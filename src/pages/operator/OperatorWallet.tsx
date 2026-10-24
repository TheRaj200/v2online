import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { useAppDispatch, useAppSelector, selectWalletBalance, selectWalletTransactions, selectWalletStatus, isInitialLoading } from '../../store/hooks';
import { fetchWallet } from '../../store/slices/walletSlice';
import { getApiErrorMessage } from '../../store/apiError';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton, SkeletonTableRows } from '../../components/ui/Skeleton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  Building,
  CreditCard,
  Hash,
  User,
  RefreshCw,
  Clock,
  ShieldCheck,
  XCircle,
  IndianRupee,
  Smartphone,
  Info,
  Check,
  Copy,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface MyWithdrawal {
  id: string;
  reqNo: string;
  amount: number;
  paymentMode: string;
  status: string;
  utrNo?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

// React Hook Form fields interface
interface WithdrawalFormData {
  amount: number;
  paymentMode: 'bank_transfer' | 'upi';
  accountHolderName: string;
  bankName: string;
  customBankName?: string;
  accountType: 'Savings' | 'Current';
  accountNo?: string;
  confirmAccountNo?: string;
  ifscCode?: string;
  upiId?: string;
  confirmUpiId?: string;
}

// Popular Indian Banks list for quick dropdown selection
const POPULAR_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Axis Bank',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'Central Bank of India',
  'Indian Bank',
  'UCO Bank',
  'Other Bank'
];

// 2-tier payout status badge
const withdrawalBadge = (status: string) => {
  const s = (status || '').toUpperCase();
  if (s === 'PROCESSED' || s === 'APPROVED') {
    return {
      label: 'PAID & SETTLED',
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />
    };
  }
  if (s === 'MANAGER_VERIFIED') {
    return {
      label: 'VERIFIED • AWAITING PAYOUT',
      cls: 'bg-blue-50 text-blue-800 border-blue-300',
      icon: <ShieldCheck className="h-3 w-3 text-blue-600" />
    };
  }
  if (s === 'PENDING') {
    return {
      label: 'PENDING VERIFICATION',
      cls: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: <Clock className="h-3 w-3 text-amber-600" />
    };
  }
  return {
    label: 'REJECTED (REFUNDED)',
    cls: 'bg-rose-50 text-rose-800 border-rose-300',
    icon: <XCircle className="h-3 w-3 text-rose-600" />
  };
};

export default function OperatorWallet() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Redux wallet balance & transactions
  const balance = useAppSelector(selectWalletBalance);
  const txns = useAppSelector(selectWalletTransactions);
  const walletStatus = useAppSelector(selectWalletStatus);
  const isWalletLoading = isInitialLoading(walletStatus, txns.length);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [activeTxnTab, setActiveTxnTab] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [txnSearch, setTxnSearch] = useState('');
  const submitAction = useAsyncAction();

  // Operator withdrawal requests
  const [myRequests, setMyRequests] = useState<MyWithdrawal[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);

  // React Hook Form initialization
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<WithdrawalFormData>({
    mode: 'onChange',
    defaultValues: {
      amount: undefined,
      paymentMode: 'bank_transfer',
      accountHolderName: user?.full_name || '',
      bankName: 'State Bank of India',
      customBankName: '',
      accountType: 'Savings',
      accountNo: '',
      confirmAccountNo: '',
      ifscCode: '',
      upiId: '',
      confirmUpiId: ''
    }
  });

  const selectedPaymentMode = watch('paymentMode');
  const watchedBankName = watch('bankName');
  const watchedAmount = watch('amount') || 0;
  const watchedAccountNo = watch('accountNo');
  const watchedUpiId = watch('upiId');

  const fetchMyRequests = useCallback(async () => {
    try {
      const res = await apiClient.get('/wallet/withdrawals');
      if (res.data.status === 'success' && Array.isArray(res.data.data)) {
        setMyRequests(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch withdrawal requests:', e);
    } finally {
      setIsRequestsLoading(false);
    }
  }, []);

  const syncWallet = useCallback(async () => {
    await Promise.all([dispatch(fetchWallet()), fetchMyRequests()]);
  }, [dispatch, fetchMyRequests]);

  useEffect(() => {
    syncWallet();
  }, [syncWallet]);

  // Open withdrawal modal and prefill default values
  const handleOpenWithdrawalModal = () => {
    setErrorMsg('');
    reset({
      amount: undefined,
      paymentMode: 'bank_transfer',
      accountHolderName: user?.full_name || '',
      bankName: 'State Bank of India',
      customBankName: '',
      accountType: 'Savings',
      accountNo: '',
      confirmAccountNo: '',
      ifscCode: '',
      upiId: '',
      confirmUpiId: ''
    });
    setIsModalOpen(true);
  };

  // Quick Amount preset handler
  const handleSetPresetAmount = (preset: number) => {
    const finalAmt = Math.min(preset, balance);
    setValue('amount', finalAmt, { shouldValidate: true });
  };

  // Copy UTR helper
  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  // Submit form via React Hook Form
  const onWithdrawalSubmit = (data: WithdrawalFormData) => {
    setErrorMsg('');
    const val = Number(data.amount);
    const isUpi = data.paymentMode === 'upi';

    // Resolved Bank Name
    const resolvedBankName = data.bankName === 'Other Bank'
      ? data.customBankName?.trim() || 'Bank Transfer'
      : `${data.bankName} (${data.accountType || 'Savings'})`;

    submitAction.run(async () => {
      try {
        const res = await apiClient.post('/wallet/withdraw', {
          amount: val,
          accountHolderName: data.accountHolderName.trim(),
          bankName: isUpi ? undefined : resolvedBankName,
          accountNo: isUpi ? undefined : data.accountNo?.trim(),
          ifscCode: isUpi ? undefined : data.ifscCode?.trim().toUpperCase(),
          upiId: isUpi ? data.upiId?.trim() : undefined,
          paymentMode: data.paymentMode
        });

        if (res.data.status !== 'success') {
          setErrorMsg(res.data.message || 'Failed to submit withdrawal request.');
          return false;
        }

        const reqNo = res.data.data?.reqNo || 'WDR-REQ';
        setSuccessMsg(`Withdrawal Request "${reqNo}" for ₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })} submitted successfully! It will be verified by Manager and paid out by Admin.`);
        setIsModalOpen(false);
        await syncWallet();
        setTimeout(() => setSuccessMsg(''), 7000);
        return true;
      } catch (err) {
        setErrorMsg(getApiErrorMessage(err, 'Server error while submitting withdrawal.'));
        throw err;
      }
    });
  };

  // Statistics calculation
  const totalPendingAmount = useMemo(() => {
    return myRequests
      .filter(r => ['pending', 'manager_verified'].includes((r.status || '').toLowerCase()))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [myRequests]);

  const totalPaidAmount = useMemo(() => {
    return myRequests
      .filter(r => ['processed', 'approved'].includes((r.status || '').toLowerCase()))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [myRequests]);

  // Filtered transactions
  const filteredTxns = useMemo(() => {
    return txns.filter(t => {
      const matchSearch =
        (t.remarks || '').toLowerCase().includes(txnSearch.toLowerCase()) ||
        (t.txnNo || '').toLowerCase().includes(txnSearch.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(txnSearch.toLowerCase());

      if (!matchSearch) return false;
      if (activeTxnTab === 'CREDIT') return t.type === 'CREDIT';
      if (activeTxnTab === 'DEBIT') return t.type === 'DEBIT';
      return true;
    });
  }, [txns, txnSearch, activeTxnTab]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-800/40">
          {/* Ambient Lighting Accents */}
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #059669 0%, transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/20 text-teal-300 text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                <span>Operator Earnings & Payout Console</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Wallet className="h-7 w-7 text-emerald-400" />
                <span>Operator Wallet & Earnings Desk</span>
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
                Track your service delivery commission incentives, manage payouts to verified bank accounts or UPI, and view settlement ledger.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={syncWallet}
                disabled={walletStatus === 'loading'}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 text-emerald-300 ${walletStatus === 'loading' ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleOpenWithdrawalModal}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-2.5 px-5 rounded-2xl text-xs sm:text-sm shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>Request Bank Payout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Success Notification */}
        {successMsg && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs animate-in fade-in">
            <div className="h-7 w-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2. Three Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Available Wallet Balance */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Balance</span>
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {isWalletLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <span>₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                ● Ready for withdrawal
              </span>
              <button
                onClick={handleOpenWithdrawalModal}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Payout →</span>
              </button>
            </div>
          </div>

          {/* Card 2: Pending In-Review Payouts */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Approvals</span>
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600">
              {isRequestsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <span>₹ {totalPendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-amber-700 font-medium">
              <span>{myRequests.filter(r => ['pending', 'manager_verified'].includes((r.status || '').toLowerCase())).length} requests in verification</span>
            </div>
          </div>

          {/* Card 3: Total Settled / Paid Payouts */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Settled Payouts</span>
              <div className="h-10 w-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-teal-700">
              {isRequestsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <span>₹ {totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-teal-700 font-medium">
              <span>Transferred directly to bank account / UPI</span>
            </div>
          </div>

        </div>

        {/* 3. My Withdrawal Requests (2-tier verification tracking) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-teal-600" />
                <span>My Withdrawal & Payout Requests ({isRequestsLoading ? '…' : myRequests.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Payout cycle: Operator Request → Manager Verification → Admin Bank Payout
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Payout Method</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isRequestsLoading ? (
                  <SkeletonTableRows rows={3} cols={5} />
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Wallet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <span>No withdrawal requests placed yet.</span>
                    </td>
                  </tr>
                ) : (
                  myRequests.map((r) => {
                    const badge = withdrawalBadge(r.status);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-teal-800 text-xs block">{r.reqNo}</span>
                          {r.utrNo && (
                            <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                              <span>UTR: <strong>{r.utrNo}</strong></span>
                              <button
                                onClick={() => handleCopyUtr(r.utrNo!)}
                                title="Copy UTR Reference"
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {copiedUtr === r.utrNo ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                          {r.rejectionReason && (
                            <span className="block text-[11px] text-rose-600 mt-1 font-medium">
                              Reason: {r.rejectionReason}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 uppercase text-xs flex items-center gap-1.5">
                            {r.paymentMode === 'upi' ? (
                              <>
                                <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                                <span>UPI Transfer</span>
                              </>
                            ) : (
                              <>
                                <Building className="h-3.5 w-3.5 text-blue-600" />
                                <span>Bank Transfer</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {r.createdAt}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${badge.cls}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ₹ {Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Wallet Transaction History */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-teal-600" />
                <span>Wallet Passbook & Transaction Ledger ({isWalletLoading ? '…' : txns.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every task verification credit and withdrawal debit logged in real-time
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'CREDIT', 'DEBIT'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTxnTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTxnTab === tab
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab === 'CREDIT' ? 'Earnings (+)' : 'Payouts (-)'}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder="Search Txn ID / Remarks..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Description & Ref ID</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isWalletLoading ? (
                  <SkeletonTableRows rows={5} cols={4} />
                ) : filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      No wallet transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          t.type === 'CREDIT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {t.type === 'CREDIT' ? <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> : <ArrowUpRight className="h-3 w-3 text-slate-600" />}
                          <span>{t.type === 'CREDIT' ? 'EARNING' : 'WITHDRAWAL'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {t.remarks || t.category}
                        {t.txnNo && <span className="text-[11px] text-teal-700 font-mono block mt-0.5">{t.txnNo}</span>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {t.createdAt}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                        t.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {t.type === 'CREDIT' ? '+' : '-'} ₹ {Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WITHDRAWAL MODAL POWERED BY REACT HOOK FORM                                */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative my-auto animate-in zoom-in-95 max-h-[92vh] overflow-y-auto flex flex-col">

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Request Bank Payout</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Withdraw accumulated service earnings directly to your bank account or UPI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Available Balance Box with Quick Chips */}
              <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Available For Withdrawal</span>
                  <span className="font-mono font-black text-emerald-800 text-lg">
                    ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Quick preset amount chips */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Quick Select:</span>
                  {[100, 200, 500, 1000].filter(a => a <= balance).map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleSetPresetAmount(a)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-mono font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs"
                    >
                      ₹{a}
                    </button>
                  ))}
                  {balance > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetPresetAmount(balance)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                    >
                      Full Balance (₹{balance.toFixed(0)})
                    </button>
                  )}
                </div>
              </div>

              {/* Form Error Banner */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form powered by React Hook Form */}
              <form onSubmit={handleSubmit(onWithdrawalSubmit)} className="space-y-4">

                {/* 1. Withdrawal Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Withdrawal Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`Enter amount (Minimum ₹10, Max ₹${balance.toFixed(2)})`}
                      {...register('amount', {
                        required: 'Withdrawal amount enter karna zaroori hai',
                        valueAsNumber: true,
                        min: { value: 10, message: 'Minimum withdrawal amount ₹ 10.00 hai' },
                        max: { value: balance, message: `Wallet balance se zyada amount enter nahi kar sakte! (Max: ₹${balance.toFixed(2)})` }
                      })}
                      className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                        errors.amount ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{errors.amount.message}</span>
                    </p>
                  )}
                </div>

                {/* 2. Payout Mode Selection Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Payout Transfer Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('paymentMode', 'bank_transfer', { shouldValidate: true })}
                      className={`p-3 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedPaymentMode === 'bank_transfer'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Building className="h-4 w-4 text-emerald-600" />
                      <span>Direct Bank Account (NEFT/IMPS)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('paymentMode', 'upi', { shouldValidate: true })}
                      className={`p-3 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedPaymentMode === 'upi'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Smartphone className="h-4 w-4 text-indigo-600" />
                      <span>Instant UPI Transfer (VPA)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Account Holder Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Beneficiary / Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Full Name as registered in Bank records"
                      {...register('accountHolderName', {
                        required: 'Account holder name required hai',
                        minLength: { value: 3, message: 'Name kam se kam 3 characters ka hona chahiye' }
                      })}
                      className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                        errors.accountHolderName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.accountHolderName && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{errors.accountHolderName.message}</span>
                    </p>
                  )}
                </div>

                {/* ================= BANK TRANSFER SPECIFIC FIELDS ================= */}
                {selectedPaymentMode === 'bank_transfer' && (
                  <div className="space-y-4 pt-1">

                    {/* Bank Name Dropdown & Account Type in 2-cols */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <select
                          {...register('bankName', { required: 'Bank name select karein' })}
                          className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        >
                          {POPULAR_BANKS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Account Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          {...register('accountType', { required: 'Account type select karein' })}
                          className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        >
                          <option value="Savings">Savings Account</option>
                          <option value="Current">Current Account</option>
                        </select>
                      </div>
                    </div>

                    {/* If 'Other Bank' selected, show custom bank text input */}
                    {watchedBankName === 'Other Bank' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Specify Other Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Gramin Bank of Aryavart / Saraswat Bank"
                          {...register('customBankName', {
                            validate: (val) => {
                              if (watchedBankName === 'Other Bank' && (!val || !val.trim())) {
                                return 'Bank ka naam enter karna zaroori hai';
                              }
                              return true;
                            }
                          })}
                          className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        />
                        {errors.customBankName && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{errors.customBankName.message}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Account Number & Confirm Account Number (2-columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Bank Account Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <CreditCard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            maxLength={18}
                            placeholder="e.g. 38192019489"
                            {...register('accountNo', {
                              required: 'Account number enter karna zaroori hai',
                              pattern: {
                                value: /^\d{9,18}$/,
                                message: 'Sahi account number (9-18 digits) enter karein'
                              }
                            })}
                            className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                              errors.accountNo ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                            }`}
                          />
                        </div>
                        {errors.accountNo && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{errors.accountNo.message}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Confirm Account Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <CreditCard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            maxLength={18}
                            placeholder="Re-enter Account No"
                            {...register('confirmAccountNo', {
                              required: 'Confirm account number zaroori hai',
                              validate: (val) => {
                                if (val !== watchedAccountNo) {
                                  return 'Account numbers match nahi kar rahe hain!';
                                }
                                return true;
                              }
                            })}
                            className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                              errors.confirmAccountNo ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                            }`}
                          />
                        </div>
                        {errors.confirmAccountNo && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{errors.confirmAccountNo.message}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* IFSC Code */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Bank Branch IFSC Code <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Hash className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          maxLength={11}
                          placeholder="e.g. SBIN0001234 (11 characters)"
                          {...register('ifscCode', {
                            required: 'IFSC code zaroori hai',
                            pattern: {
                              value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                              message: 'Invalid IFSC! 11 characters (e.g. SBIN0001234, 5th character 0)'
                            }
                          })}
                          onChange={(e) => {
                            setValue('ifscCode', e.target.value.toUpperCase(), { shouldValidate: true });
                          }}
                          className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                            errors.ifscCode ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                          }`}
                        />
                      </div>
                      {errors.ifscCode && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{errors.ifscCode.message}</span>
                        </p>
                      )}
                    </div>

                  </div>
                )}

                {/* ================= UPI TRANSFER SPECIFIC FIELDS ================= */}
                {selectedPaymentMode === 'upi' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Virtual Payment Address / UPI ID <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Smartphone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. 9876543210@paytm / name@okaxis"
                          {...register('upiId', {
                            required: 'UPI ID enter karna zaroori hai',
                            pattern: {
                              value: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
                              message: 'Sahi UPI ID format enter karein (e.g. mobile@paytm / name@upi)'
                            }
                          })}
                          className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                            errors.upiId ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                          }`}
                        />
                      </div>
                      {errors.upiId && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{errors.upiId.message}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Confirm UPI ID <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Smartphone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Re-enter UPI ID"
                          {...register('confirmUpiId', {
                            required: 'Confirm UPI ID zaroori hai',
                            validate: (val) => {
                              if (val !== watchedUpiId) {
                                return 'UPI IDs match nahi kar rahe hain!';
                              }
                              return true;
                            }
                          })}
                          className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
                            errors.confirmUpiId ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-slate-50 focus:bg-white'
                          }`}
                        />
                      </div>
                      {errors.confirmUpiId && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{errors.confirmUpiId.message}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Settlement Breakdown & Security Notice */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Withdrawal Request Amount:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹ {Number(watchedAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Payout Processing Fee:</span>
                    <span className="font-mono font-bold text-emerald-600">₹ 0.00 (Free)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 pt-1.5 border-t border-slate-200">
                    <span>Remaining Wallet Balance:</span>
                    <span className={`font-mono font-black text-sm ${balance >= watchedAmount ? 'text-emerald-700' : 'text-rose-600'}`}>
                      ₹ {Math.max(0, balance - (watchedAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 leading-relaxed">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Payout request is verified by your Area Manager and disbursed by Admin. Funds will reflect in your bank account via NEFT/IMPS within 2 to 24 hours.
                  </span>
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <ActionButton
                    type="submit"
                    state={submitAction.state}
                    loadingText="Submitting Request..."
                    successText="Submitted!"
                    errorText="Failed"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Submit Withdrawal Request</span>
                    <ArrowRight className="h-4 w-4" />
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
