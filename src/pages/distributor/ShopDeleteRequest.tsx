import { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shopStore } from '../../services/shopStore';
import { useAppDispatch, useAppSelector, selectShops, selectShopsStatus, isInitialLoading } from '../../store/hooks';
import { fetchShops } from '../../store/slices/shopsSlice';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  UserX,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Phone,
  Store,
  ChevronDown,
  Check,
  Search
} from 'lucide-react';

export default function ShopDeleteRequest() {
  const dispatch = useAppDispatch();
  const allShops = useAppSelector(selectShops);
  const shopsStatus = useAppSelector(selectShopsStatus);
  // Redux state frozen hai — sirf filter karke read
  const activeShops = useMemo(() => allShops.filter(s => s.status === 'ACTIVE'), [allShops]);
  const isShopsLoading = isInitialLoading(shopsStatus, allShops.length);
  const submitAction = useAsyncAction();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenDialog = (shopId?: string) => {
    setErrorMsg('');
    setReason('');
    setSelectedShopId(shopId || (activeShops.length > 0 ? activeShops[0].id : ''));
    setDropdownOpen(false);
    setShopSearch('');
    setIsDialogOpen(true);
  };

  const handleSubmitDeleteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedShopId) {
      setErrorMsg('Please select a shop to delete.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Please enter a mandatory reason for requesting deletion.');
      return;
    }

    const shopId = selectedShopId;
    const shop = activeShops.find(s => s.id === shopId);
    submitAction.run(async () => {
      try {
        await shopStore.requestDeletion(shopId, reason);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to submit deletion request.');
        throw err;
      }

      setSuccessMsg(`Deletion request for "${shop?.shopName || 'Shop'}" submitted successfully to Admin!`);
      setIsDialogOpen(false);
      setReason('');
      setTimeout(() => setSuccessMsg(''), 4000);
    });
  };

  const selectedShop = activeShops.find(s => s.id === selectedShopId);
  const filteredShops = activeShops.filter(shop =>
    (shop.shopName || '').toLowerCase().includes(shopSearch.toLowerCase()) ||
    (shop.ownerName || '').toLowerCase().includes(shopSearch.toLowerCase()) ||
    (shop.mobile || '').includes(shopSearch) ||
    (shop.shopCode && shop.shopCode.toLowerCase().includes(shopSearch.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserX className="h-6 w-6 text-red-600" />
              <span>Delete Shop Request</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Submit a formal request to Super Admin for deactivating or removing a non-performing shop.
            </p>
          </div>

          <button
            onClick={() => handleOpenDialog()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Submit Delete Request</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Active Shops Directory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">Your Active Network Shops ({activeShops.length})</h2>
            <p className="text-xs text-slate-500">Select any active shop to request deletion from Admin</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Shop Details</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {isShopsLoading ? (
                  <SkeletonTableRows rows={4} cols={5} />
                ) : activeShops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No active shops available for deletion request.
                    </td>
                  </tr>
                ) : (
                  activeShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{shop.shopName}</div>
                        <div className="text-[11px] text-blue-700 font-mono">{shop.shopCode}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {shop.ownerName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{shop.mobile}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {shop.address}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDialog(shop.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 justify-end ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Request Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Request Dialog / Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span>Request Shop Deletion</span>
                </div>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitDeleteRequest} className="space-y-4">
                
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Custom Shop Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Shop to Request Deletion *
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-left transition-all flex items-center justify-between gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  >
                    {selectedShop ? (
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="truncate min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {selectedShop.shopName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                            <span>{selectedShop.ownerName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-600">{selectedShop.mobile}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs sm:text-sm">Choose a shop...</span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
                      {/* Search box within dropdown */}
                      {activeShops.length > 3 && (
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                          <div className="relative">
                            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search shop by name, owner or mobile..."
                              value={shopSearch}
                              onChange={(e) => setShopSearch(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Options list */}
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                        {filteredShops.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No shops match search.
                          </div>
                        ) : (
                          filteredShops.map((shop) => {
                            const isSelected = shop.id === selectedShopId;
                            return (
                              <button
                                key={shop.id}
                                type="button"
                                onClick={() => {
                                  setSelectedShopId(shop.id);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-red-50/80 text-red-900 border border-red-200/70'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    <Store className="h-4 w-4" />
                                  </div>
                                  <div className="truncate min-w-0">
                                    <div className="font-bold text-xs sm:text-sm truncate">
                                      {shop.shopName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                                      <span>{shop.ownerName}</span>
                                      <span className="text-slate-300">•</span>
                                      <span className="font-mono text-slate-600">{shop.mobile}</span>
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-red-600 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mandatory Reason for Deletion *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide detailed explanation for requesting shop removal..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={submitAction.state}
                    loadingText="Submitting..."
                    successText="Request Sent!"
                    errorText="Failed"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Submit Request to Admin
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

