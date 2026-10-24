import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shopStore, type Shop } from '../../services/shopStore';
import { useAppDispatch, useAppSelector, selectShops, selectShopsStatus, isInitialLoading } from '../../store/hooks';
import { fetchShops } from '../../store/slices/shopsSlice';
import { useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Phone,
  Mail,
  Calendar,
  X
} from 'lucide-react';

export default function ManagerVerifyRequests() {
  const dispatch = useAppDispatch();
  // Redux shops (frozen — filter naya array deta hai, mutate nahi)
  const allShops = useAppSelector(selectShops);
  const shopsStatus = useAppSelector(selectShopsStatus);
  const pendingShops = useMemo(
    () => allShops.filter(s => s.status === 'PENDING' || s.status === 'DELETE_REQUESTED'),
    [allShops]
  );
  const showSkeleton = isInitialLoading(shopsStatus, allShops.length);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const rowAction = useKeyedAsyncAction();

  // Page open hote hi fresh shops fetch
  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  // Per-row 3-stage action; facade fail par backend message wala Error throw karta hai
  const runRowAction = (key: string, fn: () => Promise<string>) =>
    rowAction.run(key, async () => {
      setErrorMsg('');
      let message = '';
      try {
        message = await fn();
      } catch (err) {
        setErrorMsg(err instanceof Error && err.message ? err.message : 'Action failed. Please try again.');
        throw err;
      }
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(''), 3500);
    });

  const isRowBusy = (id: string) =>
    rowAction.stateOf(`approve-${id}`) === 'loading' || rowAction.stateOf(`reject-${id}`) === 'loading';

  const handleApprove = (shop: Shop) =>
    runRowAction(`approve-${shop.id}`, async () => {
      if (shop.status === 'DELETE_REQUESTED') {
        await shopStore.approveDeletion(shop.id);
        return `Approved shop deletion request for "${shop.shopName}".`;
      }
      await shopStore.approveShop(shop.id);
      return `Approved & activated shop "${shop.shopName}".`;
    });

  const handleReject = (shop: Shop) =>
    runRowAction(`reject-${shop.id}`, async () => {
      await shopStore.rejectShop(shop.id);
      return `Rejected request for "${shop.shopName}".`;
    });

  const term = searchTerm.toLowerCase();
  const filtered = pendingShops.filter(s =>
    (s.shopName || '').toLowerCase().includes(term) ||
    (s.ownerName || '').toLowerCase().includes(term) ||
    (s.mobile || '').includes(searchTerm) ||
    (s.shopCode || '').toLowerCase().includes(term)
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-amber-600" />
              <span>Verifying Requests Page (Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify pending shop registration requests and distributor deletion requests.
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert (backend message) */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-700 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Shop Code, Shop Name, Owner Name, or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">Pending Verification Queue ({filtered.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Shop Details</th>
                  <th className="py-3.5 px-4">Owner Contact</th>
                  <th className="py-3.5 px-4">Request Type</th>
                  <th className="py-3.5 px-4">Timestamps</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {showSkeleton ? (
                  <SkeletonTableRows rows={4} cols={6} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No pending verification requests found. All clear!
                    </td>
                  </tr>
                ) : (
                  filtered.map((shop) => (
                    <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-blue-700 block">{shop.shopCode}</span>
                        <span className="font-bold text-slate-900">{shop.shopName}</span>
                        <div className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">{shop.address}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{shop.ownerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{shop.mobile}</span>
                        </div>
                        {shop.email && shop.email !== 'N/A' && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{shop.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border ${
                          shop.status === 'DELETE_REQUESTED'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {shop.status === 'DELETE_REQUESTED' ? 'Delete Request' : 'New Registration'}
                        </span>
                        {shop.deleteReason && (
                          <p className="text-[11px] text-red-600 mt-1 italic max-w-xs">Reason: {shop.deleteReason}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>Req Date: <strong>{shop.requestedAt || shop.createdAt || 'N/A'}</strong></span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          <span>{shop.status.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ActionButton
                            state={rowAction.stateOf(`reject-${shop.id}`)}
                            onClick={() => handleReject(shop)}
                            disabled={isRowBusy(shop.id)}
                            loadingText="Rejecting..."
                            successText="Rejected"
                            errorText="Failed"
                            className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </ActionButton>
                          <ActionButton
                            state={rowAction.stateOf(`approve-${shop.id}`)}
                            onClick={() => handleApprove(shop)}
                            disabled={isRowBusy(shop.id)}
                            loadingText="Processing..."
                            successText="Approved!"
                            errorText="Failed"
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
