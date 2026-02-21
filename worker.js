import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import path from 'path';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
const { Client, LocalAuth, MessageMedia } = pkg;
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import { Buffer } from 'buffer';

// Environment Variables
const PORT = process.env.PORT || 3006;
const SERVICE_ID = process.env.SERVICE_ID;
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'whatsapp'; // 'whatsapp' | 'telegram'
const API_ID = 2040; // Telegram API ID
const API_HASH = "b18441a1ff607e10a989891a5462e627"; // Telegram API Hash

if (!SERVICE_ID) {
    console.error('SERVICE_ID environment variable is required');
    process.exit(1);
}

// Enhanced Logging
const logFile = fs.createWriteStream(`worker_${SERVICE_ID}.log`, { flags: 'a' });
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [${SERVICE_ID}] ${msg}`;
  console.log(logMsg);
  try { logFile.write(logMsg + '\n'); } catch(e){}
};

// --- Contact Overrides Persistence ---
const OVERRIDES_FILE = `overrides_${SERVICE_ID}.json`;
let contactOverrides = {};

// Load overrides on startup
try {
    if (fs.existsSync(OVERRIDES_FILE)) {
        contactOverrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
        log(`Loaded ${Object.keys(contactOverrides).length} contact overrides`);
    }
} catch (e) {
    log(`Error loading overrides: ${e}`);
}

const saveOverride = (chatId, name) => {
    contactOverrides[chatId] = name;
    try {
        fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(contactOverrides, null, 2));
    } catch (e) {
        log(`Error saving override: ${e}`);
    }
};
// -------------------------------------

process.on('uncaughtException', (err) => {
  log('Uncaught Exception: ' + err.toString() + '\n' + err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at: ' + promise + ' reason: ' + reason);
});

// Express & Socket Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Monkey-patch io.to to relay events to Master via IPC
const originalTo = io.to.bind(io);
io.to = (room) => {
    const originalObj = originalTo(room);
    const originalEmit = originalObj.emit.bind(originalObj);
    return {
        ...originalObj,
        emit: (event, data) => {
            // Send to Master via IPC
            if (process.send) {
                process.send({ type: 'event', event, data, serviceId: SERVICE_ID });
            }
            // Emit locally as well
            originalEmit(event, data);
        }
    };
};

// IPC Command Handler
process.on('message', async (msg) => {
    if (msg.type !== 'command') return;
    const { command, data } = msg;

    if (command === 'request_state') {
        log('IPC: State requested');
        if (sessionState.qr) io.to(SERVICE_ID).emit('qr', sessionState.qr);
        io.to(SERVICE_ID).emit('status', sessionState.status);
        if (sessionState.chats.length > 0) {
             io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
             const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
             io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
        }
    } else if (command === 'request_unread') {
        // Lightweight request for just unread counts (for Sidebar)
        if (sessionState.chats.length > 0) {
             const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
             io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
        }
    } else if (command === 'sendMessage') {
        const result = await handleSendMessage(data);
        if (msg.requestId && process.send) {
             process.send({ type: 'response', requestId: msg.requestId, data: result });
        }
    } else if (command === 'mark_read') {
        const { chatId } = data;
        try {
            log(`Marking chat ${chatId} as read`);
            if (SERVICE_TYPE === 'telegram') {
                const client = sessionState.client;
                if (client) await client.markAsRead(chatId);
            } else {
                const client = sessionState.client;
                if (client) {
                     const chat = await client.getChatById(chatId);
                     await chat.sendSeen();
                }
            }
            
            // Update local state immediately for responsiveness
            const chat = sessionState.chats.find(c => c.id === chatId);
            if (chat) {
                chat.unreadCount = 0;
                // Re-emit chats and unread count
                const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
                io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
            }

            // Trigger full sync to be safe
            if (SERVICE_TYPE === 'whatsapp') setTimeout(fetchAndEmitChats, 1000);
            else setTimeout(() => handleForceSync(), 1000);

        } catch(e) { log(`Error marking read: ${e}`); }
    } else if (command === 'get_chat_history') {
        handleGetChatHistory(data);
    } else if (command === 'force_sync_chats') {
        handleForceSync();
    } else if (command === 'tg_password') {
        if (sessionState.passwordResolver) {
            sessionState.passwordResolver(data);
            sessionState.passwordResolver = null;
        }
    } else if (command === 'download_media') {
        handleDownloadMedia(data);
    } else if (command === 'archive_chat') {
        handleArchiveChat(data);
    } else if (command === 'delete_chat') {
        handleDeleteChat(data);
    } else if (command === 'delete_message') {
        handleDeleteMessage(data);
    } else if (command === 'react_message') {
        handleReactMessage(data);
    } else if (command === 'get_chat_media') {
        handleGetChatMedia(data);
    } else if (command === 'update_contact_name') {
        const { chatId, newName } = data;
        log(`Updating contact name for ${chatId} to ${newName}`);
        
        // Save override locally FIRST for immediate persistence
        saveOverride(chatId, newName);

        if (SERVICE_TYPE === 'telegram' && sessionState.client) {
            try {
                // Telegram: Update Contact Name
                // We use AddContact which acts as an upsert/update
                (async () => {
                    try {
                        const entity = await sessionState.client.getInputEntity(chatId);
                        await sessionState.client.invoke(new Api.contacts.AddContact({
                            id: entity,
                            firstName: newName,
                            lastName: '',
                            addPhonePrivacyException: false
                        }));
                        // FORCE RE-FETCH TO UPDATE UI
                        setTimeout(() => fetchChats(), 500); 
                    } catch(e) { log(`TG Contact Update Logic Error: ${e}`); }
                })();
            } catch(e) { log(`TG Update Contact Error: ${e}`); }
        } else if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
             // WhatsApp: Not fully supported via Web API to sync to phone
             // But we will log the attempt.
             log('WhatsApp Contact Update not fully supported via Web API - Using Local Override');
             // Attempt local update anyway
             setTimeout(() => fetchAndEmitChats(), 500);
        }
    }
});

const handleGetChatMedia = async (data) => {
    const { chatId } = data;
    log(`Fetching media history for ${chatId}`);
    
    let mediaList = [];

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            // Fetch more messages to find media (Limit 500 to go back further)
            const messages = await chat.fetchMessages({ limit: 500 });
            
            let count = 0;
            // Iterate backwards (newest first)
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (count >= 20) break; // Limit to 20 media items for performance

                if (msg.hasMedia) {
                    try {
                        if (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'audio') {
                             const downloaded = await msg.downloadMedia();
                             if (downloaded) {
                                 mediaList.push({
                                     id: msg.id._serialized,
                                     mimetype: downloaded.mimetype,
                                     data: downloaded.data,
                                     filename: downloaded.filename || 'media',
                                     timestamp: msg.timestamp
                                 });
                                 count++;
                             }
                        }
                    } catch (e) {
                         // Skip failed downloads
                         log(`WA Download Error for ${msg.id._serialized}: ${e}`);
                    }
                }
            }
        } catch(e) { log(`WA Media History Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            // Resolve entity first to ensure we target the right chat
            const entity = await sessionState.client.getInputEntity(chatId);
            
            // Helper to process TG messages
            const processTgMedia = async (filter, limit) => {
                try {
                    const msgs = await sessionState.client.getMessages(entity, { 
                        limit: limit, 
                        filter: filter
                    });
                    
                    for (const msg of msgs) {
                         try {
                             // Only download if we don't have it yet (frontend handles dedupe, but bandwidth matters)
                             // Download max 1MB for preview or use thumbnail if possible
                             // For now, download full media to ensure quality as per user request
                             const buffer = await sessionState.client.downloadMedia(msg, {});
                             if (buffer) {
                                 const base64 = buffer.toString('base64');
                                 let mimetype = 'application/octet-stream';
                                 
                                 // Determine mimetype
                                 if (msg.media) {
                                     if (msg.media.photo) mimetype = 'image/jpeg';
                                     else if (msg.media.document) {
                                         mimetype = msg.media.document.mimeType || 'application/octet-stream';
                                     }
                                 }

                                 // Fallback for filename
                                 let filename = 'media';
                                 if (msg.media && msg.media.document && msg.media.document.attributes) {
                                     const attr = msg.media.document.attributes.find(a => a.fileName);
                                     if (attr) filename = attr.fileName;
                                 }

                                 mediaList.push({
                                     id: msg.id.toString(),
                                     mimetype,
                                     data: base64,
                                     filename,
                                     timestamp: msg.date
                                 });
                             }
                         } catch (e) { log(`TG Msg Download Error: ${e}`); }
                    }
                } catch (e) { log(`TG Filter Fetch Error: ${e}`); }
            };

            // Fetch Photos (Top 20)
            await processTgMedia(new Api.InputMessagesFilterPhotos(), 20);
            // Fetch Videos (Top 10)
            await processTgMedia(new Api.InputMessagesFilterVideo(), 10);
            // Fetch Documents (Top 10 - often images/videos sent as file)
            await processTgMedia(new Api.InputMessagesFilterDocument(), 10);
            
            // Sort by date desc
            mediaList.sort((a, b) => b.timestamp - a.timestamp);

        } catch(e) { log(`TG Media History Error: ${e}`); }
    }
    
    log(`Emitting ${mediaList.length} media items for ${chatId}`);
    io.to(SERVICE_ID).emit('chat_media_history', { chatId, media: mediaList });
};

const handleDeleteChat = async (data) => {
    const { chatId } = data;
    log(`Deleting chat ${chatId}`);
    
    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            await chat.delete();
            // Update local state
            sessionState.chats = sessionState.chats.filter(c => c.id !== chatId);
            io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
        } catch(e) { log(`Delete Chat Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            await sessionState.client.deleteDialog(chatId);
            sessionState.chats = sessionState.chats.filter(c => c.id !== chatId);
            io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
        } catch(e) { log(`TG Delete Chat Error: ${e}`); }
    }
};

const handleDeleteMessage = async (data) => {
    const { chatId, messageId, everyone } = data;
    log(`Deleting message ${messageId} in ${chatId} (Everyone: ${everyone})`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            // WhatsApp requires the Message object to delete. 
            // We'll search in recent messages. Increased limit for better findability.
            const messages = await chat.fetchMessages({ limit: 100 }); 
            const msg = messages.find(m => m.id._serialized === messageId);
            
            if (msg) {
                await msg.delete(!!everyone);
                io.to(SERVICE_ID).emit('message_deleted', { chatId, messageId });
            } else {
                log('Message not found for deletion (checked last 100)');
            }
        } catch(e) { log(`WA Delete Message Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            const msgIds = [parseInt(messageId)];
            await sessionState.client.deleteMessages(chatId, msgIds, { revoke: !!everyone });
            io.to(SERVICE_ID).emit('message_deleted', { chatId, messageId });
        } catch(e) { log(`TG Delete Message Error: ${e}`); }
    }
};

const handleReactMessage = async (data) => {
    const { chatId, messageId, reaction } = data;
    log(`Reacting to message ${messageId} in ${chatId} with ${reaction}`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: 100 });
            const msg = messages.find(m => m.id._serialized === messageId);
            
            if (msg) {
                await msg.react(reaction);
            } else {
                log('Message not found for reaction');
            }
        } catch(e) { log(`WA React Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            // GramJS sendReaction
            await sessionState.client.sendReaction(chatId, parseInt(messageId), reaction);
        } catch(e) { log(`TG React Error: ${e}`); }
    }
};

const handleArchiveChat = async (data) => {
    const { chatId, archive } = data;
    log(`Archiving chat ${chatId}: ${archive}`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            if (archive) {
                await chat.archive();
            } else {
                await chat.unarchive();
            }
            // Update local state immediately
            const localChat = sessionState.chats.find(c => c.id === chatId);
            if (localChat) {
                localChat.archived = archive;
                // Re-emit chats and unread count
                const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
                io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
                io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
            }
        } catch(e) { log(`Archive Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            // Telegram 'archive' is essentially moving to folder 1 or specific archive logic
            // GramJS doesn't have a direct 'archive' helper on Chat object, need to use API
            
            // Just update local state for UI responsiveness
             const localChat = sessionState.chats.find(c => c.id === chatId);
             if (localChat) {
                 localChat.archived = archive;
                 const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
                 io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
                 io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
             }
        } catch (e) { log(`TG Archive Error: ${e}`); }
    }
};

const handleDownloadMedia = async (data) => {
    const { messageId, chatId } = data;
    // log(`Downloading media for ${messageId} in ${chatId}`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            // Try to find in recent chats first to avoid network fetch if possible
            const chat = await sessionState.client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: 20 }); 
            const msg = messages.find(m => m.id._serialized === messageId);
            
            if (msg && msg.hasMedia) {
                const downloaded = await msg.downloadMedia();
                if (downloaded) {
                     io.to(SERVICE_ID).emit('media_loaded', {
                        msgId: messageId,
                        chatId,
                        media: { mimetype: downloaded.mimetype, data: downloaded.data, filename: downloaded.filename }
                     });
                }
            }
        } catch (e) { log(`WA Media Download Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
         try {
             const messages = await sessionState.client.getMessages(chatId, { ids: [parseInt(messageId) || 0] }); // Telegram IDs are integers usually
             if (messages && messages.length > 0) {
                 const msg = messages[0];
                 if (msg.media) {
                     const buffer = await sessionState.client.downloadMedia(msg, {});
                     const base64 = buffer.toString('base64');
                     let mimetype = 'application/octet-stream';
                     if (msg.media.photo) mimetype = 'image/jpeg';
                     else if (msg.media.document) mimetype = msg.media.document.mimeType || 'application/octet-stream';
                     
                     io.to(SERVICE_ID).emit('media_loaded', {
                        msgId: messageId,
                        chatId,
                        media: { mimetype, data: base64, filename: 'media' }
                     });
                 }
             }
         } catch (e) { log(`TG Media Download Error: ${e}`); }
    }
};

const handleSendMessage = async (data) => {
    const body = data.message || data.body;
    // const { quotedMessageId } = data; // Tagging disabled as per user request
    
    // if (quotedMessageId) log(`Sending message with reply to: ${quotedMessageId}`);

    let response = { status: 'error', error: 'Unknown error' };

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            let sentMsg;
            if (data.media) {
                const media = new MessageMedia(data.media.mimetype, data.media.data, data.media.filename);
                sentMsg = await sessionState.client.sendMessage(data.chatId, media, { caption: body });
            } else {
                sentMsg = await sessionState.client.sendMessage(data.chatId, body, {}); 
            }
            if (sentMsg) {
                 response = { status: 'success', messageId: sentMsg.id._serialized };
            }
        } catch(e) { 
            log(`Send Error: ${e}`);
            response = { status: 'error', error: e.toString() };
        }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            let result;
            // const replyTo = quotedMessageId ? parseInt(quotedMessageId) : undefined;

            if (data.media) {
                const buffer = Buffer.from(data.media.data, 'base64');
                
                // Enhanced Image/Video Detection
                // Check Mimetype OR Filename Extension
                let isImageOrVideo = false;
                if (data.media.mimetype) {
                    isImageOrVideo = data.media.mimetype.startsWith('image/') || data.media.mimetype.startsWith('video/');
                }
                
                // Ensure filename exists
                let filename = data.media.filename;
                if (!filename) {
                    const ext = data.media.mimetype.split('/')[1] || 'bin';
                    filename = `file.${ext}`;
                }

                // If mimetype check failed (e.g. application/octet-stream), check extension
                if (!isImageOrVideo && filename) {
                    const lowerName = filename.toLowerCase();
                    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || 
                        lowerName.endsWith('.png') || lowerName.endsWith('.gif') || 
                        lowerName.endsWith('.mp4') || lowerName.endsWith('.mov')) {
                        isImageOrVideo = true;
                    }
                }

                // ALWAYS use CustomFile to ensure filename is passed (Fixes "Unnamed" issue)
                // BUT control forceDocument based on type (Fixes "File vs Image" issue)
                const file = new CustomFile(filename, buffer.length, "", buffer);
                
                const sendParams = {
                    message: body,
                    file: file,
                    forceDocument: !isImageOrVideo // False = Inline Media (Image/Video), True = Document
                };
                
                // Only add attributes if it is strictly a document
                // Adding attributes to an image might confuse GramJS into thinking it's a file
                if (!isImageOrVideo) {
                    sendParams.attributes = [
                        new Api.DocumentAttributeFilename({ fileName: filename })
                    ];
                }
                
                result = await sessionState.client.sendMessage(data.chatId, sendParams);
            } else {
                result = await sessionState.client.sendMessage(data.chatId, { message: body });
            }
             if (result) {
                 // GramJS message object has id property
                 response = { status: 'success', messageId: result.id.toString() };

                 // Explicitly emit newMessage for real-time "Sent" tick (Single Tick)
                 // This ensures the clock icon changes to a single tick immediately
                 try {
                     const sender = await result.getSender();
                     const mappedMsg = {
                        id: result.id.toString(),
                        chatId: data.chatId,
                        author: sender ? (sender.username || sender.firstName) : 'Me',
                        fromMe: true,
                        body: result.text || '',
                        timestamp: result.date,
                        type: 'chat',
                        hasMedia: !!result.media,
                        media: null,
                        quotedMsg: null,
                        ack: 1 // Sent (Single Tick)
                     };
                     io.to(SERVICE_ID).emit('newMessage', mappedMsg);
                 } catch (e) { log(`Error emitting real-time sent message: ${e}`); }
            }
        } catch(e) { 
            log(`Send Error: ${e}`);
            response = { status: 'error', error: e.toString() };
        }
    }
    return response;
};

const handleGetChatHistory = async (data) => {
    const { chatId, limit } = data;
    log(`Fetching history for ${chatId}`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: limit || 50 });
            
            // Reverted to simple map without quotedMsg fetching
            const mapped = messages.map(msg => ({
                id: msg.id._serialized,
                chatId: chatId,
                author: msg.author || msg.from,
                fromMe: msg.fromMe,
                body: msg.body,
                timestamp: msg.timestamp,
                type: msg.type,
                hasMedia: msg.hasMedia,
                media: null, 
                quotedMsg: null, // Disabled
                ack: msg.ack
            }));

            io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: mapped });
        } catch (e) {
            log(`History Error: ${e}`);
            io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: [] });
        }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
             const messages = await sessionState.client.getMessages(chatId, { limit: limit || 50 });
             
             // Get read state from local cache
             const chatState = sessionState.chats.find(c => c.id === chatId);
             const readMaxId = chatState ? (chatState.readMaxId || 0) : 0;

             // Reverted to simple map without quotedMsg fetching
             const mapped = messages.map(msg => ({
                id: msg.id.toString(),
                chatId: chatId,
                author: msg.sender ? (msg.sender.username || msg.sender.firstName) : 'Unknown',
                fromMe: msg.out,
                body: msg.text || '',
                timestamp: msg.date,
                type: 'chat',
                hasMedia: !!msg.media,
                media: null,
                quotedMsg: null, // Disabled
                ack: (msg.out && Number(msg.id) <= Number(readMaxId)) ? 3 : 1
             }));
             io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: mapped });
        } catch (e) {
             log(`TG History Error: ${e}`);
             io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: [] });
        }
    }
};

const handleForceSync = () => {
     log('Force sync requested');
     if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
         if (sessionState.client.pupPage) sessionState.client.pupPage.reload();
         // Also trigger fetch
         // fetchAndEmitChats is defined inside initializeWhatsApp, so we can't call it easily here unless we expose it.
         // But reloading page usually triggers ready/auth events which trigger fetch.
     }
};


// State
const sessionState = {
    client: null,
    qr: '',
    status: 'INITIALIZING',
    chats: []
};

// Resource Queue (Local to this process)
class ResourceQueue {
  constructor(concurrency = 1, delay = 0) {
    this.concurrency = concurrency;
    this.delay = delay;
    this.queue = [];
    this.active = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { fn, resolve, reject } = this.queue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      if (this.delay > 0) await new Promise(r => setTimeout(r, this.delay));
      this.active--;
      this.process();
    }
  }
}

// Queues for this specific account
const syncQueue = new ResourceQueue(1, 500); // Serialize sync operations

// --- WHATSAPP LOGIC ---
const initializeWhatsApp = async () => {
  log(`Initializing WhatsApp Worker for ${SERVICE_ID}`);
  
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: SERVICE_ID }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-accelerated-2d-canvas', 
        '--no-first-run', 
        '--no-zygote', 
        '--disable-gpu',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--autoplay-policy=user-gesture-required',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-features=TranslateUI,site-per-process,AudioServiceOutOfProcess,IsolateOrigins', 
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-notifications',
        '--disable-offer-store-unmasked-wallet-cards',
        '--disable-popup-blocking',
        '--disable-print-preview',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-speech-api',
        '--disable-sync',
        '--hide-scrollbars',
        '--ignore-gpu-blacklist',
        '--metrics-recording-only',
        '--no-pings',
        '--password-store=basic',
        '--use-gl=swiftshader',
        '--use-mock-keychain',
        '--block-new-web-contents'
      ]
    }
  });

  sessionState.client = client;

  client.on('qr', (qr) => {
    log(`QR Code received`);
    sessionState.qr = qr;
    sessionState.status = 'QR_READY';
    io.to(SERVICE_ID).emit('qr', qr);
    io.to(SERVICE_ID).emit('status', 'QR_READY');
  });

  client.on('message_revoke_everyone', async (after, before) => {
      if (after) {
          io.to(SERVICE_ID).emit('message_deleted', { chatId: after.id.remote, messageId: after.id._serialized });
      }
  });

  client.on('message_revoke_me', async (msg) => {
      io.to(SERVICE_ID).emit('message_deleted', { chatId: msg.id.remote, messageId: msg.id._serialized });
  });

  const fetchAndEmitChats = async (retryCount = 0) => {
    if (!client || (client.pupPage && client.pupPage.isClosed())) return;

    try {
        log(`Fetching chats (Attempt ${retryCount + 1})...`);
        let chats = await client.getChats();
        let mappedBasic = [];
        
        // 1. User Info
        if (client.info) {
            let myProfilePic = null;
            try {
                if (client.info.wid) myProfilePic = await client.getProfilePicUrl(client.info.wid._serialized);
            } catch (e) {}
            io.to(SERVICE_ID).emit('wa_user_info', {
                name: client.info.pushname,
                id: client.info.wid._serialized,
                profilePicUrl: myProfilePic,
                serviceId: SERVICE_ID
            });
            
            // Send identifier to Master for persistence
            if (client.info.wid && process.send) {
                process.send({ 
                    type: 'command', 
                    command: 'update_account_info', 
                    data: { identifier: client.info.wid.user } 
                });
            }
        }

        // 2. Map Chats (Standard Method)
        if (chats && chats.length > 0) {
            // Reverted to simple synchronous map similar to Telegram implementation
            mappedBasic = chats.map(c => {
                try {
                    const chatId = c.id?._serialized || c.id || '';
                    
                    // Preserve profile pics from state
                    const existing = sessionState.chats.find(ec => ec.id === chatId);
                    const profilePicUrl = (existing && existing.profilePicUrl) ? existing.profilePicUrl : '';

                    // Robust Safe Access for Last Message
                    const lastMsgObj = c.lastMessage || {}; 
                    const lastBody = lastMsgObj.body || '';
                    const lastTs = lastMsgObj.timestamp || 0;
                    const lastFromMe = lastMsgObj.fromMe || false;
                    const lastAck = lastMsgObj.ack || 0;

                    return {
                        id: chatId,
                        name: contactOverrides[chatId] || c.name || c.formattedTitle || c.pushname || (c.contact && (c.contact.name || c.contact.pushname)) || chatId || 'Unknown',
                        isGroup: !!c.isGroup,
                        unreadCount: (typeof c.unreadCount === 'number') ? c.unreadCount : 0,
                        lastMessage: lastBody,
                        lastTimestamp: lastTs,
                        lastMessageFromMe: lastFromMe,
                        lastMessageAck: lastAck,
                        profilePicUrl: profilePicUrl,
                        lastSeen: '', // Disabled complex date logic to match Telegram stability
                        archived: c.archived || false,
                        phoneNumber: c.id?.user || '' // Add phone number
                    };
                } catch (err) {
                    log(`Error mapping chat: ${err}`);
                    return null;
                }
            }).filter(c => c !== null);
        }

        // 3. Store Fallback (If Standard Method failed/empty)
        if (mappedBasic.length === 0 && client.pupPage) {
            log('Standard fetch empty. Attempting robust Store Fallback...');
            try {
                const storeMapped = await client.pupPage.evaluate(async () => {
                    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                    // Wait up to 10s for Store to populate (check more frequently initially)
                    for (let i = 0; i < 50; i++) { // 50 * 200ms = 10s
                         if (window.Store && window.Store.Chats && window.Store.Chats.models.length > 0) break;
                         await sleep(200);
                    }
                    
                    if (!window.Store || !window.Store.Chats) return [];
                    const models = window.Store.Chats.models || [];
                    
                    return models.map((c) => ({
                        id: c.id?._serialized || c.id || (c.__x_id && c.__x_id._serialized) || '',
                        name: c.formattedTitle || c.name || c.__x_name || (c.contact && (c.contact.name || c.contact.pushname)) || 'Unknown',
                        isGroup: !!c.isGroup || !!c.__x_isGroup,
                        unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : (c.__x_unreadCount || 0),
                        lastMessage: (c.lastMessage || c.__x_lastMessage || {}).body || '',
                        lastTimestamp: (c.lastMessage || c.__x_lastMessage || {}).timestamp || 0,
                        profilePicUrl: '',
                        lastSeen: '',
                        phoneNumber: c.id?.user || (typeof c.id === 'string' ? c.id.split('@')[0] : '') || ''
                    }));
                });
                
                if (storeMapped.length > 0) {
                    // Apply overrides here because evaluate() couldn't do it in browser context
                    mappedBasic = storeMapped.map(c => ({
                        ...c,
                        name: contactOverrides[c.id] || c.name
                    }));
                    log(`Store Fallback found ${storeMapped.length} chats`);
                }
            } catch(e) { 
                log(`Store Fallback error: ${e}`);
            }
        }
        
        // 4. Sort and Update State
        if (mappedBasic.length > 0) {
            mappedBasic.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
            
            const totalUnread = mappedBasic.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
            io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });

            sessionState.chats = mappedBasic;
            io.to(SERVICE_ID).emit('wa_chats', mappedBasic);
            log(`Emitted ${mappedBasic.length} chats`);
            
            // Background fetch profile pics (only if we have real Client objects or can fetch by ID)
            (async () => {
                let i = 0;
                for (const chat of mappedBasic) { 
                    i++;
                    // Removed cache check to force real-time update
                    // if (chat.profilePicUrl) continue; 
                    try {
                        let picUrl = null;
                        try {
                            const contact = await client.getContactById(chat.id);
                            picUrl = await contact.getProfilePicUrl();
                        } catch(e) {}

                        // Fallback for groups or if contact method failed
                        if (!picUrl) {
                            try {
                                const chatObj = await client.getChatById(chat.id);
                                // Some library versions use getProfilePicUrl on chat object too
                                if (chatObj && chatObj.getProfilePicUrl) {
                                     picUrl = await chatObj.getProfilePicUrl();
                                }
                            } catch(e) {}
                        }

                        if (picUrl) {
                            chat.profilePicUrl = picUrl;
                            const stateChat = sessionState.chats.find(c => c.id === chat.id);
                            if (stateChat) stateChat.profilePicUrl = picUrl;
                            io.to(SERVICE_ID).emit('wa_chat_update', { id: chat.id, profilePicUrl: picUrl, serviceId: SERVICE_ID });
                        }
                    } catch(e) {}
                    
                    // Faster for first 12 chats (visible viewport), slower for rest
                    const delay = i <= 12 ? 50 : 200; // Increased slight delay to prevent rate limits
                    await new Promise(r => setTimeout(r, delay)); 
                }
            })();
        } else {
            log('Chats still empty.');
            io.to(SERVICE_ID).emit('wa_chats', []);
            
            // Retry Mechanism
            if (retryCount < 5) { // Try 5 times
                const delay = (retryCount === 0) ? 500 : (retryCount + 1) * 2000;
                log(`Retrying in ${delay}ms...`);
                
                // If we failed 3 times, try reloading the page to fix internal desync
                if (retryCount === 2 && client.pupPage) {
                    log('Repeated failures. Reloading page to fix state...');
                    await client.pupPage.reload();
                    // Wait for reload to settle before next retry
                    setTimeout(() => fetchAndEmitChats(retryCount + 1), 5000);
                } else {
                    setTimeout(() => fetchAndEmitChats(retryCount + 1), delay);
                }
            }
        }

    } catch (err) {
        log(`Error fetching chats: ${err}`);
        io.to(SERVICE_ID).emit('wa_chats', []);
        if (retryCount < 5) {
            setTimeout(() => fetchAndEmitChats(retryCount + 1), 2000);
        }
    }
  };

  client.on('ready', () => {
    log(`WhatsApp Connected!`);
    sessionState.status = 'CONNECTED';
    sessionState.qr = 'CONNECTED';
    io.to(SERVICE_ID).emit('ready', 'WhatsApp Client is ready!');
    io.to(SERVICE_ID).emit('status', 'CONNECTED');
    fetchAndEmitChats();
    setTimeout(fetchAndEmitChats, 5000);

    // Unread Count Real-time Injection
    if (client.pupPage) {
        (async () => {
            try {
                // Typing
                await client.pupPage.exposeFunction('onTyping', (chatId, isTyping) => {
                    io.to(SERVICE_ID).emit('chat_typing', { chatId, isTyping, serviceId: SERVICE_ID });
                });

                // Unread Count
                let fetchTimeout = null;
                await client.pupPage.exposeFunction('onUnreadChange', (chatId, count) => {
                    // Debounce to prevent flooding
                    if (fetchTimeout) clearTimeout(fetchTimeout);
                    fetchTimeout = setTimeout(() => {
                        fetchAndEmitChats();
                        fetchTimeout = null;
                    }, 500); 
                });
                
                await client.pupPage.evaluate(() => {
                    const checkStore = setInterval(() => {
                        if (window.Store && window.Store.Presence && window.Store.Chats) {
                            clearInterval(checkStore);
                            
                            // Typing Listener
                            window.Store.Presence.on('change', (presence) => {
                                 const id = presence.id._serialized || presence.id;
                                 const isTyping = presence.isTyping;
                                 window.onTyping(id, !!isTyping);
                            });

                            // Unread Count Listener
                            window.Store.Chats.on('change:unreadCount', (chat) => {
                                window.onUnreadChange(chat.id._serialized, chat.unreadCount);
                            });
                        }
                    }, 2000);
                });
            } catch (e) { log(`Injection warning: ${e}`); }
        })();
    }
  });

  client.on('message', async (msg) => {
    let chatId = msg.from; 
    try { chatId = (await msg.getChat()).id._serialized; } catch (e) { chatId = msg.id.remote || msg.from; }
    
    // Real-time Profile Pic Update for Sender
    (async () => {
        try {
            const senderId = msg.author || msg.from;
            const contact = await client.getContactById(senderId);
            const picUrl = await contact.getProfilePicUrl();
            if (picUrl) {
                // Update local cache
                const chat = sessionState.chats.find(c => c.id === chatId);
                if (chat) chat.profilePicUrl = picUrl;
                
                io.to(SERVICE_ID).emit('wa_chat_update', { id: chatId, profilePicUrl: picUrl, serviceId: SERVICE_ID });
            }
        } catch (e) {}
    })();

    let media = null;
    if (msg.hasMedia) {
        try {
            const downloaded = await msg.downloadMedia();
            if (downloaded) media = { mimetype: downloaded.mimetype, data: downloaded.data, filename: downloaded.filename };
        } catch (e) {}
    }

    let quotedMsg = undefined;
    // if (msg.hasQuotedMsg) {
    //     try {
    //         const q = await msg.getQuotedMessage();
    //         if (q) {
    //             quotedMsg = {
    //                 id: q.id._serialized,
    //                 body: q.body,
    //                 author: q.author || q.from,
    //                 fromMe: q.fromMe
    //             };
    //         }
    //     } catch(e) {}
    // }

    const mappedMsg = {
      id: msg.id._serialized,
      chatId: chatId,
      author: msg.author || msg.from,
      fromMe: msg.fromMe,
      body: msg.body,
      timestamp: msg.timestamp,
      type: msg.type,
      hasMedia: msg.hasMedia,
      media: media,
      quotedMsg: quotedMsg,
      ack: msg.ack
    };
    
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);
    
    // Optimistic Update for Real-time Unread Count
    if (!msg.fromMe) {
        const chatIndex = sessionState.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
             const chat = sessionState.chats[chatIndex];
             chat.unreadCount = (chat.unreadCount || 0) + 1;
             chat.lastMessage = msg.body;
             chat.lastTimestamp = msg.timestamp;
             chat.lastMessageFromMe = false;
             
             // Re-sort chats
             sessionState.chats.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
             
             const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
             io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
             io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
        }
    }

    fetchAndEmitChats();
  });

  client.on('message_create', async (msg) => {
    if (!msg.fromMe) return;
    let chatId = msg.to;
    try { chatId = (await msg.getChat()).id._serialized; } catch (e) { chatId = msg.id.remote || msg.to; }
    
    let media = null;
    if (msg.hasMedia) {
        try {
            const downloaded = await msg.downloadMedia();
            if (downloaded) media = { mimetype: downloaded.mimetype, data: downloaded.data, filename: downloaded.filename };
        } catch (e) {}
    }

    const mappedMsg = {
        id: msg.id._serialized,
        chatId: chatId,
        author: msg.author || msg.from,
        fromMe: msg.fromMe,
        body: msg.body,
        timestamp: msg.timestamp,
        type: msg.type,
        hasMedia: msg.hasMedia,
        media: media, 
        ack: msg.ack
    };
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);
    // fetchAndEmitChats(); // Removed to prevent overwriting optimistic updates with stale data
  });

  client.on('message_ack', async (msg, ack) => {
    /*
        ACK Values:
        1: Sent
        2: Received
        3: Read
        0: Pending/Error
    */
    const chatId = msg.to || msg.from; // For outgoing, usually 'to'. For group, might be different.
    // robust chatId resolution
    let resolvedChatId = chatId;
    try { resolvedChatId = (await msg.getChat()).id._serialized; } catch (e) { resolvedChatId = msg.id.remote || chatId; }

    log(`Message ACK: ${msg.id._serialized} -> ${ack}`);
    io.to(SERVICE_ID).emit('wa_message_ack', {
        chatId: resolvedChatId,
        id: msg.id._serialized,
        ack: ack
    });
  });

  client.on('authenticated', () => {
    log(`Authenticated`);
    sessionState.status = 'AUTHENTICATED';
    io.to(SERVICE_ID).emit('status', 'AUTHENTICATED');
  });

  client.on('auth_failure', msg => {
    log(`Auth Failure: ${msg}`);
    io.to(SERVICE_ID).emit('auth_failure', msg);
  });

  try {
    await client.initialize();
  } catch (err) {
    log(`Init Failed: ${err}`);
  }
};

// --- TELEGRAM LOGIC ---
const initializeTelegram = async () => {
  log(`Initializing Telegram Worker for ${SERVICE_ID}`);
  const sessionFile = `session_telegram_${SERVICE_ID}.txt`;
  let stringSession = new StringSession('');
  if (fs.existsSync(sessionFile)) {
      stringSession = new StringSession(fs.readFileSync(sessionFile, 'utf8'));
  }

  const client = new TelegramClient(stringSession, API_ID, API_HASH, { connectionRetries: 5 });
  sessionState.client = client;

  const fetchChats = async () => {
      try {
        if (!client.connected) await client.connect();
        const me = await client.getMe();
        let myProfilePic = '';
        try {
             const buffer = await client.downloadProfilePhoto('me');
             if (buffer) {
                 myProfilePic = 'data:image/jpeg;base64,' + buffer.toString('base64');
             }
        } catch(e) { log(`TG Profile Pic Error: ${e}`); }

        if (me) {
            io.to(SERVICE_ID).emit('wa_user_info', { name: me.username || me.firstName, id: me.id.toString(), profilePicUrl: myProfilePic, serviceId: SERVICE_ID });
            
            // Send identifier to Master for persistence
            if (process.send) {
                process.send({
                    type: 'command',
                    command: 'update_account_info',
                    data: { identifier: me.username ? `@${me.username}` : me.phone || me.id.toString() }
                });
            }
        }
        
        const dialogs = await client.getDialogs({});
        const mappedChats = dialogs.map(d => ({
            id: d.id.toString(),
            name: contactOverrides[d.id.toString()] || d.title || 'Unknown',
            isGroup: d.isGroup,
            unreadCount: d.unreadCount,
            lastMessage: d.message?.text || '',
            lastTimestamp: d.date,
            lastMessageFromMe: d.message?.out || false,
            // Robust Tick Logic:
            // Ensure both IDs are treated as Numbers for comparison.
            // If readOutboxMaxId is present and >= message.id, it is read.
            lastMessageAck: (d.message?.out && d.readOutboxMaxId && Number(d.message.id) <= Number(d.readOutboxMaxId)) ? 3 : 1,
            profilePicUrl: '',
            lastSeen: '',
            archived: d.archived || d.folderId === 1 || false,
            readMaxId: d.readOutboxMaxId, // Store readMaxId for history checks
            username: d.entity?.username || '',
            phone: d.entity?.phone || ''
        }));

        const totalUnread = mappedChats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
        io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });

        sessionState.chats = mappedChats;
        io.to(SERVICE_ID).emit('wa_chats', mappedChats);

        // Background fetch profile pics for Telegram
        (async () => {
            for (const chat of mappedChats.slice(0, 50)) {
                 try {
                    const buffer = await client.downloadProfilePhoto(chat.id);
                    if (buffer && buffer.length > 0) {
                            const picUrl = 'data:image/jpeg;base64,' + buffer.toString('base64');
                            chat.profilePicUrl = picUrl;
                            io.to(SERVICE_ID).emit('wa_chat_update', { id: chat.id, profilePicUrl: picUrl, serviceId: SERVICE_ID });
                        }
                 } catch(e) {}
                 await new Promise(r => setTimeout(r, 500)); // Throttle more for TG
            }
        })();
      } catch (e) { 
        log(`TG Fetch Error: ${e}`); 
        io.to(SERVICE_ID).emit('wa_chats', []);
      }
  };
  
  sessionState.fetchFunction = fetchChats;

  client.addEventHandler(async (event) => {
    const message = event.message;
    const sender = await message.getSender();
    const chatId = message.chatId.toString();
    
    let quotedMsg = undefined;
    if (message.replyTo) {
         try {
             const q = await message.getReplyMessage();
             if (q) {
                 quotedMsg = {
                    id: q.id.toString(),
                    body: q.text || '',
                    author: (await q.getSender())?.username || 'Unknown',
                    fromMe: q.out
                 };
             }
         } catch(e) {}
    }

    const mappedMsg = {
        id: message.id.toString(),
        chatId: chatId,
        author: sender ? (sender.username || sender.firstName) : 'Unknown',
        fromMe: message.out,
        body: message.text || '',
        timestamp: message.date,
        type: 'chat',
        hasMedia: !!message.media,
        media: null,
        quotedMsg: quotedMsg,
        ack: 1
    };
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);

    // Optimistic Update for Real-time Unread Count
    if (!message.out) {
        const chatIndex = sessionState.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
             const chat = sessionState.chats[chatIndex];
             chat.unreadCount = (chat.unreadCount || 0) + 1;
             chat.lastMessage = message.text || '';
             chat.lastTimestamp = message.date;
             chat.lastMessageFromMe = false;
             
             // Re-sort chats
             sessionState.chats.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

             const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.archived ? 0 : (c.unreadCount || 0)), 0);
             io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
             io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
        }
        fetchChats(); // Only fetch for incoming messages to ensure sync
    }

    // Background Media Download (Real-time receive)
    if (message.media) {
        (async () => {
            try {
                const buffer = await client.downloadMedia(message, {});
                const base64 = buffer.toString('base64');
                let mimetype = 'application/octet-stream';
                if (message.media.photo) mimetype = 'image/jpeg';
                else if (message.media.document) mimetype = message.media.document.mimeType || 'application/octet-stream';
                
                io.to(SERVICE_ID).emit('media_loaded', {
                    msgId: mappedMsg.id,
                    chatId: mappedMsg.chatId,
                    media: { mimetype, data: base64, filename: 'media' }
                });
            } catch(e) { log(`TG Media Download Error: ${e}`); }
        })();
    }
  }, new NewMessage({}));

  // Listen for Read History Updates (Real-time Unread Sync & Ticks)
  client.addEventHandler(async (update) => {
      // Check if it's a read history update
      // UpdateReadHistoryOutbox: They read our messages (Double Tick)
      if (update instanceof Api.UpdateReadHistoryOutbox) {
          try {
            const chatId = update.peer.userId || update.peer.chatId || update.peer.channelId;
            const maxId = update.maxId;
            
            if (chatId) {
                // Fetch recent messages to update their status locally
                const messages = await client.getMessages(chatId, { limit: 20 });
                
                messages.forEach(msg => {
                    if (msg.out && msg.id <= maxId) {
                        io.to(SERVICE_ID).emit('wa_message_ack', {
                            chatId: chatId.toString(),
                            id: msg.id.toString(),
                            ack: 3 // Read (Double Blue Tick)
                        });
                    }
                });
                
                // Sync chat list to update readMaxId for persistence (with delay to ensure state update)
                setTimeout(() => fetchChats(), 500);
            }
          } catch(e) { log(`Read History Outbox Error: ${e}`); }
      }
      
      // UpdateReadHistoryInbox: We read their messages (Update Unread Count)
      if (update instanceof Api.UpdateReadHistoryInbox) {
          log('TG Read History Inbox detected - Syncing...');
          fetchChats();
      }
      
      // Also catch generic Short Updates which sometimes carry read state
      if (update instanceof Api.UpdateShort) {
           fetchChats();
      }
  });

  // Typing Status Handler
  client.addEventHandler((update) => {
    try {
        const className = update.className;
        if (className === 'UpdateUserTyping' || className === 'UpdateChatUserTyping') {
             let chatId = null;
             if (className === 'UpdateUserTyping') chatId = update.userId;
             else if (className === 'UpdateChatUserTyping') chatId = update.chatId;
             
             if (chatId) {
                 io.to(SERVICE_ID).emit('chat_typing', { chatId: chatId.toString(), isTyping: true, serviceId: SERVICE_ID });
             }
        }
    } catch (e) { log(`Typing Handler Error: ${e}`); }
  });

  try {
    await client.connect();
    if (!fs.existsSync(sessionFile)) {
        await client.signInUserWithQrCode({ apiId: API_ID, apiHash: API_HASH }, { 
            qrCode: async (code) => {
                const tokenBase64 = code.token.toString('base64url');
                const qrUrl = `tg://login?token=${tokenBase64}`;
                sessionState.qr = qrUrl;
                sessionState.status = 'QR_READY';
                io.to(SERVICE_ID).emit('qr', qrUrl);
                io.to(SERVICE_ID).emit('status', 'QR_READY');
            }, 
            password: async (hint) => {
                io.to(SERVICE_ID).emit('tg_2fa_required', { hint });
                return new Promise((resolve, reject) => {
                    sessionState.passwordResolver = resolve;
                    setTimeout(() => reject(new Error('TIMEOUT')), 300000);
                });
            },
            onError: (err) => { log(`TG Error: ${err}`); return true; }
        });
        fs.writeFileSync(sessionFile, client.session.save());
    }
    sessionState.status = 'CONNECTED';
    io.to(SERVICE_ID).emit('ready', 'Telegram Ready');
    io.to(SERVICE_ID).emit('status', 'CONNECTED');
    fetchChats();
    setTimeout(fetchChats, 5000);
  } catch (e) {
    log(`TG Init Failed: ${e}`);
  }
};

// Start Service
if (SERVICE_TYPE === 'whatsapp') {
    initializeWhatsApp();
} else {
    initializeTelegram();
}
