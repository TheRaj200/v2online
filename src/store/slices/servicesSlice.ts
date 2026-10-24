import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { getApiErrorMessage, hasToken, type RequestStatus } from '../apiError';
import { logoutUser, sessionCleared } from './authSlice';
import type { ServiceItem } from '../../types/service';

interface ServicesState {
  items: ServiceItem[];
  status: RequestStatus;
  error: string | null;
}

const initialState: ServicesState = { items: [], status: 'idle', error: null };

export const fetchServices = createAsyncThunk<ServiceItem[], void, { rejectValue: string }>(
  'services/fetch',
  async (_, { rejectWithValue }) => {
    if (!hasToken()) return rejectWithValue('No session');
    try {
      const response = await apiClient.get('/services');
      if (response.data.status === 'success' && Array.isArray(response.data.data)) return response.data.data;
      return rejectWithValue(response.data.message || 'Services fetch failed');
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Services fetch failed'));
    }
  }
);

export const createService = createAsyncThunk<string, Omit<ServiceItem, 'id' | 'createdAt'>, { rejectValue: string }>(
  'services/create',
  async (data, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/services', data);
      if (response.data.status !== 'success') return rejectWithValue(response.data.message || 'Failed to create service.');
      await dispatch(fetchServices());
      return String(response.data.data?.id || '');
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to create service.'));
    }
  }
);

export const updateService = createAsyncThunk<void, { id: string; data: Partial<ServiceItem> }, { rejectValue: string }>(
  'services/update',
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.put(`/services/${id}`, data);
      await dispatch(fetchServices());
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to update service.'));
    }
  }
);

export const toggleService = createAsyncThunk<void, string, { rejectValue: string }>(
  'services/toggle',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.patch(`/services/${id}/toggle`);
      await dispatch(fetchServices());
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to change service status.'));
    }
  }
);

export const deleteService = createAsyncThunk<void, string, { rejectValue: string }>(
  'services/delete',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.delete(`/services/${id}`);
      await dispatch(fetchServices());
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to delete service. Ho sakta hai is service par applications linked hon.'));
    }
  }
);

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchServices.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Services fetch failed';
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionCleared, () => initialState);
  }
});

export default servicesSlice.reducer;
