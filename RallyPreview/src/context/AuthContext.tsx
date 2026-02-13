import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, setToken as setApiToken, isServerAvailable } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeammatePermissions {
  events: boolean;
  engagements: boolean;
  rewards: boolean;
  redemptions: boolean;
  notifications: boolean;
  bonusOffers: boolean;
  content: boolean;
  analytics: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: 'developer' | 'admin' | 'teammate' | 'user';
  schoolId: string | null;
  propertyId?: string | null;
  propertyLeague?: string;
  favoriteSchool: string | null;
  favoriteTeams?: Array<{ propertyId: string; league: string }>;
  favoriteSports?: string[];
  supportingSchools: string[];
  emailVerified: boolean;
  emailUpdates: boolean;
  pushNotifications: boolean;
  acceptedTerms: boolean;
  // Demographics
  userType?: 'student' | 'alumni' | 'general_fan' | null;
  birthYear?: number | null;
  residingCity?: string | null;
  residingState?: string | null;
  // Teammate-specific
  teammatePermissions?: TeammatePermissions;
  invitedBy?: string | null;
  points?: number;
  tier?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  editMode: boolean;
  serverConnected: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type AuthAction =
  | { type: 'LOGIN'; user: AuthUser; token: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; user: AuthUser }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SET_SERVER_STATUS'; connected: boolean }
  | { type: 'SET_LOADING'; loading: boolean };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  editMode: false,
  serverConnected: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.user,
        token: action.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        editMode: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.user,
      };
    case 'TOGGLE_EDIT_MODE':
      return {
        ...state,
        editMode: !state.editMode,
      };
    case 'SET_SERVER_STATUS':
      return {
        ...state,
        serverConnected: action.connected,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading,
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Demo accounts (offline fallback)
// ---------------------------------------------------------------------------

const DEMO_ACCOUNTS: { email: string; password: string; user: AuthUser }[] = [
  {
    email: 'jason@rally.com',
    password: 'Rally2026!',
    user: {
      id: 'demo-dev-001',
      email: 'jason@rally.com',
      name: 'Jason Kowitt',
      handle: '@jkowitt',
      role: 'developer',
      schoolId: null,
      favoriteSchool: null,
      supportingSchools: [],
      emailVerified: true,
      emailUpdates: true,
      pushNotifications: true,
      acceptedTerms: true,
      userType: null,
      birthYear: null,
      residingCity: null,
      residingState: null,
    },
  },
  {
    email: 'admin@rally.com',
    password: 'Rally2026!',
    user: {
      id: 'demo-admin-001',
      email: 'admin@rally.com',
      name: 'Alex Rivera',
      handle: '@alexr',
      role: 'admin',
      schoolId: null,
      favoriteSchool: null,
      supportingSchools: [],
      emailVerified: true,
      emailUpdates: true,
      pushNotifications: true,
      acceptedTerms: true,
      userType: 'alumni',
      birthYear: 1995,
      residingCity: 'New York',
      residingState: 'NY',
    },
  },
  {
    email: 'user@rally.com',
    password: 'Rally2026!',
    user: {
      id: 'demo-user-001',
      email: 'user@rally.com',
      name: 'Jordan Mitchell',
      handle: '@jordanm',
      role: 'user',
      schoolId: 'duke',
      favoriteSchool: 'duke',
      supportingSchools: ['unc', 'virginia'],
      emailVerified: true,
      emailUpdates: true,
      pushNotifications: true,
      acceptedTerms: true,
      userType: 'student',
      birthYear: 2003,
      residingCity: 'Durham',
      residingState: 'NC',
    },
  },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const AUTH_TOKEN_KEY = '@rally_auth_token';
const AUTH_USER_KEY = '@rally_auth_user';

// ---------------------------------------------------------------------------
// Register params
// ---------------------------------------------------------------------------

export interface RegisterParams {
  email: string;
  password: string;
  name: string;
  handle: string;
  favoriteSchool?: string | null;
  supportingSchools?: string[];
  emailUpdates?: boolean;
  pushNotifications?: boolean;
  acceptedTerms?: boolean;
  userType?: string;
  birthYear?: number;
  residingCity?: string;
  residingState?: string;
}

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: RegisterParams) => Promise<{ success: boolean; error?: string; verificationCode?: string }>;
  logout: () => Promise<void>;
  verifyEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; error?: string; verificationCode?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; resetCode?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (fields: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  toggleEditMode: () => void;
  isAdmin: boolean;
  isDeveloper: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUserJson] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (savedToken && savedUserJson) {
          const savedUser: AuthUser = JSON.parse(savedUserJson);
          setApiToken(savedToken);
          dispatch({ type: 'LOGIN', user: savedUser, token: savedToken });
        } else {
          dispatch({ type: 'SET_LOADING', loading: false });
        }
      } catch {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    })();
  }, []);

  // Check server availability on mount
  useEffect(() => {
    (async () => {
      const connected = await isServerAvailable();
      dispatch({ type: 'SET_SERVER_STATUS', connected });
    })();
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      dispatch({ type: 'SET_LOADING', loading: true });

      // Try server auth first
      const serverResult = await apiClient.post('/auth/login', { email, password });

      if (serverResult.ok) {
        const { token, user } = serverResult.data;
        setApiToken(token);
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        dispatch({ type: 'LOGIN', user, token });
        return { success: true };
      }

      // If server unavailable, fall back to demo accounts
      if (serverResult.error === 'Server unavailable') {
        const demo = DEMO_ACCOUNTS.find(
          (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password,
        );

        if (demo) {
          const fakeToken = `demo-token-${demo.user.id}-${Date.now()}`;
          setApiToken(fakeToken);
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, fakeToken);
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(demo.user));
          dispatch({ type: 'LOGIN', user: demo.user, token: fakeToken });
          return { success: true };
        }

        dispatch({ type: 'SET_LOADING', loading: false });
        return { success: false, error: 'Invalid email or password' };
      }

      // Server returned an error (wrong credentials etc.)
      dispatch({ type: 'SET_LOADING', loading: false });
      return { success: false, error: serverResult.error };
    },
    [],
  );

  // Register
  const register = useCallback(
    async (params: RegisterParams): Promise<{ success: boolean; error?: string; verificationCode?: string }> => {
      dispatch({ type: 'SET_LOADING', loading: true });

      const {
        email, password, name, handle,
        favoriteSchool, supportingSchools,
        emailUpdates, pushNotifications,
        acceptedTerms,
        userType, birthYear, residingCity, residingState,
      } = params;

      // Try server registration first
      const serverResult = await apiClient.post('/auth/register', {
        email,
        password,
        name,
        handle,
        favoriteSchool: favoriteSchool || null,
        supportingSchools: supportingSchools || [],
        emailUpdates: emailUpdates !== undefined ? emailUpdates : true,
        pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
        acceptedTerms: acceptedTerms !== undefined ? acceptedTerms : true,
        ...(userType ? { userType } : {}),
        ...(birthYear ? { birthYear } : {}),
        ...(residingCity ? { residingCity } : {}),
        ...(residingState ? { residingState } : {}),
      });

      if (serverResult.ok) {
        const { token, user, verificationCode } = serverResult.data;
        setApiToken(token);
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        dispatch({ type: 'LOGIN', user, token });
        return { success: true, verificationCode };
      }

      // If server unavailable, create local user
      if (serverResult.error === 'Server unavailable') {
        const localUser: AuthUser = {
          id: `local-${Date.now()}`,
          email,
          name,
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          role: 'user',
          schoolId: favoriteSchool || null,
          favoriteSchool: favoriteSchool || null,
          supportingSchools: supportingSchools || [],
          emailVerified: false,
          emailUpdates: emailUpdates !== undefined ? emailUpdates : true,
          pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
          acceptedTerms: true,
          userType: (userType as AuthUser['userType']) || null,
          birthYear: birthYear || null,
          residingCity: residingCity || null,
          residingState: residingState || null,
        };
        const fakeToken = `local-token-${localUser.id}`;
        setApiToken(fakeToken);
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, fakeToken);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(localUser));
        dispatch({ type: 'LOGIN', user: localUser, token: fakeToken });
        return { success: true };
      }

      dispatch({ type: 'SET_LOADING', loading: false });
      return { success: false, error: serverResult.error };
    },
    [],
  );

  // Verify email
  const verifyEmail = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      const serverResult = await apiClient.post('/auth/verify-email', { code });

      if (serverResult.ok) {
        const updatedUser = serverResult.data.user;
        if (updatedUser) {
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
          dispatch({ type: 'SET_USER', user: updatedUser });
        }
        return { success: true };
      }

      if (serverResult.error === 'Server unavailable') {
        // Offline: accept any 6-digit code
        if (state.user) {
          const updatedUser = { ...state.user, emailVerified: true };
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
          dispatch({ type: 'SET_USER', user: updatedUser });
        }
        return { success: true };
      }

      return { success: false, error: serverResult.error };
    },
    [state.user],
  );

  // Resend verification code
  const resendVerification = useCallback(
    async (): Promise<{ success: boolean; error?: string; verificationCode?: string }> => {
      const serverResult = await apiClient.post('/auth/resend-verification');

      if (serverResult.ok) {
        return { success: true, verificationCode: serverResult.data.verificationCode };
      }

      if (serverResult.error === 'Server unavailable') {
        // Offline: generate a fake code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        return { success: true, verificationCode: code };
      }

      return { success: false, error: serverResult.error };
    },
    [],
  );

  // Forgot password
  const forgotPassword = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string; resetCode?: string }> => {
      const serverResult = await apiClient.post('/auth/forgot-password', { email });

      if (serverResult.ok) {
        return { success: true, resetCode: serverResult.data.resetCode };
      }

      if (serverResult.error === 'Server unavailable') {
        // Offline: return mock code
        return { success: true, resetCode: '123456' };
      }

      return { success: false, error: serverResult.error };
    },
    [],
  );

  // Reset password
  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      const serverResult = await apiClient.post('/auth/reset-password', { email, code, newPassword });

      if (serverResult.ok) {
        return { success: true };
      }

      if (serverResult.error === 'Server unavailable') {
        // Offline: accept code 123456
        if (code === '123456') {
          return { success: true };
        }
        return { success: false, error: 'Invalid reset code' };
      }

      return { success: false, error: serverResult.error };
    },
    [],
  );

  // Update profile
  const updateProfile = useCallback(
    async (fields: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
      const serverResult = await apiClient.put('/auth/me', fields);

      if (serverResult.ok) {
        const updatedUser = serverResult.data;
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        dispatch({ type: 'SET_USER', user: updatedUser });
        return { success: true };
      }

      if (serverResult.error === 'Server unavailable') {
        // Offline: update locally
        if (state.user) {
          const updatedUser = { ...state.user, ...fields };
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
          dispatch({ type: 'SET_USER', user: updatedUser });
        }
        return { success: true };
      }

      return { success: false, error: serverResult.error };
    },
    [state.user],
  );

  // Logout
  const logout = useCallback(async () => {
    setApiToken(null);
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Computed properties
  const isAdmin = state.user?.role === 'admin' || state.user?.role === 'developer' || state.user?.role === 'teammate';
  const isDeveloper = state.user?.role === 'developer';
  const isAuthenticated = state.isAuthenticated;
  const editMode = state.editMode;

  const toggleEditMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_EDIT_MODE' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      register,
      logout,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      updateProfile,
      toggleEditMode,
      isAdmin,
      isDeveloper,
      isAuthenticated,
      editMode,
    }),
    [state, login, register, logout, verifyEmail, resendVerification, forgotPassword, resetPassword, updateProfile, toggleEditMode, isAdmin, isDeveloper, isAuthenticated, editMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
