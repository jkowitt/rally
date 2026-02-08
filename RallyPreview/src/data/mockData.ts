// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RewardCategory = 'food' | 'merch' | 'experience' | 'exclusive';

export interface Reward {
  id: string;
  name: string;
  emoji: string;
  points: number;
  category: RewardCategory;
  description: string;
  bgColor: string; // dark background for card
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface FeedItem {
  id: string;
  type: 'article' | 'video' | 'poll';
  title: string;
  subtitle: string;
  emoji: string;
  badge: string;
  bgColor: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  initial: string;
  isUser: boolean;
}

export interface PointsEntry {
  id: string;
  description: string;
  amount: number; // positive = earned, negative = spent
  source: string;
  timestamp: Date;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  emoji: string;
  timestamp: Date;
  read: boolean;
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

export const REWARDS: Reward[] = [
  {
    id: 'reward-1',
    name: 'Free Hot Dog',
    emoji: '\u{1F354}',
    points: 200,
    category: 'food',
    description: 'Redeem for a free hot dog at any concession stand on gameday.',
    bgColor: '#2A1A0E',
  },
  {
    id: 'reward-2',
    name: 'Rally T-Shirt',
    emoji: '\u{1F455}',
    points: 500,
    category: 'merch',
    description: 'Exclusive Rally-branded t-shirt available in all sizes.',
    bgColor: '#0E1A2A',
  },
  {
    id: 'reward-3',
    name: 'Signed Football',
    emoji: '\u{1F3C8}',
    points: 2000,
    category: 'experience',
    description: 'A football signed by the head coach and team captains.',
    bgColor: '#1A2A0E',
  },
  {
    id: 'reward-4',
    name: 'Sideline Pass',
    emoji: '\u{1F3AC}',
    points: 5000,
    category: 'exclusive',
    description: 'Get an exclusive sideline pass for pregame warm-ups.',
    bgColor: '#2A0E1A',
  },
  {
    id: 'reward-5',
    name: 'Free Nachos',
    emoji: '\u{1F32E}',
    points: 150,
    category: 'food',
    description: 'Enjoy a free plate of loaded nachos at any concession stand.',
    bgColor: '#2A200E',
  },
  {
    id: 'reward-6',
    name: 'VIP Upgrade',
    emoji: '\u26A1',
    points: 3000,
    category: 'exclusive',
    description: 'Upgrade your seat to the VIP section for one game.',
    bgColor: '#1A0E2A',
  },
];

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 'trivia-1',
    question: 'In what year was the university football program founded?',
    options: ['1892', '1901', '1915', '1923'],
    correctIndex: 1,
  },
  {
    id: 'trivia-2',
    question: 'What animal originally inspired the team mascot?',
    options: ['Eagle', 'Bear', 'Tiger', 'Bulldog'],
    correctIndex: 2,
  },
  {
    id: 'trivia-3',
    question: 'What is the official capacity of the home stadium?',
    options: ['72,000', '82,500', '91,000', '102,000'],
    correctIndex: 1,
  },
  {
    id: 'trivia-4',
    question: 'How many conference championships has the team won?',
    options: ['8', '12', '15', '19'],
    correctIndex: 2,
  },
  {
    id: 'trivia-5',
    question: 'Which rivalry trophy game has been played the longest?',
    options: ['The Iron Skillet', 'The Golden Boot', 'The Old Oaken Bucket', 'The Victory Bell'],
    correctIndex: 2,
  },
];

export const FEED_ITEMS: FeedItem[] = [
  {
    id: 'feed-1',
    type: 'article',
    title: 'Season Opener Preview: What to Expect',
    subtitle: 'Breaking down the matchup, key players, and predictions for Saturday.',
    emoji: '\u{1F4F0}',
    badge: 'New',
    bgColor: '#131B2E',
  },
  {
    id: 'feed-2',
    type: 'video',
    title: 'Behind the Scenes: Game Week Practice',
    subtitle: 'Exclusive footage from the practice facility as the team prepares.',
    emoji: '\u{1F3A5}',
    badge: 'Video',
    bgColor: '#1C2842',
  },
  {
    id: 'feed-3',
    type: 'poll',
    title: 'Fan Poll: Predict the Final Score',
    subtitle: 'Cast your prediction and see how other fans voted.',
    emoji: '\u{1F4CA}',
    badge: 'Poll',
    bgColor: '#2A1A0E',
  },
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Samantha R.', points: 4820, initial: 'S', isUser: false },
  { rank: 2, name: 'Marcus T.', points: 3975, initial: 'M', isUser: false },
  { rank: 3, name: 'Olivia P.', points: 3410, initial: 'O', isUser: false },
  { rank: 4, name: 'Ethan K.', points: 2195, initial: 'E', isUser: false },
  { rank: 5, name: 'You', points: 1250, initial: 'J', isUser: true },
  { rank: 6, name: 'Noah W.', points: 1100, initial: 'N', isUser: false },
  { rank: 7, name: 'Ava C.', points: 985, initial: 'A', isUser: false },
  { rank: 8, name: 'Liam D.', points: 870, initial: 'L', isUser: false },
  { rank: 9, name: 'Mia F.', points: 650, initial: 'M', isUser: false },
  { rank: 10, name: 'James H.', points: 420, initial: 'J', isUser: false },
];

export const INITIAL_POINTS_HISTORY: PointsEntry[] = [
  {
    id: 'pts-1',
    description: 'Gameday Check-In',
    amount: 100,
    source: 'check-in',
    timestamp: new Date('2025-10-18T13:00:00'),
  },
  {
    id: 'pts-2',
    description: 'Trivia Challenge Completed',
    amount: 50,
    source: 'trivia',
    timestamp: new Date('2025-10-18T14:30:00'),
  },
  {
    id: 'pts-3',
    description: 'Redeemed: Free Hot Dog',
    amount: -200,
    source: 'redemption',
    timestamp: new Date('2025-10-18T15:15:00'),
  },
  {
    id: 'pts-4',
    description: 'Noise Meter Bonus',
    amount: 75,
    source: 'noise-meter',
    timestamp: new Date('2025-10-11T14:00:00'),
  },
  {
    id: 'pts-5',
    description: 'Gameday Check-In',
    amount: 100,
    source: 'check-in',
    timestamp: new Date('2025-10-11T12:45:00'),
  },
  {
    id: 'pts-6',
    description: 'Prediction Correct',
    amount: 150,
    source: 'prediction',
    timestamp: new Date('2025-10-04T16:30:00'),
  },
  {
    id: 'pts-7',
    description: 'Gameday Check-In',
    amount: 100,
    source: 'check-in',
    timestamp: new Date('2025-10-04T12:30:00'),
  },
  {
    id: 'pts-8',
    description: 'Welcome Bonus',
    amount: 875,
    source: 'bonus',
    timestamp: new Date('2025-09-20T10:00:00'),
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Gameday Reminder',
    body: 'Gates open in 2 hours! Don\'t forget to check in when you arrive.',
    emoji: '\u{1F3C8}',
    timestamp: new Date('2025-10-25T09:00:00'),
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Tier Upgrade!',
    body: 'Congratulations! You\'ve reached Starter tier. Keep earning to unlock All-Star.',
    emoji: '\u{1F31F}',
    timestamp: new Date('2025-10-18T15:00:00'),
    read: false,
  },
  {
    id: 'notif-3',
    title: 'New Reward Available',
    body: 'The Rally T-Shirt is now available in the rewards store for 500 pts.',
    emoji: '\u{1F381}',
    timestamp: new Date('2025-10-15T12:00:00'),
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Trivia Challenge',
    body: 'A new trivia challenge is live! Answer correctly to earn bonus points.',
    emoji: '\u{1F9E0}',
    timestamp: new Date('2025-10-12T11:30:00'),
    read: true,
  },
  {
    id: 'notif-5',
    title: 'Points Earned',
    body: 'You earned 150 pts for a correct halftime prediction. Nice call!',
    emoji: '\u{1F4B0}',
    timestamp: new Date('2025-10-04T16:35:00'),
    read: true,
  },
];

export const POLL_DATA = {
  question: 'Who will be Player of the Game?',
  options: [
    { name: 'Marcus Johnson (#7)', votes: 776 },
    { name: 'Tyler Brooks (#23)', votes: 573 },
    { name: 'Derek Williams (#11)', votes: 498 },
  ],
  totalVotes: 1847,
};
