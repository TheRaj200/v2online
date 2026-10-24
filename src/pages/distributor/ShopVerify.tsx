import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shopStore } from '../../services/shopStore';
import type { Shop } from '../../services/shopStore';
import { useAppDispatch, useAppSelector, selectShops, selectShopsStatus, isInitialLoading } from '../../store/hooks';
import { fetchShops } from '../../store/slices/shopsSlice';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  User,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  X,
  UserPlus,
  Search,
  Lock,
  Eye,
  ShieldCheck,
  Circle
} from 'lucide-react';

export default function ShopVerify() {
  const dispatch = useAppDispatch();
  const allShops = useAppSelector(selectShops);
  const shopsStatus = useAppSelector(selectShopsStatus);
  const isShopsLoading = isInitialLoading(shopsStatus, allShops.length);
  const addAction = useAsyncAction();

  // Tab & Search state
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'DELETE_REQUESTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetailShop, setSelectedDetailShop] = useState<Shop | null>(null);

  // Success and Error Banners
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Add Shop Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    ownerName: '',
    shopName: '',
    mobile: '',
    email: '',
    aadhaar: '',
    address: '',
    password: ''
  });

  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  // Tab counts
  const pendingCount = useMemo(() => allShops.filter(s => s.status === 'PENDING').length, [allShops]);
  const activeCount = useMemo(() => allShops.filter(s => s.status === 'ACTIVE').length, [allShops]);
  const deleteReqCount = useMemo(() => allShops.filter(s => s.status === 'DELETE_REQUESTED').length, [allShops]);

  // Filtered Shops based on activeTab and searchTerm
  const filteredShops = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allShops.filter(shop => {
      const matchesSearch =
        (shop.shopName || '').toLowerCase().includes(term) ||
        (shop.ownerName || '').toLowerCase().includes(term) ||
        (shop.shopCode || '').toLowerCase().includes(term) ||
        (shop.mobile || '').includes(searchTerm);

      if (!matchesSearch) return false;
      if (activeTab === 'PENDING') return shop.status === 'PENDING';
      if (activeTab === 'ACTIVE') return shop.status === 'ACTIVE';
      if (activeTab === 'DELETE_REQUESTED') return shop.status === 'DELETE_REQUESTED';
      return true;
    });
  }, [allShops, activeTab, searchTerm]);

  // Handle Add Shop submission by distributor
  const handleAddShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setActionErrorMsg('');

    if (!formData.ownerName.trim() || !formData.shopName.trim() || !formData.mobile.trim() || !formData.address.trim() || !formData.password.trim()) {
      setFormError('Please fill in all mandatory fields (Owner Name, Shop Name, Mobile, Address, Password).');
      return;
    }

    if (formData.mobile.length !== 10) {
      setFormError('Mobile number must be exactly 10 digits.');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    addAction.run(async () => {
      let created: Shop;
      try {
        created = await shopStore.addActiveShopByDistributor(formData);
      } catch (err: any) {
        setFormError(err.message || 'Failed to submit shop registration. Please verify details and try again.');
        throw err;
      }

      // Dialog close immediately without delay
      setIsAddModalOpen(false);
      setActionSuccessMsg(`Shop request for "${created.shopName}" submitted to Admin for approval! It is now pending in Admin queue.`);
      setFormData({
        ownerName: '',
        shopName: '',
        mobile: '',
        email: '',
        aadhaar: '',
        address: '',
        password: ''
      });
      setTimeout(() => setActionSuccessMsg(''), 6000);
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                <Store className="h-5 w-5" />
              </div>
              <span>My Network Shops & Verifications</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Add new retail shops and track their Admin verification approval status in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl text-center hidden sm:block">
              <span className="text-[10px] font-semibold text-amber-700 block uppercase tracking-wider">Awaiting Admin</span>
              <span className="text-sm font-black text-amber-900">{isShopsLoading ? '—' : pendingCount} Requests</span>
            </div>

            <button
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add New Shop</span>
            </button>
          </div>
        </div>

        {/* Global Action Message Banner */}
        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {actionErrorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}

        {/* Tabs & Search Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              <span>All My Shops ({allShops.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PENDING')}
              className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Pending Admin Approval ({pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Active / Approved ({activeCount})</span>
            </button>

            {deleteReqCount > 0 && (
              <button
                onClick={() => setActiveTab('DELETE_REQUESTED')}
                className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'DELETE_REQUESTED'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Delete Requested ({deleteReqCount})</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shops by Shop Name, Owner Name, Code, or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
            />
          </div>
        </div>

        {/* Shops Listing */}
        {isShopsLoading ? (
          <SkeletonCards count={3} />
        ) : filteredShops.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
            <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
              <Store className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Shops Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'PENDING'
                ? 'No shops are currently waiting for Admin approval.'
                : 'No shops match your current filter. Click "Add New Shop" to register a new shop.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-blue-300 transition-all"
              >
                {/* Top Title & Status Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold border ${
                      shop.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : shop.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{shop.shopName}</h2>
                      <span className="text-xs text-slate-400 font-mono">
                        Ref Code: <strong className="text-blue-700">{shop.shopCode}</strong> • Added {shop.createdAt}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div>
                    {shop.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Awaiting Admin Approval</span>
                      </span>
                    )}
                    {shop.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Active & Approved</span>
                      </span>
                    )}
                    {shop.status === 'DELETE_REQUESTED' && (
                      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1 rounded-full">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Delete Requested</span>
                      </span>
                    )}
                    {shop.status === 'INACTIVE' && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold px-3 py-1 rounded-full">
                        <Circle className="h-3.5 w-3.5" />
                        <span>Deactivated</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Owner Full Name</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{shop.ownerName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Mobile (Login Username)</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5 font-mono">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`tel:${shop.mobile}`} className="hover:text-blue-600">{shop.mobile}</a>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Email Address</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{shop.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Aadhaar Number</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5 font-mono">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      <span>{shop.aadhaar || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-xs font-medium block">Full Address</span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{shop.address}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes & View Details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div>
                    {shop.status === 'PENDING' ? (
                      <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/60 flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>Submitted to Admin queue. Once Admin approves, the owner can log in with their mobile.</span>
                      </p>
                    ) : shop.status === 'ACTIVE' ? (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/60 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Approved & Operational. Login enabled for retailer.</span>
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailShop(shop)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>View Full Details</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Add New Shop Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <span>Request New Shop Registration</span>
                    <p className="text-[11px] text-slate-400 font-normal">Request will be sent to Admin for verification & approval</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddShopSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Owner Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Owner Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Shop / Kiosk Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Store className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh MP Online Center"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WhatsApp / Mobile (10 Digits) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Used as the shop owner's login mobile number.</span>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Shop Login Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="e.g. shop@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Aadhaar */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Aadhaar Number (Optional)
                    </label>
                    <div className="relative">
                      <CreditCard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="12-digit Aadhaar"
                        value={formData.aadhaar}
                        onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Full Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Shop Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <textarea
                        required
                        rows={2}
                        placeholder="Enter full shop address, Tehsil, Ward, Pin Code..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <ActionButton
                    state={addAction.state}
                    type="submit"
                    loadingText="Submitting Request..."
                    successText="Request Submitted!"
                    errorText="Failed"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Submit Shop Registration</span>
                  </ActionButton>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Full Details Modal */}
        {selectedDetailShop && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-slate-900 text-base">Shop Registration Details</span>
                </div>
                <button
                  onClick={() => setSelectedDetailShop(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shop Name:</span>
                    <strong className="text-slate-800">{selectedDetailShop.shopName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shop Code:</span>
                    <strong className="font-mono text-blue-700">{selectedDetailShop.shopCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Owner Name:</span>
                    <strong className="text-slate-800">{selectedDetailShop.ownerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile (Login):</span>
                    <strong className="font-mono text-slate-800">{selectedDetailShop.mobile}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <strong className="text-slate-800">{selectedDetailShop.email || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aadhaar:</span>
                    <strong className="font-mono text-slate-800">{selectedDetailShop.aadhaar || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Full Address:</span>
                    <span className="text-slate-800 text-right max-w-xs font-semibold">{selectedDetailShop.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Status:</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      selectedDetailShop.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedDetailShop.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedDetailShop.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created / Requested:</span>
                    <span className="text-slate-700">{selectedDetailShop.createdAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailShop(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
