import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Rally database...');

  // =====================
  // SCHOOLS
  // =====================
  const schools = [
    // College - SEC
    { id: 'sch-alabama', name: 'Alabama', mascot: 'Crimson Tide', conference: 'SEC', primaryColor: '#9E1B32', secondaryColor: '#FFFFFF' },
    { id: 'sch-georgia', name: 'Georgia', mascot: 'Bulldogs', conference: 'SEC', primaryColor: '#BA0C2F', secondaryColor: '#000000' },
    { id: 'sch-lsu', name: 'LSU', mascot: 'Tigers', conference: 'SEC', primaryColor: '#461D7C', secondaryColor: '#FDD023' },
    { id: 'sch-tennessee', name: 'Tennessee', mascot: 'Volunteers', conference: 'SEC', primaryColor: '#FF8200', secondaryColor: '#FFFFFF' },
    { id: 'sch-texas', name: 'Texas', mascot: 'Longhorns', conference: 'SEC', primaryColor: '#BF5700', secondaryColor: '#FFFFFF' },
    { id: 'sch-florida', name: 'Florida', mascot: 'Gators', conference: 'SEC', primaryColor: '#0021A5', secondaryColor: '#FA4616' },
    // College - Big Ten
    { id: 'sch-ohio-state', name: 'Ohio State', mascot: 'Buckeyes', conference: 'Big Ten', primaryColor: '#BB0000', secondaryColor: '#666666' },
    { id: 'sch-michigan', name: 'Michigan', mascot: 'Wolverines', conference: 'Big Ten', primaryColor: '#00274C', secondaryColor: '#FFCB05' },
    { id: 'sch-penn-state', name: 'Penn State', mascot: 'Nittany Lions', conference: 'Big Ten', primaryColor: '#041E42', secondaryColor: '#FFFFFF' },
    { id: 'sch-usc', name: 'USC', mascot: 'Trojans', conference: 'Big Ten', primaryColor: '#990000', secondaryColor: '#FFC72C' },
    // College - Big 12
    { id: 'sch-kansas', name: 'Kansas', mascot: 'Jayhawks', conference: 'Big 12', primaryColor: '#0051BA', secondaryColor: '#E8000D' },
    { id: 'sch-byu', name: 'BYU', mascot: 'Cougars', conference: 'Big 12', primaryColor: '#002E5D', secondaryColor: '#FFFFFF' },
    // College - ACC
    { id: 'sch-clemson', name: 'Clemson', mascot: 'Tigers', conference: 'ACC', primaryColor: '#F56600', secondaryColor: '#522D80' },
    { id: 'sch-miami', name: 'Miami', mascot: 'Hurricanes', conference: 'ACC', primaryColor: '#F47321', secondaryColor: '#005030' },
    // NBA
    { id: 'nba-lakers', name: 'Los Angeles Lakers', mascot: 'Lakers', conference: 'NBA - Western', primaryColor: '#552583', secondaryColor: '#FDB927' },
    { id: 'nba-celtics', name: 'Boston Celtics', mascot: 'Celtics', conference: 'NBA - Eastern', primaryColor: '#007A33', secondaryColor: '#BA9653' },
    { id: 'nba-warriors', name: 'Golden State Warriors', mascot: 'Warriors', conference: 'NBA - Western', primaryColor: '#1D428A', secondaryColor: '#FFC72C' },
    { id: 'nba-knicks', name: 'New York Knicks', mascot: 'Knicks', conference: 'NBA - Eastern', primaryColor: '#006BB6', secondaryColor: '#F58426' },
    // NFL
    { id: 'nfl-chiefs', name: 'Kansas City Chiefs', mascot: 'Chiefs', conference: 'NFL - AFC', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
    { id: 'nfl-cowboys', name: 'Dallas Cowboys', mascot: 'Cowboys', conference: 'NFL - NFC', primaryColor: '#003594', secondaryColor: '#869397' },
    { id: 'nfl-eagles', name: 'Philadelphia Eagles', mascot: 'Eagles', conference: 'NFL - NFC', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
    { id: 'nfl-49ers', name: 'San Francisco 49ers', mascot: '49ers', conference: 'NFL - NFC', primaryColor: '#AA0000', secondaryColor: '#B3995D' },
    // MLB
    { id: 'mlb-yankees', name: 'New York Yankees', mascot: 'Yankees', conference: 'MLB - AL', primaryColor: '#003087', secondaryColor: '#E4002C' },
    { id: 'mlb-dodgers', name: 'Los Angeles Dodgers', mascot: 'Dodgers', conference: 'MLB - NL', primaryColor: '#005A9C', secondaryColor: '#EF3E42' },
    // NHL
    { id: 'nhl-bruins', name: 'Boston Bruins', mascot: 'Bruins', conference: 'NHL - Eastern', primaryColor: '#FCB514', secondaryColor: '#000000' },
    { id: 'nhl-rangers', name: 'New York Rangers', mascot: 'Rangers', conference: 'NHL - Eastern', primaryColor: '#0038A8', secondaryColor: '#CE1126' },
    // MLS
    { id: 'mls-lafc', name: 'LAFC', mascot: 'LAFC', conference: 'MLS - Western', primaryColor: '#C39E6D', secondaryColor: '#000000' },
    { id: 'mls-atlanta', name: 'Atlanta United', mascot: 'Atlanta United', conference: 'MLS - Eastern', primaryColor: '#80000A', secondaryColor: '#221F1F' },
    // NWSL
    { id: 'nwsl-gotham', name: 'Gotham FC', mascot: 'Gotham', conference: 'NWSL', primaryColor: '#001532', secondaryColor: '#D4AF37' },
    { id: 'nwsl-thorns', name: 'Portland Thorns', mascot: 'Thorns', conference: 'NWSL', primaryColor: '#981D1F', secondaryColor: '#004812' },
  ];

  for (const school of schools) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: school,
      create: school,
    });
  }
  console.log(`Seeded ${schools.length} schools/teams`);

  // =====================
  // DEMO USERS
  // =====================
  const demoPassword = await bcrypt.hash('Rally2026!', 10);

  // Developer (you — full control)
  const admin = await prisma.rallyUser.upsert({
    where: { email: 'jason@rally.com' },
    update: { password: demoPassword, role: 'DEVELOPER' },
    create: {
      email: 'jason@rally.com',
      password: demoPassword,
      name: 'Jason Kowitt',
      handle: 'jkowitt',
      role: 'DEVELOPER',
      schoolId: 'sch-georgia',
      favoriteSchool: 'sch-georgia',
      supportingSchools: ['sch-georgia', 'sch-tennessee'],
      emailVerified: true,
      acceptedTerms: true,
      userType: 'general_fan',
      points: 3200,
      tier: 'Gold',
    },
  });

  // Admin demo user
  await prisma.rallyUser.upsert({
    where: { email: 'admin@rally.com' },
    update: { password: demoPassword, role: 'ADMIN' },
    create: {
      email: 'admin@rally.com',
      password: demoPassword,
      name: 'Rally Admin',
      handle: 'rally-admin',
      role: 'ADMIN',
      schoolId: 'sch-alabama',
      favoriteSchool: 'sch-alabama',
      supportingSchools: ['sch-alabama', 'sch-georgia'],
      emailVerified: true,
      acceptedTerms: true,
      userType: 'general_fan',
      points: 1500,
      tier: 'Silver',
    },
  });

  // Regular user
  const fan = await prisma.rallyUser.upsert({
    where: { email: 'user@rally.com' },
    update: { password: demoPassword, role: 'USER' },
    create: {
      email: 'user@rally.com',
      password: demoPassword,
      name: 'Demo Fan',
      handle: 'demo-fan',
      role: 'USER',
      schoolId: 'sch-alabama',
      favoriteSchool: 'sch-alabama',
      supportingSchools: ['sch-alabama', 'sch-lsu'],
      emailVerified: true,
      acceptedTerms: true,
      userType: 'student',
      birthYear: 2002,
      residingCity: 'Tuscaloosa',
      residingState: 'AL',
      favoriteSports: ['Football', 'Basketball'],
      points: 750,
      tier: 'Bronze',
    },
  });

  console.log('Seeded demo users:');
  console.log('  Developer: jason@rally.com / Rally2026! (full control)');
  console.log('  Admin:     admin@rally.com / Rally2026!');
  console.log('  User:      user@rally.com  / Rally2026!');

  // =====================
  // SAMPLE EVENTS
  // =====================
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const events = [
    {
      id: 'evt-1',
      title: 'Georgia vs Tennessee',
      sport: 'Football',
      homeSchoolId: 'sch-georgia',
      homeTeam: 'Georgia Bulldogs',
      awaySchoolId: 'sch-tennessee',
      awayTeam: 'Tennessee Volunteers',
      venue: 'Sanford Stadium',
      city: 'Athens, GA',
      dateTime: nextWeek,
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'evt-2',
      title: 'Alabama vs LSU',
      sport: 'Football',
      homeSchoolId: 'sch-alabama',
      homeTeam: 'Alabama Crimson Tide',
      awaySchoolId: 'sch-lsu',
      awayTeam: 'LSU Tigers',
      venue: 'Bryant-Denny Stadium',
      city: 'Tuscaloosa, AL',
      dateTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'LIVE' as const,
      createdBy: admin.id,
    },
    {
      id: 'evt-3',
      title: 'Lakers vs Celtics',
      sport: 'Basketball',
      homeSchoolId: 'nba-lakers',
      homeTeam: 'Los Angeles Lakers',
      awaySchoolId: 'nba-celtics',
      awayTeam: 'Boston Celtics',
      venue: 'Crypto.com Arena',
      city: 'Los Angeles, CA',
      dateTime: nextMonth,
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'evt-4',
      title: 'Chiefs vs Cowboys',
      sport: 'Football',
      homeSchoolId: 'nfl-chiefs',
      homeTeam: 'Kansas City Chiefs',
      awaySchoolId: 'nfl-cowboys',
      awayTeam: 'Dallas Cowboys',
      venue: 'Arrowhead Stadium',
      city: 'Kansas City, MO',
      dateTime: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: event,
      create: event,
    });
  }
  console.log(`Seeded ${events.length} events`);

  // =====================
  // ACTIVATIONS (for each event)
  // =====================
  const activationTemplates = [
    { type: 'checkin', name: 'Game Day Check-In', points: 50, description: 'Check in when you arrive at the venue' },
    { type: 'trivia', name: 'Pre-Game Trivia', points: 25, description: 'Answer 5 trivia questions about the teams' },
    { type: 'prediction', name: 'Score Prediction', points: 30, description: 'Predict the final score' },
    { type: 'noise_meter', name: 'Crowd Noise Challenge', points: 15, description: 'Help make some noise during key moments' },
    { type: 'photo', name: 'Fan Photo', points: 20, description: 'Share your gameday photo' },
    { type: 'poll', name: 'MVP Vote', points: 10, description: 'Vote for the game MVP' },
  ];

  for (const event of events) {
    // Delete existing activations to avoid duplicates
    await prisma.eventActivation.deleteMany({ where: { eventId: event.id } });

    for (const tmpl of activationTemplates) {
      await prisma.eventActivation.create({
        data: {
          eventId: event.id,
          ...tmpl,
        },
      });
    }
  }
  console.log(`Seeded activations for all events`);

  // =====================
  // SAMPLE REWARDS
  // =====================
  const rewardsBySchool = [
    { schoolId: 'sch-georgia', rewards: [
      { name: '10% Off Team Store', pointsCost: 200, description: 'Get 10% off your next purchase at the Georgia team store' },
      { name: 'Free Concession Drink', pointsCost: 150, description: 'Redeem for a free drink at any concession stand' },
      { name: 'Meet & Greet Entry', pointsCost: 2000, description: 'Entry into a drawing for a player meet & greet' },
      { name: 'VIP Parking Pass', pointsCost: 1500, description: 'VIP parking for one home game' },
    ]},
    { schoolId: 'sch-alabama', rewards: [
      { name: 'Bama Team Poster', pointsCost: 100, description: 'Autographed team poster' },
      { name: 'Free Nachos', pointsCost: 125, description: 'Free nachos at any Bryant-Denny concession' },
      { name: 'Sideline Pass', pointsCost: 5000, description: 'Pre-game sideline experience' },
    ]},
    { schoolId: 'nba-lakers', rewards: [
      { name: 'Lakers Mini Basketball', pointsCost: 300, description: 'Official Lakers mini basketball' },
      { name: 'Courtside Upgrade Entry', pointsCost: 3000, description: 'Entry into courtside seat upgrade drawing' },
    ]},
    { schoolId: 'nfl-chiefs', rewards: [
      { name: 'Chiefs Rally Towel', pointsCost: 150, description: 'Limited edition rally towel' },
      { name: 'Tailgate Party Access', pointsCost: 1000, description: 'Access to the official pre-game tailgate' },
    ]},
  ];

  for (const { schoolId, rewards } of rewardsBySchool) {
    for (const reward of rewards) {
      await prisma.reward.create({
        data: { schoolId, ...reward },
      });
    }
  }
  console.log('Seeded rewards');

  // =====================
  // SAMPLE POINTS HISTORY (for demo fan)
  // =====================
  const pointsEntries = [
    { userId: fan.id, eventId: 'evt-2', activationName: 'Game Day Check-In', points: 50, schoolId: 'sch-alabama' },
    { userId: fan.id, eventId: 'evt-2', activationName: 'Pre-Game Trivia', points: 25, schoolId: 'sch-alabama' },
    { userId: fan.id, eventId: 'evt-2', activationName: 'Score Prediction', points: 30, schoolId: 'sch-alabama' },
    { userId: fan.id, activationName: 'Daily Login', points: 5, schoolId: 'sch-alabama' },
    { userId: fan.id, activationName: 'Profile Complete', points: 100, schoolId: 'sch-alabama' },
    { userId: fan.id, activationName: 'Referred a Friend', points: 200, schoolId: 'sch-alabama' },
    { userId: admin.id, activationName: 'Game Day Check-In', points: 50, schoolId: 'sch-georgia' },
    { userId: admin.id, activationName: 'Pre-Game Trivia', points: 25, schoolId: 'sch-georgia' },
  ];

  for (const entry of pointsEntries) {
    await prisma.pointsEntry.create({
      data: {
        ...entry,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
      },
    });
  }
  console.log('Seeded points history');

  // =====================
  // SAMPLE CONTENT
  // =====================
  const contentItems = [
    { type: 'article', title: 'Welcome to Rally!', body: 'Rally is the sports community app where fans earn rewards for showing up, engaging, and being loyal. Start earning points today!', author: 'Rally Team' },
    { type: 'highlight', title: 'This Week\'s Top Fans', body: 'Congratulations to our top earners this week! Check the leaderboard to see where you rank.', author: 'Rally Team' },
    { type: 'update', title: 'New Rewards Available', body: 'We\'ve added new rewards across multiple teams. Check your rewards page to see what\'s new!', author: 'Rally Team' },
  ];

  for (const item of contentItems) {
    await prisma.contentItem.create({ data: item });
  }
  console.log('Seeded content');

  // =====================
  // SAMPLE BONUS OFFER
  // =====================
  await prisma.bonusOffer.create({
    data: {
      schoolId: 'sch-georgia',
      name: 'Double Points Weekend',
      description: 'Earn 2x points on all check-ins this weekend',
      bonusMultiplier: 2,
      activationType: 'checkin',
      startsAt: now,
      expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdBy: admin.id,
    },
  });
  console.log('Seeded bonus offer');

  console.log('\nSeed complete!');
  console.log('---');
  console.log('Developer: jason@rally.com / Rally2026! (full control, only role that can grant admin)');
  console.log('Admin:     admin@rally.com / Rally2026!');
  console.log('User:      user@rally.com  / Rally2026!');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
