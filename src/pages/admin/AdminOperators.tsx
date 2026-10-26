import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../api/client';
import {
  UserCog,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  X,
  Phone,
  CreditCard,
  MapPin,
  Building,
  Hash,
  Clock,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Layers,
  AlertCircle,
  Ban
} from 'lucide-react';
import { useAsyncAction, useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton, SkeletonTable } from '../../components/ui/Skeleton';

interface AddOperatorFormData {
  fullName: string;
  mobile: string;
  aadhaar?: string;
  district: string;
  officeName: string;
  address?: string;
  email?: string;
  password: string;
}

// Axios / Error object se backend ka readable message
const apiErrorText = (err: unknown, fallback: string) => {
  const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
  return anyErr?.response?.data?.message || anyErr?.message || fallback;
};

interface OperatorItem {
  id: string;
  uuid: string;
  role: string;
  fullName: string;
  mobile: string;
  email: string;
  aadhaar: string;
  district: string;
  tehsil: string;
  wardNo: string;
  address: string;
  officeName: string;
  approvalStatus: string;
  isActive: boolean;
  isOnline: boolean;
  userCode: string;
  createdAt: string;
  requestedAt?: string;
  approvedAt?: string;
}

interface OperatorAssignmentItem {
  id: string;
  operatorId: string;
  serviceId?: string;
  subServiceId?: string;
  serviceName?: string;
  subServiceName?: string;
  assignmentMode?: 'single' | 'area_wise' | 'ward_wise';
  areaLabel?: string;
  district?: string;
  wardNo?: string;
  operatorName?: string;
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (typeof dateStr === 'string' && (dateStr.includes('AM') || dateStr.includes('PM') || dateStr.includes('am') || dateStr.includes('pm'))) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
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

export default function AdminOperators() {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'REJECTED'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedViewOperator, setSelectedViewOperator] = useState<OperatorItem | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  // Row actions (approve / reject / toggle / remove) ka error + success banner
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  // 3-stage button actions
  const addAction = useAsyncAction();
  const rowAction = useKeyedAsyncAction();

  // Operator Assignments State (for display badges only)
  const [operatorAssignments, setOperatorAssignments] = useState<OperatorAssignmentItem[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

  const {
    register: registerOperator,
    handleSubmit: handleOperatorSubmitForm,
    reset: resetOperatorForm,
    formState: { errors: operatorErrors }
  } = useForm<AddOperatorFormData>({
    defaultValues: {
      fullName: '',
      mobile: '',
      aadhaar: '',
      district: '',
      officeName: '',
      address: '',
      email: '',
      password: ''
    }
  });

  const fetchOperators = useCallback(async () => {
    try {
      const response = await apiClient.get('/users?role=operator');
      if (response.data.status === 'success') {
        setOperators(response.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch operators:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await apiClient.get('/operator-assignments');
      if (res.data.status === 'success') {
        setOperatorAssignments(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch assignments:', e);
    } finally {
      setAssignmentsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
    fetchAssignments();
  }, [fetchOperators, fetchAssignments]);

  const activeOperators = operators.filter(o => o.approvalStatus === 'approved');
  const pendingOperators = operators.filter(o => o.approvalStatus === 'pending');
  // Rejected operators pehle kisi tab me nahi dikhte the — ab alag tab me, taaki re-approve ho sakein
  const rejectedOperators = operators.filter(o => o.approvalStatus === 'rejected');

  const tabOperators =
    activeTab === 'ACTIVE' ? activeOperators : activeTab === 'PENDING' ? pendingOperators : rejectedOperators;

  const filteredOperators = tabOperators.filter(o => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return o.fullName.toLowerCase().includes(term) ||
      o.mobile.includes(term) ||
      o.officeName?.toLowerCase().includes(term) ||
      o.district?.toLowerCase().includes(term);
  });

  const onAddOperatorSubmit = (data: AddOperatorFormData) => {
    addAction.run(async () => {
      setFormError('');
      setFormSuccess('');

      try {
        const payload = {
          role: 'operator',
          fullName: data.fullName.trim(),
          mobile: data.mobile.trim(),
          aadhaar: data.aadhaar?.trim() || '',
          district: data.district.trim(),
          officeName: data.officeName.trim(),
          address: data.address?.trim() || '',
          email: data.email?.trim() || '',
          password: data.password
        };

        const response = await apiClient.post('/users', payload);
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to add operator.');
        }

        // Close dialog immediately without delay
        setShowAddModal(false);
        setFormSuccess('');
        setPageSuccess(response.data.message || 'Operator added successfully!');
        resetOperatorForm();
        setTimeout(() => setPageSuccess(''), 3000);
        await fetchOperators();
      } catch (err) {
        setFormError(apiErrorText(err, 'Failed to add operator.'));
        throw err;
      }
    });
  };

  // Common row action runner — backend error user ko banner me dikhata hai (pehle sirf console.error tha)
  const runRowAction = (
    key: string,
    request: () => Promise<{ data: { status?: string; message?: string } }>,
    fallbackError: string,
    successText: string
  ) =>
    rowAction.run(key, async () => {
      setPageError('');
      setPageSuccess('');
      try {
        const res = await request();
        if (res.data?.status && res.data.status !== 'success') {
          throw new Error(res.data.message || fallbackError);
        }
        setPageSuccess(res.data?.message || successText);
        setTimeout(() => setPageSuccess(''), 3000);
        await fetchOperators();
      } catch (err) {
        setPageError(apiErrorText(err, fallbackError));
        setTimeout(() => setPageError(''), 6000);
        throw err;
      }
    });

  const handleApprove = (operatorId: string) =>
    runRowAction(`approve-${operatorId}`, () => apiClient.patch(`/users/${operatorId}/approve`), 'Operator approve nahi ho paya.', 'Operator approved successfully.');

  const handleReject = (operatorId: string) =>
    runRowAction(`reject-${operatorId}`, () => apiClient.patch(`/users/${operatorId}/reject`), 'Operator reject nahi ho paya.', 'Operator rejected.');

  const handleToggle = (operatorId: string) =>
    runRowAction(`toggle-${operatorId}`, () => apiClient.patch(`/users/${operatorId}/toggle`), 'Operator status change nahi ho paya.', 'Operator status updated.');

  const handleRemove = (operatorId: string) => {
    if (!confirm('Kya aap sure hain ki is operator ko permanently remove karna chahte hain?')) return;
    runRowAction(`remove-${operatorId}`, () => apiClient.delete(`/users/${operatorId}`), 'Operator remove nahi ho paya.', 'Operator removed successfully.');
  };

  // Kisi row ka koi bhi action chal raha ho to baaki buttons disable
  const isRowBusy = (operatorId: string) =>
    ['approve', 'reject', 'toggle', 'remove'].some(k => rowAction.stateOf(`${k}-${operatorId}`) === 'loading');

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Operator Management</h1>
              <p className="text-xs text-slate-500">Processing Officers — Add, Remove, Approve & Manage</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Operator</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Active Operators</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{activeOperators.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Pending Requests</span>
            {pendingOperators.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse ${
                activeTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
              }`}>{pendingOperators.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'REJECTED'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Rejected</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'REJECTED' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{rejectedOperators.length}</span>
          </button>
        </div>

        {/* Row action error / success banner */}
        {pageError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{pageError}</span>
          </div>
        )}
        {pageSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{pageSuccess}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, office, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
        </div>

        {/* Operators Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <SkeletonTable rows={5} cols={7} className="border-0 rounded-none" />
          ) : filteredOperators.length === 0 ? (
            <div className="text-center py-16">
              <UserCog className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                {activeTab === 'PENDING'
                  ? 'No pending operator requests'
                  : activeTab === 'REJECTED'
                    ? 'No rejected operators'
                    : 'No operators found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[10px] font-bold text-slate-500">
                    <th className="text-left px-4 py-3.5">Operator Name & ID</th>
                    <th className="text-left px-4 py-3.5">Mobile</th>
                    <th className="text-left px-4 py-3.5">Aadhaar</th>
                    <th className="text-left px-4 py-3.5">Ward</th>
                    <th className="text-left px-4 py-3.5">Office & Address</th>
                    <th className="text-left px-4 py-3.5">Status</th>
                    <th className="text-center px-4 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOperators.map(op => (
                    <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Name & Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0">
                            {op.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{op.fullName}</div>
                            <div className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60 inline-block">
                              {op.userCode}
                            </div>
                            {!assignmentsLoaded && <Skeleton className="h-3 w-24 mt-1" />}
                            {assignmentsLoaded && (() => {
                              const opAssignments = operatorAssignments.filter(a => String(a.operatorId) === String(op.id));
                              if (opAssignments.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {opAssignments.slice(0, 3).map(a => (
                                    <span key={a.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold border border-blue-200">
                                      <Layers className="h-2.5 w-2.5" />
                                      {a.subServiceName || a.serviceName}
                                      {a.areaLabel ? ` (${a.areaLabel})` : a.wardNo ? ` (Ward #${a.wardNo})` : ''}
                                    </span>
                                  ))}
                                  {opAssignments.length > 3 && (
                                    <span className="text-[9px] font-bold text-slate-400">+{opAssignments.length - 3} more</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-xs">{op.mobile}</span>
                        </div>
                      </td>

                      {/* Aadhaar */}
                      <td className="px-4 py-3.5 text-slate-700">
                        {op.aadhaar ? (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono text-xs font-semibold text-slate-800">{op.aadhaar}</span>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Ward */}
                      <td className="px-4 py-3.5 text-slate-700">
                        {op.wardNo ? (
                          <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200">
                            <Hash className="h-3 w-3 text-slate-400" />
                            <span>Ward #{op.wardNo}</span>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Address & Office */}
                      <td className="px-4 py-3.5 text-slate-700 max-w-[220px]">
                        <div className="font-semibold text-slate-800 text-xs truncate flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{op.officeName || op.district || 'Main Office'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{op.address || op.district || '—'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {activeTab === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        ) : activeTab === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                            <Ban className="h-3.5 w-3.5 text-red-600" />
                            <span>Rejected</span>
                          </span>
                        ) : op.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. View Button */}
                          <button
                            onClick={() => setSelectedViewOperator(op)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer shadow-2xs"
                            title="View Full Operator Details"
                          >
                            <Eye className="h-3.5 w-3.5 text-teal-600" />
                            <span>View</span>
                          </button>



                          {activeTab === 'PENDING' || activeTab === 'REJECTED' ? (
                            <>
                              <ActionButton
                                state={rowAction.stateOf(`approve-${op.id}`)}
                                onClick={() => handleApprove(op.id)}
                                disabled={isRowBusy(op.id)}
                                loadingText="Approving..."
                                successText="Approved"
                                errorText="Failed"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                title={activeTab === 'REJECTED' ? 'Re-approve Operator' : 'Approve Operator'}
                              >
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{activeTab === 'REJECTED' ? 'Re-approve' : 'Approve'}</span>
                              </ActionButton>
                              {activeTab === 'PENDING' ? (
                                <ActionButton
                                  state={rowAction.stateOf(`reject-${op.id}`)}
                                  onClick={() => handleReject(op.id)}
                                  disabled={isRowBusy(op.id)}
                                  loadingText="Rejecting..."
                                  successText="Rejected"
                                  errorText="Failed"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all cursor-pointer shadow-2xs"
                                  title="Reject Operator"
                                >
                                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                                  <span>Reject</span>
                                </ActionButton>
                              ) : (
                                <ActionButton
                                  state={rowAction.stateOf(`remove-${op.id}`)}
                                  onClick={() => handleRemove(op.id)}
                                  disabled={isRowBusy(op.id)}
                                  loadingText="Removing..."
                                  successText="Removed"
                                  errorText="Failed"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
                                  title="Remove Operator"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remove</span>
                                </ActionButton>
                              )}
                            </>
                          ) : (
                            <>
                              <ActionButton
                                state={rowAction.stateOf(`toggle-${op.id}`)}
                                onClick={() => handleToggle(op.id)}
                                disabled={isRowBusy(op.id)}
                                loadingText="Updating..."
                                successText="Updated"
                                errorText="Failed"
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                  op.isActive
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                                title={op.isActive ? 'Deactivate Operator' : 'Activate Operator'}
                              >
                                {op.isActive ? <EyeOff className="h-3.5 w-3.5 text-amber-600" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
                                <span>{op.isActive ? 'Deactivate' : 'Activate'}</span>
                              </ActionButton>
                              <ActionButton
                                state={rowAction.stateOf(`remove-${op.id}`)}
                                onClick={() => handleRemove(op.id)}
                                disabled={isRowBusy(op.id)}
                                loadingText="Removing..."
                                successText="Removed"
                                errorText="Failed"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
                                title="Remove Operator"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Remove</span>
                              </ActionButton>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Operator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Add New Operator</h2>
                  <p className="text-[10px] text-slate-500">Processing Officer Details</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setFormError(''); setFormSuccess(''); }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleOperatorSubmitForm(onAddOperatorSubmit)} className="p-5 space-y-4" noValidate>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-2 rounded-lg">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Name *</label>
                  <input
                    type="text"
                    placeholder="Operator Full Name"
                    {...registerOperator('fullName', {
                      required: 'Operator name enter karein.',
                      minLength: { value: 3, message: 'Name kam se kam 3 characters ka hona chahiye.' }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      operatorErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {operatorErrors.fullName && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{operatorErrors.fullName.message}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    {...registerOperator('mobile', {
                      required: '10-digit mobile number enter karein.',
                      pattern: {
                        value: /^[6-9]\d{9}$/,
                        message: 'Valid 10-digit mobile number (6-9 se shuru) enter karein.'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      operatorErrors.mobile ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {operatorErrors.mobile && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{operatorErrors.mobile.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="12-digit Aadhaar"
                    {...registerOperator('aadhaar', {
                      pattern: {
                        value: /^\d{12}$/,
                        message: 'Aadhaar exactly 12 digits ka hona chahiye.'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      operatorErrors.aadhaar ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {operatorErrors.aadhaar && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{operatorErrors.aadhaar.message}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Destination *</label>
                  <input
                    type="text"
                    placeholder="District / City"
                    {...registerOperator('district', {
                      required: 'Destination / District enter karein.'
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      operatorErrors.district ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {operatorErrors.district && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{operatorErrors.district.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Office Name *</label>
                <input
                  type="text"
                  placeholder="Office / Department Name"
                  {...registerOperator('officeName', {
                    required: 'Office / Department name enter karein.'
                  })}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                    operatorErrors.officeName ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
                {operatorErrors.officeName && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{operatorErrors.officeName.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Area / Full Address</label>
                <textarea
                  rows={2}
                  placeholder="Area / full address..."
                  {...registerOperator('address')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    {...registerOperator('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Valid email address enter karein.'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      operatorErrors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {operatorErrors.email && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{operatorErrors.email.message}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Password *</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    {...registerOperator('password', {
                      required: 'Password enter karein.',
                      minLength: { value: 6, message: 'Password at least 6 characters ka hona chahiye.' }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      operatorErrors.password ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {operatorErrors.password && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{operatorErrors.password.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <ActionButton
                type="submit"
                state={addAction.state}
                loadingText="Adding Operator..."
                successText="Operator Added!"
                errorText="Failed"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" /> Add Operator
              </ActionButton>
            </form>
          </div>
        </div>
      )}

      {/* View Operator Details Modal */}
      {selectedViewOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 relative animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header Banner */}
            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 text-white p-6 relative">
              <button
                onClick={() => setSelectedViewOperator(null)}
                className="absolute top-4 right-4 text-teal-200 hover:text-white p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-black shadow-inner">
                  {selectedViewOperator.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedViewOperator.fullName}</span>
                    <span className="font-mono text-xs font-bold bg-teal-500/40 border border-teal-300/30 text-teal-100 px-2.5 py-0.5 rounded-md">
                      {selectedViewOperator.userCode}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-teal-200 font-medium">
                    <span className="uppercase tracking-wider font-semibold">Operator / Processing Officer</span>
                    <span>•</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      selectedViewOperator.isActive ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40' : 'bg-red-400/20 text-red-300 border border-red-400/40'
                    }`}>
                      {selectedViewOperator.isActive ? 'Active Status' : 'Inactive Status'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body Info Cards */}
            <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              
              {/* Contact & Identification */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-teal-800">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Contact & Identification</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Mobile Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{selectedViewOperator.mobile}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Email Address</span>
                    <span className="font-medium text-slate-800">{selectedViewOperator.email || 'N/A'}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Aadhaar Card Number</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm tracking-wider">{selectedViewOperator.aadhaar || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Office & Work Location */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-teal-800">
                  <Building className="h-3.5 w-3.5" />
                  <span>Office & Work Location</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Destination / District</span>
                    <span className="font-semibold text-slate-800">{selectedViewOperator.district || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Office Name</span>
                    <span className="font-semibold text-slate-800">{selectedViewOperator.officeName || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Ward Number</span>
                    <span className="font-mono font-bold text-slate-900">Ward #{selectedViewOperator.wardNo || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Area / Locality</span>
                    <span className="font-medium text-slate-800">{selectedViewOperator.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Account Details & Timestamps */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-teal-800">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Account Details & Registration Timestamp</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Approval Status</span>
                    <span className="font-bold text-emerald-700 capitalize">{selectedViewOperator.approvalStatus}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Account Created Date</span>
                    <span className="font-medium text-slate-800">{formatDateTime(selectedViewOperator.createdAt)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedViewOperator(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}
      {/* View Operator Details Modal - kept as is */}
    </DashboardLayout>
  );
}
