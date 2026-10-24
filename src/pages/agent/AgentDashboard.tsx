import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  useAppDispatch,
  useAppSelector,
  selectServices,
  selectServicesStatus,
  selectWalletBalance,
  selectWalletStatus,
  isInitialLoading
} from '../../store/hooks';
import { fetchServices } from '../../store/slices/servicesSlice';
import { fetchWallet } from '../../store/slices/walletSlice';
import { Skeleton } from '../../components/ui/Skeleton';
import apiClient from '../../api/client';
import {
  Layers,
  Wallet,
  FileCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
  Phone,
  PlusCircle,
  Store,
  CreditCard,
  User,
  Zap,
  TrendingUp,
  Award
} from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state for services & wallet
  const services = useAppSelector(selectServices);
  const servicesStatus = useAppSelector(selectServicesStatus);
  const walletBalance = useAppSelector(selectWalletBalance);
  const walletStatus = useAppSelector(selectWalletStatus);
  const activeServices = useMemo(() => services.filter(s => s.isActive), [services]);
  const servicesLoading = isInitialLoading(servicesStatus, services.length);
  const walletLoading = walletStatus === 'idle' || (walletStatus === 'loading' && walletBalance === 0);

  // Local dashboard state
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchServices());
    dispatch(fetchWallet());

    // Fetch recent applications for live dashboard tracker
    apiClient.get('/applications/my-requests?limit=5')
      .then(res => {
        if (res.data?.status === 'success') {
          setRecentApplications(res.data.data || []);
        }
      })
      .catch(err => {
        console.error('Failed to load recent applications:', err);
      })
      .finally(() => {
        setApplicationsLoading(false);
      });
  }, [dispatch]);

  // Counts for summary
  const pendingCount = useMemo(() => recentApplications.filter(a => a.status === 'pending' || a.status === 'assigned' || a.status === 'processing').length, [recentApplications]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* 1. HERO BANNER: Premium Gradient with Live Profile & Wallet Chip */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-xl border border-indigo-800/40 p-6 sm:p-8">
          {/* Subtle Ambient Glow Circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Left: User & Shop Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-blue-200 border border-white/15 backdrop-blur-md">
                  <Award className="h-3.5 w-3.5 text-amber-300" />
                  <span>Verified MP Online Retail Kiosk</span>
                </span>
                <span className="text-xs text-white/60">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                 <span className="bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">{user?.full_name || 'Retail Partner'}</span>!
              </h1>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-blue-100/80">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Store className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>{user?.shop_name || 'My Kiosk Center'}</span>
                </div>
                <span>•</span>
                <span className="font-mono text-blue-200">{user?.mobile}</span>
              </div>
            </div>

            {/* Right: Live Wallet Hub & Quick CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Wallet Glass Card */}
              <div className="bg-white/10 border border-white/20 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between sm:justify-start gap-4 shadow-lg min-w-[200px]">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Available Balance</span>
                  {walletLoading ? (
                    <Skeleton className="h-7 w-20 bg-white/20! mt-0.5" />
                  ) : (
                    <div className="text-xl sm:text-2xl font-black text-white font-mono">
                      ₹{walletBalance.toFixed(2)}
                    </div>
                  )}
                </div>
                <Link
                  to="/agent/wallet"
                  title="Recharge Wallet"
                  className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
                >
                  <PlusCircle className="h-4 w-4" />
                </Link>
              </div>

          
            </div>

          </div>
        </div>

        {/* 2. STATS & ANALYTICS CARDS (4 Modern Gradients) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Wallet Balance */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Kiosk Wallet</span>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {walletLoading ? <Skeleton className="h-7 w-24" /> : `₹${walletBalance.toFixed(0)}`}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                <TrendingUp className="h-3 w-3" /> Live Balance
              </span>
              <Link to="/agent/wallet" className="text-blue-600 font-bold hover:underline text-[11px]">
                Top Up →
              </Link>
            </div>
          </div>

          {/* Card 2: Active Services */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Govt Services</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {servicesLoading ? <Skeleton className="h-7 w-14" /> : activeServices.length}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium text-[11px]">Ready to apply</span>
              <Link to="/agent/services" className="text-blue-600 font-bold hover:underline text-[11px]">
                View Directory →
              </Link>
            </div>
          </div>

          {/* Card 3: Track Applications */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Requests</span>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <FileCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {applicationsLoading ? <Skeleton className="h-7 w-14" /> : recentApplications.length}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-amber-700 font-medium text-[11px]">
                {pendingCount > 0 ? `${pendingCount} In Progress` : 'All clear'}
              </span>
              <Link to="/agent/my-requests" className="text-blue-600 font-bold hover:underline text-[11px]">
                Track Status →
              </Link>
            </div>
          </div>

          {/* Card 4: Support & Operator Help */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Support Desk</span>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Phone className="h-5 w-5" />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-800">
              Direct Portal Help
            </div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
              Call helpline or view instructions
            </p>
            <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                ● Support Active
              </span>
              <Link to="/agent/profile" className="text-purple-600 font-bold hover:underline text-[11px]">
                Helpline Contacts →
              </Link>
            </div>
          </div>

        </div>

        {/* 3. QUICK ACTION SHORTCUT TILES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Fast Actions</span>
            </h3>
            <span className="text-[11px] text-slate-400">Instant Kiosk Utilities</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/agent/services')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/70 hover:border-blue-400 text-left transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div className="font-bold text-xs text-slate-800 group-hover:text-blue-700">Apply Service</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Govt Forms & Docs</div>
            </button>

            <button
              onClick={() => navigate('/agent/wallet')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/70 hover:border-emerald-400 text-left transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-700">Add Wallet Balance</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Instant Online Top-up</div>
            </button>

            <button
              onClick={() => navigate('/agent/my-requests')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/70 hover:border-amber-400 text-left transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="font-bold text-xs text-slate-800 group-hover:text-amber-700">Track Applications</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Download Outputs</div>
            </button>

            <button
              onClick={() => navigate('/agent/profile')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50/50 border border-purple-200/70 hover:border-purple-400 text-left transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <div className="font-bold text-xs text-slate-800 group-hover:text-purple-700">My Kiosk Profile</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Contacts & Security</div>
            </button>
          </div>
        </div>

      

        {/* 5. RECENT APPLICATIONS TRACKER PREVIEW */}
        {recentApplications.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Recent Applications Activity</h3>
              </div>
              <Link to="/agent/my-requests" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                <span>View All ({recentApplications.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Application No</th>
                    <th className="py-2.5 px-3">Service Name</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Fee Deducted</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.slice(0, 4).map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {app.applicationNo}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {app.serviceName}
                        {app.subServiceName && <span className="text-slate-400 font-normal"> ({app.subServiceName})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                        ₹{app.feeDeducted || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === 'completed' || app.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : app.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {app.status === 'completed' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                          <span className="uppercase">{app.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;
