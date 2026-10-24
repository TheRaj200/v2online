import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { useAppDispatch, useAppSelector, selectWalletBalance, selectWalletStatus, selectWalletTransactions, isInitialLoading } from '../../store/hooks';
import { fetchWallet } from '../../store/slices/walletSlice';
import { Skeleton, SkeletonCards } from '../../components/ui/Skeleton';
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  RefreshCw
} from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  // Pehli load par skeleton; refresh par sirf icon spin
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const dispatch = useAppDispatch();
  const walletBalance = useAppSelector(selectWalletBalance);
  const walletStatus = useAppSelector(selectWalletStatus);
  const walletTxnCount = useAppSelector(selectWalletTransactions).length;
  const isWalletInitialLoading = isInitialLoading(walletStatus, walletTxnCount);

  const fetchQueue = useCallback(async () => {
    dispatch(fetchWallet());
    try {
      const res = await apiClient.get('/applications/operator-queue');
      if (res.data.status === 'success' && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load operator queue', e);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Manual refresh: spinner on, phir queue reload
  const refreshQueue = () => {
    setIsLoading(true);
    fetchQueue();
  };

  const isQueueInitialLoading = isLoading && !hasLoadedOnce;

  const pendingTasks = tasks.filter(t => ['pending', 'assigned', 'processing'].includes(t.status?.toLowerCase()));
  const completedTasks = tasks.filter(t => ['completed', 'verified'].includes(t.status?.toLowerCase()));
  const rejectedTasks = tasks.filter(t => t.status?.toLowerCase() === 'rejected');

  return (
    <DashboardLayout
      title="Processing Officer Work Queue"
      subtitle="Auto-assigned citizen applications based on your designated district & services"
      roleBadge="Officer (Operator)"
      badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Welcome Header & Action Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Welcome, {user?.full_name || 'Processing Officer'}!
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                Officer Desk
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Field Execution Hub • Processing Applications & Delivering Certificates
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={refreshQueue}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
            <Link
              to="/operator/service-requests"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Inbox className="h-4 w-4" />
              <span>Full Work Queue</span>
            </Link>
          </div>
        </div>

        {/* Themed KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* In-Processing Queue */}
          <Link
            to="/operator/service-requests"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">In-Processing Queue</span>
              <div className="text-2xl font-black text-sky-600 mt-1">{isQueueInitialLoading ? <Skeleton className="h-7 w-12" /> : pendingTasks.length}</div>
              <p className="text-[11px] text-sky-700 font-semibold mt-1">
                Active Pending Tasks
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-100 group-hover:scale-105 transition-transform">
              <Inbox className="h-6 w-6" />
            </div>
          </Link>

          {/* Completed Tasks */}
          <Link
            to="/operator/service-requests"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completed Tasks</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{isQueueInitialLoading ? <Skeleton className="h-7 w-12" /> : completedTasks.length}</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Finished & Delivered
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </Link>

          {/* Rejected Requests */}
          <Link
            to="/operator/service-requests"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rejected Requests</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{isQueueInitialLoading ? <Skeleton className="h-7 w-12" /> : rejectedTasks.length}</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">
                Returned to Agent
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100 group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </Link>

          {/* Operator Wallet Balance */}
          <Link
            to="/operator/wallet"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-teal-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Wallet Balance</span>
              <div className="text-2xl font-black text-teal-600 mt-1">
                {isWalletInitialLoading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <>₹ {walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                )}
              </div>
              <p className="text-[11px] text-teal-700 font-semibold mt-1">
                Available Operator Balance
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold border border-teal-100 group-hover:scale-105 transition-transform">
              <IndianRupee className="h-6 w-6" />
            </div>
          </Link>

        </div>

        {/* Live Work Queue Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4.5 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Applications Queue</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">{pendingTasks.length} active requests</span>
              <Link
                to="/operator/service-requests"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Go to Full Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {isQueueInitialLoading ? (
              <SkeletonCards count={3} />
            ) : pendingTasks.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Inbox className="h-10 w-10 mx-auto mb-2.5 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No pending applications in your queue right now.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Jab koi Agent nayi request daalega, wo auto-assign hokar yahan dikhegi.</p>
              </div>
            ) : (
              pendingTasks.slice(0, 5).map(task => (
                <div key={task.id} className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700">{task.applicationNo}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">{task.serviceCode}</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">{task.serviceName}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-emerald-600 font-mono font-bold block">+ ₹{Number(task.operatorPayout || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 block">{new Date(String(task.createdAt || '').replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <Link
                      to="/operator/service-requests"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      Process
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default OperatorDashboard;

