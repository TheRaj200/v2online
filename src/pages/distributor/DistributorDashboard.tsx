import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector, selectShops, selectShopsStatus, isInitialLoading } from '../../store/hooks';
import { fetchShops } from '../../store/slices/shopsSlice';
import { Skeleton, SkeletonTableRows } from '../../components/ui/Skeleton';
import {
  Store,
  UserCheck,
  UserX,
  User,
  ArrowUpRight,
  Circle,
  Search,
  Phone
} from 'lucide-react';

export default function DistributorDashboard() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  // Redux state frozen hai — sirf read / filter, mutate nahi
  const shops = useAppSelector(selectShops);
  const shopsStatus = useAppSelector(selectShopsStatus);
  const isShopsLoading = isInitialLoading(shopsStatus, shops.length);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  const activeShops = shops.filter(s => s.status === 'ACTIVE');
  const pendingShops = shops.filter(s => s.status === 'PENDING');
  const deleteRequestedShops = shops.filter(s => s.status === 'DELETE_REQUESTED');

  const term = searchTerm.toLowerCase();
  const filteredShops = shops.filter(shop =>
    (shop.shopName || '').toLowerCase().includes(term) ||
    (shop.ownerName || '').toLowerCase().includes(term) ||
    (shop.mobile || '').includes(searchTerm) ||
    (shop.shopCode || '').toLowerCase().includes(term)
  );

  // KPI number ya pehli load par skeleton
  const kpi = (value: number) => (isShopsLoading ? <Skeleton className="h-7 w-12" /> : value);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Welcome, {user?.full_name || 'Distributor Partner'}!
              </h1>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase">
                Distributor
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active Network Control Center • Managing Retail Shops & Verification Requests
            </p>
          </div>

          <Link
            to="/distributor/verify-shops"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Store className="h-4 w-4" />
            <span>My Shops & Registrations</span>
          </Link>
        </div>

        {/* Network KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Shops */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Network Shops</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{kpi(shops.length)}</div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">↑ Active directory</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
              <Store className="h-6 w-6" />
            </div>
          </div>

          {/* Pending Verifications */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Verifications</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{kpi(pendingShops.length)}</div>
              <p className="text-[11px] text-amber-700 font-medium mt-1">Verification needed</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>

          {/* Active Operational Kiosks */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Operational Shops</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{kpi(activeShops.length)}</div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Operational</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
              <Circle className="h-6 w-6 fill-current text-emerald-500" />
            </div>
          </div>

          {/* Deletion Requests */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Deletion Requests</span>
              <div className="text-2xl font-bold text-red-600 mt-1">{kpi(deleteRequestedShops.length)}</div>
              <p className="text-[11px] text-red-600 font-medium mt-1">Sent to Admin</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold border border-red-100">
              <UserX className="h-6 w-6" />
            </div>
          </div>

        </div>

        {/* Quick Action Navigation Hub */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Distributor Management Hub</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/distributor/verify-shops"
              className="p-4 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 rounded-xl flex flex-col items-center text-center gap-2 group transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">My Network Shops</span>
                <span className="text-[10px] text-slate-500 font-medium">Add & Track Status</span>
              </div>
            </Link>

            <Link
              to="/distributor/delete-shop-requests"
              className="p-4 bg-red-50/60 hover:bg-red-100/70 border border-red-200/80 rounded-xl flex flex-col items-center text-center gap-2 group transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Delete Requests</span>
                <span className="text-[10px] text-slate-500 font-medium">Request Shop Removal</span>
              </div>
            </Link>

            <Link
              to="/distributor/complaint"
              className="p-4 bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl flex flex-col items-center text-center gap-2 group transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Complaints & Help</span>
                <span className="text-[10px] text-slate-500 font-medium">Support Tickets</span>
              </div>
            </Link>

            <Link
              to="/distributor/profile"
              className="p-4 bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 rounded-xl flex flex-col items-center text-center gap-2 group transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">My Profile</span>
                <span className="text-[10px] text-slate-500 font-medium">Account & Security</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Network Shop Directory Overview Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Network Kiosk Shops Overview</h2>
              <p className="text-xs text-slate-500">Real-time listing of retail shops in your network</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shop name, owner, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Kiosk / Shop Name</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Added Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {isShopsLoading ? (
                  <SkeletonTableRows rows={5} cols={6} />
                ) : filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-xs text-slate-400">No shops found.</td>
                  </tr>
                ) : filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{shop.shopName}</div>
                      <div className="text-[11px] text-blue-700 font-mono">{shop.shopCode}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {shop.ownerName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <a href={`tel:${shop.mobile}`} className="hover:text-blue-600 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{shop.mobile}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {shop.address}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {shop.createdAt}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        shop.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : shop.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : shop.status === 'DELETE_REQUESTED'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <Circle className="h-2 w-2 fill-current" />
                        {shop.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredShops.length} shops</span>
            <Link to="/distributor/verify-shops" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
              <span>View All Network Shops</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
