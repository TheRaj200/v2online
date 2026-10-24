import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../store/apiError';
import {
  Settings,
  Lock,
  Phone,
  Mail,
  Key,
  CheckCircle2,
  AlertCircle,
  Save
} from 'lucide-react';

export default function AdminSettings() {
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passAction = useAsyncAction();
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Support contact state
  const [helplineNumber, setHelplineNumber] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const contactAction = useAsyncAction();
  // Settings values aane tak form ki jagah skeleton
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  // Load system settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/settings');
        if (response.data.status === 'success') {
          setHelplineNumber(response.data.data.helplineNumber || '+91 0755 2700800');
          setSupportEmail(response.data.data.supportEmail || 'distributor-help@mponline.gov.in');
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Password update handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('Kripya sabhi password fields ko fill karein.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Naya password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Naya Password aur Confirm Password match nahi kar rahe hain.');
      return;
    }

    passAction.run(async () => {
      try {
        const response = await apiClient.post('/auth/change-password', {
          currentPassword,
          newPassword
        });
        if (response.data.status !== 'success') throw new Error(response.data.message || 'Password update nahi ho saka.');
      } catch (err) {
        setPassError(getApiErrorMessage(err, 'Password update nahi ho saka. Kripya Current Password check karein.'));
        throw err;
      }
      setPassSuccess('Admin Password successfully update ho gaya hai!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 3000);
    });
  };

  // Support contact update handler
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');

    if (!helplineNumber.trim() || !supportEmail.trim()) {
      setContactError('Helpline Number aur Support Email dono bharna zaroori hai.');
      return;
    }

    contactAction.run(async () => {
      try {
        const response = await apiClient.put('/settings', {
          helplineNumber: helplineNumber.trim(),
          supportEmail: supportEmail.trim()
        });
        if (response.data.status !== 'success') throw new Error(response.data.message || 'Settings update nahi ho payi.');
      } catch (err) {
        setContactError(getApiErrorMessage(err, 'Settings update nahi ho payi.'));
        throw err;
      }
      setContactSuccess('Helpline Number aur Support Email successfully update ho gaye hain! Ab ye sabhi profile pages me dynamic dikhenge.');
      setTimeout(() => setContactSuccess(''), 4000);
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600" />
            <span>Admin Settings & Control Panel</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Update your admin login password, configure system helpline mobile numbers, and support email addresses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. Admin Password Update Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
              <Lock className="h-5 w-5 text-indigo-600" />
              <span>Admin Password Security</span>
            </div>

            {passSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Admin Password *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-2">
                <ActionButton
                  type="submit"
                  state={passAction.state}
                  loadingText="Updating Password..."
                  successText="Password Updated!"
                  errorText="Update Failed"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Key className="h-4 w-4" />
                  <span>Update Admin Password</span>
                </ActionButton>
              </div>
            </form>
          </div>

          {/* 2. System Support & Helpline Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
              <Phone className="h-5 w-5 text-emerald-600" />
              <span>System Support & Helpline Contacts</span>
            </div>

            <p className="text-xs text-slate-500">
              Yaha jo Helpline Number aur Support Email daalenge, bo Shop, Operator, aur Distributor pannels ke profile pages me dynamic dikhenge.
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

            {settingsLoading ? (
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
                    value={helplineNumber}
                    onChange={(e) => setHelplineNumber(e.target.value)}
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
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
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

        </div>

      </div>
    </DashboardLayout>
  );
}
