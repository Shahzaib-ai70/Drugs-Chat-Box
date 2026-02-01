import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import translate from 'translate-google';

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
    status: 'INITIALIZING', 
    isScreencasting: false,
    translationSettings: {
        autoTranslateIncoming: false,
        targetLang: 'en'
    }
};

// Initialize Facebook
const initFacebook = async () => {
    try {
        log('Launching Puppeteer for Facebook...');
        
        // Create session directory for persistence
        const sessionDir = path.join(process.cwd(), 'fb_auth', `session-${SERVICE_ID}`);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        sessionState.browser = await puppeteer.launch({
            headless: true,
            userDataDir: sessionDir, // Persist session
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--window-size=1000,800', // Fixed viewport
                '--disable-notifications'
            ]
        });
        
        sessionState.page = await sessionState.browser.newPage();
        await sessionState.page.setViewport({ width: 1000, height: 800 });
        await sessionState.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        log('Navigating to Facebook...');
        try {
            await sessionState.page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 60000 });
        } catch (navErr) {
            log('Navigation warning: ' + navErr);
        }

        // Start Screencast immediately so user sees something
        startScreencast();
        io.to(SERVICE_ID).emit('ready');

        // Expose Translation Service to Page (Safe Mode)
        try {
            await sessionState.page.exposeFunction('translateService', async (text) => {
                if (!sessionState.translationSettings.autoTranslateIncoming) return null;
                try {
                    const res = await translate(text, { to: sessionState.translationSettings.targetLang });
                    return res;
                } catch (e) {
                    return null;
                }
            });
        } catch (exposeErr) {
            log('Translation service already exposed or failed: ' + exposeErr);
        }

        // Inject Mutation Observer for Translation
        try {
            await sessionState.page.evaluate(() => {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    const el = node;
                                    // Basic Heuristic for Message Bubbles:
                                    // 1. Look for text content
                                    // 2. Check if it's likely a message (div with dir="auto" is common in FB)
                                    // 3. Avoid inputs and small UI elements
                                    const textNodes = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
                                    let currentNode;
                                    while(currentNode = textNodes.nextNode()) {
                                        if(currentNode.parentElement.tagName === 'SCRIPT' || 
                                           currentNode.parentElement.tagName === 'STYLE' ||
                                           currentNode.parentElement.isContentEditable) continue;

                                        const text = currentNode.nodeValue.trim();
                                        // Translate if long enough and not already translated
                                        if (text.length > 3 && !currentNode.parentElement.getAttribute('data-translated')) {
                                            const parent = currentNode.parentElement;
                                            parent.setAttribute('data-translated', 'pending');
                                            
                                            window.translateService(text).then(translated => {
                                                if (translated) {
                                                    currentNode.nodeValue = translated;
                                                    parent.setAttribute('data-translated', 'true');
                                                    parent.setAttribute('title', 'Original: ' + text); // Tooltip
                                                    parent.style.borderBottom = '1px dashed #888'; // Indicator
                                                } else {
                                                    parent.removeAttribute('data-translated');
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    });
                });
                
                // Start observing broadly (body) but be careful with performance
                observer.observe(document.body, { childList: true, subtree: true });
            });
        } catch (evalErr) {
            log('Translation observer injection failed: ' + evalErr);
        }

    } catch (e) {
        log('Init Error: ' + e);
        setTimeout(initFacebook, 10000); // Retry
    }
};

const startScreencast = () => {
    if (sessionState.isScreencasting) return;
    sessionState.isScreencasting = true;
    log('Starting Screencast...');

    setInterval(async () => {
        if (!sessionState.page) return;
        try {
            const screenshot = await sessionState.page.screenshot({ 
                type: 'jpeg', 
                quality: 60, 
                encoding: 'base64' 
            });
            io.to(SERVICE_ID).emit('fb_screen_update', { data: screenshot });
        } catch (e) {
            // log('Screen capture error: ' + e);
        }
    }, 500); // 2 FPS
};

// IPC Command Handler
process.on('message', async (msg) => {
    if (msg.type !== 'command') return;
    const { command, data } = msg;

    if (command === 'request_state') {
        io.to(SERVICE_ID).emit('status', 'READY'); // Always claim ready so frontend shows view
    } else if (command === 'fb_update_translation') {
        // Update translation settings
        sessionState.translationSettings = {
            autoTranslateIncoming: data.autoTranslateIncoming,
            targetLang: data.targetLang
        };
        log(`Updated Translation Settings: ${JSON.stringify(sessionState.translationSettings)}`);
    } else if (command === 'fb_input_event') {
        if (!sessionState.page) return;
        const { type, x, y, text, key } = data;
        try {
            if (type === 'click') {
                await sessionState.page.mouse.click(x, y);
            } else if (type === 'type') {
                await sessionState.page.keyboard.type(text);
            } else if (type === 'key') {
                await sessionState.page.keyboard.press(key);
            } else if (type === 'scroll') {
                 // Simple scroll support
                 await sessionState.page.evaluate((d) => window.scrollBy(0, d), data.delta);
            }
        } catch (e) { log('Input error: ' + e); }
    }
});

// Start Server
server.listen(PORT, () => {
    log(`Worker started on port ${PORT}`);
    initFacebook();
});
