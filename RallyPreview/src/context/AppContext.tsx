import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTierForPoints } from '../utils/points';
import {
  REWARDS,
  INITIAL_POINTS_HISTORY,
  INITIAL_NOTIFICATIONS,
  INITIAL_LEADERBOARD,
  POLL_DATA,
  type Reward,
  type PointsEntry,
  type NotificationItem,
  type LeaderboardEntry,
} from '../data/mockData';
import { type School } from '../data/schools';

const STORAGE_KEY = '@rally_app_state';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface Settings {
  pushNotifications: boolean;
  gamedayAlerts: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
  shareActivity: boolean;
}

interface AppState {
  school: School | null;
  user: {
    name: string;
    handle: string;
    memberSince: string;
    avatarInitial: string;
  };
  points: {
    balance: number;
    totalEarned: number;
    history: PointsEntry[];
  };
  tier: {
    name: string;
    min: number;
    next: string | null;
    nextMin: number | null;
  };
  gameday: {
    isLive: boolean;
    checkedIn: boolean;
    homeScore: number;
    awayScore: number;
    quarter: string;
    clock: string;
    fanPointsCurrent: number;
    fanPointsTarget: number;
    completedActivations: string[];
    photoUri: string | null;
  };
  rewards: {
    catalog: Reward[];
    redeemed: { reward: Reward; date: Date }[];
  };
  poll: {
    question: string;
    options: { name: string; votes: number }[];
    totalVotes: number;
    userVote: number | null;
  };
  notifications: NotificationItem[];
  leaderboard: LeaderboardEntry[];
  settings: Settings;
  gamesAttended: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SELECT_SCHOOL'; school: School }
  | { type: 'CHECK_IN' }
  | { type: 'ADD_POINTS'; amount: number; description: string; source: string }
  | { type: 'REDEEM_REWARD'; rewardId: string }
  | { type: 'VOTE_POLL'; optionIndex: number }
  | { type: 'COMPLETE_ACTIVATION'; activationId: string; points: number; description: string }
  | { type: 'DISMISS_NOTIFICATION'; notificationId: string }
  | { type: 'MARK_NOTIFICATION_READ'; notificationId: string }
  | { type: 'SUBMIT_PHOTO'; uri: string }
  | { type: 'UPDATE_SETTINGS'; key: keyof Settings; value: boolean }
  | { type: 'UPDATE_PROFILE'; name: string; handle: string }
  | { type: 'RESTORE_STATE'; state: AppState }
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextEntryId = 100;
function makeHistoryEntry(description: string, amount: number, source: string): PointsEntry {
  return {
    id: `pts-${nextEntryId++}`,
    description,
    amount,
    source,
    timestamp: new Date(),
  };
}

function updateLeaderboard(leaderboard: LeaderboardEntry[], userPoints: number): LeaderboardEntry[] {
  const updated = leaderboard.map((entry) =>
    entry.isUser ? { ...entry, points: userPoints } : { ...entry },
  );
  updated.sort((a, b) => b.points - a.points);
  return updated.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

function buildInitialState(): AppState {
  return {
    school: null,
    user: {
      name: 'Jordan Mitchell',
      handle: '@jordanm',
      memberSince: 'Sep 2025',
      avatarInitial: 'J',
    },
    points: {
      balance: 1250,
      totalEarned: 1250,
      history: [...INITIAL_POINTS_HISTORY],
    },
    tier: getTierForPoints(1250),
    gameday: {
      isLive: true,
      checkedIn: false,
      homeScore: 24,
      awayScore: 17,
      quarter: 'Q3',
      clock: '8:42',
      fanPointsCurrent: 850,
      fanPointsTarget: 1000,
      completedActivations: [],
      photoUri: null,
    },
    rewards: {
      catalog: [...REWARDS],
      redeemed: [],
    },
    poll: {
      question: POLL_DATA.question,
      options: POLL_DATA.options.map((o) => ({ ...o })),
      totalVotes: POLL_DATA.totalVotes,
      userVote: null,
    },
    notifications: [...INITIAL_NOTIFICATIONS],
    leaderboard: [...INITIAL_LEADERBOARD],
    settings: {
      pushNotifications: true,
      gamedayAlerts: true,
      soundEffects: true,
      hapticFeedback: true,
      shareActivity: false,
    },
    gamesAttended: 12,
  };
}

const initialState: AppState = buildInitialState();

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_SCHOOL': {
      return {
        ...state,
        school: action.school,
      };
    }

    case 'CHECK_IN': {
      const amount = 100;
      const newTotalEarned = state.points.totalEarned + amount;
      const newBalance = state.points.balance + amount;
      return {
        ...state,
        gameday: {
          ...state.gameday,
          checkedIn: true,
          fanPointsCurrent: Math.min(
            state.gameday.fanPointsCurrent + amount,
            state.gameday.fanPointsTarget,
          ),
        },
        points: {
          balance: newBalance,
          totalEarned: newTotalEarned,
          history: [
            makeHistoryEntry('Gameday Check-In', amount, 'check-in'),
            ...state.points.history,
          ],
        },
        tier: getTierForPoints(newTotalEarned),
        leaderboard: updateLeaderboard(state.leaderboard, newBalance),
        gamesAttended: state.gamesAttended + 1,
      };
    }

    case 'ADD_POINTS': {
      const { amount, description, source } = action;
      const newTotalEarned = state.points.totalEarned + amount;
      const newBalance = state.points.balance + amount;
      return {
        ...state,
        points: {
          balance: newBalance,
          totalEarned: newTotalEarned,
          history: [
            makeHistoryEntry(description, amount, source),
            ...state.points.history,
          ],
        },
        tier: getTierForPoints(newTotalEarned),
        leaderboard: updateLeaderboard(state.leaderboard, newBalance),
      };
    }

    case 'REDEEM_REWARD': {
      const reward = state.rewards.catalog.find((r) => r.id === action.rewardId);
      if (!reward) return state;

      const newBalance = state.points.balance - reward.points;
      if (newBalance < 0) return state;

      return {
        ...state,
        points: {
          ...state.points,
          balance: newBalance,
          history: [
            makeHistoryEntry(`Redeemed: ${reward.name}`, -reward.points, 'redemption'),
            ...state.points.history,
          ],
        },
        rewards: {
          ...state.rewards,
          redeemed: [
            ...state.rewards.redeemed,
            { reward, date: new Date() },
          ],
        },
        leaderboard: updateLeaderboard(state.leaderboard, newBalance),
      };
    }

    case 'VOTE_POLL': {
      if (state.poll.userVote !== null) return state;
      const updatedOptions = state.poll.options.map((opt, i) =>
        i === action.optionIndex ? { ...opt, votes: opt.votes + 1 } : { ...opt },
      );
      return {
        ...state,
        poll: {
          ...state.poll,
          options: updatedOptions,
          totalVotes: state.poll.totalVotes + 1,
          userVote: action.optionIndex,
        },
      };
    }

    case 'COMPLETE_ACTIVATION': {
      const { activationId, points, description } = action;
      if (state.gameday.completedActivations.includes(activationId)) return state;

      const newTotalEarned = state.points.totalEarned + points;
      const newBalance = state.points.balance + points;
      return {
        ...state,
        gameday: {
          ...state.gameday,
          completedActivations: [...state.gameday.completedActivations, activationId],
          fanPointsCurrent: Math.min(
            state.gameday.fanPointsCurrent + points,
            state.gameday.fanPointsTarget,
          ),
        },
        points: {
          balance: newBalance,
          totalEarned: newTotalEarned,
          history: [
            makeHistoryEntry(description, points, 'activation'),
            ...state.points.history,
          ],
        },
        tier: getTierForPoints(newTotalEarned),
        leaderboard: updateLeaderboard(state.leaderboard, newBalance),
      };
    }

    case 'DISMISS_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.notificationId),
      };
    }

    case 'MARK_NOTIFICATION_READ': {
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.notificationId ? { ...n, read: true } : n,
        ),
      };
    }

    case 'SUBMIT_PHOTO': {
      return {
        ...state,
        gameday: {
          ...state.gameday,
          photoUri: action.uri,
        },
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.key]: action.value,
        },
      };
    }

    case 'UPDATE_PROFILE': {
      return {
        ...state,
        user: {
          ...state.user,
          name: action.name,
          handle: action.handle,
          avatarInitial: action.name.charAt(0).toUpperCase(),
        },
      };
    }

    case 'RESTORE_STATE': {
      return action.state;
    }

    case 'RESET': {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      return buildInitialState();
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers for AsyncStorage
// ---------------------------------------------------------------------------

function serializeState(state: AppState): string {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Date) return { __date: value.toISOString() };
    return value;
  });
}

function deserializeState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json, (key, value) => {
      if (value && typeof value === 'object' && value.__date) return new Date(value.__date);
      return value;
    });
    // Merge with defaults to handle missing keys from older versions
    const defaults = buildInitialState();
    return {
      ...defaults,
      ...parsed,
      user: { ...defaults.user, ...parsed.user },
      points: { ...defaults.points, ...parsed.points },
      tier: parsed.points ? getTierForPoints(parsed.points.totalEarned) : defaults.tier,
      gameday: { ...defaults.gameday, ...parsed.gameday },
      rewards: { ...defaults.rewards, ...parsed.rewards },
      poll: { ...defaults.poll, ...parsed.poll },
      settings: { ...defaults.settings, ...parsed.settings },
      leaderboard: parsed.leaderboard || defaults.leaderboard,
      gamesAttended: parsed.gamesAttended ?? defaults.gamesAttended,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) {
          const restored = deserializeState(json);
          if (restored) dispatch({ type: 'RESTORE_STATE', state: restored });
        }
      })
      .catch(() => {});
  }, []);

  // Persist state on every change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, serializeState(state)).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an <AppProvider>');
  }
  return ctx;
}
