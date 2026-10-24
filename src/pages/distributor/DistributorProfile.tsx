import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Key, 
  CheckCircle2, 
  Lock,
  AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

// MySQL 'YYYY-MM-DD HH:MM:SS' ko Safari-safe parse karke '15 Jan 2024' format; invalid ho to '—'
const formatJoinDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function DistributorProfile() {
  const { user, isLoading: isAuthLoading } = useAuth();
  // Profile data abhi load ho raha hai (app start par session restore)
  const isProfileLoading = isAuthLoading && !user;

  // Dynamic system settings (Helpline & Support Email)
  const [supportInfo, setSupportInfo] = useState({
    helplineNumber: '+91 0755 2700800',
    supportEmail: 'distributor-help@mponline.gov.in'
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/settings');
        if (response.data.status === 'success') {
          setSupportInfo({
            helplineNumber: response.data.data.helplineNumber || '+91 0755 2700800',
            supportEmail: response.data.data.supportEmail || 'distributor-help@mponline.gov.in'
          });
        }
      } catch (e) {
        console.error('Failed to fetch support settings:', e);
      } finally {
        setIsSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Profile data sirf logged-in user se — fake fallback nahi, data na ho to '—'
  const rawUser = user as (NonNullable<typeof user> & { created_at?: string; createdAt?: string; aadhaar?: string }) | null;
  const profile = {
    name: user?.full_name || 'Distributor Partner',
    distributorId: user?.id ? `DIST-MP-${1000 + Number(user.id)}` : '—',
    mobile: user?.mobile || '—',
    email: user?.email || '—',
    location: [user?.district, user?.tehsil].filter(Boolean).join(', ') || '—',
    joiningDate: formatJoinDate(rawUser?.created_at || rawUser?.createdAt),
    status: user?.is_active === false ? 'INACTIVE' : (user?.approval_status || 'active').toUpperCase(),
    aadhaar: user?.aadhaar_number || rawUser?.aadhaar || '—'
  };
  const isStatusActive = profile.status === 'ACTIVE' || profile.status === 'APPROVED';

  // Password change state
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });
  const passAction = useAsyncAction();
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      setPassError('Please fill in all password fields');
      return;
    }

    if (passwords.newPass !== passwords.confirm) {
      setPassError('New password and confirm password do not match');
      return;
    }

    if (passwords.newPass.length < 6) {
      setPassError('New password must be at least 6 characters long');
      return;
    }

    passAction.run(async () => {
      try {
        const response = await apiClient.post('/auth/change-password', {
          currentPassword: passwords.current,
          newPassword: passwords.newPass
        });

        if (response.data.status !== 'success') {
          setPassError(response.data.message || 'Password update failed. Kripya Current Password check karein.');
          return false;
        }
        setPassSuccess(true);
        setPasswords({ current: '', newPass: '', confirm: '' });
        setTimeout(() => setPassSuccess(false), 4000);
      } catch (err: any) {
        setPassError(err.response?.data?.message || 'Password update failed. Kripya Current Password check karein.');
        throw err;
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {isProfileLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ) : (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl border border-blue-200 shadow-inner uppercase">
              {profile.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{profile.name}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isStatusActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                  {profile.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Distributor ID: <span className="font-semibold text-slate-700">{profile.distributorId}</span> • Joined {profile.joiningDate}
              </p>
            </div>
          </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Columns: Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile Overview */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Personal & Account Details</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Read Only</span>
              </div>

              {isProfileLoading ? (
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-xs font-medium block">Full Name</span>
                  <span className="font-semibold text-slate-800">{profile.name}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-xs font-medium block">Mobile Number</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{profile.mobile}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-xs font-medium block">Email Address</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{profile.email}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-xs font-medium block">Distributor ID</span>
                  <span className="font-semibold text-blue-700">{profile.distributorId}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-xs font-medium block">Aadhaar Number</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{profile.aadhaar}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-xs font-medium block">District / Location</span>
                  <span className="font-semibold text-slate-800">{profile.location}</span>
                </div>
              </div>
              )}
            </div>

          </div>

          {/* Right Column: Security & Password Change */}
          <div className="space-y-6">
            
            {/* Password Reset Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <Lock className="h-4 w-4 text-blue-600" />
                <span>Security & Password</span>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
                
                {passSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Password updated successfully! Use your new password for your next login.</span>
                  </div>
                )}

                {passError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords({...passwords, newPass: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <ActionButton
                  type="submit"
                  state={passAction.state}
                  loadingText="Updating..."
                  successText="Password Updated!"
                  errorText="Update Failed"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Key className="h-4 w-4" />
                  <span>Update Password</span>
                </ActionButton>
              </form>
            </div>

            {/* Dynamic Support / Contact Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-sm">Distributor Support Hub</h3>
              </div>
              <p className="text-xs text-slate-300">
                Need to modify profile details or update bank account? Contact your assigned MP Online District Manager.
              </p>
              {isSettingsLoading ? (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-56" />
                </div>
              ) : (
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 text-slate-300">
                <p>📞 DM Helpline: <span className="text-emerald-400 font-bold">{supportInfo.helplineNumber}</span></p>
                <p>✉️ Support: <span className="text-blue-300 font-bold">{supportInfo.supportEmail}</span></p>
              </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
