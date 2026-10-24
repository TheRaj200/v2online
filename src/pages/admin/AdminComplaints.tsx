import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAppDispatch, useAppSelector, selectComplaints, selectComplaintsStatus, isInitialLoading } from '../../store/hooks';
import { fetchComplaints, updateComplaintStatus, sortComplaints, type ComplaintTicket } from '../../store/slices/complaintsSlice';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import {
  Headphones,
  CheckCircle2,
  Search,
  X,
  Eye,
  Calendar,
  User as UserIcon,
  Tag,
  FileText,
  XCircle
} from 'lucide-react';

export default function AdminComplaints() {
  const dispatch = useAppDispatch();
  const rawTickets = useAppSelector(selectComplaints);
  const complaintsStatus = useAppSelector(selectComplaintsStatus);
  // Status priority + numeric id (naya pehle) — sortComplaints copy return karta hai, frozen state safe
  const tickets = useMemo(() => sortComplaints(rawTickets), [rawTickets]);
  const showSkeleton = isInitialLoading(complaintsStatus, rawTickets.length);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<ComplaintTicket | null>(null);
  const [viewTicket, setViewTicket] = useState<ComplaintTicket | null>(null);
  const [status, setStatus] = useState<'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'>('IN_REVIEW');
  const [resolutionNote, setResolutionNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const saveAction = useAsyncAction();

  // Page open hote hi fresh tickets fetch (pehle mount par refresh nahi hota tha)
  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const handleOpenModal = (ticket: ComplaintTicket) => {
    setSelectedTicket(ticket);
    setStatus(ticket.status);
    setResolutionNote(ticket.resolutionNote || '');
    setErrorMsg('');
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const ticket = selectedTicket;
    if (!ticket) return;

    saveAction.run(async () => {
      setErrorMsg('');
      const result = await dispatch(updateComplaintStatus({ ticketId: ticket.id, status, resolutionNote }));
      if (!updateComplaintStatus.fulfilled.match(result)) {
        const message = result.payload || 'Failed to update complaint status.';
        setErrorMsg(message);
        throw new Error(message);
      }
      setSuccessMsg(`Status for ticket "${ticket.ticketNo}" updated to ${status}!`);
      setSelectedTicket(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    });
  };

  const term = searchTerm.toLowerCase();
  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      (t.ticketNo || '').toLowerCase().includes(term) ||
      (t.subject || '').toLowerCase().includes(term) ||
      (t.raisedByName || '').toLowerCase().includes(term) ||
      (t.category || '').toLowerCase().includes(term);

    if (activeFilter === 'ALL') return matchesSearch;
    return matchesSearch && t.status === activeFilter;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Headphones className="h-6 w-6 text-red-600" />
              <span>Master Helpdesk & Complaint Desk (Admin / Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review, assign status, and post resolution notes for tickets raised across Retailers, Operators, and Distributors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-red-700 uppercase block">Open Tickets</span>
              <span className="text-base font-black text-red-900">
                {tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_REVIEW').length}
              </span>
            </div>
          </div>
        </div>

        {/* Action Message Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
          {(['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                activeFilter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')} ({tab === 'ALL' ? tickets.length : tickets.filter(t => t.status === tab).length})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets by Ticket No, Subject, User Name, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Tickets List Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Ticket No & Subject</th>
                  <th className="py-3.5 px-4">Raised By</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {showSkeleton ? (
                  <SkeletonTableRows rows={5} cols={6} />
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No complaint tickets found in this filter.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 text-xs block">{ticket.ticketNo}</span>
                        <span className="font-bold text-slate-900 text-sm">{ticket.subject}</span>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ticket.description}</p>
                        {ticket.resolutionNote && (
                          <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
                            <strong>Resolution Remarks:</strong> {ticket.resolutionNote}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{ticket.raisedByName}</div>
                        <span className="inline-block bg-slate-100 text-slate-700 font-bold uppercase text-[9px] px-2 py-0.2 rounded mt-0.5">
                          {ticket.raisedByRole}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {ticket.category}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {ticket.createdAt}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          ticket.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ticket.status === 'IN_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : ticket.status === 'OPEN'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewTicket(ticket)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 border border-slate-200"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => handleOpenModal(ticket)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors whitespace-nowrap"
                          >
                            Resolve / Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Ticket Details Modal */}
        {viewTicket && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Headphones className="h-5 w-5 text-blue-600" />
                  <span>Complaint Ticket Details</span>
                </div>
                <button
                  onClick={() => setViewTicket(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Ticket Meta Info Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-blue-700 text-sm">{viewTicket.ticketNo}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    viewTicket.status === 'RESOLVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : viewTicket.status === 'IN_REVIEW'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : viewTicket.status === 'OPEN'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {viewTicket.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>Raised By: <strong>{viewTicket.raisedByName}</strong> ({viewTicket.raisedByRole})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Date: <strong>{viewTicket.createdAt}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span>Category: <strong>{viewTicket.category}</strong></span>
                  </div>
                </div>
              </div>

              {/* Subject & Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Subject: {viewTicket.subject}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Complaint Details / Description:
                  </label>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {viewTicket.description}
                  </div>
                </div>
              </div>

              {/* Resolution remarks if exists */}
              {viewTicket.resolutionNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Resolution Remarks ({viewTicket.resolvedBy || 'Admin'}):
                  </span>
                  <p className="text-emerald-900 leading-normal pl-5">{viewTicket.resolutionNote}</p>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewTicket(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ticketToResolve = viewTicket;
                    setViewTicket(null);
                    handleOpenModal(ticketToResolve);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Resolve / Update Status
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Update Ticket Status Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Headphones className="h-5 w-5 text-blue-600" />
                  <span>Update Ticket #{selectedTicket.ticketNo}</span>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                <p className="font-bold text-slate-800">{selectedTicket.subject}</p>
                <p className="text-slate-500">Raised By: <strong>{selectedTicket.raisedByName} ({selectedTicket.raisedByRole})</strong></p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveStatus} className="space-y-4">

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select New Ticket Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="OPEN">OPEN (Unresolved)</option>
                    <option value="IN_REVIEW">IN REVIEW (Under Investigation)</option>
                    <option value="RESOLVED">RESOLVED (Solution Provided)</option>
                    <option value="CLOSED">CLOSED (Archived)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Resolution Remarks / Response to User *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter resolution notes, action taken, or explanation for the user..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={saveAction.state}
                    loadingText="Updating..."
                    successText="Updated!"
                    errorText="Update Failed"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px]"
                  >
                    <span>Save & Update Ticket</span>
                  </ActionButton>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
