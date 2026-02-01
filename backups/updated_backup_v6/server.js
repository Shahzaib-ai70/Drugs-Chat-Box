import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { spawn, fork } from 'child_process';
import http from 'http';
import { Server } from 'socket.io'; // For admin/global events if needed
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB to handle large image/media uploads
}); // Main socket for global events (optional)

const PORT = process.env.PORT || 3005;
const BASE_WORKER_PORT = 3006;

// Logging
const log = (msg) => console.log(`[MASTER] ${msg}`);

// Global Error Handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Keep running if possible, but log critical error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Database Setup
let db;
try {
  db = new Database('database.db', { verbose: log });
  db.pragma('journal_mode = WAL');

  // Initialize Tables
  db.exec(`
  CREATE TABLE IF NOT EXISTS user_services (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    custom_name TEXT NOT NULL,
    created_at INTEGER,
    owner_code TEXT,
    port INTEGER
  );
  CREATE TABLE IF NOT EXISTS invitation_codes (
    code TEXT PRIMARY KEY,
    created_at INTEGER,
    status TEXT DEFAULT 'active',
    owner_name TEXT
  );
`);

  // Migration: Add port column if missing
  try {
    const columns = db.prepare('PRAGMA table_info(user_services)').all();
    const hasPort = columns.some(c => c.name === 'port');
    if (!hasPort) {
      log('Migrating DB: Adding port column to user_services');
      db.prepare('ALTER TABLE user_services ADD COLUMN port INTEGER').run();
    }
  } catch (e) {
    log(`Migration Error: ${e.message}`);
  }

  // Migration: Add status column to invitation_codes if missing
  try {
    const columns = db.prepare('PRAGMA table_info(invitation_codes)').all();
    const hasStatus = columns.some(c => c.name === 'status');
    if (!hasStatus) {
      log('Migrating DB: Adding status column to invitation_codes');
      db.prepare("ALTER TABLE invitation_codes ADD COLUMN status TEXT DEFAULT 'active'").run();
    }
  } catch (e) {
    log(`Migration Error invitation_codes: ${e.message}`);
  }
} catch (dbError) {
  console.error('FATAL DATABASE ERROR:', dbError);
  // If DB fails, we can't do much, but we can start a fallback server to report error
}

// Process Manager State
const workers = new Map(); // serviceId -> { process, port, startTime }

// Helper: Get Next Free Port
const getNextFreePort = (start = 3006) => {
  try {
    const usedPorts = db.prepare('SELECT port FROM user_services WHERE port IS NOT NULL').all().map(r => r.port);
    let port = start;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  } catch (e) {
    log('DB Error in getNextFreePort, returning random safe port');
    return Math.floor(Math.random() * 1000) + 3100;
  }
};

// Helper: Spawn Worker
const spawnWorker = (service) => {
    if (workers.has(service.id)) return; // Already running

    let port = service.port;
    if (!port) {
        port = getNextFreePort();
        db.prepare('UPDATE user_services SET port = ? WHERE id = ?').run(port, service.id);
        log(`Assigned new port ${port} to service ${service.id}`);
    }

    const serviceType = service.service_id.startsWith('tg') ? 'telegram' : service.service_id.startsWith('fb') ? 'facebook' : 'whatsapp';
    
    log(`Spawning worker for ${service.custom_name} (${service.id}) on port ${port}`);

    // Use fork for IPC communication
    const workerFile = serviceType === 'facebook' ? 'worker_facebook.js' : 'worker.js';
    const child = fork(workerFile, [], {
        env: { ...process.env, PORT: port, SERVICE_ID: service.id, SERVICE_TYPE: serviceType },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    workers.set(service.id, { process: child, port, startTime: Date.now() });

    // IPC: Listen for events from Worker and relay to Frontend
    child.on('message', (msg) => {
        if (msg.type === 'event') {
            // log(`Relay event ${msg.event} from ${service.id}`);
            io.to(service.id).emit(msg.event, msg.data);
        } else if (msg.type === 'response') {
            const { requestId, data } = msg;
            if (pendingCallbacks.has(requestId)) {
                const callback = pendingCallbacks.get(requestId);
                callback(data);
                pendingCallbacks.delete(requestId);
            }
        }
    });

    child.on('exit', (code) => {
        log(`Worker ${service.id} exited with code ${code}`);
        workers.delete(service.id);
        // Auto-restart? Yes, for resilience
        setTimeout(() => spawnWorker(service), 5000);
    });
};

// Startup: Restore all services
try {
    const services = db.prepare('SELECT * FROM user_services').all();
    services.forEach((s, i) => {
        // Stagger startup
        setTimeout(() => {
            try {
                spawnWorker(s);
            } catch (e) {
                log(`Failed to restore service ${s.id}: ${e.message}`);
            }
        }, i * 2000);
    });
} catch (e) {
    log(`Startup Error: ${e.message}`);
}

// --- APIs ---

// List Services (Public - filtered by owner)
// STRICTLY require owner_code to prevent data leaks
app.get('/api/services', (req, res) => {
    const ownerCode = req.query.owner_code || req.query.code; // Support both for safety
    
    if (!ownerCode) {
        return res.json([]); // Return empty if no code provided
    }

    const list = db.prepare('SELECT * FROM user_services WHERE owner_code = ?').all(ownerCode);
    
    res.json(list.map(s => ({
        ...s,
        port: s.port || workers.get(s.id)?.port // Return port so frontend can connect
    })));
});

// Create Service
app.post('/api/create_service', (req, res) => {
    const { customName, serviceType, ownerCode } = req.body; // serviceType: 'whatsapp' or 'telegram'
    const id = (Date.now()).toString(36) + Math.random().toString(36).substr(2);
    // Fix: Check if serviceType starts with 'tg' to support tg1, tg2, etc.
    let serviceId = id;
    if (serviceType === 'telegram' || (serviceType && serviceType.startsWith('tg'))) {
        serviceId = `tg_${id}`;
    } else if (serviceType === 'facebook' || (serviceType && serviceType.startsWith('fb'))) {
        serviceId = `fb_${id}`;
    }

    try {
        const port = getNextFreePort();
        db.prepare('INSERT INTO user_services (id, service_id, custom_name, created_at, owner_code, port) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, serviceId, customName, Date.now(), ownerCode || 'default', port);
        
        const newService = { id, service_id: serviceId, custom_name: customName, port };
        spawnWorker(newService);
        
        res.json({ success: true, service: newService });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete Service
app.post('/api/delete_service', (req, res) => {
    const { id } = req.body;
    try {
        const worker = workers.get(id);
        if (worker) {
            worker.process.kill();
            workers.delete(id);
        }
        db.prepare('DELETE FROM user_services WHERE id = ?').run(id);
        // Also delete session files
        // fs.rmSync(`.wwebjs_auth/session-${id}`, { recursive: true, force: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin APIs (Simplified)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') res.json({ success: true, token: 'admin-token' });
    else res.status(401).json({ success: false, error: 'Invalid credentials' });
});

app.get('/api/admin/users', (req, res) => {
    const codes = db.prepare('SELECT * FROM invitation_codes').all();
    // Add service count for each code
    const usersWithCounts = codes.map(c => {
        const count = db.prepare('SELECT COUNT(*) as count FROM user_services WHERE owner_code = ?').get(c.code).count;
        return { ...c, serviceCount: count };
    });
    res.json(usersWithCounts);
});

app.post('/api/admin/generate-code', (req, res) => {
    const { ownerName, customCode } = req.body;
    let code = customCode ? customCode.trim() : null;

    if (code) {
        // Check for duplicate
        try {
            const existing = db.prepare('SELECT code FROM invitation_codes WHERE code = ?').get(code);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Code already exists' });
            }
        } catch (e) {
             return res.status(500).json({ success: false, error: 'Database error checking duplicate' });
        }
    } else {
        // Generate random if no custom code
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    try {
        // Explicitly set status to active
        db.prepare('INSERT INTO invitation_codes (code, created_at, owner_name, status) VALUES (?, ?, ?, ?)').run(code, Date.now(), ownerName, 'active');
        res.json({ success: true, code });
    } catch (e) {
        console.error('Error generating code:', e);
        // If column status missing, try without it (fallback for old DBs if migration failed)
        try {
             db.prepare('INSERT INTO invitation_codes (code, created_at, owner_name) VALUES (?, ?, ?)').run(code, Date.now(), ownerName);
             res.json({ success: true, code });
        } catch (retryError) {
             res.status(500).json({ success: false, error: 'Database error' });
        }
    }
});

app.delete('/api/admin/code/:code', (req, res) => {
    const { code } = req.params;
    try {
        db.prepare('DELETE FROM invitation_codes WHERE code = ?').run(code);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.put('/api/admin/code/:code', (req, res) => {
    const { code } = req.params;
    const { ownerName } = req.body;
    try {
        db.prepare('UPDATE invitation_codes SET owner_name = ? WHERE code = ?').run(ownerName, code);
        res.json({ success: true });
    } catch (e) {
         res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/verify-code', (req, res) => {
    let { code } = req.body;
    if (!code) return res.json({ valid: false });
    
    code = code.trim(); // Remove any whitespace
    
    if (!db) return res.status(500).json({ valid: false, error: 'Database not initialized' });
    
    try {
        console.log(`Verifying code: '${code}'`); // Debug log
        
        // First try with status check (Use single quotes for SQL string literal)
        const found = db.prepare("SELECT * FROM invitation_codes WHERE code = ? AND status = 'active'").get(code);
        if (found) return res.json({ valid: true, owner: found.owner_name });
        
        // If not found, check if it exists but status is missing (fallback)
        const anyFound = db.prepare('SELECT * FROM invitation_codes WHERE code = ?').get(code);
        if (anyFound) {
             console.log(`Found code '${code}' but status check failed. Status: ${anyFound.status}`);
             // If status is present but didn't match 'active', it might be case sensitivity or whitespace
             // For now, if it's 'active' (case insensitive) or null, allow it
             const status = anyFound.status;
             if (!status || status.toLowerCase() === 'active') {
                 return res.json({ valid: true, owner: anyFound.owner_name });
             }
        }

        res.json({ valid: false });
    } catch (e) {
        console.error('Verify Code Error:', e);
        // Fallback: if 'no such column status' error, try query without status
        if (e.message.includes('no such column: status')) {
             try {
                const foundOld = db.prepare('SELECT * FROM invitation_codes WHERE code = ?').get(code);
                if (foundOld) return res.json({ valid: true, owner: foundOld.owner_name });
             } catch (e2) {
                 return res.status(500).json({ valid: false, error: 'Database Error' });
             }
        }
        res.status(500).json({ valid: false, error: 'Internal Server Error' });
    }
});

const translate = require('translate-google');

// Translation Endpoint
app.post('/api/translate', async (req, res) => {
    let { text, targetLang } = req.body;
    if (!text) return res.json({ translatedText: '' });

    // Map 'he' to 'iw' for Google Translate compatibility
    if (targetLang === 'he') targetLang = 'iw';
    
    try {
        const translated = await translate(text, { to: targetLang || 'en' });
        res.json({ translatedText: translated });
    } catch (e) {
        console.error('Translation Error:', e);
        // Fallback to original text if API fails (instead of sending [Failed]...)
        res.json({ translatedText: text, error: true });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Serve Static Frontend (Vite Build)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA Fallback: Serve index.html for any unknown routes
  // Note: Express 5 requires a RegExp for catch-all if * is not supported by the parser
  app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  log('WARNING: dist folder not found. Running in API-only mode or Build Failed.');
  app.get('/', (req, res) => {
      res.status(200).send('<h1>Server is Running</h1><p>Frontend build is missing. Please run build.</p>');
  });
}

const pendingCallbacks = new Map();

// Socket.IO Gateway Logic
io.on('connection', (socket) => {
    log(`Client connected to Master Gateway: ${socket.id}`);

    socket.on('join_service', (data) => {
        // Support both simple ID (string) and object with options
        const serviceId = typeof data === 'object' ? data.serviceId : data;
        const isPassive = typeof data === 'object' ? data.passive : false;

        log(`Socket ${socket.id} joining service ${serviceId} (passive: ${isPassive})`);
        socket.join(serviceId);
        
        // Request latest state from worker ONLY if not passive
        // Passive listeners (like Sidebar unread counts) don't need to trigger a full state dump
        // BUT they do need the unread count immediately
        if (!isPassive) {
            const worker = workers.get(serviceId);
            if (worker && worker.process) {
                worker.process.send({ type: 'command', command: 'request_state' });
            }
        } else {
            // Passive mode: Request ONLY unread count
            const worker = workers.get(serviceId);
            if (worker && worker.process) {
                worker.process.send({ type: 'command', command: 'request_unread' });
            }
        }
    });

    socket.on('sendMessage', (data, callback) => {
        const { serviceId } = data;
        const worker = workers.get(serviceId);
        if (worker && worker.process) {
            const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            if (typeof callback === 'function') {
                pendingCallbacks.set(requestId, callback);
                // Set timeout to clear callback if no response
                setTimeout(() => {
                    if (pendingCallbacks.has(requestId)) {
                        pendingCallbacks.delete(requestId);
                        callback({ status: 'error', error: 'Timeout' });
                    }
                }, 30000);
            }
            worker.process.send({ type: 'command', command: 'sendMessage', data, requestId });
        } else {
            if (typeof callback === 'function') callback({ status: 'error', error: 'Service not running' });
            else socket.emit('error', 'Service not running');
        }
    });

    socket.on('mark_read', (data) => {
        const { serviceId } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'mark_read', data });
    });

    socket.on('get_chat_history', (data) => {
        const { serviceId } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'get_chat_history', data });
    });

    socket.on('force_sync_chats', (serviceId) => {
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'force_sync_chats' });
    });

    socket.on('tg_password', (data) => {
        const { serviceId, password } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'tg_password', data: password });
    });

    socket.on('download_media', (data) => {
        const { serviceId } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'download_media', data });
    });

    socket.on('fb_login_submit', (data) => {
        const { serviceId, email, password } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'fb_login_submit', data: { email, password } });
    });

    socket.on('fb_input_event', (data) => {
        const { serviceId, event } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'fb_input_event', data: event });
    });

    socket.on('fb_update_translation', (data) => {
        // data contains autoTranslateIncoming, targetLang, and implicitly the socket context but we need serviceId
        // The socket is joined to rooms, but for this specific event we need to know WHICH service.
        // Usually the client emits serviceId with the event.
        // Update RemoteBrowserView to send serviceId in the payload.
    });

    // Better implementation: Update the event listener to expect serviceId
    socket.on('fb_update_translation', (data) => {
        const { serviceId, ...settings } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'fb_update_translation', data: settings });
    });

    socket.on('fb_2fa_submit', (data) => {
        const { serviceId, code } = data;
        const worker = workers.get(serviceId);
        if (worker) worker.process.send({ type: 'command', command: 'fb_2fa_submit', data: { code } });
    });
});

server.listen(PORT, () => {
    log(`Master Server running on port ${PORT}`);
});
