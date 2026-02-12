const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = 3001;
const JWT_SECRET = 'rally-secret-key-2026';
const JWT_EXPIRES_IN = '7d';
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Database helpers ────────────────────────────────────────────────────────

const DEFAULT_DB = {
  users: [],
  content: [],
  analytics: [],
  pageEdits: [],
  schoolSettings: {}
};

const readDb = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_DB };
  }
};

const writeDb = (db) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
};

const getDb = () => readDb();

// ─── Multer setup ────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

// ─── Express app ─────────────────────────────────────────────────────────────

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Auth middleware ─────────────────────────────────────────────────────────

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ─── Helper: generate token ─────────────────────────────────────────────────

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// ─── Health check ────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Auth routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, handle, role, schoolId, acceptedTerms } = req.body;

    if (!email || !password || !name || !handle) {
      return res.status(400).json({ error: 'Email, password, name, and handle are required' });
    }

    if (!acceptedTerms) {
      return res.status(400).json({ error: 'You must accept the terms of service' });
    }

    const db = getDb();

    if (db.users.find((u) => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    if (db.users.find((u) => u.handle === handle)) {
      return res.status(409).json({ error: 'Handle already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const user = {
      id: uuidv4(),
      email,
      passwordHash,
      name,
      handle,
      role: role || 'user',
      schoolId: schoolId || null,
      createdAt: now,
      acceptedTerms: true,
      lastLogin: now
    };

    db.users.push(user);
    writeDb(db);

    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, schoolId: user.schoolId }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    writeDb(db);

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, schoolId: user.schoolId }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { id, email, name, handle, role, schoolId, createdAt, lastLogin } = req.user;
  res.json({ id, email, name, handle, role, schoolId, createdAt, lastLogin });
});

app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { name, handle, schoolId, password } = req.body;
    const db = getDb();
    const user = db.users.find((u) => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (handle) {
      const existing = db.users.find((u) => u.handle === handle && u.id !== user.id);
      if (existing) {
        return res.status(409).json({ error: 'Handle already taken' });
      }
      user.handle = handle;
    }
    if (schoolId !== undefined) user.schoolId = schoolId;
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    writeDb(db);
    res.json({ id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, schoolId: user.schoolId });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── User management routes ─────────────────────────────────────────────────

app.get('/api/users', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const users = db.users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    handle: u.handle,
    role: u.role,
    schoolId: u.schoolId,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin
  }));
  res.json(users);
});

app.put('/api/users/:id/role', authenticateToken, requireRole(['developer']), (req, res) => {
  const { role } = req.body;
  const validRoles = ['developer', 'admin', 'user'];

  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.role = role;
  writeDb(db);

  res.json({ id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role });
});

app.delete('/api/users/:id', authenticateToken, requireRole(['developer']), (req, res) => {
  const db = getDb();
  const index = db.users.findIndex((u) => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (db.users[index].id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.users.splice(index, 1);
  writeDb(db);

  res.json({ message: 'User deleted' });
});

// ─── Content routes ─────────────────────────────────────────────────────────

app.get('/api/schools/:schoolId/content', (req, res) => {
  const db = getDb();
  const content = db.content.filter((c) => c.schoolId === req.params.schoolId);
  content.sort((a, b) => a.order - b.order);
  res.json(content);
});

app.post('/api/schools/:schoolId/content', authenticateToken, requireRole(['admin', 'developer']), upload.single('file'), (req, res) => {
  try {
    const { title, description, type, active, order } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const validTypes = ['banner', 'video', 'splash', 'logo'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    const now = new Date().toISOString();
    const url = req.file ? `/uploads/${req.file.filename}` : (req.body.url || '');

    const contentItem = {
      id: uuidv4(),
      schoolId: req.params.schoolId,
      type,
      title,
      description: description || '',
      url,
      active: active !== undefined ? active === 'true' || active === true : true,
      order: order !== undefined ? parseInt(order, 10) : 0,
      createdAt: now,
      updatedAt: now
    };

    const db = getDb();
    db.content.push(contentItem);
    writeDb(db);

    res.status(201).json(contentItem);
  } catch (err) {
    console.error('Create content error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/content/:id', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const item = db.content.find((c) => c.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Content not found' });
  }

  const { title, description, type, url, active, order } = req.body;

  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  if (type !== undefined) item.type = type;
  if (url !== undefined) item.url = url;
  if (active !== undefined) item.active = active;
  if (order !== undefined) item.order = order;
  item.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(item);
});

app.delete('/api/content/:id', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const index = db.content.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Content not found' });
  }

  db.content.splice(index, 1);
  writeDb(db);

  res.json({ message: 'Content deleted' });
});

// ─── Analytics routes ────────────────────────────────────────────────────────

app.get('/api/analytics', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  let analytics = [...db.analytics];

  const { schoolId, startDate, endDate, event } = req.query;

  if (schoolId) {
    analytics = analytics.filter((a) => a.schoolId === schoolId);
  }
  if (event) {
    analytics = analytics.filter((a) => a.event === event);
  }
  if (startDate) {
    analytics = analytics.filter((a) => a.timestamp >= startDate);
  }
  if (endDate) {
    analytics = analytics.filter((a) => a.timestamp <= endDate);
  }

  analytics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(analytics);
});

app.post('/api/analytics/track', authenticateToken, (req, res) => {
  const { event, schoolId, metadata } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  const analyticsEntry = {
    id: uuidv4(),
    event,
    userId: req.user.id,
    schoolId: schoolId || req.user.schoolId || 'unknown',
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  };

  const db = getDb();
  db.analytics.push(analyticsEntry);
  writeDb(db);

  res.status(201).json(analyticsEntry);
});

app.get('/api/analytics/summary', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Total users
  const totalUsers = db.users.length;

  // Active today (users who logged in today)
  const activeToday = db.users.filter((u) => u.lastLogin && u.lastLogin.slice(0, 10) === todayStr).length;

  // Total events
  const totalEvents = db.analytics.length;

  // Events by type
  const eventsByType = {};
  for (const entry of db.analytics) {
    eventsByType[entry.event] = (eventsByType[entry.event] || 0) + 1;
  }

  // Top schools by event count
  const schoolCounts = {};
  for (const entry of db.analytics) {
    schoolCounts[entry.schoolId] = (schoolCounts[entry.schoolId] || 0) + 1;
  }
  const topSchools = Object.entries(schoolCounts)
    .map(([schoolId, count]) => ({ schoolId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Daily active users (last 30 days)
  const dailyActiveUsers = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const uniqueUsers = new Set();
    for (const entry of db.analytics) {
      if (entry.timestamp.slice(0, 10) === dateStr) {
        uniqueUsers.add(entry.userId);
      }
    }

    dailyActiveUsers.push({ date: dateStr, count: uniqueUsers.size });
  }

  res.json({
    totalUsers,
    activeToday,
    totalEvents,
    eventsByType,
    topSchools,
    dailyActiveUsers
  });
});

// ─── Page edits routes ──────────────────────────────────────────────────────

app.get('/api/page-edits/:page', (req, res) => {
  const db = getDb();
  const edits = db.pageEdits.filter((e) => e.page === req.params.page);

  // Return only the latest edit per field
  const latestByField = {};
  for (const edit of edits) {
    if (!latestByField[edit.field] || edit.timestamp > latestByField[edit.field].timestamp) {
      latestByField[edit.field] = edit;
    }
  }

  res.json(Object.values(latestByField));
});

app.post('/api/page-edits', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const { page, field, value } = req.body;

  if (!page || !field || value === undefined) {
    return res.status(400).json({ error: 'Page, field, and value are required' });
  }

  const edit = {
    id: uuidv4(),
    page,
    field,
    value,
    editedBy: req.user.id,
    timestamp: new Date().toISOString()
  };

  const db = getDb();
  db.pageEdits.push(edit);
  writeDb(db);

  res.status(201).json(edit);
});

// ─── School settings routes ─────────────────────────────────────────────────

app.get('/api/schools/:schoolId/settings', authenticateToken, (req, res) => {
  const db = getDb();
  const settings = db.schoolSettings[req.params.schoolId] || {
    sponsorBannerEnabled: true,
    splashEnabled: true,
    customRewards: []
  };
  res.json(settings);
});

app.put('/api/schools/:schoolId/settings', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  db.schoolSettings[req.params.schoolId] = {
    ...db.schoolSettings[req.params.schoolId],
    ...req.body
  };
  writeDb(db);
  res.json(db.schoolSettings[req.params.schoolId]);
});

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rally server running at http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
