// server.js - AuthAPI v3.3 ULTIMATE - No Email Validation
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();

/* ================= ERROR HANDLING ================= */
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err.stack);
  res.status(500).json({
    success: false, 
    message: 'Internal Server Error', 
    error_code: 'SERVER_ERROR'
  });
});

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ================= CONSTANTS ================= */
const PORT = process.env.PORT || 10000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'keys.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');
const PACKAGES_FILE = path.join(DATA_DIR, 'packages.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const JWT_SECRET = process.env.JWT_SECRET || 'please-change-jwt-secret-2025';
const HMAC_SECRET = process.env.HMAC_SECRET || 'please-change-hmac-secret-2025';
const OPENAI_KEY = process.env.OPENAI_KEY || '';

const MAX_ACCOUNTS_PER_DEVICE = 3;
const FREE_USER_KEY_LIMIT = 10;
const AI_DAILY_LIMIT = 100;
const AI_RATE_LIMIT = 3000; // 3 seconds
const REQUEST_TIMEOUT = 30000; // 30 seconds

/* ================= BACKUP SYSTEM ================= */
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Created backup directory');
}

function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = path.join(BACKUP_DIR, timestamp);
    
    if (!fs.existsSync(backupSubDir)) {
      fs.mkdirSync(backupSubDir, { recursive: true });
    }

    const filesToBackup = [DATA_FILE, USERS_FILE, CONFIG_FILE, DEVICES_FILE, LOGS_FILE, PACKAGES_FILE];
    
    filesToBackup.forEach(file => {
      if (fs.existsSync(file)) {
        const filename = path.basename(file);
        const backupPath = path.join(backupSubDir, filename);
        fs.copyFileSync(file, backupPath);
      }
    });

    console.log(`✅ Backup created: ${timestamp}`);
    cleanOldBackups();
  } catch(err) {
    console.error('❌ Backup error:', err);
  }
}

function cleanOldBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR);
    const now = new Date();
    
    backups.forEach(backup => {
      const backupPath = path.join(BACKUP_DIR, backup);
      const stats = fs.statSync(backupPath);
      const daysDiff = (now - stats.mtime) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        fs.rmSync(backupPath, { recursive: true, force: true });
        console.log(`🗑️ Deleted old backup: ${backup}`);
      }
    });
  } catch(err) {
    console.error('❌ Clean backup error:', err);
  }
}

// Auto backup every 6 hours
setInterval(createBackup, 6 * 60 * 60 * 1000);

/* ================= AUTO DELETE EXPIRED KEYS ================= */
function autoDeleteExpiredKeys() {
  try {
    const keys = loadKeys();
    const now = new Date();
    let deletedCount = 0;
    
    const filteredKeys = keys.filter(k => {
      if (k.auto_delete && new Date(k.expires_at) <= now) {
        console.log(`🗑️ Auto-deleted expired key: ${k.key_code}`);
        deletedCount++;
        return false;
      }
      return true;
    });
    
    if (deletedCount > 0) {
      saveKeys(filteredKeys);
      console.log(`✅ Auto-deleted ${deletedCount} expired keys`);
    }
  } catch(err) {
    console.error('❌ Auto-delete error:', err);
  }
}

setInterval(autoDeleteExpiredKeys, 60 * 60 * 1000);
autoDeleteExpiredKeys();

/* ================= SAFE FILE OPERATIONS ================= */
function safeLoadJSON(file, defaultValue = []) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch(err) {
    console.error(`❌ Error loading ${file}:`, err);
    return defaultValue;
  }
}

function safeSaveJSON(file, data) {
  try {
    const tempFile = file + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, file);
    return true;
  } catch(err) {
    console.error(`❌ Error saving ${file}:`, err);
    return false;
  }
}

/* ================= INIT FILES ================= */
if (!fs.existsSync(DATA_FILE)) {
  safeSaveJSON(DATA_FILE, []);
  console.log('✅ Initialized keys.json');
}

if (!fs.existsSync(USERS_FILE)) {
  safeSaveJSON(USERS_FILE, []);
  console.log('✅ Initialized users.json');
}

if (!fs.existsSync(DEVICES_FILE)) {
  safeSaveJSON(DEVICES_FILE, []);
  console.log('✅ Initialized devices.json');
}

if (!fs.existsSync(LOGS_FILE)) {
  safeSaveJSON(LOGS_FILE, []);
  console.log('✅ Initialized activity_logs.json');
}

if (!fs.existsSync(PACKAGES_FILE)) {
  safeSaveJSON(PACKAGES_FILE, []);
  console.log('✅ Initialized packages.json');
}

if (!fs.existsSync(CONFIG_FILE)) {
  const adminPassword = process.env.ADMIN_PASSWORD || '1';
  const hash = bcrypt.hashSync(adminPassword, 10);
  const cfg = {
    admin: {
      username: 'admin',
      passwordHash: hash
    },
    contact: {
      admin_profile: 'https://www.facebook.com/duc.pham.396384',
      telegram: '@phamcduc0',
      email: 'monhpham15@gmail.com'
    },
    settings: {
      maintenance_mode: false,
      registration_enabled: true,
      max_key_days: 365,
      enable_email_verification: false,
      free_user_key_limit: 10,
      ai_daily_limit: 100,
      ai_rate_limit_ms: 3000
    },
    premium_users: []
  };
  safeSaveJSON(CONFIG_FILE, cfg);
  console.log('✅ Initialized config.json');
}

/* ================= HELPERS ================= */
function loadKeys() {
  return safeLoadJSON(DATA_FILE, []);
}

function saveKeys(keys) {
  return safeSaveJSON(DATA_FILE, keys);
}

function loadUsers() {
  return safeLoadJSON(USERS_FILE, []);
}

function saveUsers(users) {
  return safeSaveJSON(USERS_FILE, users);
}

function loadDevices() {
  return safeLoadJSON(DEVICES_FILE, []);
}

function saveDevices(devices) {
  return safeSaveJSON(DEVICES_FILE, devices);
}

function loadConfig() {
  return safeLoadJSON(CONFIG_FILE, {
    admin: { username: 'admin', passwordHash: '' },
    contact: {},
    settings: {},
    premium_users: []
  });
}

function saveConfig(config) {
  return safeSaveJSON(CONFIG_FILE, config);
}

function loadLogs() {
  return safeLoadJSON(LOGS_FILE, []);
}

function saveLogs(logs) {
  return safeSaveJSON(LOGS_FILE, logs);
}

function loadPackages() {
  return safeLoadJSON(PACKAGES_FILE, []);
}

function savePackages(packages) {
  return safeSaveJSON(PACKAGES_FILE, packages);
}

/* ================= ACTIVITY LOGGING ================= */
function logActivity(action, userId, username, details = {}) {
  try {
    const logs = loadLogs();
    const log = {
      id: uuidv4(),
      action,
      userId,
      username,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown'
    };
    
    logs.push(log);
    
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    saveLogs(logs);
  } catch(err) {
    console.error('❌ Log error:', err);
  }
}

function signValue(val) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(val).digest('hex');
}

function getFullDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function randomChunk(len) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

function generateKey(type = "KEY") {
  const prefix = type;
  return `${prefix}-${randomChunk(6)}-${randomChunk(4)}`;
}

function generateAPICode() {
  return `API-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
}

function generateDeviceId(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  const combined = `${userAgent}-${ip}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

function isPremiumUser(userId) {
  const cfg = loadConfig();
  return cfg.premium_users && cfg.premium_users.includes(userId);
}

function checkApiCodeRequired(req, res, next) {
  if (req.user && !isPremiumUser(req.user.userId) && req.user.role !== 'admin') {
    const apiCode = req.body?.api_code || req.headers['x-api-code'];
    if (!apiCode) {
      return res.status(403).json({ 
        success: false, 
        message: 'API Code required for free users',
        error_code: 'API_CODE_REQUIRED'
      });
    }
  }
  next();
}

/* ================= AUTH MIDDLEWARE ================= */
function requireAdmin(req, res, next) {
  try {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    const parts = auth.split(' ');
    if (parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid token' });

    const payload = jwt.verify(parts[1], JWT_SECRET);
    if (payload.role === 'admin') {
      req.user = payload;
      return next();
    }
    return res.status(403).json({ error: 'Admin access required' });
  } catch(err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Token invalid' });
  }
}

function requireAuth(req, res, next) {
  try {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    const parts = auth.split(' ');
    if (parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid token' });

    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    return next();
  } catch(err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Token invalid' });
  }
}

/* ================= MAINTENANCE MODE ================= */
function checkMaintenance(req, res, next) {
  const config = loadConfig();
  if (config.settings?.maintenance_mode && !req.path.includes('/admin')) {
    return res.status(503).json({
      success: false,
      message: '🔧 Hệ thống đang bảo trì. Vui lòng quay lại sau.',
      error_code: 'MAINTENANCE_MODE'
    });
  }
  next();
}

app.use(checkMaintenance);

/* ================= ADMIN LOGIN ================= */
app.post('/api/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const cfg = loadConfig();

    if (username !== cfg.admin.username) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, cfg.admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: 'admin', username: cfg.admin.username, role: 'admin', iat: Date.now() },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    logActivity('admin_login', 'admin', 'admin', { ip: req.ip });

    res.json({ success: true, token, role: 'admin' });
  } catch(err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= USER REGISTRATION (NO EMAIL VALIDATION) ================= */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    
    const config = loadConfig();
    if (!config.settings?.registration_enabled) {
      return res.status(403).json({ 
        success: false, 
        message: 'Đăng ký tạm thời bị tắt. Liên hệ admin.' 
      });
    }

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username tối thiểu 3 ký tự, mật khẩu tối thiểu 6 ký tự' 
      });
    }

    const deviceId = generateDeviceId(req);
    const devices = loadDevices();
    const deviceRecord = devices.find(d => d.device_id === deviceId);
    
    if (deviceRecord && deviceRecord.accounts.length >= MAX_ACCOUNTS_PER_DEVICE) {
      return res.status(403).json({ 
        success: false, 
        message: `Thiết bị này đã đăng ký tối đa ${MAX_ACCOUNTS_PER_DEVICE} tài khoản.` 
      });
    }

    const users = loadUsers();
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiCode = generateAPICode();
    
    const newUser = {
      id: uuidv4(),
      username,
      email,
      passwordHash: hashedPassword,
      role: 'user',
      isActive: true,
      isBanned: false,
      createdAt: getFullDateTime(),
      keyCount: 0,
      lastLogin: null,
      apiCode: apiCode,
      deviceId: deviceId,
      totalKeysCreated: 0,
      totalVerifications: 0,
      emailVerified: false
    };

    users.push(newUser);
    saveUsers(users);

    if (deviceRecord) {
      deviceRecord.accounts.push(newUser.id);
    } else {
      devices.push({
        device_id: deviceId,
        accounts: [newUser.id],
        created_at: getFullDateTime()
      });
    }
    saveDevices(devices);

    logActivity('register', newUser.id, username, { email, ip: req.ip });

    res.json({ 
      success: true, 
      message: 'Đăng ký thành công!',
      apiCode: apiCode
    });
  } catch(err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= USER LOGIN ================= */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const users = loadUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản đã bị khóa.' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản đã bị tạm khóa.' 
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    user.lastLogin = getFullDateTime();
    saveUsers(users);

    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username, 
        role: user.role,
        iat: Date.now() 
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    logActivity('login', user.id, username, { ip: req.ip });

    res.json({ 
      success: true, 
      token,
      user: {
        username: user.username,
        email: user.email,
        keyCount: user.keyCount,
        apiCode: user.apiCode
      }
    });
  } catch(err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= CREATE KEY ================= */
app.post('/api/create-key', requireAuth, (req, res) => {
  try {
    const { days, devices, type, customKey, autoDelete, name } = req.body || {};
    
    if (!days || !devices) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const config = loadConfig();
    const maxDays = config.settings?.max_key_days || 365;
    
    if (days > maxDays && req.user.role !== 'admin') {
      return res.status(400).json({ 
        success: false, 
        message: `Thời hạn tối đa ${maxDays} ngày` 
      });
    }

    const users = loadUsers();
    const user = users.find(u => u.id === req.user.userId);

    if (req.user.role !== 'admin') {
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      if (user.isBanned || !user.isActive) {
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
      }
    }

    let keyCode;
    
    if (customKey && customKey.trim()) {
      keyCode = customKey.trim();
      const keys = loadKeys();
      if (keys.find(k => k.key_code === keyCode)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Key code đã tồn tại. Vui lòng chọn mã khác.' 
        });
      }
    } else {
      keyCode = generateKey(type || "KEY");
    }

    const createdAt = getFullDateTime();
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const signature = signValue(keyCode);

    const keys = loadKeys();
    const record = {
      id: uuidv4(),
      key_code: keyCode,
      type: type || "KEY",
      signature,
      created_at: createdAt,
      expires_at: expiresAt,
      allowed_devices: Number(devices),
      devices: [],
      owner_id: req.user.role === 'admin' ? 'admin' : user.id,
      owner_username: req.user.role === 'admin' ? 'admin' : user.username,
      require_api_key: false,
      total_verifications: 0,
      last_verified: null,
      is_custom: !!customKey,
      auto_delete: autoDelete || false,
      alias_name: name ? String(name).trim() : null
    };

    keys.push(record);
    saveKeys(keys);

    if (req.user.role !== 'admin' && user) {
      user.keyCount++;
      user.totalKeysCreated = (user.totalKeysCreated || 0) + 1;
      saveUsers(users);
    }

    logActivity('create_key', req.user.userId, req.user.username, { 
      keyCode, 
      type, 
      days, 
      devices,
      custom: !!customKey,
      autoDelete: autoDelete || false,
      name: name || null
    });

    res.json({ 
      success: true, 
      message: 'Tạo key thành công',
      key: record
    });
  } catch(err) {
    console.error('Create key error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= BULK CREATE KEYS ================= */
app.post('/api/bulk-create-keys', requireAuth, (req, res) => {
  try {
    const { count, days, devices, type, autoDelete, name } = req.body || {};
    
    if (!count || !days || !devices || count < 1 || count > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số lượng phải từ 1-100' 
      });
    }

    const users = loadUsers();
    const user = users.find(u => u.id === req.user.userId);

    if (req.user.role !== 'admin') {
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
    }

    const keys = loadKeys();
    const createdKeys = [];

    for (let i = 0; i < count; i++) {
      const keyCode = generateKey(type || "KEY");
      const createdAt = getFullDateTime();
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      const signature = signValue(keyCode);

      const record = {
        id: uuidv4(),
        key_code: keyCode,
        type: type || "KEY",
        signature,
        created_at: createdAt,
        expires_at: expiresAt,
        allowed_devices: Number(devices),
        devices: [],
        owner_id: req.user.role === 'admin' ? 'admin' : user.id,
        owner_username: req.user.role === 'admin' ? 'admin' : user.username,
        require_api_key: false,
        total_verifications: 0,
        last_verified: null,
        auto_delete: autoDelete || false,
        alias_name: name ? String(name).trim() : null
      };

      keys.push(record);
      createdKeys.push(record);
    }

    saveKeys(keys);

    if (req.user.role !== 'admin' && user) {
      user.keyCount += count;
      user.totalKeysCreated = (user.totalKeysCreated || 0) + count;
      saveUsers(users);
    }

    logActivity('bulk_create_keys', req.user.userId, req.user.username, { 
      count, 
      type, 
      days, 
      devices,
      autoDelete: autoDelete || false,
      name: name || null
    });

    res.json({ 
      success: true, 
      message: `Tạo thành công ${count} keys`, 
      keys: createdKeys 
    });
  } catch(err) {
    console.error('Bulk create error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= LIST USER KEYS ================= */
app.get('/api/my-keys', requireAuth, (req, res) => {
  try {
    const keys = loadKeys();
    const userKeys = keys.filter(k => k.owner_id === req.user.userId)
      .map(k => ({
        key_code: k.key_code,
        type: k.type,
        alias: k.alias_name || 'N/A',
        created_at: k.created_at,
        expires_at: k.expires_at,
        is_expired: new Date(k.expires_at) < new Date(),
        devices_used: k.devices.length,
        devices_allowed: k.allowed_devices,
        total_verifications: k.total_verifications || 0,
        is_custom: k.is_custom || false
      }));
    res.json({ 
      success: true, 
      count: userKeys.length, 
      keys: userKeys 
    });
  } catch(err) {
    console.error('List keys error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= LIST ALL KEYS (ADMIN) ================= */
app.get('/api/list-keys', requireAdmin, (req, res) => {
  try {
    res.json(loadKeys());
  } catch(err) {
    console.error('List all keys error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= VERIFY KEY ================= */
app.post('/api/verify-key', (req, res) => {
  try {
    const { key, device_id, api_code } = req.body || {};
    
    if (!key || !device_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu key hoặc device_id',
        error_code: 'MISSING_PARAMS'
      });
    }

    const keys = loadKeys();
    const found = keys.find(k => k.key_code === key);
    
    if (!found) {
      return res.status(404).json({ 
        success: false, 
        message: 'Key không tồn tại',
        error_code: 'KEY_NOT_FOUND'
      });
    }

    const expectedSig = signValue(found.key_code);
    if (expectedSig !== found.signature) {
      return res.status(500).json({ 
        success: false, 
        message: 'Chữ ký không khớp',
        error_code: 'SIGNATURE_MISMATCH'
      });
    }

    if (new Date(found.expires_at) < new Date()) {
      return res.json({ 
        success: false, 
        message: 'Key đã hết hạn',
        error_code: 'KEY_EXPIRED',
        expired_at: found.expires_at
      });
    }

    if (!found.devices.includes(device_id)) {
      if (found.devices.length >= found.allowed_devices) {
        return res.json({ 
          success: false, 
          message: 'Đã đạt giới hạn thiết bị',
          error_code: 'DEVICE_LIMIT_REACHED',
          devices_used: found.devices.length,
          devices_allowed: found.allowed_devices
        });
      }

      found.devices.push(device_id);
    }

    found.total_verifications = (found.total_verifications || 0) + 1;
    found.last_verified = getFullDateTime();
    saveKeys(keys);

    res.json({ 
      success: true, 
      message: 'Xác thực thành công', 
      type: found.type,
      expires_at: found.expires_at,
      devices_remaining: found.allowed_devices - found.devices.length,
      alias: found.alias_name || 'N/A'
    });
  } catch(err) {
    console.error('Verify error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error_code: 'SERVER_ERROR'
    });
  }
});

/* ================= KEY INFO ================= */
app.post('/api/key-info', (req, res) => {
  try {
    const { key } = req.body || {};
    
    if (!key) {
      return res.status(400).json({ success: false, message: 'Thiếu key' });
    }

    const keys = loadKeys();
    const found = keys.find(k => k.key_code === key);
    
    if (!found) {
      return res.status(404).json({ success: false, message: 'Key không tồn tại' });
    }

    const now = new Date();
    const expiresAt = new Date(found.expires_at);
    const isExpired = expiresAt < now;
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      info: {
        type: found.type,
        created_at: found.created_at,
        expires_at: found.expires_at,
        is_expired: isExpired,
        days_remaining: isExpired ? 0 : daysRemaining,
        devices_used: found.devices.length,
        devices_allowed: found.allowed_devices,
        require_api_key: found.require_api_key,
        total_verifications: found.total_verifications || 0,
        last_verified: found.last_verified || 'Never',
        is_custom: found.is_custom || false,
        alias_name: found.alias_name || null
      }
    });
  } catch(err) {
    console.error('Key info error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= ADMIN: USER MANAGEMENT ================= */
app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = loadUsers().map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isBanned: u.isBanned,
      keyCount: u.keyCount,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      apiCode: u.apiCode,
      totalKeysCreated: u.totalKeysCreated || 0,
      totalVerifications: u.totalVerifications || 0
    }));
    res.json(users);
  } catch(err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/admin/ban-user', requireAdmin, (req, res) => {
  try {
    const { userId } = req.body || {};
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    user.isBanned = true;
    saveUsers(users);

    logActivity('ban_user', 'admin', 'admin', { targetUser: user.username });
    
    res.json({ success: true, message: 'Đã ban user' });
  } catch(err) {
    console.error('Ban user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/admin/unban-user', requireAdmin, (req, res) => {
  try {
    const { userId } = req.body || {};
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    user.isBanned = false;
    saveUsers(users);

    logActivity('unban_user', 'admin', 'admin', { targetUser: user.username });
    
    res.json({ success: true, message: 'Đã unban user' });
  } catch(err) {
    console.error('Unban user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/admin/delete-user', requireAdmin, (req, res) => {
  try {
    const { userId } = req.body || {};
    
    let users = loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    let keys = loadKeys();
    keys = keys.filter(k => k.owner_id !== userId);
    saveKeys(keys);

    users = users.filter(u => u.id !== userId);
    saveUsers(users);

    logActivity('delete_user', 'admin', 'admin', { targetUser: user.username });
    
    res.json({ success: true, message: 'Đã xóa user và tất cả key của họ' });
  } catch(err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= ADMIN: SETTINGS ================= */
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const config = loadConfig();
    res.json(config.settings || {});
  } catch(err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const config = loadConfig();
    config.settings = { ...config.settings, ...req.body };
    saveConfig(config);

    logActivity('update_settings', 'admin', 'admin', req.body);

    res.json({ success: true, message: 'Cập nhật settings thành công' });
  } catch(err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= ADMIN: LOGS ================= */
app.get('/api/admin/logs', requireAdmin, (req, res) => {
  try {
    const logs = loadLogs();
    const limit = parseInt(req.query.limit) || 100;
    res.json(logs.slice(-limit).reverse());
  } catch(err) {
    console.error('Get logs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= ADMIN: BACKUP ================= */
app.post('/api/admin/backup', requireAdmin, (req, res) => {
  try {
    createBackup();
    res.json({ success: true, message: 'Backup thành công' });
  } catch(err) {
    console.error('Backup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= ADMIN: STATS ================= */
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const users = loadUsers();
    const keys = loadKeys();
    const now = new Date();

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive && !u.isBanned).length,
      bannedUsers: users.filter(u => u.isBanned).length,
      totalKeys: keys.length,
      activeKeys: keys.filter(k => new Date(k.expires_at) > now).length,
      expiredKeys: keys.filter(k => new Date(k.expires_at) <= now).length,
      totalVerifications: keys.reduce((sum, k) => sum + (k.total_verifications || 0), 0)
    };

    res.json(stats);
  } catch(err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= SYSTEM CONFIG ================= */
app.get('/api/config', (req, res) => {
  try {
    const configPath = path.join(DATA_DIR, 'CONFIG_v3.5.json');
    
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      res.json(configData);
    } else {
      const configData = {
        name: 'AuthAPI v3.5 ULTIMATE - Anti-Crash + AI Features',
        version: '3.5.0',
        status: 'online',
        maintenance_mode: false,
        api_url: process.env.API_URL || 'https://HIHI.com'
      };
      res.json(configData);
    }
  } catch(err) {
    console.error('Get config error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= ROOT & API INFO ================= */
app.get('/', (req, res) => {
  res.json({ message: 'AuthAPI Server', version: '3.3.0' });
});

app.get('/api', (req, res) => {
  const config = loadConfig();
  res.json({
    name: "AuthAPI v3.3 ULTIMATE",
    version: "3.3.0",
    status: "online",
    features: [
      "✅ Multi-user authentication",
      "✅ Unlimited key creation",
      "✅ Key alias/naming support",
      "💾 Auto backup every 6 hours",
      "📊 Activity logging"
    ]
  });
});

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error_code: 'NOT_FOUND'
  });
});

/* ================= SERVER START ================= */
const server = app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   AuthAPI v3.3 ULTIMATE                          ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log('🔑 Keys: UNLIMITED for all users!!');
  console.log('🎉 Ready for deployment!');
  console.log('═══════════════════════════════════════════════════');
  
  createBackup();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received...');
  createBackup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received...');
  createBackup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
