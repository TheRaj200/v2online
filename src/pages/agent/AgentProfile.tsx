import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton } from '../../components/ui/Skeleton';
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
  ShieldCheck
} from 'lucide-react';

export default function AgentProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const profileLoading = authLoading || !user;

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passAction = useAsyncAction();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamic system settings (Helpline & Support Email)
  const [supportInfo, setSupportInfo] = useState({
    helplineNumber: '+91 0755 2700800',
    supportEmail: 'distributor-help@mponline.gov.in'
  });

  const [supportLoading, setSupportLoading] = useState(true);

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
      setErrorMsg('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New Password and Confirm Password do not match.');
      return;
    }

    passAction.run(async () => {
      try {
        const response = await apiClient.post('/auth/change-password', {
          currentPassword,
          newPassword
        });

        if (response.data.status === 'success') {
          setSuccessMsg('Security password updated successfully!');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => setSuccessMsg(''), 4000);
          return true;
        }
        setErrorMsg(response.data.message || 'Password update failed.');
        return false;
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || err.message || 'Password update failed. Kripya Current Password check karein.');
        return false;
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            <span>Shop Retailer Account & Security Profile</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your kiosk profile information, contact details, and account security credentials.
          </p>
        </div>

        {/* Action Message Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left Box: Profile Info */}
          <div className="space-y-6">
            {profileLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4" aria-busy="true">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="h-12 w-12 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">{user?.full_name || 'Retailer Partner'}</h2>
                 
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Store className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Shop / Kiosk Name</div>
                    <div className="font-bold text-slate-800">{user?.shop_name || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Mobile Number</div>
                    <div className="font-bold text-slate-800">{user?.mobile || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Email Address</div>
                    <div className="font-bold text-slate-800">{user?.email || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">District / Location</div>
                    <div className="font-bold text-slate-800">{user?.district ? `${user.district}, MP` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Dynamic Support Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-sm">Retailer Support & Helpdesk</h3>
              </div>
              <p className="text-xs text-slate-300">
                Facing technical issues or need help with kiosk verification? Contact your assigned District Manager.
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 text-slate-300">
                {supportLoading ? (
                  <>
                    <Skeleton className="h-3 w-48 bg-white/15!" />
                    <Skeleton className="h-3 w-56 bg-white/15!" />
                  </>
                ) : (
                  <>
                    <p>📞 Helpline: <span className="text-emerald-400 font-bold">{supportInfo.helplineNumber}</span></p>
                    <p>✉️ Support Email: <span className="text-blue-300 font-bold">{supportInfo.supportEmail}</span></p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Box: Security & Password Update */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 h-fit">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
              <Lock className="h-5 w-5 text-blue-600" />
              <span>Security & Password</span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="pt-2">
                <ActionButton
                  type="submit"
                  state={passAction.state}
                  loadingText="Updating..."
                  successText="Password Updated!"
                  errorText="Update Failed"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Key className="h-4 w-4" />
                  <span>Update Password</span>
                </ActionButton>
              </div>
            </form>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
