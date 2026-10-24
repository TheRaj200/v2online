import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  User,
  Phone,
  Mail,
  Store,
  MapPin,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Headphones,
  Save
} from 'lucide-react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../store/apiError';

export default function UserProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const profileLoading = authLoading || !user;

  // Is user an admin or manager? (can edit support settings)
  const isAdmin = user?.role === 'super_admin' || user?.role === 'sub_admin' || user?.role === 'manager';

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passAction = useAsyncAction();
  const [supportLoading, setSupportLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamic system settings (Helpline & Support Email)
  const [supportInfo, setSupportInfo] = useState({
    helplineNumber: '+91 0755 2700800',
    supportEmail: 'support@mponline.gov.in'
  });

  // Editable support fields (for admin)
  const [editHelpline, setEditHelpline] = useState('');
  const [editSupportEmail, setEditSupportEmail] = useState('');
  const contactAction = useAsyncAction();
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/settings');
        if (response.data.status === 'success') {
          const hn = response.data.data.helplineNumber || '+91 0755 2700800';
          const se = response.data.data.supportEmail || 'support@mponline.gov.in';
          setSupportInfo({ helplineNumber: hn, supportEmail: se });
          setEditHelpline(hn);
          setEditSupportEmail(se);
        }
      } catch (e) {
        console.error('Failed to fetch support settings:', e);
      } finally {
        setSupportLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Kripya sabhi password fields ko bharein.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Naya password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password aur Confirm password match nahi ho rahe.');
      return;
    }

    passAction.run(async () => {
      try {
        const res = await apiClient.post('/auth/change-password', {
          currentPassword,
          newPassword
        });

        if (res.data.status === 'success') {
          setSuccessMsg(res.data.message || 'Password safaltapoorvak update ho gaya!');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => setSuccessMsg(''), 5000);
          return true;
        }
        setErrorMsg(res.data.message || 'Password update karne me samasya aayi.');
        return false;
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || err.message || 'Password update karne me samasya aayi. Kripya punah prayas karein.');
        return false;
      }
    });
  };

  // Admin: Save system support settings handler
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');

    if (!editHelpline.trim() || !editSupportEmail.trim()) {
      setContactError('Helpline Number aur Support Email dono bharna zaroori hai.');
      return;
    }

    contactAction.run(async () => {
      try {
        const response = await apiClient.put('/settings', {
          helplineNumber: editHelpline.trim(),
          supportEmail: editSupportEmail.trim()
        });
        if (response.data.status !== 'success') throw new Error(response.data.message || 'Settings update nahi ho payi.');
      } catch (err) {
        setContactError(getApiErrorMessage(err, 'Settings update nahi ho payi.'));
        throw err;
      }
      // Update local display too
      setSupportInfo({ helplineNumber: editHelpline.trim(), supportEmail: editSupportEmail.trim() });
      setContactSuccess('Helpline Number aur Support Email successfully update ho gaye hain! Ab ye sabhi profile pages me dynamic dikhenge.');
      setTimeout(() => setContactSuccess(''), 4000);
    });
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super_admin':
      case 'sub_admin':
        return { label: 'Super Admin', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'manager':
        return { label: 'Operations Manager', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'operator':
        return { label: 'Processing Officer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'distributor':
        return { label: 'Distributor Partner', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'Authorized Kiosk Agent', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
  };

  const roleInfo = getRoleBadge();

  return (
    <DashboardLayout
      title="User Account & Security Profile"
      subtitle="Manage your registered credentials, location details, and secure login password"
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white">
              <User className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">
                  {user?.full_name || 'Portal User'}
                </h1>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  ● ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>ID: <strong className="font-mono text-slate-700">{(user as any)?.user_code || (user as any)?.userCode || (user?.id ? `USR-MP-${user.id}` : '—')}</strong></span>
                <span>•</span>
                <span>Mobile: <strong className="text-slate-700">{user?.mobile || '—'}</strong></span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Columns: User Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Account & Location Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Registration & Location Details
                </h2>
              </div>

              {profileLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Full Name */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>{user?.full_name || '—'}</span>
                  </div>
                </div>

                {/* Mobile */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Mobile</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{user?.mobile || '—'}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{user?.email || '—'}</span>
                  </div>
                </div>

                {/* Shop / Entity Name */}
                {user?.shop_name && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kiosk / Shop Name</span>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-amber-600" />
                      <span>{user.shop_name}</span>
                    </div>
                  </div>
                )}

                {/* District */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designated District</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-purple-600" />
                    <span>{user?.district || '—'}</span>
                  </div>
                </div>

                {/* Tehsil / Ward */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tehsil / Ward</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                    <span>{user?.tehsil || (user?.ward_no ? '' : '—')} {user?.ward_no ? `(Ward ${user.ward_no})` : ''}</span>
                  </div>
                </div>

              </div>
              )}

              {/* Complete Address */}
              {user?.address && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Address</span>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{user.address}</p>
                </div>
              )}
            </div>

            {/* 2. System Support & Helpline Contacts — Editable for Admin/Manager, Read-Only for others */}
            {isAdmin ? (
              /* ── ADMIN EDITABLE CARD ── */
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                  <Phone className="h-5 w-5 text-emerald-600" />
                  <span>System Support & Helpline Contacts</span>
                </div>

                <p className="text-xs text-slate-500">
                  Yaha jo Helpline Number aur Support Email daalenge, bo Shop, Operator, aur Distributor panels ke profile pages me dynamic dikhenge.
                </p>

                {contactSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{contactSuccess}</span>
                  </div>
                )}

                {contactError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{contactError}</span>
                  </div>
                )}

                {supportLoading ? (
                  <div className="space-y-4" aria-busy="true">
                    {[0, 1].map(i => (
                      <div key={i} className="space-y-1.5">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ))}
                    <Skeleton className="h-10 w-full rounded-xl mt-2" />
                  </div>
                ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Helpline Mobile / Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="+91 0755 2700800"
                        value={editHelpline}
                        onChange={(e) => setEditHelpline(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Support Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        placeholder="support@mponline.gov.in"
                        value={editSupportEmail}
                        onChange={(e) => setEditSupportEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <ActionButton
                      type="submit"
                      state={contactAction.state}
                      loadingText="Saving..."
                      successText="Settings Saved!"
                      errorText="Save Failed"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save System Support Settings</span>
                    </ActionButton>
                  </div>
                </form>
                )}
              </div>
            ) : (
              /* ── READ-ONLY SUPPORT INFO CARD (for non-admin roles) ── */
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">System Support & Helpline Contacts</h3>
                    <p className="text-[11px] text-slate-600">Contact admin team for KYC or authorization updates</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {supportLoading ? (
                    <div className="space-y-1.5 sm:flex sm:flex-col sm:items-end">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-blue-700 block">{supportInfo.helplineNumber}</span>
                      <span className="text-[11px] text-slate-500 block">{supportInfo.supportEmail}</span>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Security & Password Management */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Lock className="h-5 w-5 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Change Password
                </h2>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Purana password enter karein"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Kam se kam 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="New password dobara likhein"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <ActionButton
                  type="submit"
                  state={passAction.state}
                  loadingText="Updating..."
                  successText="Password Updated!"
                  errorText="Update Failed"
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <Key className="h-4 w-4" />
                  <span>Update Password</span>
                </ActionButton>
              </form>

            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
