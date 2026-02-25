import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import translate from 'translate-google';

const PORT = process.env.PORT || 3007;
const SERVICE_ID = process.env.SERVICE_ID;
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'facebook';

if (!SERVICE_ID) {
    console.error('SERVICE_ID environment variable is required');
    process.exit(1);
}

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
process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection: ' + reason);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

const initRemote = async () => {
    try {
        log(`Launching Puppeteer for ${SERVICE_TYPE}...`);
        
        const baseDir = SERVICE_TYPE === 'tiktok' ? 'tt_auth' : 'fb_auth';
        const sessionDir = path.join(process.cwd(), baseDir, `session-${SERVICE_ID}`);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        sessionState.browser = await puppeteer.launch({
            headless: true,
            userDataDir: sessionDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1000,800',
                '--disable-notifications',
                '--disable-features=IsolateOrigins,site-per-process,SitePerProcess',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });
        
        sessionState.page = await sessionState.browser.newPage();
        await sessionState.page.setViewport({ width: 1000, height: 800 });
        await sessionState.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        const targetUrl = SERVICE_TYPE === 'tiktok' 
            ? 'https://www.tiktok.com/messages' 
            : 'https://www.facebook.com/';
        log(`Navigating to ${targetUrl}`);
        try {
            await sessionState.page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        } catch (navErr) {
            log('Navigation warning: ' + navErr);
        }

        if (SERVICE_TYPE === 'tiktok') {
            try {
                await sessionState.page.evaluate(() => {
                    const style = document.createElement('style');
                    style.innerHTML = `
                        video { 
                            visibility: hidden !important; 
                            pointer-events: none !important; 
                        }
                    `;
                    document.head.appendChild(style);
                    const pauseAll = () => {
                        document.querySelectorAll('video').forEach((v) => {
                            try {
                                if (v && typeof v.pause === 'function') {
                                    v.pause();
                                }
                            } catch (e) {}
                        });
                    };
                    pauseAll();
                    setInterval(pauseAll, 3000);
                });
            } catch (e) {
                log('TikTok video disable failed: ' + e);
            }
        }

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
            log('Translation expose failed: ' + exposeErr);
        }

        sessionState.status = 'READY';
        startScreencast();
        io.to(SERVICE_ID).emit('ready');
        io.to(SERVICE_ID).emit('status', 'READY');
    } catch (e) {
        log('Init Error: ' + e);
        setTimeout(initRemote, 10000);
    }
};

const startScreencast = () => {
    if (sessionState.isScreencasting) return;
    sessionState.isScreencasting = true;

    const intervalMs = SERVICE_TYPE === 'tiktok' ? 1500 : 500;

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
            log('Screenshot error: ' + e);
        }
    }, intervalMs);
};

process.on('message', async (msg) => {
    if (msg.type !== 'command') return;
    const { command, data } = msg;

    if (command === 'request_state') {
        io.to(SERVICE_ID).emit('status', 'READY');
    } else if (command === 'fb_update_translation') {
        sessionState.translationSettings = {
            autoTranslateIncoming: data.autoTranslateIncoming,
            targetLang: data.targetLang
        };
        log(`Updated Translation Settings: ${JSON.stringify(sessionState.translationSettings)}`);
    } else if (command === 'fb_input_event') {
        if (!sessionState.page) return;
        const { type, x, y, text, key, delta } = data;
        try {
            if (type === 'click') {
                await sessionState.page.mouse.click(x, y);
            } else if (type === 'type') {
                await sessionState.page.keyboard.type(text);
            } else if (type === 'key') {
                await sessionState.page.keyboard.press(key);
            } else if (type === 'scroll') {
                await sessionState.page.evaluate((d) => window.scrollBy(0, d), delta);
            }
        } catch (e) { 
            log('Input error: ' + e); 
        }
    }
});

server.listen(PORT, () => {
    log(`Remote worker started on port ${PORT} for ${SERVICE_TYPE}`);
    initRemote();
});
