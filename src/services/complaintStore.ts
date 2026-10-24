import { store } from '../store';
import {
  fetchComplaints,
  createComplaint,
  updateComplaintStatus,
  sortComplaints,
  type ComplaintTicket,
  type ComplaintRole,
  type ComplaintStatus
} from '../store/slices/complaintsSlice';

export type { ComplaintTicket } from '../store/slices/complaintsSlice';

/**
 * Backward-compatible facade over Redux `complaints` slice.
 * Naye code me `useAppSelector(selectComplaints)` + thunks use karein.
 */
class ComplaintStoreService {
  public async syncBackend() {
    await store.dispatch(fetchComplaints());
  }

  public subscribe(listener: () => void) {
    return store.subscribe(listener);
  }

  public isLoading(): boolean {
    return store.getState().complaints.status === 'loading';
  }

  public getComplaints(): ComplaintTicket[] {
    return structuredClone(sortComplaints(store.getState().complaints.items));
  }

  // Backend non-admin users ko sirf unke apne tickets bhejta hai; yahan sirf userId se filter
  public getComplaintsForUser(userId?: string | number, _mobile?: string, _name?: string): ComplaintTicket[] {
    const uIdStr = userId?.toString();
    const items = store.getState().complaints.items.filter(c => !!uIdStr && c.raisedByUserId?.toString() === uIdStr);
    return structuredClone(sortComplaints(items));
  }

  // Raise new complaint — server failure par error throw hota hai (fake offline ticket nahi)
  public async addComplaint(data: {
    raisedByUserId?: number | string;
    raisedByName: string;
    raisedByRole: ComplaintRole;
    subject: string;
    category: string;
    description: string;
  }): Promise<ComplaintTicket> {
    const result = await store.dispatch(
      createComplaint({ subject: data.subject, category: data.category, description: data.description })
    );
    if (!createComplaint.fulfilled.match(result)) {
      throw new Error(result.payload || 'Complaint submit failed. Kripya dobara try karein.');
    }
    return {
      id: result.payload.id,
      ticketNo: result.payload.ticketNo,
      raisedByUserId: data.raisedByUserId,
      raisedByName: data.raisedByName,
      raisedByRole: data.raisedByRole,
      subject: data.subject,
      category: data.category,
      description: data.description,
      status: 'OPEN',
      createdAt: 'Just Now'
    };
  }

  // Admin / Manager Update Complaint Status & Resolution — failure par error throw
  public async updateStatus(ticketId: string, status: ComplaintStatus, resolutionNote?: string, _resolvedBy?: string) {
    const result = await store.dispatch(updateComplaintStatus({ ticketId, status, resolutionNote }));
    if (!updateComplaintStatus.fulfilled.match(result)) {
      throw new Error(result.payload || 'Failed to update complaint status.');
    }
  }
}

export const complaintStore = new ComplaintStoreService();
