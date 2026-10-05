const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'iot_super_secret_key_sb_jain_2026';

// Data Directories and Files
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SENSOR_DATA_FILE = path.join(DATA_DIR, 'sensor_data.json');
const DEVICE_STATE_FILE = path.join(DATA_DIR, 'device_state.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initFile(filePath, defaultContent) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
  }
}

initFile(USERS_FILE, []);
initFile(SENSOR_DATA_FILE, []);
initFile(DEVICE_STATE_FILE, {
  led: false,
  lcd: {
    line1: "Simple IoT World",
    line2: "Welcome User"
  },
  lastSeen: null,
  currentReading: {
    temperature: 0,
    humidity: 0,
    timestamp: null
  }
});

// Helper for file read/write
function readJson(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt_iot_2026').digest('hex');
}

// Timezone formatter for Asia/Kolkata (+5:30)
function formatKolkataDateTime(dateObj = new Date()) {
  const d = new Date(dateObj);
  const options = { timeZone: 'Asia/Kolkata' };

  // DD-MM-YYYY
  const parts = new Intl.DateTimeFormat('en-GB', {
    ...options,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(d);

  const day = parts.find(p => p.type === 'day')?.value || '01';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const dateFormatted = `${day}-${month}-${year}`;

  // HH:MM AM/PM
  const timeFormatted = d.toLocaleTimeString('en-US', {
    ...options,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return { timeFormatted, dateFormatted };
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access denied. Please login.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired session.' });
    req.user = user;
    next();
  });
}

// ================= AUTH ROUTES =================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = readJson(USERS_FILE, []);

  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ success: false, message: 'User with this email already exists.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJson(USERS_FILE, users);

  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    success: true,
    message: 'Registration successful!',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = readJson(USERS_FILE, []);
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    success: true,
    message: 'Login successful!',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});

// ================= IOT SENSOR DATA ROUTES =================

// Endpoint for ESP8266 or Web App to post temperature & humidity
app.post('/api/iot/data', (req, res) => {
  let { temperature, humidity } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ success: false, message: 'Missing temperature or humidity values.' });
  }

  const tempVal = parseFloat(temperature);
  const humVal = parseFloat(humidity);

  if (isNaN(tempVal) || isNaN(humVal)) {
    return res.status(400).json({ success: false, message: 'Invalid temperature or humidity numeric values.' });
  }

  const now = new Date();
  const { timeFormatted, dateFormatted } = formatKolkataDateTime(now);

  const records = readJson(SENSOR_DATA_FILE, []);
  const newRecord = {
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    temperature: tempVal,
    humidity: humVal,
    timestamp: now.getTime(),
    time: timeFormatted,
    date: dateFormatted
  };

  // Add new record at front (newest first)
  records.unshift(newRecord);

  // Keep last 1000 records to prevent excessive memory usage
  if (records.length > 1000) {
    records.length = 1000;
  }
  writeJson(SENSOR_DATA_FILE, records);

  // Update device state and heartbeat
  const deviceState = readJson(DEVICE_STATE_FILE, {});
  deviceState.lastSeen = Date.now();
  deviceState.currentReading = {
    temperature: tempVal,
    humidity: humVal,
    timestamp: now.getTime(),
    time: timeFormatted,
    date: dateFormatted
  };
  writeJson(DEVICE_STATE_FILE, deviceState);

  return res.json({
    success: true,
    message: 'Data recorded successfully',
    record: newRecord
  });
});

// Endpoint to fetch saved records with pagination
app.get('/api/iot/data', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const records = readJson(SENSOR_DATA_FILE, []);
  const deviceState = readJson(DEVICE_STATE_FILE, {});

  const total = records.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedRecords = records.slice(startIndex, startIndex + limit);

  return res.json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    records: paginatedRecords,
    currentReading: deviceState.currentReading || (records[0] || null),
    graphData: records.slice(0, 30).reverse() // Last 30 points in chronological order for graph
  });
});

// Endpoint to delete a specific record
app.delete('/api/iot/data/:id', (req, res) => {
  const { id } = req.params;
  let records = readJson(SENSOR_DATA_FILE, []);
  const initialLength = records.length;
  records = records.filter(r => r.id !== id);

  if (records.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  writeJson(SENSOR_DATA_FILE, records);
  return res.json({ success: true, message: 'Record deleted successfully' });
});

// Endpoint to clear all records
app.delete('/api/iot/data', (req, res) => {
  writeJson(SENSOR_DATA_FILE, []);
  return res.json({ success: true, message: 'All sensor records cleared.' });
});

// ================= IOT DEVICE CONTROL ROUTES =================

// Endpoint for Web Dashboard to get device status (Online/Offline, LED, LCD, Current Readings)
app.get('/api/iot/status', (req, res) => {
  const deviceState = readJson(DEVICE_STATE_FILE, {});
  const now = Date.now();
  // If heartbeat received within last 25 seconds, device is ONLINE
  const isOnline = !!(deviceState.lastSeen && (now - deviceState.lastSeen < 25000));

  return res.json({
    success: true,
    isOnline,
    lastSeen: deviceState.lastSeen,
    led: deviceState.led ?? false,
    lcd: deviceState.lcd || { line1: "Simple IoT World", line2: "Welcome User" },
    currentReading: deviceState.currentReading || { temperature: 0, humidity: 0 }
  });
});

// Dedicated lightweight endpoint for ESP8266 to fetch control data & send heartbeat
app.get('/api/iot/control', (req, res) => {
  const deviceState = readJson(DEVICE_STATE_FILE, {});
  deviceState.lastSeen = Date.now();
  writeJson(DEVICE_STATE_FILE, deviceState);

  return res.json({
    led: deviceState.led ?? false,
    line1: (deviceState.lcd && deviceState.lcd.line1) ? deviceState.lcd.line1.substring(0, 16) : "Simple IoT World",
    line2: (deviceState.lcd && deviceState.lcd.line2) ? deviceState.lcd.line2.substring(0, 16) : "Welcome"
  });
});

// Endpoint to update LCD Text (Tab 2)
app.post('/api/iot/lcd', (req, res) => {
  let { line1, line2 } = req.body;
  line1 = (line1 !== undefined ? String(line1) : "").substring(0, 16);
  line2 = (line2 !== undefined ? String(line2) : "").substring(0, 16);

  const deviceState = readJson(DEVICE_STATE_FILE, {});
  deviceState.lcd = { line1, line2 };
  writeJson(DEVICE_STATE_FILE, deviceState);

  return res.json({
    success: true,
    message: 'LCD display updated successfully!',
    lcd: deviceState.lcd
  });
});

// Endpoint to toggle LED state (Tab 3)
app.post('/api/iot/led', (req, res) => {
  const { status } = req.body;
  if (typeof status !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Status must be a boolean (true/false).' });
  }

  const deviceState = readJson(DEVICE_STATE_FILE, {});
  deviceState.led = status;
  writeJson(DEVICE_STATE_FILE, deviceState);

  return res.json({
    success: true,
    message: `LED turned ${status ? 'ON' : 'OFF'} successfully!`,
    led: deviceState.led
  });
});

// Simulation endpoint (allows manual testing in web browser without physical ESP8266)
app.post('/api/iot/simulate', (req, res) => {
  const temp = (25 + Math.random() * 15).toFixed(1);
  const hum = (40 + Math.random() * 35).toFixed(1);

  const now = new Date();
  const { timeFormatted, dateFormatted } = formatKolkataDateTime(now);

  const records = readJson(SENSOR_DATA_FILE, []);
  const newRecord = {
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    temperature: parseFloat(temp),
    humidity: parseFloat(hum),
    timestamp: now.getTime(),
    time: timeFormatted,
    date: dateFormatted
  };

  records.unshift(newRecord);
  if (records.length > 1000) records.length = 1000;
  writeJson(SENSOR_DATA_FILE, records);

  const deviceState = readJson(DEVICE_STATE_FILE, {});
  deviceState.lastSeen = Date.now(); // simulates live ESP8266
  deviceState.currentReading = {
    temperature: parseFloat(temp),
    humidity: parseFloat(hum),
    timestamp: now.getTime(),
    time: timeFormatted,
    date: dateFormatted
  };
  writeJson(DEVICE_STATE_FILE, deviceState);

  return res.json({
    success: true,
    message: 'Simulated ESP8266 sensor packet generated successfully!',
    record: newRecord
  });
});

// Fallback route: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Simple IoT World server running on port ${PORT}`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`⏰ Timezone configured: Asia/Kolkata (+5:30)`);
  console.log(`===============================================`);
});
