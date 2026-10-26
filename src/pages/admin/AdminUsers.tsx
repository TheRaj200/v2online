import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../api/client';
import { useAsyncAction, useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../store/apiError';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Briefcase,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface AddUserFormData {
  role: 'distributor' | 'manager' | 'sub_admin';
  fullName: string;
  mobile: string;
  email?: string;
  password: string;
  district?: string;
  aadhaar?: string;
  officeName?: string;
  address?: string;
}

interface UserItem {
  id: string;
  uuid: string;
  role: string;
  fullName: string;
  mobile: string;
  email: string;
  aadhaar: string;
  district: string;
  address: string;
  officeName: string;
  approvalStatus: string;
  isActive: boolean;
  isOnline: boolean;
  walletBalance: number;
  userCode: string;
  createdAt: string;
  requestedAt?: string;
  approvedAt?: string;
}

const roleLabels: Record<string, string> = {
  distributor: 'Distributor',
  manager: 'Manager',
  sub_admin: 'Sub Admin'
};

const roleBadgeColors: Record<string, string> = {
  distributor: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-purple-100 text-purple-700 border-purple-200',
  sub_admin: 'bg-amber-100 text-amber-700 border-amber-200'
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (typeof dateStr === 'string' && (dateStr.includes('AM') || dateStr.includes('PM') || dateStr.includes('am') || dateStr.includes('pm'))) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
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

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'distributor' | 'manager' | 'sub_admin'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  const createAction = useAsyncAction();
  const toggleAction = useKeyedAsyncAction();

  const {
    register: registerUser,
    handleSubmit: handleUserSubmitForm,
    reset: resetUserForm,
    watch: watchUserForm,
    setValue: setUserValue,
    formState: { errors: userErrors }
  } = useForm<AddUserFormData>({
    defaultValues: {
      role: 'distributor',
      fullName: '',
      mobile: '',
      email: '',
      password: '',
      district: '',
      aadhaar: '',
      officeName: '',
      address: ''
    }
  });

  const selectedRole = watchUserForm('role');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiClient.get('/users?role=distributor,manager,sub_admin');
      if (response.data.status === 'success') {
        setUsers(response.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === 'ALL' || u.role === activeTab;
    const matchesSearch = !searchTerm ||
      (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.mobile || '').includes(searchTerm) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const onAddUserSubmit = (data: AddUserFormData) => {
    createAction.run(async () => {
      setFormError('');
      setFormSuccess('');
      let message = '';
      try {
        const payload = {
          role: data.role,
          fullName: data.fullName.trim(),
          mobile: data.mobile.trim(),
          email: data.email?.trim() || '',
          password: data.password,
          district: data.district?.trim() || '',
          aadhaar: data.aadhaar?.trim() || '',
          officeName: data.officeName?.trim() || '',
          address: data.address?.trim() || ''
        };
        const response = await apiClient.post('/users', payload);
        if (response.data.status !== 'success') throw new Error(response.data.message || 'Failed to create user.');
        message = response.data.message;
      } catch (err) {
        setFormError(getApiErrorMessage(err, 'Failed to create user.'));
        throw err;
      }

      // Close dialog immediately without delay
      setShowAddModal(false);
      setFormSuccess('');
      setPageSuccess(message || 'User created successfully!');
      resetUserForm();
      setTimeout(() => setPageSuccess(''), 4000);
      await fetchUsers();
    });
  };

  const isRowBusy = (userId: string) =>
    ['toggle', 'delete'].some(k => toggleAction.stateOf(`${k}-${userId}`) === 'loading');

  // Per-row 3-stage toggle (activate / deactivate)
  const handleToggle = (userId: string) =>
    toggleAction.run(`toggle-${userId}`, async () => {
      setPageError('');
      try {
        await apiClient.patch(`/users/${userId}/toggle`);
      } catch (e) {
        setPageError(getApiErrorMessage(e, 'Failed to update user status.'));
        throw e;
      }
      await fetchUsers();
    });

  const handleDeleteUser = (user: UserItem) => {
    if (!window.confirm(`Kya aap sure hain ki "${user.fullName}" (${user.role}) ko permanently delete karna chahte hain?`)) return;
    toggleAction.run(`delete-${user.id}`, async () => {
      setPageError('');
      setPageSuccess('');
      try {
        const res = await apiClient.delete(`/users/${user.id}`);
        setPageSuccess(res.data?.message || `User "${user.fullName}" deleted successfully.`);
        setTimeout(() => setPageSuccess(''), 4000);
      } catch (e) {
        setPageError(getApiErrorMessage(e, 'Failed to delete user.'));
        throw e;
      }
      await fetchUsers();
    });
  };

  const tabs = [
    { key: 'ALL', label: 'All Users', count: users.length },
    { key: 'distributor', label: 'Distributors', count: users.filter(u => u.role === 'distributor').length },
    { key: 'manager', label: 'Managers', count: users.filter(u => u.role === 'manager').length },
    { key: 'sub_admin', label: 'Sub Admins', count: users.filter(u => u.role === 'sub_admin').length }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Staff Management</h1>
              <p className="text-xs text-slate-500">Distributors, Managers & Sub Admins</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {pageSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2.5 rounded-xl">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{pageSuccess}</span>
            <button onClick={() => setPageSuccess('')} className="ml-auto p-0.5 hover:bg-emerald-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {pageError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2.5 rounded-xl">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{pageError}</span>
            <button onClick={() => setPageError('')} className="ml-auto p-0.5 hover:bg-red-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {loading && users.length === 0 ? (
            <SkeletonTable rows={6} cols={7} className="border-0 rounded-none" />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">User Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Mobile</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">District</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date & Time Timestamps</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-indigo-600 font-bold">{u.userCode}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.fullName}</p>
                            {u.officeName && <p className="text-[10px] text-slate-400">{u.officeName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {u.mobile}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[120px]">{u.email}</span>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeColors[u.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {u.role === 'sub_admin' && <ShieldCheck className="h-3 w-3" />}
                          {u.role === 'manager' && <Shield className="h-3 w-3" />}
                          {u.role === 'distributor' && <Briefcase className="h-3 w-3" />}
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.district ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {u.district}
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 font-bold">
                            <XCircle className="h-3.5 w-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] space-y-0.5 min-w-[170px]">
                        <div><span className="text-[9px] font-bold uppercase text-slate-400"> </span><strong>{formatDateTime(u.requestedAt || u.createdAt)}</strong></div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap space-x-1.5">
                        <ActionButton
                          state={toggleAction.stateOf(`toggle-${u.id}`)}
                          onClick={() => handleToggle(u.id)}
                          disabled={isRowBusy(u.id)}
                          loadingText={u.isActive ? 'Deactivating...' : 'Activating...'}
                          successText="Updated"
                          errorText="Failed"
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            u.isActive
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                          title={u.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {u.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </ActionButton>
                        <ActionButton
                          state={toggleAction.stateOf(`delete-${u.id}`)}
                          onClick={() => handleDeleteUser(u)}
                          disabled={isRowBusy(u.id)}
                          loadingText="Deleting..."
                          successText="Deleted"
                          errorText="Failed"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
                          title="Delete Staff Permanently"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Add New User</h2>
                  <p className="text-[10px] text-slate-500">Distributor / Manager / Sub Admin</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setFormError(''); setFormSuccess(''); }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUserSubmitForm(onAddUserSubmit)} className="p-5 space-y-4" noValidate>
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

              {/* Role Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Select Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['distributor', 'manager', 'sub_admin'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserValue('role', r, { shouldValidate: true })}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                        selectedRole === r
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {r === 'distributor' && <Briefcase className="h-3.5 w-3.5" />}
                      {r === 'manager' && <Shield className="h-3.5 w-3.5" />}
                      {r === 'sub_admin' && <ShieldCheck className="h-3.5 w-3.5" />}
                      {roleLabels[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    {...registerUser('fullName', {
                      required: 'Full Name enter karein.',
                      minLength: { value: 3, message: 'Name kam se kam 3 characters ka hona chahiye.' }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      userErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {userErrors.fullName && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{userErrors.fullName.message}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Mobile *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    {...registerUser('mobile', {
                      required: '10-digit mobile number enter karein.',
                      pattern: {
                        value: /^[6-9]\d{9}$/,
                        message: 'Valid 10-digit mobile number (6-9 se shuru) enter karein.'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      userErrors.mobile ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {userErrors.mobile && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{userErrors.mobile.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    {...registerUser('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Valid email address enter karein.'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      userErrors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {userErrors.email && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{userErrors.email.message}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Password *</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    {...registerUser('password', {
                      required: 'Password enter karein.',
                      minLength: { value: 6, message: 'Password at least 6 characters ka hona chahiye.' }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      userErrors.password ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {userErrors.password && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{userErrors.password.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">District</label>
                  <input
                    type="text"
                    placeholder="District Name"
                    {...registerUser('district')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="12-digit Aadhaar"
                    {...registerUser('aadhaar', {
                      pattern: {
                        value: /^\d{12}$/,
                        message: 'Aadhaar exactly 12 digits ka hona chahiye.'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      userErrors.aadhaar ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {userErrors.aadhaar && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{userErrors.aadhaar.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Office / Organization Name</label>
                <input
                  type="text"
                  placeholder="Office / Organization Name"
                  {...registerUser('officeName')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Full Address</label>
                <textarea
                  rows={2}
                  placeholder="Full address..."
                  {...registerUser('address')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <ActionButton
                type="submit"
                state={createAction.state}
                loadingText="Creating..."
                successText="User Created!"
                errorText="Failed"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" /> Create {roleLabels[selectedRole] || 'User'}
              </ActionButton>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
