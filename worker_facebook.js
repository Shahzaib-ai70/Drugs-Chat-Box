import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import puppeteer from 'puppeteer';

// Environment Variables
const PORT = process.env.PORT || 3007;
const SERVICE_ID = process.env.SERVICE_ID;

if (!SERVICE_ID) {
    console.error('SERVICE_ID environment variable is required');
    process.exit(1);
}

// Logging
const logFile = fs.createWriteStream(`worker_${SERVICE_ID}.log`, { flags: 'a' });
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [${SERVICE_ID}] ${msg}`;
  console.log(logMsg);
  try { logFile.write(logMsg + '\n'); } catch(e){}
};

process.on('uncaughtException', (err) => {
  log('Uncaught Exception: ' + err.toString());
});
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection: ' + reason);
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
            if (process.send) {
                process.send({ type: 'event', event, data, serviceId: SERVICE_ID });
            }
            originalEmit(event, data);
        }
    };
};

// State
const sessionState = {
    browser: null,
    page: null,
    status: 'INITIALIZING', // INITIALIZING, LOGIN_NEEDED, 2FA_NEEDED, READY
    chats: []
};

// Initialize Facebook
const initFacebook = async () => {
    try {
        log('Launching Puppeteer for Facebook...');
        sessionState.browser = await puppeteer.launch({
            headless: true, // Use headless for server
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        sessionState.page = await sessionState.browser.newPage();
        await sessionState.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        log('Navigating to Facebook...');
        await sessionState.page.goto('https://www.facebook.com/messages/t', { waitUntil: 'networkidle2' });
        
        await checkLoginState();

    } catch (e) {
        log('Init Error: ' + e);
        setTimeout(initFacebook, 10000); // Retry
    }
};

const checkLoginState = async () => {
    if (!sessionState.page) return;
    
    try {
        // Check for login form
        const loginForm = await sessionState.page.$('#email');
        if (loginForm) {
            log('Login Required');
            sessionState.status = 'LOGIN_NEEDED';
            io.to(SERVICE_ID).emit('fb_login_required', { serviceId: SERVICE_ID });
            return;
        }

        // Check for 2FA (this selector is a guess, need to be robust)
        // Usually FB 2FA asks for code.
        const twoFactor = await sessionState.page.$('input[name="approvals_code"]'); 
        if (twoFactor) {
            log('2FA Required');
            sessionState.status = '2FA_NEEDED';
            io.to(SERVICE_ID).emit('fb_2fa_required', { serviceId: SERVICE_ID });
            return;
        }

        // Check if logged in (Messenger interface)
        // Look for chat list container or specific messenger elements
        // This is tricky without visual inspection, assuming if no login form, we might be in.
        // Or check for "Keep me signed in" or similar if still on login page.
        
        const messengerElement = await sessionState.page.$('[role="navigation"]'); // Generic sidebar
        if (messengerElement) {
            log('Facebook Ready');
            sessionState.status = 'READY';
            io.to(SERVICE_ID).emit('ready');
            io.to(SERVICE_ID).emit('status', 'READY');
            // Start scraping chats
            scrapeChats();
        } else {
             // Maybe stuck or loading
             log('Unknown state, checking again...');
             setTimeout(checkLoginState, 2000);
        }

    } catch (e) {
        log('Check State Error: ' + e);
    }
};

const scrapeChats = async () => {
    if (sessionState.status !== 'READY' || !sessionState.page) return;
    
    // TODO: Implement actual scraping logic
    // For now, emit dummy chats to prove it works
    const dummyChats = [
        { id: 'fb_1', name: 'Facebook User', unreadCount: 1, lastMessage: 'Hello from FB', lastTimestamp: Math.floor(Date.now()/1000) }
    ];
    sessionState.chats = dummyChats;
    io.to(SERVICE_ID).emit('wa_chats', dummyChats); // Reuse wa_chats event for compatibility
};

// IPC Command Handler
process.on('message', async (msg) => {
    if (msg.type !== 'command') return;
    const { command, data } = msg;

    if (command === 'request_state') {
        io.to(SERVICE_ID).emit('status', sessionState.status);
        if (sessionState.status === 'LOGIN_NEEDED') io.to(SERVICE_ID).emit('fb_login_required', { serviceId: SERVICE_ID });
        if (sessionState.status === '2FA_NEEDED') io.to(SERVICE_ID).emit('fb_2fa_required', { serviceId: SERVICE_ID });
        if (sessionState.chats.length > 0) io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
    } else if (command === 'fb_login_submit') {
        const { email, password } = data;
        log('Attempting Login...');
        if (sessionState.page) {
            try {
                await sessionState.page.type('#email', email);
                await sessionState.page.type('#pass', password);
                await sessionState.page.click('[name="login"]');
                await sessionState.page.waitForNavigation({ waitUntil: 'networkidle2' });
                checkLoginState();
            } catch (e) {
                log('Login Error: ' + e);
            }
        }
    } else if (command === 'fb_2fa_submit') {
        const { code } = data;
        log('Submitting 2FA...');
        if (sessionState.page) {
            try {
                await sessionState.page.type('input[name="approvals_code"]', code);
                await sessionState.page.click('#checkpointSubmitButton'); // Selector guess
                await sessionState.page.waitForNavigation({ waitUntil: 'networkidle2' });
                checkLoginState();
            } catch (e) {
                log('2FA Error: ' + e);
            }
        }
    } else if (command === 'sendMessage') {
        // Implement sending message via Puppeteer
        log('Sending message (mock): ' + data.body);
        const mockId = 'fb_msg_' + Date.now();
        if (msg.requestId && process.send) {
             process.send({ type: 'response', requestId: msg.requestId, data: { status: 'success', messageId: mockId } });
        }
    }
});

// Start Server
server.listen(PORT, () => {
    log(`Worker started on port ${PORT}`);
    initFacebook();
});
