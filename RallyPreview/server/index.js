const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'rally-secret-key-2026';
const JWT_EXPIRES_IN = '7d';
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ─── Capacity limits ────────────────────────────────────────────────────────
const MAX_SCHOOL_ADMINS = parseInt(process.env.MAX_SCHOOL_ADMINS, 10) || 15;
const MAX_USERS = parseInt(process.env.MAX_USERS, 10) || 10000;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Haversine distance between two lat/lng pairs (returns miles)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Default check-in radius in miles
const DEFAULT_CHECKIN_RADIUS = 0.25;

// Strip sensitive fields from user object for API responses
function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    role: user.role,
    schoolId: user.schoolId || null,
    favoriteSchool: user.favoriteSchool || null,
    supportingSchools: user.supportingSchools || [],
    emailVerified: user.emailVerified || false,
    emailUpdates: user.emailUpdates !== undefined ? user.emailUpdates : true,
    pushNotifications: user.pushNotifications !== undefined ? user.pushNotifications : true,
    acceptedTerms: user.acceptedTerms || false,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

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

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['*'];

app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Rate limiting (simple in-memory) ────────────────────────────────────────

const rateLimits = {};

function rateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  if (!rateLimits[key]) {
    rateLimits[key] = [];
  }
  // Clean old entries
  rateLimits[key] = rateLimits[key].filter((t) => now - t < windowMs);
  if (rateLimits[key].length >= maxAttempts) {
    return false; // rate limited
  }
  rateLimits[key].push(now);
  return true; // allowed
}

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
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.1.0' });
});

// ─── Schools data ───────────────────────────────────────────────────────────

const SCHOOLS_FILE = path.join(__dirname, 'schools.json');

const getSchools = () => {
  try {
    const raw = fs.readFileSync(SCHOOLS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

app.get('/api/schools', (req, res) => {
  const schools = getSchools();
  const { q, conference, division } = req.query || {};
  let results = schools;
  if (division) results = results.filter((s) => s.division === division);
  if (conference) results = results.filter((s) => s.conference === conference);
  if (q) {
    const query = q.toLowerCase();
    results = results.filter((s) =>
      s.name.toLowerCase().includes(query) ||
      s.shortName.toLowerCase().includes(query) ||
      s.mascot.toLowerCase().includes(query) ||
      s.conference.toLowerCase().includes(query)
    );
  }
  res.json({ schools: results, total: results.length });
});

app.get('/api/schools/:schoolId', (_req, res) => {
  const schools = getSchools();
  const school = schools.find((s) => s.id === _req.params.schoolId);
  if (!school) return res.status(404).json({ error: 'School not found' });
  res.json(school);
});

// ─── Events / Games ─────────────────────────────────────────────────────────

// Migrate: on startup, load events.json into data.json if needed
const EVENTS_FILE = path.join(__dirname, 'events.json');

function ensureEventsInDb() {
  const db = getDb();
  if (!db.events) {
    try {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
      db.events = JSON.parse(raw);
    } catch {
      db.events = [];
    }
    writeDb(db);
  }
  if (!db.pointsLedger) {
    db.pointsLedger = [];
    writeDb(db);
  }
}

app.get('/api/events', (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const { schoolId, status } = req.query || {};
  let results = db.events || [];
  if (schoolId) results = results.filter((e) => e.homeSchoolId === schoolId || e.awaySchoolId === schoolId);
  if (status) results = results.filter((e) => e.status === status);
  results.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  res.json({ events: results, total: results.length });
});

app.get('/api/events/:eventId', (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Create event (admin/developer)
app.post('/api/events', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  ensureEventsInDb();
  const {
    title, sport, homeSchoolId, homeTeam, awaySchoolId, awayTeam,
    venue, city, dateTime, status, activations,
    venueAddress, venueLatitude, venueLongitude, checkinRadius,
    broadcastEnabled,
  } = req.body;

  if (!title || !dateTime || !homeSchoolId) {
    return res.status(400).json({ error: 'Title, dateTime, and homeSchoolId are required' });
  }

  const now = new Date().toISOString();
  const event = {
    id: uuidv4(),
    title,
    sport: sport || 'General',
    homeSchoolId,
    homeTeam: homeTeam || '',
    awaySchoolId: awaySchoolId || null,
    awayTeam: awayTeam || '',
    venue: venue || '',
    city: city || '',
    dateTime,
    status: status || 'upcoming',
    // Geo check-in fields
    venueAddress: venueAddress || '',
    venueLatitude: venueLatitude ? parseFloat(venueLatitude) : null,
    venueLongitude: venueLongitude ? parseFloat(venueLongitude) : null,
    checkinRadius: checkinRadius ? parseFloat(checkinRadius) : DEFAULT_CHECKIN_RADIUS,
    // Broadcast: allows remote fans to participate
    broadcastEnabled: broadcastEnabled !== undefined ? broadcastEnabled : true,
    activations: Array.isArray(activations) ? activations.map((a) => ({
      id: uuidv4(),
      type: a.type || 'custom',
      name: a.name || 'Activity',
      points: parseInt(a.points, 10) || 0,
      description: a.description || '',
    })) : [],
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  db.events.push(event);
  writeDb(db);

  console.log(`[Event] Created "${event.title}" by ${req.user.email}`);
  res.status(201).json(event);
});

// Update event
app.put('/api/events/:eventId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const {
    title, sport, homeTeam, awaySchoolId, awayTeam, venue, city, dateTime, status, activations,
    venueAddress, venueLatitude, venueLongitude, checkinRadius, broadcastEnabled,
  } = req.body;

  if (title !== undefined) event.title = title;
  if (sport !== undefined) event.sport = sport;
  if (homeTeam !== undefined) event.homeTeam = homeTeam;
  if (awaySchoolId !== undefined) event.awaySchoolId = awaySchoolId;
  if (awayTeam !== undefined) event.awayTeam = awayTeam;
  if (venue !== undefined) event.venue = venue;
  if (city !== undefined) event.city = city;
  if (dateTime !== undefined) event.dateTime = dateTime;
  if (status !== undefined) event.status = status;
  if (venueAddress !== undefined) event.venueAddress = venueAddress;
  if (venueLatitude !== undefined) event.venueLatitude = parseFloat(venueLatitude);
  if (venueLongitude !== undefined) event.venueLongitude = parseFloat(venueLongitude);
  if (checkinRadius !== undefined) event.checkinRadius = parseFloat(checkinRadius);
  if (broadcastEnabled !== undefined) event.broadcastEnabled = broadcastEnabled;
  if (activations !== undefined) {
    event.activations = Array.isArray(activations) ? activations.map((a) => ({
      id: a.id || uuidv4(),
      type: a.type || 'custom',
      name: a.name || 'Activity',
      points: parseInt(a.points, 10) || 0,
      description: a.description || '',
    })) : [];
  }
  event.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(event);
});

// Delete event
app.delete('/api/events/:eventId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const index = (db.events || []).findIndex((e) => e.id === req.params.eventId);
  if (index === -1) return res.status(404).json({ error: 'Event not found' });

  db.events.splice(index, 1);
  writeDb(db);
  res.json({ message: 'Event deleted' });
});

// ─── Geo Check-In System ────────────────────────────────────────────────────
//
// Flow:
// 1. User taps "Pre Check-In" for an upcoming event → status: pre_checkin
//    - They get queued; the app monitors their location in the background
// 2. When the user enters the venue geofence (0.25mi default) → status: checked_in
//    - Points are awarded, in-game features unlock
// 3. Users can also do a direct check-in if already at the venue
// 4. Remote fans (watching on TV) can "tune in" → status: remote
//    - They don't get venue check-in points but CAN interact with live engagements
//

// Pre check-in (user signals intent to attend)
app.post('/api/events/:eventId/pre-checkin', authenticateToken, (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (!db.checkins) db.checkins = [];

  // Check if already checked in
  const existing = db.checkins.find(
    (c) => c.userId === req.user.id && c.eventId === event.id
  );
  if (existing) {
    return res.status(409).json({
      error: `Already ${existing.status === 'checked_in' ? 'checked in' : 'pre-checked in'}`,
      checkin: existing,
    });
  }

  const checkin = {
    id: uuidv4(),
    userId: req.user.id,
    eventId: event.id,
    schoolId: event.homeSchoolId,
    status: 'pre_checkin',   // pre_checkin → checked_in (when in range)
    preCheckinAt: new Date().toISOString(),
    checkedInAt: null,
    latitude: null,
    longitude: null,
    distanceMiles: null,
    pointsAwarded: false,
    method: 'pre_checkin',   // pre_checkin, direct, remote
  };

  db.checkins.push(checkin);
  writeDb(db);

  console.log(`[CheckIn] Pre check-in for "${event.title}" by ${req.user.email}`);
  res.status(201).json(checkin);
});

// Location update / direct check-in (user sends their lat/lng)
// If they have a pre-checkin and are now in range → auto-promotes to checked_in
// If no pre-checkin → does a direct check-in (must be in range)
app.post('/api/events/:eventId/checkin', authenticateToken, (req, res) => {
  ensureEventsInDb();
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Venue must have coordinates set by admin
  if (!event.venueLatitude || !event.venueLongitude) {
    return res.status(400).json({ error: 'This event does not have venue coordinates configured yet' });
  }

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);
  const distance = haversineDistance(userLat, userLng, event.venueLatitude, event.venueLongitude);
  const radius = event.checkinRadius || DEFAULT_CHECKIN_RADIUS;
  const inRange = distance <= radius;

  if (!db.checkins) db.checkins = [];

  // Find existing checkin for this user+event
  const existing = db.checkins.find(
    (c) => c.userId === req.user.id && c.eventId === event.id
  );

  if (existing && existing.status === 'checked_in') {
    return res.status(409).json({
      error: 'Already checked in',
      checkin: existing,
      distance: Math.round(distance * 1000) / 1000,
    });
  }

  if (!inRange) {
    return res.status(403).json({
      error: `You are ${distance.toFixed(2)} miles from the venue. Must be within ${radius} miles to check in.`,
      distance: Math.round(distance * 1000) / 1000,
      radius,
      inRange: false,
    });
  }

  // In range — either promote pre_checkin or create direct checkin
  const now = new Date().toISOString();

  if (existing) {
    // Promote pre_checkin to checked_in
    existing.status = 'checked_in';
    existing.checkedInAt = now;
    existing.latitude = userLat;
    existing.longitude = userLng;
    existing.distanceMiles = Math.round(distance * 1000) / 1000;
    existing.method = 'auto_from_pre_checkin';

    // Award check-in points if not already awarded
    if (!existing.pointsAwarded) {
      const checkinPoints = 100; // base check-in points
      if (!db.pointsLedger) db.pointsLedger = [];
      db.pointsLedger.push({
        id: uuidv4(),
        userId: req.user.id,
        eventId: event.id,
        activationId: 'geo-checkin',
        activationName: 'Venue Check-In',
        points: checkinPoints,
        schoolId: event.homeSchoolId,
        timestamp: now,
      });
      existing.pointsAwarded = true;
    }

    writeDb(db);
    console.log(`[CheckIn] Auto check-in for "${event.title}" by ${req.user.email} (${distance.toFixed(3)} mi)`);

    return res.json({
      checkin: existing,
      distance: Math.round(distance * 1000) / 1000,
      inRange: true,
      message: 'Checked in! You were pre-checked in and are now at the venue.',
    });
  }

  // Direct check-in (no pre-checkin)
  const checkin = {
    id: uuidv4(),
    userId: req.user.id,
    eventId: event.id,
    schoolId: event.homeSchoolId,
    status: 'checked_in',
    preCheckinAt: null,
    checkedInAt: now,
    latitude: userLat,
    longitude: userLng,
    distanceMiles: Math.round(distance * 1000) / 1000,
    pointsAwarded: true,
    method: 'direct',
  };

  db.checkins.push(checkin);

  // Award check-in points
  const checkinPoints = 100;
  if (!db.pointsLedger) db.pointsLedger = [];
  db.pointsLedger.push({
    id: uuidv4(),
    userId: req.user.id,
    eventId: event.id,
    activationId: 'geo-checkin',
    activationName: 'Venue Check-In',
    points: checkinPoints,
    schoolId: event.homeSchoolId,
    timestamp: now,
  });

  writeDb(db);
  console.log(`[CheckIn] Direct check-in for "${event.title}" by ${req.user.email} (${distance.toFixed(3)} mi)`);

  res.status(201).json({
    checkin,
    distance: Math.round(distance * 1000) / 1000,
    inRange: true,
    message: 'Checked in at the venue!',
  });
});

// Remote tune-in (for TV/away fans — no geo required)
app.post('/api/events/:eventId/tune-in', authenticateToken, (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (!event.broadcastEnabled) {
    return res.status(403).json({ error: 'Remote viewing is not enabled for this event' });
  }

  if (!db.checkins) db.checkins = [];

  const existing = db.checkins.find(
    (c) => c.userId === req.user.id && c.eventId === event.id
  );
  if (existing) {
    // If already at venue, keep that status (it's higher priority)
    if (existing.status === 'checked_in') {
      return res.json({ checkin: existing, message: 'You are checked in at the venue' });
    }
    // Upgrade pre_checkin to remote if they're tuning in from home
    if (existing.status === 'pre_checkin') {
      existing.status = 'remote';
      existing.method = 'remote';
      writeDb(db);
      return res.json({ checkin: existing, message: 'Tuned in remotely' });
    }
    return res.status(409).json({ error: 'Already tuned in', checkin: existing });
  }

  const now = new Date().toISOString();
  const checkin = {
    id: uuidv4(),
    userId: req.user.id,
    eventId: event.id,
    schoolId: event.homeSchoolId,
    status: 'remote',
    preCheckinAt: null,
    checkedInAt: now,
    latitude: null,
    longitude: null,
    distanceMiles: null,
    pointsAwarded: true,
    method: 'remote',
  };

  db.checkins.push(checkin);

  // Remote tune-in gets fewer points than venue check-in
  const remotePoints = 25;
  if (!db.pointsLedger) db.pointsLedger = [];
  db.pointsLedger.push({
    id: uuidv4(),
    userId: req.user.id,
    eventId: event.id,
    activationId: 'remote-tunein',
    activationName: 'Remote Tune-In',
    points: remotePoints,
    schoolId: event.homeSchoolId,
    timestamp: now,
  });

  writeDb(db);
  console.log(`[CheckIn] Remote tune-in for "${event.title}" by ${req.user.email}`);
  res.status(201).json({ checkin, message: 'Tuned in remotely! You can now interact with live engagements.' });
});

// Get my check-in status for an event
app.get('/api/events/:eventId/my-checkin', authenticateToken, (req, res) => {
  const db = getDb();
  if (!db.checkins) return res.json({ checkin: null });

  const checkin = db.checkins.find(
    (c) => c.userId === req.user.id && c.eventId === req.params.eventId
  );
  res.json({ checkin: checkin || null });
});

// Get all check-ins for an event (admin view)
app.get('/api/events/:eventId/checkins', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const checkins = (db.checkins || []).filter((c) => c.eventId === req.params.eventId);

  const atVenue = checkins.filter((c) => c.status === 'checked_in').length;
  const preChecked = checkins.filter((c) => c.status === 'pre_checkin').length;
  const remote = checkins.filter((c) => c.status === 'remote').length;

  res.json({
    checkins,
    summary: { total: checkins.length, atVenue, preChecked, remote },
  });
});

// ─── Live Engagements (admin pushes content during games) ───────────────────
//
// Admins can push interactive content to fans during live events:
// - Ads / Sponsor activations (served to both venue + remote fans = touchpoints)
// - Polls ("Who will score next?")
// - Trivia questions (earn points for correct answers)
// - Predictions ("Will they convert this 3rd down?")
// - Challenges ("Make some noise!" / noise meter)
// - Announcements (halftime, score updates, promo codes)
//
// Audience targeting:
// - at_venue: only fans physically checked in at the venue
// - remote: only fans watching from home/TV
// - all: both venue and remote fans (maximum touchpoints)
//
// Each engagement has a time window (startsAt → expiresAt) and can award points
// for interaction. Sponsors get impression tracking.
//

// Create a live engagement for an event
app.post('/api/events/:eventId/engagements', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const {
    type, title, body, imageUrl,
    audience, points, duration,
    sponsorName, sponsorLogo, sponsorUrl,
    options,     // for polls/trivia/predictions: [{ label, isCorrect? }]
    correctAnswer, // for trivia: index of correct option
    metadata,
  } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: 'type and title are required' });
  }

  const validTypes = ['ad', 'sponsor', 'poll', 'trivia', 'prediction', 'challenge', 'announcement', 'promo'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  const validAudiences = ['at_venue', 'remote', 'all'];
  const targetAudience = audience || 'all';
  if (!validAudiences.includes(targetAudience)) {
    return res.status(400).json({ error: `audience must be one of: ${validAudiences.join(', ')}` });
  }

  const now = new Date().toISOString();
  const durationMs = (duration || 300) * 1000; // default 5 min
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  const engagement = {
    id: uuidv4(),
    eventId: event.id,
    schoolId: event.homeSchoolId,
    type,
    title,
    body: body || '',
    imageUrl: imageUrl || null,
    audience: targetAudience,
    points: parseInt(points, 10) || 0,
    // Timing
    startsAt: now,
    expiresAt,
    durationSeconds: duration || 300,
    active: true,
    // Sponsor info (for ad/sponsor types)
    sponsorName: sponsorName || null,
    sponsorLogo: sponsorLogo || null,
    sponsorUrl: sponsorUrl || null,
    // Interactive options (polls, trivia, predictions)
    options: Array.isArray(options) ? options.map((o, i) => ({
      id: `opt-${i}`,
      label: o.label || o,
      isCorrect: o.isCorrect || false,
      votes: 0,
    })) : [],
    correctAnswer: correctAnswer !== undefined ? parseInt(correctAnswer, 10) : null,
    // Tracking
    impressions: 0,
    interactions: 0,
    metadata: metadata || {},
    createdBy: req.user.id,
    createdAt: now,
  };

  if (!db.engagements) db.engagements = [];
  db.engagements.push(engagement);
  writeDb(db);

  console.log(`[Engagement] "${engagement.type}: ${engagement.title}" pushed to ${targetAudience} for "${event.title}" by ${req.user.email}`);
  res.status(201).json(engagement);
});

// Get all engagements for an event (admin view — includes expired)
app.get('/api/events/:eventId/engagements', authenticateToken, (req, res) => {
  const db = getDb();
  let engagements = (db.engagements || []).filter((e) => e.eventId === req.params.eventId);
  engagements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ engagements, total: engagements.length });
});

// Get active engagements for a user (what should show on their screen right now)
app.get('/api/events/:eventId/engagements/live', authenticateToken, (req, res) => {
  const db = getDb();
  const now = new Date();

  // Determine user's check-in status for audience filtering
  const checkin = (db.checkins || []).find(
    (c) => c.userId === req.user.id && c.eventId === req.params.eventId
  );

  if (!checkin) {
    return res.status(403).json({ error: 'You must be checked in or tuned in to view live engagements' });
  }

  const userLocation = checkin.status === 'checked_in' ? 'at_venue' : 'remote';

  let engagements = (db.engagements || []).filter((e) => {
    if (e.eventId !== req.params.eventId) return false;
    if (!e.active) return false;
    if (new Date(e.expiresAt) < now) return false;
    // Audience filter
    if (e.audience === 'all') return true;
    if (e.audience === userLocation) return true;
    return false;
  });

  // Sort by most recent first
  engagements.sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));

  // Track impressions
  for (const eng of engagements) {
    eng.impressions = (eng.impressions || 0) + 1;
  }
  writeDb(db);

  // Log impression for sponsors
  if (!db.impressionLog) db.impressionLog = [];
  for (const eng of engagements) {
    if (eng.sponsorName) {
      db.impressionLog.push({
        id: uuidv4(),
        engagementId: eng.id,
        eventId: eng.eventId,
        userId: req.user.id,
        sponsorName: eng.sponsorName,
        userLocation,
        timestamp: now.toISOString(),
      });
    }
  }
  writeDb(db);

  res.json({
    engagements,
    userStatus: checkin.status,
    userLocation,
    total: engagements.length,
  });
});

// Interact with an engagement (vote on poll, answer trivia, tap ad, etc.)
app.post('/api/engagements/:engagementId/interact', authenticateToken, (req, res) => {
  const db = getDb();
  const engagement = (db.engagements || []).find((e) => e.id === req.params.engagementId);
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' });

  const now = new Date();
  if (new Date(engagement.expiresAt) < now) {
    return res.status(410).json({ error: 'This engagement has expired' });
  }

  const { optionId, response } = req.body;

  // Check for duplicate interaction
  if (!db.engagementInteractions) db.engagementInteractions = [];
  const alreadyInteracted = db.engagementInteractions.find(
    (i) => i.userId === req.user.id && i.engagementId === engagement.id
  );
  if (alreadyInteracted) {
    return res.status(409).json({ error: 'Already interacted with this engagement', interaction: alreadyInteracted });
  }

  // Process the interaction based on type
  let correct = null;
  let pointsEarned = 0;

  if (['poll', 'trivia', 'prediction'].includes(engagement.type) && optionId) {
    // Record vote
    const option = engagement.options.find((o) => o.id === optionId);
    if (option) {
      option.votes = (option.votes || 0) + 1;
    }

    // For trivia, check correctness
    if (engagement.type === 'trivia' && engagement.correctAnswer !== null) {
      correct = option && option.isCorrect;
      pointsEarned = correct ? (engagement.points || 10) : Math.floor((engagement.points || 10) / 4);
    } else {
      // Polls/predictions: flat participation points
      pointsEarned = engagement.points || 5;
    }
  } else if (['ad', 'sponsor'].includes(engagement.type)) {
    // Tapping/viewing an ad = interaction point + impression tracked
    pointsEarned = engagement.points || 2;
  } else if (engagement.type === 'challenge') {
    // Challenge completion
    pointsEarned = engagement.points || 25;
  } else {
    // Generic interaction (announcement tap, promo claim)
    pointsEarned = engagement.points || 1;
  }

  engagement.interactions = (engagement.interactions || 0) + 1;

  const interaction = {
    id: uuidv4(),
    userId: req.user.id,
    engagementId: engagement.id,
    eventId: engagement.eventId,
    type: engagement.type,
    optionId: optionId || null,
    response: response || null,
    correct,
    pointsEarned,
    timestamp: now.toISOString(),
  };

  db.engagementInteractions.push(interaction);

  // Award points
  if (pointsEarned > 0) {
    if (!db.pointsLedger) db.pointsLedger = [];
    db.pointsLedger.push({
      id: uuidv4(),
      userId: req.user.id,
      eventId: engagement.eventId,
      activationId: `engagement-${engagement.id}`,
      activationName: `${engagement.type}: ${engagement.title}`,
      points: pointsEarned,
      schoolId: engagement.schoolId,
      timestamp: now.toISOString(),
    });
  }

  writeDb(db);

  console.log(`[Engagement] Interaction on "${engagement.title}" by user ${req.user.id} (+${pointsEarned} pts)`);

  res.json({
    interaction,
    pointsEarned,
    correct,
    message: correct === true ? 'Correct!' : correct === false ? 'Not quite!' : 'Interaction recorded!',
  });
});

// Update an engagement (extend time, deactivate, etc.)
app.put('/api/engagements/:engagementId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const engagement = (db.engagements || []).find((e) => e.id === req.params.engagementId);
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' });

  const { title, body, imageUrl, active, audience, points, expiresAt, durationSeconds, sponsorName, sponsorLogo, sponsorUrl, options } = req.body;

  if (title !== undefined) engagement.title = title;
  if (body !== undefined) engagement.body = body;
  if (imageUrl !== undefined) engagement.imageUrl = imageUrl;
  if (active !== undefined) engagement.active = active;
  if (audience !== undefined) engagement.audience = audience;
  if (points !== undefined) engagement.points = parseInt(points, 10) || 0;
  if (expiresAt !== undefined) engagement.expiresAt = expiresAt;
  if (durationSeconds !== undefined) engagement.durationSeconds = durationSeconds;
  if (sponsorName !== undefined) engagement.sponsorName = sponsorName;
  if (sponsorLogo !== undefined) engagement.sponsorLogo = sponsorLogo;
  if (sponsorUrl !== undefined) engagement.sponsorUrl = sponsorUrl;
  if (options !== undefined) engagement.options = options;

  writeDb(db);
  res.json(engagement);
});

// Delete an engagement
app.delete('/api/engagements/:engagementId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const index = (db.engagements || []).findIndex((e) => e.id === req.params.engagementId);
  if (index === -1) return res.status(404).json({ error: 'Engagement not found' });

  db.engagements.splice(index, 1);
  writeDb(db);
  res.json({ message: 'Engagement deleted' });
});

// Get engagement stats (admin — impressions, interactions, sponsor ROI)
app.get('/api/events/:eventId/engagement-stats', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const engagements = (db.engagements || []).filter((e) => e.eventId === req.params.eventId);
  const interactions = (db.engagementInteractions || []).filter((i) => i.eventId === req.params.eventId);
  const impressions = (db.impressionLog || []).filter((i) => i.eventId === req.params.eventId);
  const checkins = (db.checkins || []).filter((c) => c.eventId === req.params.eventId);

  // Sponsor summary
  const sponsorStats = {};
  for (const eng of engagements) {
    if (eng.sponsorName) {
      if (!sponsorStats[eng.sponsorName]) {
        sponsorStats[eng.sponsorName] = { impressions: 0, interactions: 0, engagements: 0 };
      }
      sponsorStats[eng.sponsorName].impressions += eng.impressions || 0;
      sponsorStats[eng.sponsorName].interactions += eng.interactions || 0;
      sponsorStats[eng.sponsorName].engagements += 1;
    }
  }

  res.json({
    totalEngagements: engagements.length,
    totalInteractions: interactions.length,
    totalImpressions: impressions.length,
    audienceBreakdown: {
      atVenue: checkins.filter((c) => c.status === 'checked_in').length,
      remote: checkins.filter((c) => c.status === 'remote').length,
      preChecked: checkins.filter((c) => c.status === 'pre_checkin').length,
    },
    byType: engagements.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {}),
    sponsorStats,
    engagements: engagements.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      audience: e.audience,
      impressions: e.impressions,
      interactions: e.interactions,
      sponsorName: e.sponsorName,
      active: e.active,
      startsAt: e.startsAt,
      expiresAt: e.expiresAt,
    })),
  });
});

// ─── Points earning (complete an activation) ────────────────────────────────

app.post('/api/events/:eventId/earn', authenticateToken, (req, res) => {
  ensureEventsInDb();
  const { activationId } = req.body;
  if (!activationId) return res.status(400).json({ error: 'activationId is required' });

  const db = getDb();
  const event = (db.events || []).find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const activation = (event.activations || []).find((a) => a.id === activationId);
  if (!activation) return res.status(404).json({ error: 'Activation not found' });

  // Check if already earned
  const already = (db.pointsLedger || []).find(
    (p) => p.userId === req.user.id && p.eventId === event.id && p.activationId === activationId
  );
  if (already) return res.status(409).json({ error: 'Already earned points for this activation' });

  const entry = {
    id: uuidv4(),
    userId: req.user.id,
    eventId: event.id,
    activationId,
    activationName: activation.name,
    points: activation.points,
    schoolId: event.homeSchoolId,
    timestamp: new Date().toISOString(),
  };

  if (!db.pointsLedger) db.pointsLedger = [];
  db.pointsLedger.push(entry);
  writeDb(db);

  // Calculate total points for this user
  const totalPoints = db.pointsLedger
    .filter((p) => p.userId === req.user.id)
    .reduce((sum, p) => sum + p.points, 0);

  res.status(201).json({ earned: entry, totalPoints });
});

// Get user's points summary
app.get('/api/points/me', authenticateToken, (req, res) => {
  ensureEventsInDb();
  const db = getDb();
  const ledger = (db.pointsLedger || []).filter((p) => p.userId === req.user.id);
  const totalPoints = ledger.reduce((sum, p) => sum + p.points, 0);

  // Determine tier
  let tier = 'Bronze';
  if (totalPoints >= 5000) tier = 'Platinum';
  else if (totalPoints >= 2500) tier = 'Gold';
  else if (totalPoints >= 1000) tier = 'Silver';

  res.json({
    totalPoints,
    tier,
    history: ledger.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50),
  });
});

// ─── Rewards CRUD ────────────────────────────────────────────────────────────

// Get rewards for a school
app.get('/api/schools/:schoolId/rewards', (req, res) => {
  const db = getDb();
  const settings = db.schoolSettings[req.params.schoolId] || {};
  res.json({ rewards: settings.customRewards || [] });
});

// Create reward
app.post('/api/schools/:schoolId/rewards', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const { name, pointsCost, description } = req.body;
  if (!name || pointsCost === undefined) {
    return res.status(400).json({ error: 'Name and pointsCost are required' });
  }

  const db = getDb();
  if (!db.schoolSettings[req.params.schoolId]) {
    db.schoolSettings[req.params.schoolId] = { sponsorBannerEnabled: true, splashEnabled: true, customRewards: [] };
  }
  if (!db.schoolSettings[req.params.schoolId].customRewards) {
    db.schoolSettings[req.params.schoolId].customRewards = [];
  }

  const reward = {
    id: uuidv4(),
    name,
    pointsCost: parseInt(pointsCost, 10) || 0,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  db.schoolSettings[req.params.schoolId].customRewards.push(reward);
  writeDb(db);

  res.status(201).json(reward);
});

// Update reward
app.put('/api/schools/:schoolId/rewards/:rewardId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const settings = db.schoolSettings[req.params.schoolId];
  if (!settings || !settings.customRewards) return res.status(404).json({ error: 'School settings not found' });

  const reward = settings.customRewards.find((r) => r.id === req.params.rewardId);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  const { name, pointsCost, description } = req.body;
  if (name !== undefined) reward.name = name;
  if (pointsCost !== undefined) reward.pointsCost = parseInt(pointsCost, 10) || 0;
  if (description !== undefined) reward.description = description;

  writeDb(db);
  res.json(reward);
});

// Delete reward
app.delete('/api/schools/:schoolId/rewards/:rewardId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const settings = db.schoolSettings[req.params.schoolId];
  if (!settings || !settings.customRewards) return res.status(404).json({ error: 'School settings not found' });

  const index = settings.customRewards.findIndex((r) => r.id === req.params.rewardId);
  if (index === -1) return res.status(404).json({ error: 'Reward not found' });

  settings.customRewards.splice(index, 1);
  writeDb(db);
  res.json({ message: 'Reward deleted' });
});

// ─── Push Notifications CRUD ─────────────────────────────────────────────────

app.get('/api/notifications', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const { schoolId } = req.query || {};
  let notifs = db.notifications || [];
  if (schoolId) notifs = notifs.filter((n) => n.schoolId === schoolId);
  notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notifications: notifs, total: notifs.length });
});

app.post('/api/notifications', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const { title, body, schoolId, targetAudience, scheduledFor } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

  const now = new Date().toISOString();
  const notif = {
    id: uuidv4(),
    title,
    body,
    schoolId: schoolId || req.user.schoolId || 'rally-university',
    targetAudience: targetAudience || 'all', // all, tier:gold, tier:silver, etc.
    status: scheduledFor ? 'scheduled' : 'sent',
    scheduledFor: scheduledFor || null,
    sentAt: scheduledFor ? null : now,
    createdBy: req.user.id,
    createdAt: now,
  };

  const db = getDb();
  if (!db.notifications) db.notifications = [];
  db.notifications.push(notif);
  writeDb(db);

  console.log(`[Notification] "${notif.title}" created by ${req.user.email}`);
  res.status(201).json(notif);
});

app.put('/api/notifications/:notifId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const notif = (db.notifications || []).find((n) => n.id === req.params.notifId);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  const { title, body, targetAudience, scheduledFor, status } = req.body;
  if (title !== undefined) notif.title = title;
  if (body !== undefined) notif.body = body;
  if (targetAudience !== undefined) notif.targetAudience = targetAudience;
  if (scheduledFor !== undefined) notif.scheduledFor = scheduledFor;
  if (status !== undefined) notif.status = status;

  writeDb(db);
  res.json(notif);
});

app.delete('/api/notifications/:notifId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const index = (db.notifications || []).findIndex((n) => n.id === req.params.notifId);
  if (index === -1) return res.status(404).json({ error: 'Notification not found' });

  db.notifications.splice(index, 1);
  writeDb(db);
  res.json({ message: 'Notification deleted' });
});

// Send a notification now (marks as sent)
app.post('/api/notifications/:notifId/send', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const notif = (db.notifications || []).find((n) => n.id === req.params.notifId);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  notif.status = 'sent';
  notif.sentAt = new Date().toISOString();
  writeDb(db);

  console.log(`[Notification] "${notif.title}" sent to ${notif.targetAudience}`);
  res.json(notif);
});

// ─── Bonus Offers CRUD ──────────────────────────────────────────────────────

app.get('/api/schools/:schoolId/bonus-offers', (req, res) => {
  const db = getDb();
  let offers = (db.bonusOffers || []).filter((o) => o.schoolId === req.params.schoolId);
  const now = new Date();
  offers = offers.map((o) => ({
    ...o,
    isActive: o.active && (!o.expiresAt || new Date(o.expiresAt) > now),
  }));
  offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ bonusOffers: offers, total: offers.length });
});

app.post('/api/schools/:schoolId/bonus-offers', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const { name, description, bonusMultiplier, bonusPoints, activationType, expiresAt, startsAt } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const now = new Date().toISOString();
  const offer = {
    id: uuidv4(),
    schoolId: req.params.schoolId,
    name,
    description: description || '',
    bonusMultiplier: parseFloat(bonusMultiplier) || null, // e.g. 2.0 for double points
    bonusPoints: parseInt(bonusPoints, 10) || null, // e.g. 50 flat bonus
    activationType: activationType || 'all', // all, checkin, trivia, prediction, etc.
    active: true,
    startsAt: startsAt || now,
    expiresAt: expiresAt || null,
    createdBy: req.user.id,
    createdAt: now,
  };

  const db = getDb();
  if (!db.bonusOffers) db.bonusOffers = [];
  db.bonusOffers.push(offer);
  writeDb(db);

  console.log(`[Bonus] "${offer.name}" created for ${req.params.schoolId}`);
  res.status(201).json(offer);
});

app.put('/api/schools/:schoolId/bonus-offers/:offerId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const offer = (db.bonusOffers || []).find((o) => o.id === req.params.offerId && o.schoolId === req.params.schoolId);
  if (!offer) return res.status(404).json({ error: 'Bonus offer not found' });

  const { name, description, bonusMultiplier, bonusPoints, activationType, active, expiresAt, startsAt } = req.body;
  if (name !== undefined) offer.name = name;
  if (description !== undefined) offer.description = description;
  if (startsAt !== undefined) offer.startsAt = startsAt;
  if (bonusMultiplier !== undefined) offer.bonusMultiplier = parseFloat(bonusMultiplier) || null;
  if (bonusPoints !== undefined) offer.bonusPoints = parseInt(bonusPoints, 10) || null;
  if (activationType !== undefined) offer.activationType = activationType;
  if (active !== undefined) offer.active = active;
  if (expiresAt !== undefined) offer.expiresAt = expiresAt;

  writeDb(db);
  res.json(offer);
});

app.delete('/api/schools/:schoolId/bonus-offers/:offerId', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const index = (db.bonusOffers || []).findIndex((o) => o.id === req.params.offerId && o.schoolId === req.params.schoolId);
  if (index === -1) return res.status(404).json({ error: 'Bonus offer not found' });

  db.bonusOffers.splice(index, 1);
  writeDb(db);
  res.json({ message: 'Bonus offer deleted' });
});

// ─── Auth routes ─────────────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      email, password, name, handle,
      role, schoolId, acceptedTerms,
      favoriteSchool, supportingSchools,
      emailUpdates, pushNotifications,
    } = req.body;

    if (!email || !password || !name || !handle) {
      return res.status(400).json({ error: 'Email, password, name, and handle are required' });
    }

    if (!acceptedTerms) {
      return res.status(400).json({ error: 'You must accept the terms of service' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDb();

    // Enforce user capacity
    const userCount = db.users.filter((u) => u.role === 'user').length;
    if ((role || 'user') === 'user' && userCount >= MAX_USERS) {
      return res.status(403).json({ error: 'User registration is currently full. Please try again later.' });
    }

    // Enforce admin capacity
    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (role === 'admin' && adminCount >= MAX_SCHOOL_ADMINS) {
      return res.status(403).json({ error: 'Admin capacity reached. Contact support for more slots.' });
    }

    if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    if (db.users.find((u) => u.handle.toLowerCase() === handle.toLowerCase())) {
      return res.status(409).json({ error: 'Handle already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = generate6DigitCode();
    const now = new Date().toISOString();

    const user = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      role: role || 'user',
      schoolId: schoolId || favoriteSchool || 'rally-university',
      favoriteSchool: favoriteSchool || 'rally-university',
      supportingSchools: Array.isArray(supportingSchools) ? supportingSchools.slice(0, 2) : [],
      emailVerified: false,
      emailUpdates: emailUpdates !== undefined ? emailUpdates : true,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
      acceptedTerms: true,
      verificationCode,
      verificationCodeExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: now,
      lastLogin: now,
    };

    db.users.push(user);
    writeDb(db);

    const token = generateToken(user.id);

    console.log(`[Register] User ${user.email} registered. Verification code: ${verificationCode}`);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
      verificationCode, // Included for demo/dev - remove in production
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Rate limit: 10 attempts per email per 15 minutes
    const rateLimitKey = `login:${email.toLowerCase()}`;
    if (!rateLimit(rateLimitKey, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

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
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(sanitizeUser(req.user));
});

// Update current user profile
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const {
      name, handle, schoolId, password,
      favoriteSchool, supportingSchools,
      emailUpdates, pushNotifications,
    } = req.body;

    const db = getDb();
    const user = db.users.find((u) => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) user.name = name.trim();
    if (handle !== undefined) {
      const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
      const existing = db.users.find((u) => u.handle.toLowerCase() === normalizedHandle.toLowerCase() && u.id !== user.id);
      if (existing) {
        return res.status(409).json({ error: 'Handle already taken' });
      }
      user.handle = normalizedHandle;
    }
    if (schoolId !== undefined) user.schoolId = schoolId;
    if (favoriteSchool !== undefined) {
      user.favoriteSchool = favoriteSchool;
      user.schoolId = favoriteSchool; // keep schoolId in sync
    }
    if (supportingSchools !== undefined) {
      user.supportingSchools = Array.isArray(supportingSchools) ? supportingSchools.slice(0, 2) : [];
    }
    if (emailUpdates !== undefined) user.emailUpdates = emailUpdates;
    if (pushNotifications !== undefined) user.pushNotifications = pushNotifications;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    writeDb(db);
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
app.post('/api/auth/verify-email', authenticateToken, (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.json({ message: 'Email already verified', user: sanitizeUser(user) });
  }

  // Check expiry
  if (user.verificationCodeExpiry && new Date(user.verificationCodeExpiry) < new Date()) {
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (user.verificationCode !== code.toString().trim()) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  user.emailVerified = true;
  user.verificationCode = null;
  user.verificationCodeExpiry = null;
  writeDb(db);

  console.log(`[Verify] User ${user.email} email verified`);

  res.json({ message: 'Email verified successfully', user: sanitizeUser(user) });
});

// Resend verification code
app.post('/api/auth/resend-verification', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.json({ message: 'Email already verified' });
  }

  // Rate limit: 3 resends per 5 minutes
  const rateLimitKey = `resend:${user.id}`;
  if (!rateLimit(rateLimitKey, 3, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many resend requests. Please wait before trying again.' });
  }

  const newCode = generate6DigitCode();
  user.verificationCode = newCode;
  user.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  writeDb(db);

  console.log(`[Resend] Verification code for ${user.email}: ${newCode}`);

  res.json({
    message: 'Verification code resent',
    verificationCode: newCode, // Included for demo/dev - remove in production
  });
});

// Forgot password - request reset code
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Rate limit: 5 requests per email per 15 minutes
  const rateLimitKey = `forgot:${email.toLowerCase()}`;
  if (!rateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many reset requests. Please try again later.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({
      message: 'If an account with that email exists, a reset code has been sent.',
      resetCode: null,
    });
  }

  const resetCode = generate6DigitCode();
  user.resetToken = resetCode;
  user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  writeDb(db);

  console.log(`[ForgotPassword] Reset code for ${user.email}: ${resetCode}`);

  res.json({
    message: 'If an account with that email exists, a reset code has been sent.',
    resetCode, // Included for demo/dev - remove in production
  });
});

// Reset password with code
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(400).json({ error: 'Invalid email or reset code' });
  }

  if (!user.resetToken || user.resetToken !== code.toString().trim()) {
    return res.status(400).json({ error: 'Invalid reset code' });
  }

  if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  writeDb(db);

  console.log(`[ResetPassword] Password reset for ${user.email}`);

  res.json({ message: 'Password reset successfully' });
});

// ─── User management routes ─────────────────────────────────────────────────

app.get('/api/users', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const users = db.users.map((u) => sanitizeUser(u));
  res.json(users);
});

app.get('/api/users/:id', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(sanitizeUser(user));
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

  res.json(sanitizeUser(user));
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

// ─── Capacity & Admin Provisioning ──────────────────────────────────────────

// Get server capacity status
app.get('/api/capacity', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const admins = db.users.filter((u) => u.role === 'admin');
  const users = db.users.filter((u) => u.role === 'user');
  const developers = db.users.filter((u) => u.role === 'developer');

  // Schools with active admins
  const schoolsWithAdmins = [...new Set(admins.map((a) => a.schoolId).filter(Boolean))];

  res.json({
    admins: {
      current: admins.length,
      max: MAX_SCHOOL_ADMINS,
      available: Math.max(0, MAX_SCHOOL_ADMINS - admins.length),
      schools: schoolsWithAdmins,
    },
    users: {
      current: users.length,
      max: MAX_USERS,
      available: Math.max(0, MAX_USERS - users.length),
    },
    developers: {
      current: developers.length,
    },
    totalAccounts: db.users.length,
  });
});

// Provision a school admin (developer-only)
app.post('/api/admin/provision', authenticateToken, requireRole(['developer']), async (req, res) => {
  const { email, password, name, handle, schoolId } = req.body;

  if (!email || !password || !name || !handle || !schoolId) {
    return res.status(400).json({ error: 'email, password, name, handle, and schoolId are all required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Verify school exists
  const schools = getSchools();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) {
    return res.status(404).json({ error: `School "${schoolId}" not found in schools list` });
  }

  const db = getDb();

  // Check admin capacity
  const adminCount = db.users.filter((u) => u.role === 'admin').length;
  if (adminCount >= MAX_SCHOOL_ADMINS) {
    return res.status(403).json({
      error: `Admin capacity reached (${adminCount}/${MAX_SCHOOL_ADMINS}). Upgrade your plan to add more admins.`,
    });
  }

  // Check email uniqueness
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Check handle uniqueness
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  if (db.users.find((u) => u.handle.toLowerCase() === normalizedHandle.toLowerCase())) {
    return res.status(409).json({ error: 'Handle already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const admin = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    handle: normalizedHandle,
    role: 'admin',
    schoolId,
    favoriteSchool: schoolId,
    supportingSchools: [],
    emailVerified: true, // Pre-verified since provisioned by developer
    emailUpdates: true,
    pushNotifications: true,
    acceptedTerms: true,
    verificationCode: null,
    verificationCodeExpiry: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: now,
    lastLogin: now,
  };

  db.users.push(admin);

  // Initialize school settings if not present
  if (!db.schoolSettings[schoolId]) {
    db.schoolSettings[schoolId] = {
      sponsorBannerEnabled: true,
      splashEnabled: true,
      customRewards: [],
    };
  }

  writeDb(db);

  console.log(`[Provision] Admin "${admin.email}" provisioned for school "${school.name}" by ${req.user.email}`);

  res.status(201).json({
    admin: sanitizeUser(admin),
    school: { id: school.id, name: school.name, shortName: school.shortName },
    capacity: {
      adminsUsed: adminCount + 1,
      adminsMax: MAX_SCHOOL_ADMINS,
      adminsAvailable: MAX_SCHOOL_ADMINS - adminCount - 1,
    },
  });
});

// Bulk provision multiple school admins (developer-only)
app.post('/api/admin/provision/bulk', authenticateToken, requireRole(['developer']), async (req, res) => {
  const { admins: adminList } = req.body;

  if (!Array.isArray(adminList) || adminList.length === 0) {
    return res.status(400).json({ error: 'admins array is required with at least one entry' });
  }

  const db = getDb();
  const schools = getSchools();
  const currentAdminCount = db.users.filter((u) => u.role === 'admin').length;

  if (currentAdminCount + adminList.length > MAX_SCHOOL_ADMINS) {
    return res.status(403).json({
      error: `Would exceed admin capacity. Current: ${currentAdminCount}, Requested: ${adminList.length}, Max: ${MAX_SCHOOL_ADMINS}`,
    });
  }

  const results = [];
  const errors = [];

  for (const entry of adminList) {
    const { email, password, name, handle, schoolId } = entry;

    if (!email || !password || !name || !handle || !schoolId) {
      errors.push({ email: email || 'unknown', error: 'Missing required fields' });
      continue;
    }

    const school = schools.find((s) => s.id === schoolId);
    if (!school) {
      errors.push({ email, error: `School "${schoolId}" not found` });
      continue;
    }

    if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      errors.push({ email, error: 'Email already registered' });
      continue;
    }

    const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    if (db.users.find((u) => u.handle.toLowerCase() === normalizedHandle.toLowerCase())) {
      errors.push({ email, error: 'Handle already taken' });
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const admin = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      handle: normalizedHandle,
      role: 'admin',
      schoolId,
      favoriteSchool: schoolId,
      supportingSchools: [],
      emailVerified: true,
      emailUpdates: true,
      pushNotifications: true,
      acceptedTerms: true,
      verificationCode: null,
      verificationCodeExpiry: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: now,
      lastLogin: now,
    };

    db.users.push(admin);

    if (!db.schoolSettings[schoolId]) {
      db.schoolSettings[schoolId] = {
        sponsorBannerEnabled: true,
        splashEnabled: true,
        customRewards: [],
      };
    }

    results.push({ email: admin.email, schoolId, schoolName: school.name });
  }

  writeDb(db);

  const finalAdminCount = db.users.filter((u) => u.role === 'admin').length;
  console.log(`[Bulk Provision] ${results.length} admins provisioned by ${req.user.email}`);

  res.status(201).json({
    provisioned: results,
    errors,
    capacity: {
      adminsUsed: finalAdminCount,
      adminsMax: MAX_SCHOOL_ADMINS,
      adminsAvailable: MAX_SCHOOL_ADMINS - finalAdminCount,
    },
  });
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

app.post('/api/analytics/track', (req, res) => {
  const { event, page, schoolId, metadata, timestamp } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  // Try to extract user from token (optional - allow unauthenticated tracking)
  let userId = 'anonymous';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      userId = decoded.userId || decoded.id || 'anonymous';
    } catch {
      // Continue with anonymous
    }
  }

  const analyticsEntry = {
    id: uuidv4(),
    event,
    page: page || '',
    userId,
    schoolId: schoolId || 'unknown',
    metadata: metadata || {},
    timestamp: timestamp || new Date().toISOString()
  };

  const db = getDb();
  db.analytics.push(analyticsEntry);
  // Keep only last 1000 events to prevent unbounded growth
  if (db.analytics.length > 1000) {
    db.analytics = db.analytics.slice(-1000);
  }
  writeDb(db);

  res.status(201).json(analyticsEntry);
});

app.get('/api/analytics/summary', authenticateToken, requireRole(['admin', 'developer']), (req, res) => {
  const db = getDb();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Total users
  const totalUsers = db.users.length;

  // Verified users
  const verifiedUsers = db.users.filter((u) => u.emailVerified).length;

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

  // Users by school (favorite)
  const usersBySchool = {};
  for (const user of db.users) {
    const school = user.favoriteSchool || user.schoolId || 'unassigned';
    usersBySchool[school] = (usersBySchool[school] || 0) + 1;
  }

  // Notification preferences
  const emailOptIn = db.users.filter((u) => u.emailUpdates !== false).length;
  const pushOptIn = db.users.filter((u) => u.pushNotifications !== false).length;

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

  // Recent events (last 50)
  const recentEvents = db.analytics
    .slice(-50)
    .reverse()
    .map((e) => ({
      event: e.event,
      page: e.page || '',
      timestamp: e.timestamp,
      userId: e.userId
    }));

  res.json({
    totalUsers,
    verifiedUsers,
    activeToday,
    eventsTracked: totalEvents,
    totalEvents,
    eventsByType,
    topSchools,
    usersBySchool,
    emailOptIn,
    pushOptIn,
    dailyActiveUsers,
    recentEvents
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

// ─── Seed demo accounts on startup ──────────────────────────────────────────

async function seedDemoAccounts() {
  const db = getDb();
  const demoAccounts = [
    {
      email: 'jason@rally.com',
      password: 'Rally2026!',
      name: 'Jason Kowitt',
      handle: '@jkowitt',
      role: 'developer',
      favoriteSchool: 'rally-university',
      supportingSchools: [],
    },
    {
      email: 'admin@rally.com',
      password: 'Rally2026!',
      name: 'Alex Rivera',
      handle: '@alexr',
      role: 'admin',
      favoriteSchool: 'rally-university',
      supportingSchools: [],
    },
    {
      email: 'user@rally.com',
      password: 'Rally2026!',
      name: 'Jordan Mitchell',
      handle: '@jordanm',
      role: 'user',
      favoriteSchool: 'rally-university',
      supportingSchools: [],
    },
  ];

  let seeded = 0;
  for (const account of demoAccounts) {
    const existing = db.users.find((u) => u.email.toLowerCase() === account.email.toLowerCase());
    if (!existing) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      const now = new Date().toISOString();
      db.users.push({
        id: `demo-${account.role}-001`,
        email: account.email,
        passwordHash,
        name: account.name,
        handle: account.handle,
        role: account.role,
        schoolId: account.favoriteSchool,
        favoriteSchool: account.favoriteSchool,
        supportingSchools: account.supportingSchools,
        emailVerified: true,
        emailUpdates: true,
        pushNotifications: true,
        acceptedTerms: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: now,
        lastLogin: now,
      });
      seeded++;
    } else {
      // Update existing demo accounts to have new fields if missing
      if (existing.favoriteSchool === undefined) existing.favoriteSchool = account.favoriteSchool;
      if (existing.supportingSchools === undefined) existing.supportingSchools = account.supportingSchools;
      if (existing.emailVerified === undefined) existing.emailVerified = true;
      if (existing.emailUpdates === undefined) existing.emailUpdates = true;
      if (existing.pushNotifications === undefined) existing.pushNotifications = true;
    }
  }

  if (seeded > 0) {
    writeDb(db);
    console.log(`[Seed] Created ${seeded} demo account(s)`);
  }
}

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Rally server running at http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Seed demo accounts
  await seedDemoAccounts();
});
