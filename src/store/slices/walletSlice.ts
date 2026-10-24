import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { getApiErrorMessage, hasToken, type RequestStatus } from '../apiError';
import { logoutUser, sessionCleared } from './authSlice';

export interface WalletTransaction {
  id: string;
  txnNo: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'topup' | 'service_fee' | 'operator_earning' | 'distributor_commission' | 'refund' | 'withdrawal' | 'admin_adjustment';
  amount: number;
  openingBalance: number;
  closingBalance: number;
  remarks: string;
  appId?: string; // Application ID (e.g., APP-2026-1001)
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  userName?: string;
  shopName?: string;
  userMobile?: string;
  userRole?: string;
  createdAt: string;
}

interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
  status: RequestStatus;
  error: string | null;
}

const initialState: WalletState = { balance: 0, transactions: [], status: 'idle', error: null };

// Remarks se App ID nikalna (purane transactions me alag column nahi hai)
const extractAppId = (t: any): string | undefined => {
  let appId = t.appId || t.app_id || null;
  if (!appId && t.remarks) {
    const match = t.remarks.match(/\[(?:App|Application|Task)\s*ID:\s*([^\]]+)\]/i) || t.remarks.match(/(APP-\d{4}-\d{4})/i);
    if (match) appId = match[1];
  }
  return appId || undefined;
};

export const fetchWallet = createAsyncThunk<
  { balance: number | null; transactions: WalletTransaction[] },
  void,
  { rejectValue: string }
>('wallet/fetch', async (_, { rejectWithValue }) => {
  if (!hasToken()) return rejectWithValue('No session');
  try {
    const response = await apiClient.get('/wallet/transactions');
    if (response.data.status !== 'success') return rejectWithValue(response.data.message || 'Wallet fetch failed');
    const list = Array.isArray(response.data.data) ? response.data.data : [];
    return {
      balance: typeof response.data.balance === 'number' ? response.data.balance : null,
      transactions: list.map((t: any) => ({ ...t, appId: extractAppId(t) }))
    };
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e, 'Wallet fetch failed'));
  }
});

export const rechargeWallet = createAsyncThunk<string, { amount: number; remarks?: string }, { rejectValue: string }>(
  'wallet/recharge',
  async ({ amount, remarks }, { dispatch, rejectWithValue }) => {
    const amt = parseFloat(String(amount));
    if (isNaN(amt) || amt <= 0) return rejectWithValue('Kripya sahi recharge amount enter/select karein.');
    try {
      const response = await apiClient.post('/wallet/recharge', { amount: amt, remarks });
      if (response.data.status !== 'success') return rejectWithValue(response.data.message || 'Recharge request failed.');
      await dispatch(fetchWallet());
      return response.data.message || `₹${amt.toFixed(2)} aapke wallet me add ho gaye hain!`;
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Server error while recharging wallet.'));
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchWallet.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload.balance !== null) state.balance = action.payload.balance;
        state.transactions = action.payload.transactions;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Wallet fetch failed';
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionCleared, () => initialState);
  }
});

export default walletSlice.reducer;
