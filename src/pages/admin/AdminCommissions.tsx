import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../api/client';
import { SkeletonStatCards, SkeletonTableRows } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../store/apiError';
import {
  Percent,
  Search,
  CheckCircle2,
  Clock,
  Store,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Backend /applications/verification-queue ka relevant shape
interface QueueApplication {
  id: string | number;
  applicationNo: string;
  serviceName?: string;
  subServiceName?: string;
  serviceCode?: string;
  subServiceCode?: string;
  shopName?: string;
  agentName?: string;
  agentMobile?: string;
  operatorName?: string;
  status?: string;
  feeDeducted?: number | string;
  operatorPayout?: number | string;
  distributorPayout?: number | string;
  createdAt?: string;
  completedAt?: string;
}

interface CommissionRecord {
  id: string;
  txNo: string;
  shopName: string;
  ownerName: string;
  operatorName: string;
  serviceName: string;
  serviceCode: string;
  amount: number;
  operatorPayout: number;
  distributorPayout: number;
  platformShare: number;
  commissionRate: string;
  status: 'CREDITED' | 'PROCESSING';
  dateTime: string;
}

const toNum = (v: unknown) => {
  const n = parseFloat(String(v ?? 0));
  return isNaN(n) ? 0 : n;
};

const formatMoney = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// MySQL 'YYYY-MM-DD HH:MM:SS' Safari me Invalid Date deta hai — ' ' ko 'T' se replace
const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Application se commission row banana:
 *  - Txn Amount = agent wallet se kata fee (feeDeducted)
 *  - Operator Payout = verify hone par operator wallet me credit
 *  - Platform Share = fee - operator payout - distributor payout (admin commission)
 * Rejected application ka fee refund ho jata hai, isliye wo ledger me nahi aati.
 */
const toCommissionRecord = (a: QueueApplication): CommissionRecord => {
  const amount = toNum(a.feeDeducted);
  const operatorPayout = toNum(a.operatorPayout);
  const distributorPayout = toNum(a.distributorPayout);
  const platformShare = Math.max(0, amount - operatorPayout - distributorPayout);
  const rate = amount > 0 ? (platformShare / amount) * 100 : 0;
  return {
    id: String(a.id),
    txNo: a.applicationNo,
    shopName: a.shopName || a.agentName || 'Agent Kiosk',
    ownerName: a.agentName || '-',
    operatorName: a.operatorName || 'Unassigned',
    serviceName: a.subServiceName && a.subServiceName !== a.serviceName
      ? `${a.serviceName || 'Service'} - ${a.subServiceName}`
      : a.serviceName || a.subServiceName || 'Service Application',
    serviceCode: a.subServiceCode || a.serviceCode || '-',
    amount,
    operatorPayout,
    distributorPayout,
    platformShare,
    commissionRate: `${Number(rate.toFixed(2))}%`,
    status: String(a.status || '').toLowerCase() === 'verified' ? 'CREDITED' : 'PROCESSING',
    dateTime: formatDateTime(a.completedAt || a.createdAt)
  };
};

// CSV cell escape (comma / quote / newline)
const csvCell = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function AdminCommissions() {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CREDITED' | 'PROCESSING'>('ALL');

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.get('/applications/verification-queue', { params: { limit: 1000 } });
      if (res.data.status === 'success' && Array.isArray(res.data.data)) {
        const list = (res.data.data as QueueApplication[])
          .filter(a => String(a.status || '').toLowerCase() !== 'rejected' && toNum(a.feeDeducted) > 0)
          .map(toCommissionRecord);
        setRecords(list);
      } else {
        setErrorMsg(res.data.message || 'Commission data load nahi ho paya.');
      }
    } catch (e) {
      setErrorMsg(getApiErrorMessage(e, 'Commission data load nahi ho paya.'));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const term = searchTerm.toLowerCase();
  const filteredRecords = records.filter(r => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      r.txNo.toLowerCase().includes(term) ||
      r.shopName.toLowerCase().includes(term) ||
      r.serviceName.toLowerCase().includes(term) ||
      r.serviceCode.toLowerCase().includes(term) ||
      r.operatorName.toLowerCase().includes(term) ||
      r.ownerName.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  // Stats sirf CREDITED (verified) records se — processing wale abhi settle nahi hue
  const credited = useMemo(() => records.filter(r => r.status === 'CREDITED'), [records]);
  const totalPlatformCommission = credited.reduce((acc, r) => acc + r.platformShare, 0);
  const totalOperatorPayout = credited.reduce((acc, r) => acc + r.operatorPayout, 0);
  const totalVolumeProcessed = credited.reduce((acc, r) => acc + r.amount, 0);
  const processingCount = records.length - credited.length;

  // Sabse zyada platform commission dene wala outlet (real data se)
  const topOutlet = useMemo(() => {
    const map = new Map<string, { name: string; owner: string; total: number; count: number }>();
    credited.forEach(r => {
      const key = `${r.shopName}|${r.ownerName}`;
      const cur = map.get(key) || { name: r.shopName, owner: r.ownerName, total: 0, count: 0 };
      cur.total += r.platformShare;
      cur.count += 1;
      map.set(key, cur);
    });
    let best: { name: string; owner: string; total: number; count: number } | null = null;
    map.forEach(v => {
      if (!best || v.total > best.total) best = v;
    });
    return best as { name: string; owner: string; total: number; count: number } | null;
  }, [credited]);

  // Table me dikh rahe rows ka real CSV download
  const handleExport = () => {
    const header = [
      'Application No', 'Date', 'Shop', 'Owner', 'Operator', 'Service', 'Service Code',
      'Txn Amount', 'Operator Payout', 'Distributor Payout', 'Platform Commission', 'Commission Rate', 'Status'
    ];
    const rows = filteredRecords.map(r => [
      r.txNo, r.dateTime, r.shopName, r.ownerName, r.operatorName, r.serviceName, r.serviceCode,
      r.amount.toFixed(2), r.operatorPayout.toFixed(2), r.distributorPayout.toFixed(2), r.platformShare.toFixed(2),
      r.commissionRate, r.status
    ]);
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    // BOM taaki Excel me ₹ / Hindi text sahi dikhe
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showSkeleton = !hasLoaded && records.length === 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Percent className="h-6 w-6 text-emerald-600" />
              <span>Service Commission Ledger (Admin & Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Har service application ka fee split — operator payout aur platform commission (live database se).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecords}
              disabled={isLoading}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Stats Summary Widgets */}
        {showSkeleton ? (
          <SkeletonStatCards count={4} />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Platform Commission</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹ {formatMoney(totalPlatformCommission)}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Verified applications se earned</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Service Volume</span>
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹ {formatMoney(totalVolumeProcessed)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Operator Payout: ₹ {formatMoney(totalOperatorPayout)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Transactions</span>
              <div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {credited.length}
            </div>
            <p className="text-[11px] text-violet-600 font-semibold">
              Verified • {processingCount} in processing
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Top Earning Outlet</span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Store className="h-4 w-4" />
              </div>
            </div>
            {topOutlet ? (
              <>
                <div className="text-sm font-bold text-slate-900 truncate">{topOutlet.name}</div>
                <p className="text-[11px] text-amber-600 font-mono font-bold">
                  ₹ {formatMoney(topOutlet.total)} • {topOutlet.count} txn
                </p>
              </>
            ) : (
              <div className="text-sm font-semibold text-slate-400">No verified data yet</div>
            )}
          </div>
        </div>
        )}

        {/* Search & Status Filter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'CREDITED', 'PROCESSING'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'CREDITED' ? 'Credited (Verified)' : 'Processing'}
              </button>
            ))}
          </div>
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Application No, Shop Name, Owner, Operator, or Service Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Commission Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Service Commission Logs ({filteredRecords.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">App No & Date</th>
                  <th className="py-3.5 px-4">Shop Details</th>
                  <th className="py-3.5 px-4">Service Used</th>
                  <th className="py-3.5 px-4">Txn Amount</th>
                  <th className="py-3.5 px-4">Operator Payout</th>
                  <th className="py-3.5 px-4">Platform Commission</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {showSkeleton ? (
                  <SkeletonTableRows rows={5} cols={7} />
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No commission records found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-blue-700 block">{r.txNo}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{r.dateTime}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.shopName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{r.ownerName}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">Op: {r.operatorName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{r.serviceName}</div>
                        <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.2 rounded mt-0.5">
                          Code: {r.serviceCode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹ {formatMoney(r.amount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        ₹ {formatMoney(r.operatorPayout)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          + ₹ {formatMoney(r.platformShare)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold">
                          ({r.commissionRate} rate)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          r.status === 'CREDITED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {r.status === 'CREDITED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {r.status}
                        </span>
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
