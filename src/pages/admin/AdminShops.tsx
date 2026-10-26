import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shopStore } from '../../services/shopStore';
import type { Shop } from '../../services/shopStore';
import { useAppDispatch, useAppSelector, selectShops, selectShopsStatus, isInitialLoading } from '../../store/hooks';
import { fetchShops } from '../../store/slices/shopsSlice';
import { useAsyncAction, useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import {
  Store,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  Phone,
  Mail,
  PlusCircle,
  X,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

interface AddShopFormData {
  shopName: string;
  ownerName: string;
  mobile: string;
  password: string;
  email?: string;
  aadhaar?: string;
  address: string;
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (typeof dateStr === 'string' && (dateStr.includes('AM') || dateStr.includes('PM') || dateStr.includes('am') || dateStr.includes('pm'))) {
    return dateStr;
  }
  try {
    // Safari ke liye 'YYYY-MM-DD HH:MM:SS' -> ISO 'T' format
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
};

export default function AdminShops() {
  const dispatch = useAppDispatch();
  // Redux shops list (frozen — mutate nahi karna)
  const shops = useAppSelector(selectShops);
  const shopsStatus = useAppSelector(selectShopsStatus);
  const showSkeleton = isInitialLoading(shopsStatus, shops.length);
  const [errorMsg, setErrorMsg] = useState('');
  const rowAction = useKeyedAsyncAction();
  const addAction = useAsyncAction();
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'DELETE_REQUESTS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Shop Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register: registerAddShop,
    handleSubmit: handleAddShopSubmitForm,
    reset: resetAddShop,
    formState: { errors: addShopErrors }
  } = useForm<AddShopFormData>({
    defaultValues: {
      shopName: '',
      ownerName: '',
      mobile: '',
      password: '',
      email: '',
      aadhaar: '',
      address: ''
    }
  });

  // Page open hote hi fresh shop list
  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  // Filtered Shops per Tab
  const getTabShops = () => {
    switch (activeTab) {
      case 'APPROVED':
        return shops.filter(s => s.status === 'ACTIVE');
      case 'PENDING':
        return shops.filter(s => s.status === 'PENDING');
      case 'DELETE_REQUESTS':
        return shops.filter(s => s.status === 'DELETE_REQUESTED');
      case 'ALL':
      default:
        return shops;
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredShops = getTabShops().filter(s =>
    (s.shopName || '').toLowerCase().includes(term) ||
    (s.ownerName || '').toLowerCase().includes(term) ||
    (s.mobile || '').includes(searchTerm) ||
    (s.shopCode || '').toLowerCase().includes(term)
  );

  // Per-row 3-stage action — facade fail hone par backend message ke saath Error throw karta hai
  const runShopAction = (key: string, fn: () => Promise<void>, successText: string, fallback: string) =>
    rowAction.run(key, async () => {
      setErrorMsg('');
      try {
        await fn();
      } catch (err) {
        setErrorMsg(err instanceof Error && err.message ? err.message : fallback);
        throw err;
      }
      setSuccessMsg(successText);
      setTimeout(() => setSuccessMsg(''), 3000);
    });

  // Ek row par koi action chal raha ho to us row ke baaki buttons disable
  const isRowBusy = (id: string) =>
    ['approve', 'reject', 'delete', 'deactivate', 'activate', 'perm-delete'].some(k => rowAction.stateOf(`${k}-${id}`) === 'loading');

  // Handlers
  const handleApprovePending = (shop: Shop, key = `approve-${shop.id}`) =>
    runShopAction(key, () => shopStore.approveShop(shop.id), `Shop "${shop.shopName}" approved & activated!`, 'Failed to approve shop.');

  const handleApproveDeletion = (shop: Shop) =>
    runShopAction(
      `delete-${shop.id}`,
      () => shopStore.approveDeletion(shop.id),
      `Deletion approved for "${shop.shopName}". Shop deactivated & login blocked!`,
      'Failed to approve deletion.'
    );

  const handleDeleteShopPermanently = (shop: Shop) => {
    if (!window.confirm(`Kya aap sure hain ki "${shop.shopName}" ko permanently delete karna chahte hain? Iska poora data aur user account delete ho jayega.`)) return;
    runShopAction(
      `perm-delete-${shop.id}`,
      () => shopStore.deleteShopPermanently(shop.id),
      `Shop "${shop.shopName}" permanently deleted from system!`,
      'Failed to delete shop permanently.'
    );
  };

  const handleRejectPending = (shop: Shop, key = `reject-${shop.id}`) =>
    runShopAction(key, () => shopStore.rejectShop(shop.id), `Registration request for "${shop.shopName}" rejected.`, 'Failed to reject shop.');

  const onAddShopSubmit = async (data: AddShopFormData) => {
    setFormError('');

    addAction.run(async () => {
      try {
        await shopStore.addActiveShopByDistributor({
          shopName: data.shopName.trim(),
          ownerName: data.ownerName.trim(),
          mobile: data.mobile.trim(),
          email: data.email?.trim() || '',
          aadhaar: data.aadhaar?.trim() || '',
          address: data.address.trim(),
          password: data.password
        });
      } catch (err) {
        setFormError(err instanceof Error && err.message ? err.message : 'Failed to add shop. Please try again.');
        throw err;
      }

      setSuccessMsg(`New Shop "${data.shopName}" added and activated successfully!`);
      setIsAddModalOpen(false);
      resetAddShop();
      setTimeout(() => setSuccessMsg(''), 4000);
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Store className="h-6 w-6 text-blue-600" />
              <span>Super Admin - Master Shop Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Control shop registrations, partner verification requests, and distributor deletion requests.
            </p>
          </div>

          <button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add New Shop</span>
          </button>
        </div>

        {/* Action Message Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-700 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4 Tabs Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>All Shops ({shops.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Approved Shops ({shops.filter(s => s.status === 'ACTIVE').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Pending Shops ({shops.filter(s => s.status === 'PENDING').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DELETE_REQUESTS')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'DELETE_REQUESTS'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Shop Requests ({shops.filter(s => s.status === 'DELETE_REQUESTED').length})</span>
          </button>

        </div>

        {/* Search Input */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shops by Name, Owner, Mobile, or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Tab Content Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Shop Details</th>
                  <th className="py-3.5 px-4">Owner Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4">Timestamps</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {showSkeleton ? (
                  <SkeletonTableRows rows={5} cols={7} />
                ) : filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No shops found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 text-xs block">{shop.shopCode}</span>
                        <span className="font-bold text-slate-900 text-sm">{shop.shopName}</span>
                        {shop.distributorName && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-semibold">
                              <span>Distributor: {shop.distributorName}</span>
                              {shop.distributorMobile && <span className="font-mono">({shop.distributorMobile})</span>}
                            </span>
                          </div>
                        )}
                        {shop.deleteReason && (
                          <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px]">
                            <strong>Reason:</strong> {shop.deleteReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {shop.ownerName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-700 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{shop.mobile}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{shop.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate font-medium">
                        {shop.address}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-[11px] space-y-0.5 min-w-[170px]">
                        <div><span className="text-[9px] font-bold uppercase text-slate-400"> </span><strong>{formatDateTime(shop.requestedAt || shop.createdAt)}</strong></div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          shop.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : shop.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : shop.status === 'DELETE_REQUESTED'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {shop.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        {/* Actions for PENDING Tab */}
                        {shop.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionButton
                              state={rowAction.stateOf(`reject-${shop.id}`)}
                              onClick={() => handleRejectPending(shop)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Rejecting..."
                              successText="Rejected"
                              errorText="Failed"
                              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold"
                            >
                              Reject
                            </ActionButton>
                            <ActionButton
                              state={rowAction.stateOf(`approve-${shop.id}`)}
                              onClick={() => handleApprovePending(shop)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Approving..."
                              successText="Approved!"
                              errorText="Failed"
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1"
                            >
                              <span>Approve & Activate</span>
                            </ActionButton>
                          </div>
                        )}

                        {/* Actions for DELETE_REQUESTED Tab */}
                        {shop.status === 'DELETE_REQUESTED' && (
                          <div className="flex items-center justify-end gap-2">
                            <ActionButton
                              state={rowAction.stateOf(`delete-${shop.id}`)}
                              onClick={() => handleApproveDeletion(shop)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Deactivating..."
                              successText="Deactivated"
                              errorText="Failed"
                              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                            >
                              <span>Approve Deletion (Deactivate Shop)</span>
                            </ActionButton>
                            <ActionButton
                              state={rowAction.stateOf(`perm-delete-${shop.id}`)}
                              onClick={() => handleDeleteShopPermanently(shop)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Deleting..."
                              successText="Deleted"
                              errorText="Failed"
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1"
                              title="Delete Permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Permanently</span>
                            </ActionButton>
                          </div>
                        )}

                        {/* Status label & actions for ACTIVE */}
                        {shop.status === 'ACTIVE' && (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-semibold text-emerald-600">Operational</span>
                            <ActionButton
                              state={rowAction.stateOf(`deactivate-${shop.id}`)}
                              onClick={() => handleRejectPending(shop, `deactivate-${shop.id}`)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Deactivating..."
                              successText="Deactivated"
                              errorText="Failed"
                              className="bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200 transition-colors"
                            >
                              Deactivate
                            </ActionButton>
                            <ActionButton
                              state={rowAction.stateOf(`perm-delete-${shop.id}`)}
                              onClick={() => handleDeleteShopPermanently(shop)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Deleting..."
                              successText="Deleted"
                              errorText="Failed"
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                              title="Delete Shop Permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ActionButton>
                          </div>
                        )}

                        {/* Status label & action button for INACTIVE */}
                        {shop.status === 'INACTIVE' && (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-semibold text-slate-400">Login Blocked</span>
                            <ActionButton
                              state={rowAction.stateOf(`activate-${shop.id}`)}
                              onClick={() => handleApprovePending(shop, `activate-${shop.id}`)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Activating..."
                              successText="Activated!"
                              errorText="Failed"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-colors"
                            >
                              Activate Shop
                            </ActionButton>
                            <ActionButton
                              state={rowAction.stateOf(`perm-delete-${shop.id}`)}
                              onClick={() => handleDeleteShopPermanently(shop)}
                              disabled={isRowBusy(shop.id)}
                              loadingText="Deleting..."
                              successText="Deleted"
                              errorText="Failed"
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                              title="Delete Shop Permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ActionButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New Shop Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Store className="h-5 w-5 text-blue-600" />
                  <span>Add New Shop (Admin)</span>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddShopSubmitForm(onAddShopSubmit)} className="space-y-3.5" noValidate>
                
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Shop / Outlet Name"
                    {...registerAddShop('shopName', {
                      required: 'Shop Name enter karein.',
                      minLength: { value: 3, message: 'Shop name at least 3 characters ka hona chahiye.' }
                    })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      addShopErrors.shopName ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  {addShopErrors.shopName && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{addShopErrors.shopName.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name of Owner"
                    {...registerAddShop('ownerName', {
                      required: 'Owner Name enter karein.',
                      minLength: { value: 3, message: 'Owner name at least 3 characters ka hona chahiye.' }
                    })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      addShopErrors.ownerName ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  {addShopErrors.ownerName && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{addShopErrors.ownerName.message}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit Mobile"
                      {...registerAddShop('mobile', {
                        required: '10-digit mobile number enter karein.',
                        pattern: {
                          value: /^[6-9]\d{9}$/,
                          message: 'Valid 10-digit mobile number (6-9 se shuru) enter karein.'
                        }
                      })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                        addShopErrors.mobile ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                    {addShopErrors.mobile && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{addShopErrors.mobile.message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Login Password *
                    </label>
                    <input
                      type="password"
                      placeholder="Set Password"
                      {...registerAddShop('password', {
                        required: 'Password enter karein.',
                        minLength: { value: 6, message: 'Password at least 6 characters ka hona chahiye.' }
                      })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                        addShopErrors.password ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                    {addShopErrors.password && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{addShopErrors.password.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Email Address"
                      {...registerAddShop('email', {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Valid email address enter karein.'
                        }
                      })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                        addShopErrors.email ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                    {addShopErrors.email && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{addShopErrors.email.message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Aadhaar Number
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="12-digit Aadhaar"
                      {...registerAddShop('aadhaar', {
                        pattern: {
                          value: /^\d{12}$/,
                          message: 'Aadhaar exactly 12 digits ka hona chahiye.'
                        }
                      })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                        addShopErrors.aadhaar ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                    {addShopErrors.aadhaar && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{addShopErrors.aadhaar.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shop Address *
                  </label>
                  <input
                    type="text"
                    placeholder="Full Address / City / District"
                    {...registerAddShop('address', {
                      required: 'Shop Address enter karein.',
                      minLength: { value: 5, message: 'Address at least 5 characters ka hona chahiye.' }
                    })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      addShopErrors.address ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  {addShopErrors.address && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{addShopErrors.address.message}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetAddShop();
                      setIsAddModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={addAction.state}
                    loadingText="Adding Shop..."
                    successText="Shop Added!"
                    errorText="Failed"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Create & Activate Shop
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
