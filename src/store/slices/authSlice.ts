import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import type { User } from '../../types/auth';
import { getApiErrorMessage } from '../apiError';

const TOKEN_KEY = 'v2online_token';
const USER_KEY = 'v2online_user';

// Corrupt localStorage value se app white-screen na ho
const readSavedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  // App start par /auth/me check chal raha hai
  isInitializing: boolean;
}

const initialState: AuthState = {
  user: readSavedUser(),
  token: localStorage.getItem(TOKEN_KEY),
  isInitializing: true
};

export interface LoginResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  if (!localStorage.getItem(TOKEN_KEY)) return rejectWithValue('No session');
  try {
    const response = await apiClient.get('/auth/me');
    if (response.data.status === 'success') return response.data.user as User;
    return rejectWithValue(response.data.message || 'Profile fetch failed');
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e, 'Profile fetch failed'));
  }
});

export const loginUser = createAsyncThunk<
  { token: string; user: User; message: string; redirectUrl?: string },
  { mobile: string; password: string },
  { rejectValue: string }
>('auth/login', async ({ mobile, password }, { rejectWithValue }) => {
  try {
    const response = await apiClient.post('/auth/login', { mobile, password });
    if (response.data.status === 'success') {
      return {
        token: response.data.token,
        user: response.data.user,
        message: response.data.message,
        redirectUrl: response.data.redirect_url
      };
    }
    return rejectWithValue(response.data.message || 'Login failed');
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e, 'Login request failed. Check server connection.'));
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error', error);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Profile / wallet balance jaisi fields local update karne ke liye
    patchUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
    },
    sessionCleared(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isInitializing = false;
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
      })
      .addCase(fetchProfile.rejected, state => {
        // Network error par saved user rehne do; 401 par interceptor session clear karta hai
        state.isInitializing = false;
        state.token = localStorage.getItem(TOKEN_KEY);
        if (!state.token) state.user = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isInitializing = false;
        localStorage.setItem(TOKEN_KEY, action.payload.token);
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
      })
      .addCase(logoutUser.fulfilled, state => {
        state.user = null;
        state.token = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      });
  }
});

export const { patchUser, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
