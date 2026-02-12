const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

const seed = async () => {
  console.log('Seeding Rally database...');

  // ─── Users ───────────────────────────────────────────────────────────────

  const password = 'Rally2026!';
  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const users = [
    {
      id: uuidv4(),
      email: 'jason@rally.com',
      passwordHash: hash,
      name: 'Jason Kowitt',
      handle: '@jkowitt',
      role: 'developer',
      schoolId: 'kent-state',
      createdAt: now,
      acceptedTerms: true,
      lastLogin: now
    },
    {
      id: uuidv4(),
      email: 'admin@rally.com',
      passwordHash: hash,
      name: 'Rally Admin',
      handle: '@rallyadmin',
      role: 'admin',
      schoolId: 'kent-state',
      createdAt: now,
      acceptedTerms: true,
      lastLogin: now
    },
    {
      id: uuidv4(),
      email: 'user@rally.com',
      passwordHash: hash,
      name: 'Alex Johnson',
      handle: '@alexj',
      role: 'user',
      schoolId: 'kent-state',
      createdAt: now,
      acceptedTerms: true,
      lastLogin: now
    }
  ];

  // ─── Content ─────────────────────────────────────────────────────────────

  const content = [
    {
      id: uuidv4(),
      schoolId: 'kent-state',
      type: 'banner',
      title: 'Welcome to Kent State Rally',
      description: 'Get ready for an amazing game day experience!',
      url: '/uploads/banner-welcome.png',
      active: true,
      order: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      schoolId: 'kent-state',
      type: 'banner',
      title: 'Season Ticket Promo',
      description: 'Save 20% on season tickets when you sign up through Rally.',
      url: '/uploads/banner-tickets.png',
      active: true,
      order: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      schoolId: 'kent-state',
      type: 'banner',
      title: 'Golden Flashes Merch',
      description: 'Exclusive merchandise available for Rally members.',
      url: '/uploads/banner-merch.png',
      active: true,
      order: 2,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      schoolId: 'kent-state',
      type: 'video',
      title: 'Gameday Highlights - Week 1',
      description: 'Relive the best moments from the season opener.',
      url: 'https://example.com/videos/highlights-week1.mp4',
      active: true,
      order: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      schoolId: 'kent-state',
      type: 'video',
      title: 'Fan Rally Recap',
      description: 'See the energy from our biggest fan rally event yet.',
      url: 'https://example.com/videos/fan-rally-recap.mp4',
      active: true,
      order: 1,
      createdAt: now,
      updatedAt: now
    }
  ];

  // ─── Analytics ───────────────────────────────────────────────────────────

  const eventTypes = [
    'app_open',
    'check_in',
    'trivia_complete',
    'prediction_submit',
    'reward_redeem',
    'photo_submit',
    'poll_vote'
  ];

  const analytics = [];
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const startTime = Date.now() - thirtyDaysMs;

  for (let i = 0; i < 50; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomTime = new Date(startTime + Math.random() * thirtyDaysMs);

    const metadata = {};
    if (randomEvent === 'trivia_complete') {
      metadata.score = Math.floor(Math.random() * 10) + 1;
      metadata.totalQuestions = 10;
    } else if (randomEvent === 'prediction_submit') {
      metadata.gameId = `game-${Math.floor(Math.random() * 5) + 1}`;
      metadata.prediction = Math.random() > 0.5 ? 'home' : 'away';
    } else if (randomEvent === 'reward_redeem') {
      metadata.rewardId = `reward-${Math.floor(Math.random() * 3) + 1}`;
      metadata.pointsCost = (Math.floor(Math.random() * 5) + 1) * 100;
    } else if (randomEvent === 'check_in') {
      metadata.venue = 'Dix Stadium';
      metadata.method = Math.random() > 0.5 ? 'geofence' : 'beacon';
    }

    analytics.push({
      id: uuidv4(),
      event: randomEvent,
      userId: randomUser.id,
      schoolId: 'kent-state',
      metadata,
      timestamp: randomTime.toISOString()
    });
  }

  // Sort by timestamp
  analytics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // ─── School Settings ────────────────────────────────────────────────────

  const schoolSettings = {
    'kent-state': {
      sponsorBannerEnabled: true,
      splashEnabled: true,
      customRewards: [
        { id: uuidv4(), name: 'Free Popcorn', pointsCost: 200, description: 'Redeem for a free popcorn at the concession stand.' },
        { id: uuidv4(), name: 'T-Shirt', pointsCost: 500, description: 'Get an exclusive Rally t-shirt.' },
        { id: uuidv4(), name: 'VIP Parking', pointsCost: 1000, description: 'Premium parking pass for next home game.' }
      ]
    }
  };

  // ─── Write database ─────────────────────────────────────────────────────

  const db = {
    users,
    content,
    analytics,
    pageEdits: [],
    schoolSettings
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');

  console.log(`Seeded ${users.length} users`);
  console.log(`Seeded ${content.length} content items`);
  console.log(`Seeded ${analytics.length} analytics events`);
  console.log(`Seeded school settings for kent-state`);
  console.log(`Database written to ${DATA_FILE}`);
  console.log('\nLogin credentials:');
  console.log('  Developer: jason@rally.com / Rally2026!');
  console.log('  Admin:     admin@rally.com / Rally2026!');
  console.log('  User:      user@rally.com  / Rally2026!');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
