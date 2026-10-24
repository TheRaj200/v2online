import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { SkeletonStatCards, SkeletonTable } from '../../components/ui/Skeleton';
import {
  CreditCard,
  Users,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [usersCount, setUsersCount] = useState({ total: 0, agents: 0, operators: 0, distributors: 0 });
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // Skeleton sirf pehli load par (refresh par purana data dikhta rahe)
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const usersRes = await apiClient.get('/users').catch(() => ({ data: { data: [] } }));
      if (usersRes.data?.status === 'success' || Array.isArray(usersRes.data?.data)) {
        const list = usersRes.data.data || [];
        setUsersCount({
          total: list.length,
          agents: list.filter((u: any) => u.role === 'agent' || u.role === 'shop').length,
          operators: list.filter((u: any) => u.role === 'operator').length,
          distributors: list.filter((u: any) => u.role === 'distributor').length
        });
      }

      // 2. Fetch Verification Queue Applications
      const queueRes = await apiClient.get('/applications/verification-queue').catch(() => ({ data: { data: [] } }));
      if (queueRes.data?.status === 'success' || Array.isArray(queueRes.data?.data)) {
        const apps = queueRes.data.data || [];
        setRecentApplications(apps.slice(0, 6));
        // "Awaiting Payout Approval" = sirf operator dwara completed tasks (TaskVerification page jaisa)
        setPendingTasksCount(apps.filter((a: any) => String(a.status).toLowerCase() === 'completed').length);
      }

      // 3. Fetch Withdrawal Requests
      const withdrawRes = await apiClient.get('/wallet/withdrawals').catch(() => ({ data: { data: [] } }));
      if (withdrawRes.data?.status === 'success' || Array.isArray(withdrawRes.data?.data)) {
        const wList = withdrawRes.data.data || [];
        setPendingWithdrawalsCount(wList.filter((w: any) => String(w.status).toLowerCase() === 'pending').length);
      }

      // 4. Fetch Services
      const servicesRes = await apiClient.get('/services').catch(() => ({ data: { data: [] } }));
      if (servicesRes.data?.status === 'success' || Array.isArray(servicesRes.data?.data)) {
        setServicesCount((servicesRes.data.data || []).length);
      }
    } catch (e) {
      console.error('Failed to load admin dashboard data:', e);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <DashboardLayout
      title="Master Super Admin Control Room"
      subtitle="Financial settlement ledger, platform margin, master applications & dynamic service engine"
      roleBadge="Super Admin (Owner)"
      badgeColor="bg-rose-500/20 text-rose-300 border-rose-500/30"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Welcome & Quick Action Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Welcome, {user?.full_name || 'Administrator'}!
              </h1>
              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              MP Online Platform Control Room • Real-time Monitoring & Service Orchestration
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/admin/services"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Layers className="h-4 w-4" />
              <span>Services Engine</span>
            </Link>
          </div>
        </div>

        {/* Real-time KPI Stat Cards */}
        {!hasLoaded ? (
          <SkeletonStatCards count={4} />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Onboarded Users */}
          <Link
            to="/admin/users"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{usersCount.total}</div>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">
                {usersCount.agents} Agents • {usersCount.operators} Operators
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 group-hover:scale-105 transition-transform">
              <Users className="h-6 w-6" />
            </div>
          </Link>

          {/* Pending Task Verifications */}
          <Link
            to="/admin/task-verification"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Task Verification</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{pendingTasksCount}</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">
                Awaiting Payout Approval
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100 group-hover:scale-105 transition-transform">
              <Clock className="h-6 w-6" />
            </div>
          </Link>

          {/* Pending Withdrawal Requests */}
          <Link
            to="/admin/withdrawals"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Withdrawals</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{pendingWithdrawalsCount}</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Operator / Partner Desk
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 group-hover:scale-105 transition-transform">
              <CreditCard className="h-6 w-6" />
            </div>
          </Link>

          {/* Active Services */}
          <Link
            to="/admin/services"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Catalog Services</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">{servicesCount}</div>
              <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                Active Dynamic Forms
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 group-hover:scale-105 transition-transform">
              <Layers className="h-6 w-6" />
            </div>
          </Link>

        </div>
        )}

        {/* Recent Applications Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Recent Citizen Applications
              </h2>
              <p className="text-xs text-slate-500">Live feed of service requests across all Kiosks</p>
            </div>
            <Link
              to="/admin/task-verification"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!hasLoaded ? (
            <SkeletonTable rows={4} cols={6} />
          ) : recentApplications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No recent applications recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Application No</th>
                    <th className="pb-2.5">Service</th>
                    <th className="pb-2.5">Kiosk / Agent</th>
                    <th className="pb-2.5">Operator</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-mono font-bold text-blue-700">
                        {app.applicationNo}
                      </td>
                      <td className="py-3 font-semibold text-slate-800">
                        {app.serviceName}
                      </td>
                      <td className="py-3 text-slate-600">
                        {app.shopName || app.agentName || 'Agent'}
                      </td>
                      <td className="py-3 text-slate-600">
                        {app.operatorName || 'Unassigned'}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === 'completed' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          app.status === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          app.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {app.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to="/admin/task-verification"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Review</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

