import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

interface AdminPasswordInputs {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AdminContactInputs {
  helplineNumber: string;
  supportEmail: string;
}

export default function AdminSettings() {
  const passAction = useAsyncAction();
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  const contactAction = useAsyncAction();
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  // React Hook Form for Password
  const {
    register: registerPass,
    handleSubmit: handlePassSubmit,
    watch: watchPass,
    reset: resetPassForm,
    formState: { errors: passErrors }
  } = useForm<AdminPasswordInputs>({
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // React Hook Form for Contact
  const {
    register: registerContact,
    handleSubmit: handleContactSubmit,
    reset: resetContactForm,
    formState: { errors: contactErrors }
  } = useForm<AdminContactInputs>({
    mode: 'onTouched',
    defaultValues: {
      helplineNumber: '',
      supportEmail: ''
    }
  });

  // Load system settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/settings');
        if (response.data.status === 'success') {
          const hn = response.data.data.helplineNumber || '+91 0755 2700800';
          const se = response.data.data.supportEmail || 'distributor-help@mponline.gov.in';
          resetContactForm({
            helplineNumber: hn,
            supportEmail: se
          });
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, [resetContactForm]);

  // Password update handler
  const onPasswordSubmit = (data: AdminPasswordInputs) => {
    setPassError('');
    setPassSuccess('');

    passAction.run(async () => {
      try {
        const response = await apiClient.post('/auth/change-password', {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        });
        if (response.data.status !== 'success') throw new Error(response.data.message || 'Password update nahi ho saka.');
      } catch (err) {
        setPassError(getApiErrorMessage(err, 'Password update nahi ho saka. Kripya Current Password check karein.'));
        throw err;
      }
      setPassSuccess('Admin Password successfully update ho gaya hai!');
      resetPassForm();
      setTimeout(() => setPassSuccess(''), 3000);
    });
  };

  // Support contact update handler
  const onContactSubmit = (data: AdminContactInputs) => {
    setContactError('');
    setContactSuccess('');

    contactAction.run(async () => {
      try {
        const response = await apiClient.put('/settings', {
          helplineNumber: data.helplineNumber.trim(),
          supportEmail: data.supportEmail.trim()
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

            <form onSubmit={handlePassSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Admin Password *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...registerPass('currentPassword', {
                    required: 'Current admin password enter karna zaroori hai'
                  })}
                  className={`w-full bg-slate-50 border ${passErrors.currentPassword ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-600'} rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:bg-white`}
                />
                {passErrors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" />
                    <span>{passErrors.currentPassword.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  {...registerPass('newPassword', {
                    required: 'Naya password enter karna zaroori hai',
                    minLength: {
                      value: 6,
                      message: 'Password kam se kam 6 characters ka hona chahiye'
                    }
                  })}
                  className={`w-full bg-slate-50 border ${passErrors.newPassword ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-600'} rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:bg-white`}
                />
                {passErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" />
                    <span>{passErrors.newPassword.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  {...registerPass('confirmPassword', {
                    required: 'Confirm password enter karna zaroori hai',
                    validate: (val) =>
                      val === watchPass('newPassword') || 'Confirm Password naye password se match nahi kar raha'
                  })}
                  className={`w-full bg-slate-50 border ${passErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-600'} rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:bg-white`}
                />
                {passErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" />
                    <span>{passErrors.confirmPassword.message}</span>
                  </p>
                )}
              </div>

              <div className="pt-2">
                <ActionButton
                  type="submit"
                  state={passAction.state}
                  loadingText="Updating Password..."
                  successText="Password Updated!"
                  errorText="Update Failed"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
            <form onSubmit={handleContactSubmit(onContactSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Helpline Mobile / Phone Number *
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="+91 0755 2700800"
                    {...registerContact('helplineNumber', {
                      required: 'Helpline Number enter karna zaroori hai',
                      minLength: { value: 6, message: 'Valid phone number enter karein' }
                    })}
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border ${contactErrors.helplineNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:bg-white`}
                  />
                </div>
                {contactErrors.helplineNumber && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" />
                    <span>{contactErrors.helplineNumber.message}</span>
                  </p>
                )}
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
                    {...registerContact('supportEmail', {
                      required: 'Support Email enter karna zaroori hai',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Valid email address enter karein'
                      }
                    })}
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border ${contactErrors.supportEmail ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-600'} rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:bg-white`}
                  />
                </div>
                {contactErrors.supportEmail && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" />
                    <span>{contactErrors.supportEmail.message}</span>
                  </p>
                )}
              </div>

              <div className="pt-2">
                <ActionButton
                  type="submit"
                  state={contactAction.state}
                  loadingText="Saving..."
                  successText="Settings Saved!"
                  errorText="Save Failed"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
