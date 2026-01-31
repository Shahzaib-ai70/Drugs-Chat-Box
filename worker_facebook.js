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
    status: 'INITIALIZING', 
    isScreencasting: false
};

// Initialize Facebook
const initFacebook = async () => {
    try {
        log('Launching Puppeteer for Facebook...');
        sessionState.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--window-size=1000,800' // Fixed viewport
            ]
        });
        
        sessionState.page = await sessionState.browser.newPage();
        await sessionState.page.setViewport({ width: 1000, height: 800 });
        await sessionState.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        log('Navigating to Facebook...');
        await sessionState.page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });

        // Start Screencast immediately
        startScreencast();
        
        // Notify frontend we are ready to stream
        io.to(SERVICE_ID).emit('ready');

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
