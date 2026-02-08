import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import { getTierForPoints } from '../utils/points';
import {
  REWARDS,
  INITIAL_POINTS_HISTORY,
  INITIAL_NOTIFICATIONS,
  POLL_DATA,
  type Reward,
  type PointsEntry,
  type NotificationItem,
} from '../data/mockData';
import { type School } from '../data/schools';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

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
        gameday: { ...state.gameday, checkedIn: true },
        points: {
          balance: newBalance,
          totalEarned: newTotalEarned,
          history: [
            makeHistoryEntry('Gameday Check-In', amount, 'check-in'),
            ...state.points.history,
          ],
        },
        tier: getTierForPoints(newTotalEarned),
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
      };
    }

    case 'DISMISS_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.notificationId),
      };
    }

    case 'RESET': {
      return buildInitialState();
    }

    default:
      return state;
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
