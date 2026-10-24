import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { SkeletonStatCards, SkeletonTable } from '../../components/ui/Skeleton';
import {
  Layers,
  UserCheck,
  Headphones,
  Clock,
  Store,
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [activeOperatorsCount, setActiveOperatorsCount] = useState(0);
  const [shopsCount, setShopsCount] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Skeleton sirf pehli load par (refresh par purana data dikhta rahe)
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchManagerData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users / Operators / Shops
      const usersRes = await apiClient.get('/users').catch(() => ({ data: { data: [] } }));
      if (usersRes.data?.status === 'success' || Array.isArray(usersRes.data?.data)) {
        const list = usersRes.data.data || [];
        // Backend 'isActive' (boolean) bhejta hai, 'status' field nahi — active + non-pending/rejected operator hi count
        setActiveOperatorsCount(list.filter((u: any) =>
          u.role === 'operator' && u.isActive && !['pending', 'rejected'].includes(String(u.approvalStatus || '').toLowerCase())
        ).length);
        setShopsCount(list.filter((u: any) => u.role === 'agent' || u.role === 'shop').length);
      }

      // 2. Fetch Verification Queue Applications
      const queueRes = await apiClient.get('/applications/verification-queue').catch(() => ({ data: { data: [] } }));
      if (queueRes.data?.status === 'success' || Array.isArray(queueRes.data?.data)) {
        const apps = queueRes.data.data || [];
        setRecentApplications(apps.slice(0, 6));
        // "Awaiting Approval" = sirf operator dwara completed tasks (TaskVerification page jaisa)
        setPendingTasksCount(apps.filter((a: any) => String(a.status).toLowerCase() === 'completed').length);
      }

      // 3. Fetch Complaints
      const compRes = await apiClient.get('/complaints').catch(() => ({ data: { data: [] } }));
      if (compRes.data?.status === 'success' || Array.isArray(compRes.data?.data)) {
        const comps = compRes.data.data || [];
        // Complaint status OPEN / IN_REVIEW dono abhi pending hain
        setComplaintsCount(comps.filter((c: any) => ['open', 'in_review', 'pending'].includes(String(c.status).toLowerCase())).length);
      }
    } catch (e) {
      console.error('Failed to load manager dashboard data:', e);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  return (
    <DashboardLayout
      title="Operations & Dispatch Control Room"
      subtitle="Monitor applications, verify operator tasks, and manage kiosk services"
      roleBadge="Operations Manager"
      badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/30"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Welcome Header & Action Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Welcome, {user?.full_name || 'Operations Manager'}!
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                Manager Desk
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Field Operations & Kiosk Dispatch • Real-time Task Oversight & Verification
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchManagerData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/manager/services"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Layers className="h-4 w-4" />
              <span>Services Management</span>
            </Link>
          </div>
        </div>

        {/* Real-time Themed KPI Stat Cards */}
        {!hasLoaded ? (
          <SkeletonStatCards count={4} />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Pending Task Verifications */}
          <Link
            to="/manager/task-verification"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Task Verification</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{pendingTasksCount}</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">
                Awaiting Approval
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100 group-hover:scale-105 transition-transform">
              <Clock className="h-6 w-6" />
            </div>
          </Link>

          {/* Active Operators */}
          <Link
            to="/manager/operators"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-teal-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Operators</span>
              <div className="text-2xl font-black text-teal-600 mt-1">{activeOperatorsCount}</div>
              <p className="text-[11px] text-teal-700 font-semibold mt-1">
                Assigned Processing Officers
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold border border-teal-100 group-hover:scale-105 transition-transform">
              <UserCheck className="h-6 w-6" />
            </div>
          </Link>

          {/* Registered Shops/Agents */}
          <Link
            to="/manager/shops"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Network Kiosks</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{shopsCount}</div>
              <p className="text-[11px] text-blue-700 font-semibold mt-1">
                Active Retail Shops
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 group-hover:scale-105 transition-transform">
              <Store className="h-6 w-6" />
            </div>
          </Link>

          {/* Complaints / Helpdesk */}
          <Link
            to="/manager/complaints"
            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs hover:shadow-md hover:border-rose-300 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Open Complaints</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{complaintsCount}</div>
              <p className="text-[11px] text-rose-700 font-semibold mt-1">
                Pending Support Tickets
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 group-hover:scale-105 transition-transform">
              <Headphones className="h-6 w-6" />
            </div>
          </Link>

        </div>
        )}

        {/* Live Citizen Applications Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Recent Citizen Applications
              </h2>
              <p className="text-xs text-slate-500">Live feed of service requests requiring supervision</p>
            </div>
            <Link
              to="/manager/task-verification"
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
                          to="/manager/task-verification"
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

export default ManagerDashboard;

