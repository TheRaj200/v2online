import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { complaintStore, type ComplaintTicket } from '../../services/complaintStore';
import { useAppDispatch, useAppSelector, selectComplaints, selectComplaintsStatus, isInitialLoading } from '../../store/hooks';
import { fetchComplaints, sortComplaints } from '../../store/slices/complaintsSlice';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  Headphones,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Tag,
  Calendar,
  Eye,
  FileText
} from 'lucide-react';

export default function DistributorComplaint() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const allComplaints = useAppSelector(selectComplaints);
  const complaintsStatus = useAppSelector(selectComplaintsStatus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<ComplaintTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical Issue');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Backend non-admin ko sirf apne tickets bhejta hai; yahan bhi userId se filter (agent / operator / distributor sab)
  const complaints = useMemo<ComplaintTicket[]>(() => {
    const uId = user?.id?.toString();
    if (!uId) return [];
    return allComplaints.filter(c => c.raisedByUserId?.toString() === uId);
  }, [allComplaints, user?.id]);
  const isTicketsLoading = isInitialLoading(complaintsStatus, complaints.length);

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const submitAction = useAsyncAction();

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Please enter both Subject and Description for your complaint ticket.');
      return;
    }

    submitAction.run(async () => {
      try {
        // Server fail hone par addComplaint throw karta hai (koi fake offline ticket nahi)
        const newTicket = await complaintStore.addComplaint({
          raisedByUserId: user?.id,
          raisedByName: user?.full_name || 'Portal User',
          raisedByRole: (user?.role as any) || 'agent',
          subject,
          category,
          description
        });

        // Close dialog immediately without delay
        setIsModalOpen(false);
        setSuccessMsg(`Complaint Ticket "${newTicket.ticketNo}" raised successfully! Our support team will review it.`);
        setSubject('');
        setDescription('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Complaint submit failed. Kripya dobara try karein.');
        throw err;
      }
    });
  };

  // OPEN pehle, phir naya ticket upar (sortComplaints copy return karta hai)
  const term = searchTerm.toLowerCase();
  const filteredComplaints = sortComplaints(complaints.filter(c =>
    (c.ticketNo || '').toLowerCase().includes(term) ||
    (c.subject || '').toLowerCase().includes(term) ||
    (c.category || '').toLowerCase().includes(term)
  ));

  const getPortalTitle = () => {
    if (user?.role === 'agent') return 'Shop / Retailer Helpdesk & Complaint Portal';
    if (user?.role === 'operator') return 'Operator Helpdesk & Complaint Portal';
    return 'Distributor Helpdesk & Complaint Portal';
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Headphones className="h-6 w-6 text-red-600" />
              <span>{getPortalTitle()}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Raise support tickets for technical glitches, portal issues, or manager assistance.
            </p>
          </div>

          <button
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Raise New Ticket</span>
          </button>
        </div>

        {/* Global Action Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Ticket No, Subject, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Tickets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Your Support Tickets</span>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 font-mono">
                {filteredComplaints.length}
              </span>
            </h2>
          </div>

          {isTicketsLoading ? (
            <SkeletonCards count={3} />
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs sm:text-sm shadow-xs">
              <Headphones className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">No support tickets found.</p>
              <p className="text-slate-400 text-xs mt-1">Click "Raise New Ticket" above to submit a support request.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredComplaints.map((item) => {
                const statusBorderClass =
                  item.status === 'RESOLVED'
                    ? 'border-l-4 border-l-emerald-500'
                    : item.status === 'IN_REVIEW'
                    ? 'border-l-4 border-l-amber-500'
                    : 'border-l-4 border-l-red-500';

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5 ${statusBorderClass}`}
                  >
                    {/* Top Row: Ticket No, Category Badge, Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50/90 px-3 py-1 rounded-lg border border-blue-200/60 shadow-2xs">
                          {item.ticketNo}
                        </span>
                        
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span>{item.category}</span>
                        </span>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                        item.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'IN_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {item.status === 'RESOLVED' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : item.status === 'IN_REVIEW' ? (
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <span>{(item.status || '').replace('_', ' ')}</span>
                      </span>
                    </div>

                    {/* Subject & Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {item.subject}
                      </h3>
                      
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </div>
                    </div>

                    {/* Resolution Remarks Box if Resolved */}
                    {item.resolutionNote && (
                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl text-xs text-emerald-950 font-medium space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Admin Resolution Remarks ({item.resolvedBy || 'Support Desk'}):</span>
                        </div>
                        <p className="text-slate-700 pl-5 leading-relaxed">{item.resolutionNote}</p>
                      </div>
                    )}

                    {/* Card Footer: Date & View Details Button */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Raised on <strong>{item.createdAt}</strong></span>
                      </div>

                      <button
                        onClick={() => setViewTicket(item)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-600" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View Details Modal */}
        {viewTicket && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Headphones className="h-5 w-5 text-red-600" />
                  <span>Ticket Details</span>
                </div>
                <button
                  onClick={() => setViewTicket(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Ticket Summary Header Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-blue-700 text-sm">{viewTicket.ticketNo}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    viewTicket.status === 'RESOLVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : viewTicket.status === 'IN_REVIEW'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {(viewTicket.status || '').replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span>Category: <strong>{viewTicket.category}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Date: <strong>{viewTicket.createdAt}</strong></span>
                  </div>
                </div>
              </div>

              {/* Subject & Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <FileText className="h-4 w-4 text-red-600" />
                  <span>Subject: {viewTicket.subject}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Full Description / Details:
                  </label>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {viewTicket.description}
                  </div>
                </div>
              </div>

              {/* Resolution Remarks */}
              {viewTicket.resolutionNote && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Official Resolution Remarks ({viewTicket.resolvedBy || 'Support Team'}):
                  </span>
                  <p className="text-emerald-950 leading-relaxed pl-5">{viewTicket.resolutionNote}</p>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Raise Ticket Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Headphones className="h-5 w-5 text-red-600" />
                  <span>Raise Support Ticket</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Complaint Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="Technical Issue">Technical Glitch / Portal Bug</option>
                    <option value="Service Delay">Service Processing Delay</option>
                    <option value="Operator Issue">Operator Assistance</option>
                    <option value="Account & Login">Account & Password Problem</option>
                    <option value="Other">Other General Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subject / Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Brief title of the issue..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Explain the problem in detail with shop name or application reference number..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={submitAction.state}
                    loadingText="Submitting..."
                    successText="Ticket Raised!"
                    errorText="Failed"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-w-[130px]"
                  >
                    <span>Submit Ticket</span>
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

