import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { getApiErrorMessage, hasToken, type RequestStatus } from '../apiError';
import { logoutUser, sessionCleared } from './authSlice';

export interface Shop {
  id: string;
  shopCode: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  password?: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'DELETE_REQUESTED';
  deleteReason?: string;
  registrationType: 'SELF_REGISTER' | 'DISTRIBUTOR_ADDED';
  distributorId?: string | null;
  distributorName?: string | null;
  distributorMobile?: string | null;
  createdAt: string;
  requestedAt?: string;
  approvedAt?: string;
}

export interface NewShopInput {
  ownerName: string;
  shopName: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  password: string;
}

interface ShopsState {
  items: Shop[];
  status: RequestStatus;
  error: string | null;
}

const initialState: ShopsState = { items: [], status: 'idle', error: null };

export const fetchShops = createAsyncThunk<Shop[], void, { rejectValue: string }>(
  'shops/fetch',
  async (_, { rejectWithValue }) => {
    if (!hasToken()) return rejectWithValue('No session');
    try {
      const response = await apiClient.get('/shops');
      if (response.data.status === 'success' && Array.isArray(response.data.data)) return response.data.data;
      return rejectWithValue(response.data.message || 'Shops fetch failed');
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Shops fetch failed'));
    }
  }
);

export const addShop = createAsyncThunk<Shop, NewShopInput, { rejectValue: string }>(
  'shops/add',
  async (data, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/shops', data);
      if (response.data.status !== 'success' || !response.data.data) {
        return rejectWithValue(response.data.message || 'Failed to create shop on server.');
      }
      const refreshed = await dispatch(fetchShops());
      const list = fetchShops.fulfilled.match(refreshed) ? refreshed.payload : [];
      return list.find(s => s.shopCode === response.data.data.shopCode) || response.data.data;
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to create shop on server. Please check details and try again.'));
    }
  }
);

// approve / reject / delete-request / approve-deletion ke liye common thunk factory
const shopAction = (name: string, call: (args: { shopId: string; reason?: string }) => Promise<unknown>, fallback: string) =>
  createAsyncThunk<void, { shopId: string; reason?: string }, { rejectValue: string }>(
    `shops/${name}`,
    async (args, { dispatch, rejectWithValue }) => {
      try {
        await call(args);
        await dispatch(fetchShops());
      } catch (e) {
        return rejectWithValue(getApiErrorMessage(e, fallback));
      }
    }
  );

export const approveShop = shopAction('approve', ({ shopId }) => apiClient.patch(`/shops/${shopId}/approve`), 'Failed to approve shop.');
export const rejectShop = shopAction('reject', ({ shopId }) => apiClient.patch(`/shops/${shopId}/reject`), 'Failed to reject shop.');
export const requestShopDeletion = shopAction(
  'requestDeletion',
  ({ shopId, reason }) => apiClient.post(`/shops/${shopId}/request-delete`, { reason }),
  'Failed to submit deletion request.'
);
export const approveShopDeletion = shopAction(
  'approveDeletion',
  ({ shopId }) => apiClient.patch(`/shops/${shopId}/approve-deletion`),
  'Failed to approve deletion.'
);
export const deleteShopPermanentlyThunk = shopAction(
  'deletePermanently',
  ({ shopId }) => apiClient.delete(`/shops/${shopId}`),
  'Failed to delete shop.'
);

const shopsSlice = createSlice({
  name: 'shops',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchShops.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchShops.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchShops.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Shops fetch failed';
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionCleared, () => initialState);
  }
});

export default shopsSlice.reducer;
