import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { shopStore } from '../../services/shopStore';
import type { Shop } from '../../services/shopStore';
import { useAppDispatch, useAppSelector, selectShops, selectShopsStatus, isInitialLoading } from '../../store/hooks';
import { fetchShops } from '../../store/slices/shopsSlice';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  Store,
  Search,
  Phone,
  UserPlus,
  Filter,
  CheckCircle2,
  Clock,
  Mail,
  X,
  Lock,
  User,
  CreditCard,
  MapPin,
  AlertCircle
} from 'lucide-react';

interface AddShopFormData {
  ownerName: string;
  shopName: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  password: string;
}

export default function ShopList() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  // Redux state frozen hai — sirf read / filter
  const shops = useAppSelector(selectShops);
  const shopsStatus = useAppSelector(selectShopsStatus);
  const isShopsLoading = isInitialLoading(shopsStatus, shops.length);
  const addAction = useAsyncAction();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // React Hook Form for Add Shop
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AddShopFormData>({
    mode: 'onTouched',
    defaultValues: {
      ownerName: '',
      shopName: '',
      mobile: '',
      email: '',
      aadhaar: '',
      address: '',
      password: ''
    }
  });

  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  const onAddShopSubmit = (data: AddShopFormData) => {
    setFormError('');
    setSuccessMsg('');

    addAction.run(async () => {
      let created: Shop;
      try {
        created = await shopStore.addActiveShopByDistributor(data);
      } catch (err: any) {
        setFormError(err.message || 'Failed to create shop on server. Please check details and try again.');
        throw err;
      }

      // Close dialog immediately without delay
      setIsAddModalOpen(false);
      setSuccessMsg(`Shop "${created.shopName}" added successfully! The owner can now log in at /login using Mobile: ${created.mobile}`);
      reset();
      setTimeout(() => setSuccessMsg(''), 5000);
    });
  };

  const term = searchTerm.toLowerCase();
  const filteredShops = shops.filter(shop => {
    const matchesSearch =
      (shop.shopName || '').toLowerCase().includes(term) ||
      (shop.ownerName || '').toLowerCase().includes(term) ||
      (shop.shopCode || '').toLowerCase().includes(term) ||
      (shop.mobile || '').includes(searchTerm);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && shop.status === statusFilter;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Store className="h-6 w-6 text-blue-600" />
              <span>Network Shop List Directory</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage all registered MP Online & Retailer Shops under your distributor network.
            </p>
          </div>

          <button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New Shop</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Shop Name, Owner, Code, or Mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-48 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="PENDING">Pending Approval</option>
                <option value="DELETE_REQUESTED">Delete Requested</option>
                <option value="INACTIVE">Deactivated</option>
              </select>
            </div>

          </div>
        </div>

        {/* Shops Directory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Shop Code & Name</th>
                  <th className="py-3.5 px-4">Owner Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Full Address</th>
                  <th className="py-3.5 px-4">Added Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {isShopsLoading ? (
                  <SkeletonTableRows rows={5} cols={7} />
                ) : filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No shops found matching your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 text-xs block">{shop.shopCode}</span>
                        <span className="font-bold text-slate-900 text-sm">{shop.shopName}</span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {shop.ownerName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{shop.mobile}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{shop.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 font-medium">
                        {shop.address}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {shop.createdAt}
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
                          {shop.status === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
                          {shop.status === 'PENDING' && <Clock className="h-3 w-3" />}
                          {shop.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedShop(shop)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg text-xs transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Registered Shops: <strong className="text-slate-800">{filteredShops.length}</strong></span>
            <span>Distributor Territory: {[user?.district, user?.tehsil].filter(Boolean).join(', ') || '—'}</span>
          </div>
        </div>

        {/* Add New Shop Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <UserPlus className="h-5 w-5 text-emerald-600" />
                  <span>Add New Shop (Direct Registration)</span>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onAddShopSubmit)} className="space-y-4" noValidate>
                
                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Owner Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Owner Full Name *
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Owner Name"
                        {...register('ownerName', {
                          required: 'Owner full name enter karna zaroori hai',
                          minLength: { value: 2, message: 'Kam se kam 2 characters required' }
                        })}
                        className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.ownerName ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                      />
                    </div>
                    {errors.ownerName && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 inline" />
                        <span>{errors.ownerName.message}</span>
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Mobile */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile *
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile"
                        {...register('mobile', {
                          required: 'Mobile number enter karna zaroori hai',
                          pattern: {
                            value: /^[6-9]\d{9}$/,
                            message: 'Valid 10-digit mobile number enter karein'
                          }
                        })}
                        className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.mobile ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                      />
                    </div>
                    {errors.mobile && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 inline" />
                        <span>{errors.mobile.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Shop Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shop / Kiosk Center Name *
                  </label>
                  <div className="relative">
                    <Store className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Sharma MP Online & CSC Center"
                      {...register('shopName', {
                        required: 'Shop / Kiosk center name enter karna zaroori hai',
                        minLength: { value: 2, message: 'Kam se kam 2 characters required' }
                      })}
                      className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.shopName ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.shopName && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" />
                      <span>{errors.shopName.message}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        placeholder="email@example.com"
                        {...register('email', {
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Valid email address enter karein'
                          }
                        })}
                        className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 inline" />
                        <span>{errors.email.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Aadhaar Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Aadhaar Number (12-Digit)
                    </label>
                    <div className="relative">
                      <CreditCard className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="12-digit Aadhaar"
                        {...register('aadhaar', {
                          validate: (val) => {
                            if (val && !/^\d{12}$/.test(val)) {
                              return 'Aadhaar 12-digits ka hona chahiye';
                            }
                            return true;
                          }
                        })}
                        className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.aadhaar ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                      />
                    </div>
                    {errors.aadhaar && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 inline" />
                        <span>{errors.aadhaar.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Address *
                  </label>
                  <div className="relative">
                    <MapPin className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Detailed shop address"
                      {...register('address', {
                        required: 'Full address enter karna zaroori hai',
                        minLength: { value: 5, message: 'Address kam se kam 5 characters ka hona chahiye' }
                      })}
                      className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" />
                      <span>{errors.address.message}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Create Login Password *
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      {...register('password', {
                        required: 'Password enter karna zaroori hai',
                        minLength: { value: 6, message: 'Password kam se kam 6 characters ka hona chahiye' }
                      })}
                      className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" />
                      <span>{errors.password.message}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={addAction.state}
                    loadingText="Saving..."
                    successText="Shop Added!"
                    errorText="Failed"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
                  >
                    Save & Activate Shop
                  </ActionButton>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedShop && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Store className="h-5 w-5 text-blue-600" />
                  <span>Shop Details</span>
                </div>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-xs text-blue-700 font-bold block">{selectedShop.shopCode}</span>
                    <h3 className="font-bold text-slate-900 text-sm">{selectedShop.shopName}</h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded border border-emerald-200">
                    {selectedShop.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-xs block">Owner Name</span>
                    <span className="font-bold text-slate-800">{selectedShop.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Mobile Number</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedShop.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Email Address</span>
                    <span className="font-bold text-slate-800">{selectedShop.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Aadhaar Number</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedShop.aadhaar}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-xs block">Full Address</span>
                    <span className="font-bold text-slate-800">{selectedShop.address}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <a
                  href={`tel:${selectedShop.mobile}`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition-colors flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Owner</span>
                </a>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
