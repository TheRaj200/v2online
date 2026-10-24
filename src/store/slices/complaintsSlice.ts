import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { getApiErrorMessage, hasToken, type RequestStatus } from '../apiError';
import { logoutUser, sessionCleared } from './authSlice';

export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type ComplaintRole = 'agent' | 'operator' | 'distributor' | 'manager' | 'super_admin' | 'sub_admin';

export interface ComplaintTicket {
  id: string;
  ticketNo: string;
  raisedByUserId?: number | string;
  raisedByName: string;
  raisedByRole: ComplaintRole;
  subject: string;
  category: string;
  description: string;
  status: ComplaintStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  createdAt: string;
}

interface ComplaintsState {
  items: ComplaintTicket[];
  status: RequestStatus;
  error: string | null;
}

const initialState: ComplaintsState = { items: [], status: 'idle', error: null };

export const fetchComplaints = createAsyncThunk<ComplaintTicket[], void, { rejectValue: string }>(
  'complaints/fetch',
  async (_, { rejectWithValue }) => {
    if (!hasToken()) return rejectWithValue('No session');
    try {
      const response = await apiClient.get('/complaints');
      if (response.data.status === 'success' && Array.isArray(response.data.data)) return response.data.data;
      return rejectWithValue(response.data.message || 'Complaints fetch failed');
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e, 'Complaints fetch failed'));
    }
  }
);

export const createComplaint = createAsyncThunk<
  { id: string; ticketNo: string },
  { subject: string; category: string; description: string },
  { rejectValue: string }
>('complaints/create', async (data, { dispatch, rejectWithValue }) => {
  try {
    // raised_by backend JWT se khud set karta hai
    const response = await apiClient.post('/complaints', data);
    if (response.data.status !== 'success') return rejectWithValue(response.data.message || 'Complaint submit failed.');
    await dispatch(fetchComplaints());
    return { id: String(response.data.data?.id || ''), ticketNo: response.data.data?.ticketNo || '' };
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e, 'Complaint submit failed. Kripya dobara try karein.'));
  }
});

export const updateComplaintStatus = createAsyncThunk<
  void,
  { ticketId: string; status: ComplaintStatus; resolutionNote?: string },
  { rejectValue: string }
>('complaints/updateStatus', async ({ ticketId, status, resolutionNote }, { dispatch, rejectWithValue }) => {
  try {
    await apiClient.patch(`/complaints/${ticketId}/status`, { status, resolutionNote });
    await dispatch(fetchComplaints());
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to update complaint status.'));
  }
});

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchComplaints.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Complaints fetch failed';
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionCleared, () => initialState);
  }
});

// Status priority (OPEN pehle) + naya ticket upar (numeric id compare)
const priorityMap: Record<string, number> = { OPEN: 1, IN_REVIEW: 2, RESOLVED: 3, CLOSED: 4 };
export const sortComplaints = (list: ComplaintTicket[]): ComplaintTicket[] =>
  [...list].sort((a, b) => {
    const pA = priorityMap[a.status?.toUpperCase() || ''] || 5;
    const pB = priorityMap[b.status?.toUpperCase() || ''] || 5;
    if (pA !== pB) return pA - pB;
    return Number(b.id || 0) - Number(a.id || 0);
  });

export default complaintsSlice.reducer;
