import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import {
  ShieldCheck,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Mail,
  KeyRound,
  CheckCircle2,
  X,
  Clock,
  RefreshCw
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Login Form State
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginAction = useAsyncAction();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Har forgot-password step ka apna 3-stage button state
  const sendOtpAction = useAsyncAction();
  const resendOtpAction = useAsyncAction();
  const verifyOtpAction = useAsyncAction();
  const resetPassAction = useAsyncAction();
  const forgotBusy = sendOtpAction.isLoading || resendOtpAction.isLoading || verifyOtpAction.isLoading || resetPassAction.isLoading;
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // 15-Minute Timer (900 Seconds)
  const [timerSeconds, setTimerSeconds] = useState(900);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!mobile || !password) {
      setErrorMessage('Kripya Mobile Number aur Password dono enter karein.');
      return;
    }

    if (mobile.length !== 10) {
      setErrorMessage('Mobile number 10 digits ka hona chahiye.');
      return;
    }

    loginAction.run(async () => {
      try {
        const result = await login(mobile, password);
        if (result.success && result.redirectUrl) {
          navigate(result.redirectUrl, { replace: true });
          return true;
        }
        setErrorMessage(result.message || 'Login failed.');
        return false;
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || err.message || 'Login failed.');
        return false;
      }
    });
  };

  // Step 1: Send Forgot Password OTP to Email (Send + Resend dono yahi use karte hain)
  const sendForgotOtp = async (): Promise<boolean> => {
    setForgotError('');
    setForgotSuccess('');

    if (!resetEmail.trim()) {
      setForgotError('Kripya apna registered Email address enter karein.');
      return false;
    }

    try {
      const res = await apiClient.post('/auth/forgot-password-otp', { email: resetEmail });
      if (res.data.status === 'success') {
        setForgotSuccess(res.data.message);
        setForgotStep('otp');
        setTimerSeconds(900); // 15 Minutes
        setIsTimerActive(true);
        return true;
      }
      setForgotError(res.data.message || 'OTP send nahi ho paaya.');
      return false;
    } catch (err: any) {
      setForgotError(err.response?.data?.message || err.message || 'OTP send karne me error aaya. Kripya email check karein.');
      return false;
    }
  };

  const handleSendForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtpAction.run(sendForgotOtp);
  };

  const handleResendForgotOtp = () => {
    resendOtpAction.run(sendForgotOtp);
  };

  // Step 2: Verify Forgot Password OTP
  const handleVerifyForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!resetOtp.trim() || resetOtp.length !== 6) {
      setForgotError('Kripya 6-digit OTP code enter karein.');
      return;
    }

    verifyOtpAction.run(async () => {
      try {
        const res = await apiClient.post('/auth/verify-reset-otp', {
          email: resetEmail,
          otp: resetOtp
        });
        if (res.data.status === 'success') {
          setForgotSuccess(res.data.message);
          setForgotStep('reset');
          return true;
        }
        setForgotError(res.data.message || 'OTP verify nahi ho paaya.');
        return false;
      } catch (err: any) {
        setForgotError(err.response?.data?.message || err.message || 'Galat OTP enter kiya gaya hai.');
        return false;
      }
    });
  };

  // Step 3: Reset Password with OTP
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setForgotError('Naya Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New Password aur Confirm Password match nahi kar rahe hain.');
      return;
    }

    resetPassAction.run(async () => {
      try {
        const res = await apiClient.post('/auth/reset-password', {
          email: resetEmail,
          otp: resetOtp,
          newPassword
        });

        if (res.data.status === 'success') {
          setShowForgotModal(false);
          setErrorMessage('');
          setSuccessMessage('🎉 Password safaltapoorvak reset ho gaya hai! Kripya apne naye password se login karein.');

          // Reset Modal State
          setForgotStep('email');
          setResetEmail('');
          setResetOtp('');
          setNewPassword('');
          setConfirmPassword('');
          setIsTimerActive(false);
          return true;
        }
        setForgotError(res.data.message || 'Password reset failed.');
        return false;
      } catch (err: any) {
        setForgotError(err.response?.data?.message || err.message || 'Password reset failed.');
        return false;
      }
    });
  };

  const resetModalState = () => {
    setShowForgotModal(false);
    setForgotStep('email');
    setForgotError('');
    setForgotSuccess('');
    setResetEmail('');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setIsTimerActive(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col justify-between font-sans">
      {/* Top Header Bar */}
      <header className="bg-[#1d4ed8] text-white shadow-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 rounded-xl blur-xs opacity-80 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative h-10 w-10 rounded-xl bg-slate-950 border border-white/20 flex items-center justify-center shadow-lg">
              <span className="text-sm font-black bg-gradient-to-br from-amber-300 via-orange-400 to-emerald-300 bg-clip-text text-transparent tracking-tighter">
                V2
              </span>
            </div>
          </div>
          <div className="leading-none select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white drop-shadow-sm">V2</span>
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200 bg-clip-text text-transparent uppercase drop-shadow-xs">
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 bg-white/15 text-amber-300 text-[9px] font-extrabold tracking-widest px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-xs uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SERVICES PORTAL</span>
              </span>
            </div>
          </div>
        </div>

        <Link
          to="/register"
          className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-lg border border-white/20 text-white transition-colors"
        >
          New Registration (Agent / Operator)
        </Link>
      </header>

      {/* Main Login Card */}
      <div className="flex-1 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Sign In to Your Account</h2>
              <p className="text-xs text-slate-500 mt-1">
                Super Admin • Manager • Distributor • Operator • MP Online Retailer
              </p>
            </div>

            {successMessage && (
              <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-emerald-800 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-red-700 text-xs font-medium animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email');
                      setForgotError('');
                      setForgotSuccess('');
                      setShowForgotModal(true);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <ActionButton
                  type="submit"
                  state={loginAction.state}
                  loadingText="Signing In..."
                  successText="Signed In!"
                  errorText="Login Failed"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <span>Secure Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </ActionButton>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
              <p className="text-xs text-slate-600">
                Naye Retailer ya Operator hain?{' '}
                <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
                  Self Register Karein (OTP)
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Interactive Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Your Password</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    15-Minute Email OTP Verification
                  </p>
                </div>
              </div>
              <button
                onClick={resetModalState}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error & Success Messages */}
            {forgotError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 'email' && (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apna registered <strong>Email Address</strong> enter karein. Hum aapko 6-digit password reset OTP bhejenge (valid for 15 minutes).
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetModalState}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={sendOtpAction.state}
                    loadingText="Sending..."
                    successText="OTP Sent!"
                    errorText="Failed"
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Send Reset OTP</span>
                    <ArrowRight className="h-4 w-4" />
                  </ActionButton>
                </div>
              </form>
            )}

            {/* STEP 2: Enter & Verify 6-Digit OTP */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs font-semibold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span>OTP Validity: <strong>{formatTimer(timerSeconds)}</strong></span>
                  </span>
                  <span className="text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-bold">15 MIN</span>
                </div>

                <p className="text-xs text-slate-600">
                  Aapke email <strong>{resetEmail}</strong> par bheja gaya 6-digit OTP code enter karein:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    6-Digit Verification OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 849201"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full text-center tracking-[8px] font-mono font-bold text-lg py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    ← Change Email
                  </button>
                  <ActionButton
                    state={resendOtpAction.state}
                    onClick={handleResendForgotOtp}
                    disabled={forgotBusy && !resendOtpAction.isLoading}
                    loadingText="Resending..."
                    successText="OTP Sent!"
                    errorText="Failed"
                    keepColorOnResult
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Resend OTP</span>
                  </ActionButton>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetModalState}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={verifyOtpAction.state}
                    disabled={resendOtpAction.isLoading}
                    loadingText="Verifying..."
                    successText="Verified!"
                    errorText="Invalid OTP"
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Verify OTP</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </ActionButton>
                </div>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {forgotStep === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  OTP verification safal raha! Ab apne account ke liye naya password enter karein.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="•••••••• (Min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetModalState}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={resetPassAction.state}
                    loadingText="Resetting..."
                    successText="Password Reset!"
                    errorText="Reset Failed"
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Reset Password & Sign In</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </ActionButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-200">
        © 2026 V2Online Citizen Center Portal • Fast Track Government Services Platform
      </footer>
    </div>
  );
};

export default LoginPage;
