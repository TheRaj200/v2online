import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import {
  Store,
  Briefcase,
  Phone,
  User as UserIcon,
  CreditCard,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Building,
  MapPin,
  Award
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<'agent' | 'operator'>('agent');
  // 3-stage button states (Send OTP / Resend OTP / Verify & Register)
  const sendOtpAction = useAsyncAction();
  const resendOtpAction = useAsyncAction();
  const verifyAction = useAsyncAction();
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [designation, setDesignation] = useState('');
  const [wardNumber] = useState('');
  const [area, setArea] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [address, setAddress] = useState('');

  // Step 2 State
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Kripya apna poora naam enter karein.');
      return;
    }

    if (mobile.length !== 10) {
      setErrorMessage('Kripya 10-digit valid mobile number enter karein.');
      return;
    }

    // OTP sirf email par jaata hai, isliye valid email zaroori hai
    if (!/^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(email.trim())) {
      setErrorMessage('Kripya valid Email Address enter karein. OTP isi email par bheja jayega.');
      return;
    }

    if (role === 'agent' && !shopName) {
      setErrorMessage('Shop / Kiosk Name enter karna zaroori hai.');
      return;
    }

    if (role === 'operator' && !officeName) {
      setErrorMessage('Office / Department Name enter karna zaroori hai.');
      return;
    }

    sendOtpAction.run(async () => {
      try {
        const response = await apiClient.post('/auth/register-otp', buildOtpPayload());
        if (response.data.status === 'success') {
          setStep(2);
          return true;
        }
        setErrorMessage(response.data.message || 'OTP request failed. Kripya dobara try karein.');
        return false;
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || error.message || 'OTP request failed. Kripya dobara try karein.');
        return false;
      }
    });
  };

  // Send + Resend dono ka same payload
  const buildOtpPayload = () => ({
    role,
    full_name: fullName,
    mobile,
    shop_name: shopName,
    office_name: officeName,
    designation,
    ward_no: wardNumber,
    area,
    email,
    aadhaar_number: aadhaarNumber,
    address
  });

  const [resendMessage, setResendMessage] = useState('');

  // Resend OTP Handler
  const handleResendOtp = () => {
    setErrorMessage('');
    setResendMessage('');
    resendOtpAction.run(async () => {
      try {
        const response = await apiClient.post('/auth/register-otp', buildOtpPayload());
        if (response.data.status === 'success') {
          setResendMessage('Naya OTP email par successfully bhej diya gaya hai!');
          return true;
        }
        setErrorMessage(response.data.message || 'OTP resend failed. Kripya dobara try karein.');
        return false;
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || error.message || 'OTP resend failed. Kripya dobara try karein.');
        return false;
      }
    });
  };

  // Step 2: Verify OTP & Complete Self-Registration
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (otp.length !== 6) {
      setErrorMessage('Kripya 6-digit OTP enter karein.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password aur Confirm Password match nahi kar rahe hain.');
      return;
    }

    verifyAction.run(async () => {
      try {
        // Backend OTP verify karke user + shop record (pending approval) create karta hai
        const response = await apiClient.post('/auth/verify-registration', {
          mobile,
          otp,
          password
        });
        if (response.data?.status && response.data.status !== 'success') {
          setErrorMessage(response.data.message || 'Verification failed. Kripya sahi OTP daalein.');
          return false;
        }
        setStep(3);
        return true;
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || error.message || 'Verification failed. Kripya sahi OTP daalein.');
        return false;
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col justify-between font-sans">
      {/* Top Header Bar */}
      <header className="bg-[#1d4ed8] text-white shadow-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
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
        </Link>

        <Link
          to="/login"
          className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-lg border border-white/20 text-white transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Main Registration Container */}
      <div className="flex-1 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-red-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: Details & WhatsApp OTP */}
            {step === 1 && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Partner Registration</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your role and verify via Email OTP
                  </p>
                </div>

                {/* Role Toggle */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setRole('agent')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${role === 'agent'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <Store className="h-4 w-4" />
                    <span>MP Online Shop (Retailer)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('operator')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${role === 'operator'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-sm ring-1 ring-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>Processing Officer (Operator)</span>
                  </button>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {role === 'operator' ? 'Operator Full Name *' : 'Owner Full Name *'}
                      </label>
                      <div className="relative">
                        <UserIcon className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder={role === 'operator' ? 'Operator Name' : 'Owner / Full Name'}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* WhatsApp Mobile */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Number *
                      </label>
                      <div className="relative">
                        <Phone className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit mobile"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {role === 'agent' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Shop / Kiosk Center Name *
                      </label>
                      <div className="relative">
                        <Store className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Sharma MP Online & CSC Center"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Designation */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Designation / Post *
                        </label>
                        <div className="relative">
                          <Award className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. Senior Operator / Clerk"
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                            required
                          />
                        </div>
                      </div>

                      {/* Office Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Office / Department Name *
                        </label>
                        <div className="relative">
                          <Building className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. District E-Governance Office"
                            value={officeName}
                            onChange={(e) => setOfficeName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                        required
                      />
                    </div>

                    {/* Aadhaar Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Aadhaar Number (12-Digit)
                      </label>
                      <div className="relative">
                        <CreditCard className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="12-digit Aadhaar No."
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {role === 'operator' && (
                    <div>
                      {/* Area / Location */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Area / Tehsil
                        </label>
                        <div className="relative">
                          <MapPin className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Area / Tehsil Name"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Address *
                    </label>
                    <input
                      type="text"
                      placeholder="Shop / Office detailed address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <ActionButton
                      type="submit"
                      state={sendOtpAction.state}
                      loadingText="Sending OTP..."
                      successText="OTP Sent!"
                      errorText="Failed"
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                    >
                      <span>Send Email OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: OTP Verification & Set Password */}
            {step === 2 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Verify OTP</h2>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Change Details</span>
                  </button>
                </div>

                <div className="text-xs text-slate-600 mb-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 p-3 rounded-xl border border-blue-200/60 shadow-xs">
                  <span>OTP sent to Email <strong className="text-blue-700">{email}</strong></span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">⏱️ OTP is valid for 5 minutes. Inbox / Spam folder bhi check karein.</span>
                </div>

                {resendMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{resendMessage}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP *
                    </label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 tracking-widest text-center text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="mt-1.5 flex justify-end">
                      <ActionButton
                        state={resendOtpAction.state}
                        onClick={handleResendOtp}
                        disabled={verifyAction.isLoading}
                        loadingText="Resending OTP..."
                        successText="OTP Sent!"
                        errorText="Resend Failed"
                        keepColorOnResult
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Resend Email OTP</span>
                      </ActionButton>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Password (Min 6 chars) *
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <ActionButton
                      type="submit"
                      state={verifyAction.state}
                      disabled={resendOtpAction.isLoading}
                      loadingText="Verifying..."
                      successText="Registered!"
                      errorText="Verification Failed"
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
                    >
                      <span>Complete Registration</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: Pending Approval Screen */}
            {step === 3 && (
              <div className="text-center py-6">
                <div className="h-14 w-14 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Registration Successful! 🎉</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-4 text-left text-xs text-slate-700 space-y-1.5">
                  <p className="font-bold text-amber-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Status: Pending Admin / Manager Approval
                  </p>
                  <p className="text-slate-600">
                    Aapka {role === 'agent' ? 'MP Online Shop' : 'Officer Operator'} account register ho chuka hai. Verification hote hi aapko Email par update milega.
                  </p>
                </div>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
                >
                  <span>Go to Login Page</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {step !== 3 && (
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Pehle se registered hain?{' '}
                  <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
                    Sign In Karein
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-200">
        © 2026 V2Online Citizen Center Portal • Fast Track Government Services Platform
      </footer>
    </div>
  );
};

export default RegisterPage;
