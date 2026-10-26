import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../../api/client';
import { ActionButton } from '../ui/ActionButton';
import { SkeletonTableRows } from '../ui/Skeleton';
import { useAsyncAction, useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import { getApiErrorMessage } from '../../store/apiError';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building,
  User,
  Phone,
  RefreshCw,
  ShieldCheck,
  Send,
  X,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

interface RejectWithdrawalFormData {
  reason: string;
}

interface ReleasePayoutFormData {
  utrNo: string;
}

type WithdrawalStatus = 'PENDING' | 'MANAGER_VERIFIED' | 'PROCESSED' | 'REJECTED' | 'APPROVED';

interface WithdrawalItem {
  id: string;
  reqNo: string;
  userId: string;
  userName: string;
  userMobile: string;
  userRole: string;
  amount: number;
  paymentMode: string;
  accountHolderName: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  upiId?: string;
  status: WithdrawalStatus;
  rejectionReason?: string | null;
  utrNo?: string | null;
  verifiedByName?: string | null;
  processedByName?: string | null;
  createdAt: string;
}

type TabKey = 'PENDING' | 'MANAGER_VERIFIED' | 'PROCESSED' | 'REJECTED' | 'ALL';

/**
 * 2-Tier Payout Queue
 *  - mode="manager": Step 1 — PENDING request verify & forward (ya reject + refund)
 *  - mode="admin":   Step 2 — MANAGER_VERIFIED request ko Bank UTR ke saath release (ya reject + refund)
 */
export default function WithdrawalQueue({ mode }: { mode: 'manager' | 'admin' }) {
  const isAdmin = mode === 'admin';
  const [requests, setRequests] = useState<WithdrawalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>(isAdmin ? 'MANAGER_VERIFIED' : 'PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [rejectTarget, setRejectTarget] = useState<WithdrawalItem | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<WithdrawalItem | null>(null);
  const [modalError, setModalError] = useState('');

  const rowAction = useKeyedAsyncAction();
  const rejectAction = useAsyncAction();
  const releaseAction = useAsyncAction();

  const {
    register: registerReject,
    handleSubmit: handleRejectSubmitForm,
    reset: resetRejectForm,
    formState: { errors: rejectErrors }
  } = useForm<RejectWithdrawalFormData>({
    defaultValues: { reason: '' }
  });

  const {
    register: registerRelease,
    handleSubmit: handleReleaseSubmitForm,
    reset: resetReleaseForm,
    formState: { errors: releaseErrors }
  } = useForm<ReleasePayoutFormData>({
    defaultValues: { utrNo: '' }
  });

  const fetchWithdrawals = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    try {
      const res = await apiClient.get('/wallet/withdrawals');
      if (res.data.status === 'success') {
        setRequests(res.data.data);
        setLoadError('');
      }
    } catch (e) {
      setLoadError(getApiErrorMessage(e, 'Withdrawal requests load nahi ho paaye.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Step 1: Manager (ya Admin) verify & forward
  const handleVerify = (req: WithdrawalItem) =>
    rowAction.run(`verify-${req.id}`, async () => {
      try {
        await apiClient.patch(`/wallet/withdrawals/${req.id}/verify`, { action: 'approve' });
        flashSuccess(`Request "${req.reqNo}" verified & forwarded to Admin for final payout release.`);
        await fetchWithdrawals(true);
      } catch (err) {
        alert(getApiErrorMessage(err, 'Failed to verify withdrawal request.'));
        throw err;
      }
    });

  const openReject = (req: WithdrawalItem) => {
    setRejectTarget(req);
    resetRejectForm();
    setModalError('');
  };

  const onConfirmReject = (data: RejectWithdrawalFormData) => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    const endpoint = isAdmin ? 'process' : 'verify';
    rejectAction.run(async () => {
      try {
        await apiClient.patch(`/wallet/withdrawals/${target.id}/${endpoint}`, {
          action: 'reject',
          rejectionReason: data.reason.trim()
        });
        setRejectTarget(null);
        resetRejectForm();
        flashSuccess(`Request "${target.reqNo}" rejected and ₹${Number(target.amount).toLocaleString()} refunded to user's wallet.`);
        await fetchWithdrawals(true);
      } catch (err) {
        setModalError(getApiErrorMessage(err, 'Failed to reject withdrawal request.'));
        throw err;
      }
    });
  };

  const openRelease = (req: WithdrawalItem) => {
    setReleaseTarget(req);
    resetReleaseForm();
    setModalError('');
  };

  // Step 2: Admin final payout release (real Bank UTR mandatory)
  const onConfirmRelease = (data: ReleasePayoutFormData) => {
    if (!releaseTarget) return;
    const target = releaseTarget;
    releaseAction.run(async () => {
      try {
        await apiClient.patch(`/wallet/withdrawals/${target.id}/process`, {
          action: 'approve',
          utrNo: data.utrNo.trim()
        });
        setReleaseTarget(null);
        resetReleaseForm();
        flashSuccess(`Payout of ₹${Number(target.amount).toLocaleString()} for "${target.userName}" released (UTR: ${data.utrNo.trim()}).`);
        await fetchWithdrawals(true);
      } catch (err) {
        setModalError(getApiErrorMessage(err, 'Failed to release payout.'));
        throw err;
      }
    });
  };

  const normStatus = (s?: string) => (s || '').toUpperCase();
  const countOf = (tab: TabKey) =>
    tab === 'ALL'
      ? requests.length
      : tab === 'PROCESSED'
        ? requests.filter(r => ['PROCESSED', 'APPROVED'].includes(normStatus(r.status))).length
        : requests.filter(r => normStatus(r.status) === tab).length;

  const filtered = requests.filter(r => {
    const s = normStatus(r.status);
    const matchesTab =
      activeTab === 'ALL' ? true : activeTab === 'PROCESSED' ? ['PROCESSED', 'APPROVED'].includes(s) : s === activeTab;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      r.reqNo?.toLowerCase().includes(q) ||
      r.userName?.toLowerCase().includes(q) ||
      r.userMobile?.includes(searchTerm) ||
      r.bankName?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const tabs: { key: TabKey; label: string }[] = isAdmin
    ? [
        { key: 'MANAGER_VERIFIED', label: 'Ready to Release' },
        { key: 'PENDING', label: 'Awaiting Manager' },
        { key: 'PROCESSED', label: 'Paid' },
        { key: 'REJECTED', label: 'Rejected' },
        { key: 'ALL', label: 'All' }
      ]
    : [
        { key: 'PENDING', label: 'Pending Verify' },
        { key: 'MANAGER_VERIFIED', label: 'Forwarded to Admin' },
        { key: 'PROCESSED', label: 'Paid' },
        { key: 'REJECTED', label: 'Rejected' },
        { key: 'ALL', label: 'All' }
      ];

  const statusBadge = (s: string) => {
    if (s === 'PROCESSED' || s === 'APPROVED') return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'PAID', icon: <CheckCircle2 className="h-3 w-3" /> };
    if (s === 'MANAGER_VERIFIED') return { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'MANAGER VERIFIED', icon: <ShieldCheck className="h-3 w-3" /> };
    if (s === 'PENDING') return { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'PENDING', icon: <Clock className="h-3 w-3" /> };
    return { cls: 'bg-red-50 text-red-700 border-red-200', label: 'REJECTED', icon: <XCircle className="h-3 w-3" /> };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600" />
            <span>{isAdmin ? 'Final Payout Release Desk (Admin)' : 'Operator Withdrawal Verification (Manager)'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Step 2: Manager-verified requests ko bank transfer ke baad real UTR number ke saath release karein, ya reject (auto-refund) karein.'
              : 'Step 1: Operator / Distributor ke bank details verify karke Admin ko forward karein, ya reject (auto-refund) karein.'}
          </p>
        </div>

        <button
          onClick={() => fetchWithdrawals(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-30 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === tab.key ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label} ({isLoading ? '…' : countOf(tab.key)})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Request No, Name, Mobile, or Bank Name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Payout Queue ({isLoading ? '…' : filtered.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4">Request No & Amount</th>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Bank Account Info</th>
                <th className="py-3.5 px-4">Requested / Trail</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {isLoading ? (
                <SkeletonTableRows rows={5} cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No withdrawal requests found in this filter.
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const s = normStatus(r.status);
                  const badge = statusBadge(s);
                  const canVerify = s === 'PENDING';
                  const canRelease = isAdmin && s === 'MANAGER_VERIFIED';
                  const canReject = isAdmin ? ['PENDING', 'MANAGER_VERIFIED'].includes(s) : s === 'PENDING';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-emerald-700 block">{r.reqNo}</span>
                        <span className="text-base font-black text-slate-900">₹ {Number(r.amount || 0).toLocaleString()}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.userName}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{r.userMobile}</span>
                          <span className="bg-slate-100 px-1.5 rounded text-[10px] uppercase font-bold text-slate-600">{r.userRole}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.paymentMode === 'upi' ? 'UPI Transfer' : r.bankName}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                          A/C Holder: <strong className="text-slate-900">{r.accountHolderName || r.userName}</strong>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                          {r.accountNo && r.accountNo !== 'N/A' && <span>A/C: <strong>{r.accountNo}</strong></span>}
                          {r.ifscCode && r.ifscCode !== 'N/A' && <span>IFSC: <strong>{r.ifscCode}</strong></span>}
                          {r.upiId && r.upiId !== 'N/A' && <span className="text-purple-700 font-semibold">UPI: {r.upiId}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600 space-y-0.5">
                        <div>{r.createdAt}</div>
                        {r.verifiedByName && <div className="text-blue-700 font-medium">Verified by: {r.verifiedByName}</div>}
                        {r.utrNo && <div className="text-emerald-700 font-medium font-mono text-[10px]">UTR: {r.utrNo}</div>}
                        {r.rejectionReason && <div className="text-red-600 font-medium">Reason: {r.rejectionReason}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canVerify || canRelease || canReject ? (
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {canReject && (
                              <button
                                onClick={() => openReject(r)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                            {canVerify && (
                              <ActionButton
                                state={rowAction.stateOf(`verify-${r.id}`)}
                                onClick={() => handleVerify(r)}
                                loadingText="Verifying..."
                                successText="Forwarded!"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Verify & Forward</span>
                              </ActionButton>
                            )}
                            {canRelease && (
                              <button
                                onClick={() => openRelease(r)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Release Payout</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">
                            {s === 'MANAGER_VERIFIED' ? 'Awaiting Admin release' : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleRejectSubmitForm(onConfirmReject)} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" noValidate>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Reject {rejectTarget.reqNo} & Refund</span>
              </h3>
              <button type="button" onClick={() => setRejectTarget(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                ₹{Number(rejectTarget.amount).toLocaleString()} <strong>{rejectTarget.userName}</strong> ke wallet me wapas refund ho jayega.
              </p>
              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{modalError}</div>
              )}
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Rejection Reason *</label>
              <textarea
                rows={3}
                placeholder="e.g. Bank account details mismatch"
                {...registerReject('reason', {
                  required: 'Rejection reason enter karein.',
                  minLength: { value: 5, message: 'Reason kam se kam 5 characters ka hona chahiye.' }
                })}
                className={`w-full bg-slate-50 border rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  rejectErrors.reason ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-red-500'
                }`}
              />
              {rejectErrors.reason && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{rejectErrors.reason.message}</span>
                </p>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-white cursor-pointer">
                Cancel
              </button>
              <ActionButton
                type="submit"
                state={rejectAction.state}
                loadingText="Rejecting..."
                successText="Rejected"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>Confirm Reject & Refund</span>
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {/* Release (UTR) Modal — Admin only */}
      {releaseTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReleaseSubmitForm(onConfirmRelease)} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" noValidate>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Release Payout — {releaseTarget.reqNo}</span>
              </h3>
              <button type="button" onClick={() => setReleaseTarget(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Amount</span><strong className="text-slate-900">₹{Number(releaseTarget.amount).toLocaleString()}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Beneficiary</span><strong className="text-slate-900">{releaseTarget.accountHolderName || releaseTarget.userName}</strong></div>
                {releaseTarget.verifiedByName && (
                  <div className="flex justify-between"><span className="text-slate-500">Verified by</span><strong className="text-blue-700">{releaseTarget.verifiedByName}</strong></div>
                )}
              </div>
              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{modalError}</div>
              )}
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Bank UTR / Reference No. *</label>
              <input
                type="text"
                placeholder="Bank transfer ke baad mila UTR number"
                {...registerRelease('utrNo', {
                  required: 'Bank UTR / Reference number enter karein.',
                  minLength: { value: 6, message: 'Valid Bank UTR / Reference number (min 6 characters) enter karein.' }
                })}
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:ring-2 ${
                  releaseErrors.utrNo ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-emerald-600'
                }`}
              />
              {releaseErrors.utrNo && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{releaseErrors.utrNo.message}</span>
                </p>
              )}
              <p className="text-[11px] text-slate-500">Pehle bank / UPI se payment transfer karein, phir yahan asli UTR daal kar release karein.</p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setReleaseTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-white cursor-pointer">
                Cancel
              </button>
              <ActionButton
                type="submit"
                state={releaseAction.state}
                loadingText="Releasing..."
                successText="Released!"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Release</span>
              </ActionButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
