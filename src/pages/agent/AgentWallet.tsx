import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAppDispatch, useAppSelector, selectWalletBalance, selectWalletTransactions, selectWalletStatus, isInitialLoading } from '../../store/hooks';
import { fetchWallet, rechargeWallet } from '../../store/slices/walletSlice';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton, SkeletonTableRows } from '../../components/ui/Skeleton';
import {
  Wallet,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  QrCode
} from 'lucide-react';

interface RechargeFormData {
  amount: number;
}

export default function AgentWallet() {
  // Redux se real balance / transactions (koi fake ₹500 default nahi)
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectWalletBalance);
  const transactions = useAppSelector(selectWalletTransactions);
  const walletStatus = useAppSelector(selectWalletStatus);
  const isLoading = isInitialLoading(walletStatus, transactions.length);
  const recharge = useAsyncAction();
  const [activeTab, setActiveTab] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<RechargeFormData>({
    defaultValues: { amount: 500 }
  });

  const selectedAmount = watch('amount');

  useEffect(() => {
    dispatch(fetchWallet());
  }, [dispatch]);

  const onRechargeSubmit = (data: RechargeFormData) => {
    setErrorMsg('');
    const amt = Number(data.amount);

    recharge.run(async () => {
      const result = await dispatch(rechargeWallet({ amount: amt, remarks: 'Wallet Auto UPI Topup' }));
      if (rechargeWallet.fulfilled.match(result)) {
        setIsModalOpen(false);
        setSuccessMsg(result.payload);
        reset({ amount: 500 });
        setTimeout(() => setSuccessMsg(''), 5000);
        return true;
      }
      setErrorMsg(result.payload || 'Recharge request failed.');
      return false;
    });
  };

  const filteredTxns = transactions.filter(t => {
    const matchesSearch =
      t.txnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && t.type === activeTab;
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header Card with Wallet Balance & Quick Add Action */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <Wallet className="h-4 w-4" />
              <span>Available Shop Wallet Balance</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl text-amber-400">₹</span>
              {isLoading ? (
                <Skeleton className="h-9 w-36 bg-white/20!" />
              ) : (
                <span>{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
            </div>
            <p className="text-xs text-blue-200">
              Instant auto-deduction for MP Online & Citizen Services fees.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="relative z-10 bg-amber-400 hover:bg-amber-300 text-blue-950 font-black px-5 py-3 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 text-xs sm:text-sm shrink-0"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Recharge / Add Money</span>
          </button>

          {/* Decorative Background Circles */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Global Success Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Transaction History Header & Filter Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>Wallet Passbook & Transaction Ledger</span>
              </h2>
              <p className="text-xs text-slate-500">Track all recharge credits and service fee deductions.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['ALL', 'CREDIT', 'DEBIT'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All (Total)' : tab === 'CREDIT' ? 'Money Added (Credit)' : 'Service Fees (Debit)'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions by Txn No, Category, or Remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Txn Details</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-right">Opening / Closing</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {isLoading ? (
                  <SkeletonTableRows rows={5} cols={6} />
                ) : filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No wallet transactions found.
                    </td>
                  </tr>
                ) : (
                    filteredTxns.map((txn) => {
                      const displayAppId = txn.appId || (txn.remarks ? (txn.remarks.match(/\[(?:App|Application|Task)\s*ID:\s*([^\]]+)\]/i)?.[1] || txn.remarks.match(/(APP-\d{4}-\d{4})/i)?.[1]) : null);
                      // Txn No se fake App ID guess nahi karna — sirf real App ID dikhana
                      const finalAppId = displayAppId || null;
                      const cleanRemarks = txn.remarks ? txn.remarks.replace(/\s*\[(?:App|Application|Task)\s*ID:\s*[^\]]+\]/gi, '').trim() : '';

                      return (
                        <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-blue-700 text-xs">{txn.txnNo}</span>
                              {finalAppId && (
                                <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shadow-2xs">
                                  <span className="text-indigo-400 font-sans text-[10px] font-semibold uppercase">App ID:</span>
                                  <span className="text-indigo-900">{finalAppId}</span>
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{cleanRemarks}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              Category: {txn.category.replace('_', ' ')}
                            </div>
                          </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          txn.type === 'CREDIT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {txn.type === 'CREDIT' ? <ArrowDownRight className="h-3 w-3 text-emerald-600" /> : <ArrowUpRight className="h-3 w-3 text-red-600" />}
                          {txn.type}
                        </span>
                      </td>

                      <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                        txn.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'CREDIT' ? '+' : '-'} ₹{txn.amount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs">
                        <div className="text-slate-500">Op: ₹{txn.openingBalance.toFixed(2)}</div>
                        <div className="font-bold text-slate-800">Cl: ₹{txn.closingBalance.toFixed(2)}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {txn.createdAt}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Balance Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <span>Add Money / Recharge Wallet</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onRechargeSubmit)} className="space-y-4" noValidate>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Quick Amount (₹)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['100', '200', '500', '1000', '2000', '5000'].map((amt) => {
                      const numAmt = Number(amt);
                      const isSelected = Number(selectedAmount) === numAmt;
                      return (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => {
                            setValue('amount', numAmt, { shouldValidate: true });
                          }}
                          className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          + ₹{amt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Or Enter Custom Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 750"
                    {...register('amount', {
                      required: 'Recharge amount enter karein.',
                      min: { value: 50, message: 'Minimum recharge amount ₹50 hona chahiye.' },
                      max: { value: 100000, message: 'Maximum recharge limit ₹1,00,000 hai.' },
                      valueAsNumber: true
                    })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.amount ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  {errors.amount && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.amount.message}</span>
                    </p>
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <QrCode className="h-6 w-6 text-blue-600 shrink-0" />
                  <div className="text-[11px] text-blue-900 font-medium">
                    Instant Auto UPI Credit enabled (Cashfree / Meta UPI Gateway).
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={recharge.state}
                    loadingText="Processing..."
                    successText="Money Added!"
                    errorText="Recharge Failed"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[150px]"
                  >
                    <span>Proceed to Add ₹{selectedAmount || 0}</span>
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
