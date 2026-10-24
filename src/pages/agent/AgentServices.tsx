import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  type ServiceItem,
  type SubServiceItem,
  type FormField,
  DROPDOWN_PRESETS
} from '../../types/service';
import { useAppDispatch, useAppSelector, selectServices, selectServicesStatus, selectWalletBalance, selectWalletStatus, isInitialLoading } from '../../store/hooks';
import { fetchServices } from '../../store/slices/servicesSlice';
import { fetchWallet } from '../../store/slices/walletSlice';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { Skeleton, SkeletonGrid } from '../../components/ui/Skeleton';
import apiClient, { FILE_BASE_URL } from '../../api/client';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
  Wallet,
  Sparkles,
  Upload,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  IndianRupee,
  PlusCircle,
  MapPin,
  FileText,
  Check,
  ShieldCheck
} from 'lucide-react';

export default function AgentServices() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const allServices = useAppSelector(selectServices);
  const servicesStatus = useAppSelector(selectServicesStatus);
  const walletBalance = useAppSelector(selectWalletBalance);
  const walletStatus = useAppSelector(selectWalletStatus);
  const services = useMemo(() => allServices.filter(s => s.isActive), [allServices]);
  const isLoading = isInitialLoading(servicesStatus, allServices.length);
  const walletLoading = walletStatus === 'idle' || (walletStatus === 'loading' && walletBalance === 0);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MULTI' | 'SINGLE'>('ALL');

  // Sub-service drill-down state
  const [drillDownService, setDrillDownService] = useState<ServiceItem | null>(null);

  // Application Modal State
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedSubService, setSelectedSubService] = useState<SubServiceItem | null>(null);

  // Low Balance Modal State
  const [lowBalanceAlert, setLowBalanceAlert] = useState<{
    show: boolean;
    requiredFee: number;
    serviceName: string;
  }>({ show: false, requiredFee: 0, serviceName: '' });

  // Dynamic Form Values
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [rawFiles, setRawFiles] = useState<Record<string, File>>({});

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const applyAction = useAsyncAction();

  // Area / Ward routing state
  const [areasLoading, setAreasLoading] = useState(false);
  const areasRequestId = useRef(0);

  interface AreaDetail {
    label: string;
    price: number;
  }
  interface WardDetail {
    wardNo: string;
    label: string;
    price: number;
  }

  const [availableAreas, setAvailableAreas] = useState<{
    mode: 'single' | 'area_wise' | 'ward_wise';
    areas: string[];
    wards: string[];
    areaDetails?: AreaDetail[];
    wardDetails?: WardDetail[];
    basePrice?: number;
    hasOperators: boolean;
  }>({
    mode: 'single',
    areas: [],
    wards: [],
    areaDetails: [],
    wardDetails: [],
    basePrice: 0,
    hasOperators: true
  });
  const [selectedAreaLabel, setSelectedAreaLabel] = useState('');
  const [selectedWardNo, setSelectedWardNo] = useState('');

  useEffect(() => {
    dispatch(fetchServices());
    dispatch(fetchWallet());
  }, [dispatch]);

  // Check Wallet Balance before opening application modal
  const handleInitiateApply = async (parentService: ServiceItem, subService?: SubServiceItem) => {
    const fee = subService ? subService.fee : parentService.fee;
    const sName = subService && subService.name !== parentService.name
      ? `${parentService.name} (${subService.name})`
      : (subService ? subService.name : parentService.name);

    if (walletStatus === 'succeeded' && walletBalance < fee) {
      setLowBalanceAlert({
        show: true,
        requiredFee: fee,
        serviceName: sName
      });
      return;
    }

    setSelectedService(parentService);
    setSelectedSubService(subService || null);
    setErrorMsg('');
    setFormInputs({});
    setUploadedFiles({});
    setRawFiles({});
    setSelectedAreaLabel('');
    setSelectedWardNo('');
    setAvailableAreas({ mode: 'single', areas: [], wards: [], areaDetails: [], wardDetails: [], basePrice: 0, hasOperators: true });
    setAreasLoading(true);
    const requestId = ++areasRequestId.current;

    // Fetch routing areas for selected service
    try {
      const query = subService ? `sub_service_id=${subService.id}` : `service_id=${parentService.id}`;
      const res = await apiClient.get(`/operator-assignments/areas?${query}`);
      if (requestId !== areasRequestId.current) return;
      if (res.data.status === 'success') {
        const data = res.data.data;
        setAvailableAreas(data);
        if (data.areas && data.areas.length > 0) setSelectedAreaLabel(data.areas[0]);
        if (data.wards && data.wards.length > 0) setSelectedWardNo(data.wards[0]);
      }
    } catch (e) {
      console.error('Failed to fetch available areas:', e);
      if (requestId === areasRequestId.current) {
        setAvailableAreas({ mode: 'single', areas: [], wards: [], hasOperators: true });
      }
    } finally {
      if (requestId === areasRequestId.current) setAreasLoading(false);
    }
  };

  // Compute Active Applicable Fee & Dynamic Form Fields
  let baseFee = selectedService?.hasSubServices
    ? selectedSubService?.fee || 0
    : selectedService?.fee || 0;

  if (availableAreas.mode === 'area_wise' && selectedAreaLabel) {
    const match = availableAreas.areaDetails?.find(a => a.label === selectedAreaLabel);
    if (match) baseFee = match.price;
  } else if (availableAreas.mode === 'ward_wise' && selectedWardNo) {
    const match = availableAreas.wardDetails?.find(w => w.wardNo === selectedWardNo);
    if (match) baseFee = match.price;
  }

  const activeFee = baseFee;

  const activeFormFields: FormField[] = selectedService?.hasSubServices
    ? selectedSubService?.formFields || []
    : selectedService?.formFields || [];

  // Handle Form Field Change
  const handleInputChange = (fieldId: string, value: any) => {
    setFormInputs(prev => ({ ...prev, [fieldId]: value }));
  };

  // Handle Real File Input Change
  const handleFileChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [fieldId]: file.name }));
      setRawFiles(prev => ({ ...prev, [fieldId]: file }));
      setFormInputs(prev => ({ ...prev, [fieldId]: file.name }));
    }
  };

  // Submit Application to Real Backend API
  const handleApplyServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || areasLoading) return;
    setErrorMsg('');

    if (walletStatus === 'succeeded' && activeFee > walletBalance) {
      setLowBalanceAlert({
        show: true,
        requiredFee: activeFee,
        serviceName: selectedSubService ? `${selectedService.name} (${selectedSubService.name})` : selectedService.name
      });
      setSelectedService(null);
      return;
    }

    // Validate Required Dynamic Form Fields
    for (const field of activeFormFields) {
      if (field.required && field.docUploader !== 'operator') {
        if (field.type === 'file') {
          if (!rawFiles[field.id]) {
            setErrorMsg(`Please upload required document: "${field.label}"`);
            return;
          }
        } else {
          const val = formInputs[field.id];
          if (!val || (typeof val === 'string' && !val.trim())) {
            setErrorMsg(`Please fill required field: "${field.label}"`);
            return;
          }
        }
      }
    }

    // Validate Location selection based on routing mode
    if (availableAreas.mode === 'area_wise' && !selectedAreaLabel) {
      setErrorMsg('Please select an Office / Area Location.');
      return;
    }
    if (availableAreas.mode === 'ward_wise' && !selectedWardNo) {
      setErrorMsg('Please select a Gwalior Ward Number.');
      return;
    }
    if (!availableAreas.hasOperators) {
      setErrorMsg('Is service ke liye Gwalior mein filhal koi official operator available nahi hai.');
      return;
    }

    const serviceTitle = selectedService.hasSubServices && selectedSubService
      ? (selectedService.name === selectedSubService.name
          ? selectedService.name
          : `${selectedService.name} (${selectedSubService.name})`)
      : selectedService.name;

    // Compile submitted form data labels & values
    const submittedFormData: Record<string, string> = {};
    activeFormFields.forEach(field => {
      if (field.docUploader === 'operator') {
        submittedFormData[`[Operator Deliverable Required]: ${field.label}`] = 'Pending Operator File Upload';
      } else if (field.type === 'file' && uploadedFiles[field.id]) {
        submittedFormData[field.label] = `${uploadedFiles[field.id]} (Uploaded Document)`;
      } else if (formInputs[field.id]) {
        submittedFormData[field.label] = formInputs[field.id];
      }
    });

    if (selectedAreaLabel) submittedFormData['Office / Area Location'] = selectedAreaLabel;
    if (selectedWardNo) submittedFormData['Gwalior Ward Number'] = `Ward #${selectedWardNo}`;

    // Construct FormData for multipart API call
    const formDataPayload = new FormData();
    if (selectedSubService?.id) {
      formDataPayload.append('subServiceId', selectedSubService.id.toString());
    } else {
      formDataPayload.append('serviceId', selectedService.id.toString());
    }

    if (selectedAreaLabel) formDataPayload.append('areaLabel', selectedAreaLabel);
    if (selectedWardNo) formDataPayload.append('wardNo', selectedWardNo);
    formDataPayload.append('formData', JSON.stringify(submittedFormData));

    // Append actual file objects
    activeFormFields.forEach(field => {
      if (field.type === 'file' && rawFiles[field.id]) {
        formDataPayload.append(`doc_${field.label}`, rawFiles[field.id]);
      }
    });

    applyAction.run(async () => {
      try {
        const response = await apiClient.post('/applications/apply', formDataPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.status === 'success') {
          const appNo = response.data.data?.applicationNo || 'APP-SUCCESS';
          dispatch(fetchWallet());
          setSuccessMsg(`Service application "${appNo}" for "${serviceTitle}" submitted successfully! Fee ₹${activeFee.toFixed(2)} deducted.`);
          setSelectedService(null);
          setDrillDownService(null);
          setTimeout(() => setSuccessMsg(''), 6000);
          return true;
        }
        setErrorMsg(response.data.message || 'Failed to apply.');
        return false;
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || err.message || 'Server error while submitting application.');
        return false;
      }
    });
  };

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subServices?.some(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      const hasSubs = s.hasSubServices && (s.subServices?.length || 0) > 0;
      if (activeFilter === 'MULTI') return hasSubs;
      if (activeFilter === 'SINGLE') return !hasSubs;
      return true;
    });
  }, [services, searchTerm, activeFilter]);

  // Counts for filter pills
  const multiCount = useMemo(() => services.filter(s => s.hasSubServices && (s.subServices?.length || 0) > 0).length, [services]);
  const singleCount = useMemo(() => services.filter(s => !s.hasSubServices || (s.subServices?.length || 0) === 0).length, [services]);

  // Helper to render icon/logo
  const renderLogo = (iconUrl?: string, className: string = "h-8 w-8 text-blue-600") => {
    if (iconUrl) {
      const src = iconUrl.startsWith('http') || iconUrl.startsWith('data:') ? iconUrl : `${FILE_BASE_URL}${iconUrl}`;
      return <img src={src} alt="" className="h-full w-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
    }
    return <Layers className={className} />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">

        {/* 1. Sleek Glassmorphic Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-2xl border border-indigo-900/50">
          {/* Ambient Lighting Accents */}
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[11px] font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Citizen Services Catalog</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Government Services Portal</span>
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl leading-relaxed">
                Apply for certificates, citizen identity, welfare schemes & legal documents with automated routing to verified city operators.
              </p>
            </div>

            {/* Quick Actions & Live Wallet Chip */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/agent/my-requests"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs border border-white/20 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FileCheck className="h-4 w-4 text-indigo-300" />
                <span>Track Applications</span>
              </Link>

              {/* Wallet Chip */}
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 backdrop-blur-md">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Available Balance</span>
                  {walletLoading ? (
                    <Skeleton className="h-5 w-20 bg-white/20! mt-0.5" />
                  ) : (
                    <span className="font-mono text-base font-black text-emerald-200">
                      ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <Link
                  to="/agent/wallet"
                  title="Add Funds to Wallet"
                  className="ml-1 p-1.5 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Global Success Notification */}
        {successMsg && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <span>{successMsg}</span>
            </div>
            <Link
              to="/agent/my-requests"
              className="text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
            >
              <span>View In Requests</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* 2. Interactive Search & Category Filter Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by service name, code (e.g. MP-SV-101)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              All Services ({services.length})
            </button>
            <button
              onClick={() => setActiveFilter('MULTI')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'MULTI'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Multi-Option ({multiCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('SINGLE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'SINGLE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Direct Apply ({singleCount})</span>
            </button>
          </div>
        </div>

        {/* 3. DRILL-DOWN VIEW: Sub-Services of a Parent Service */}
        {drillDownService ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Breadcrumb Navigation & Parent Service Header */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 p-2 shadow-xs">
                  {renderLogo(drillDownService.iconUrl, "h-10 w-10 text-indigo-600")}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase">
                      Code: {drillDownService.code}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {(drillDownService.subServices || []).length} Options Available
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                    {drillDownService.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Choose the specific sub-service below to fill application details & submit.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDrillDownService(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to All Services</span>
              </button>
            </div>

            {/* Sub-Services Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {(drillDownService.subServices || []).filter(s => s.isActive !== false).map((sub) => {
                const docFieldsCount = (sub.formFields || []).filter(f => f.type === 'file' && f.docUploader !== 'operator').length;
                const totalFieldsCount = (sub.formFields || []).length;

                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                  >
                    {/* Header Row: Sub Logo & Fee Badge */}
                    <div className="flex items-start justify-between">
                      <div className="h-14 w-14 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        {renderLogo(sub.iconUrl || drillDownService.iconUrl, "h-7 w-7 text-indigo-600")}
                      </div>

                      <span className="inline-flex items-center gap-1 font-mono text-sm sm:text-base font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 rounded-full shadow-xs">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {sub.fee.toFixed(2)}
                      </span>
                    </div>

                    {/* Middle: Title, Code & Document requirements */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {sub.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                          {sub.code}
                        </span>
                        {docFieldsCount > 0 && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            {docFieldsCount} Docs
                          </span>
                        )}
                        {totalFieldsCount > 0 && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {totalFieldsCount} Fields
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: Apply Button */}
                    <button
                      onClick={() => handleInitiateApply(drillDownService, sub)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3 rounded-2xl text-xs sm:text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Apply for this Service</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 4. MAIN SERVICES GRID */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Available Services ({isLoading ? '…' : filteredServices.length})</span>
              </h2>
            </div>

            {isLoading ? (
              <SkeletonGrid count={6} className="grid-cols-1! sm:grid-cols-2! lg:grid-cols-3! gap-5 sm:gap-6" />
            ) : filteredServices.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs sm:text-sm bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Layers className="h-6 w-6" />
                </div>
                <p className="font-semibold text-slate-700">No services found matching your search</p>
                <p className="text-slate-400 text-xs">Try searching with a different keyword or resetting your filter.</p>
                <button
                  onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Clear Search & Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredServices.map((service) => {
                  const hasSubs = service.hasSubServices && (service.subServices?.length || 0) > 0;
                  const subCount = service.subServices?.length || 0;
                  const docFieldsCount = (service.formFields || []).filter(f => f.type === 'file' && f.docUploader !== 'operator').length;

                  return (
                    <div
                      key={service.id}
                      className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between space-y-5 group"
                    >
                      {/* Top Row: Service Logo & Fee/SubService Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/70 flex items-center justify-center overflow-hidden shrink-0 p-2 shadow-xs group-hover:scale-105 transition-transform duration-300">
                          {renderLogo(service.iconUrl, "h-9 w-9 text-indigo-600")}
                        </div>

                        {hasSubs ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full shadow-xs">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{subCount} Options</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-sm sm:text-base font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full shadow-xs">
                            <IndianRupee className="h-3.5 w-3.5" />
                            <span>{service.fee.toFixed(2)}</span>
                          </span>
                        )}
                      </div>

                      {/* Middle: Service Title, Code & Form Tags */}
                      <div className="space-y-2">
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {service.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                            {service.code}
                          </span>
                          {!hasSubs && docFieldsCount > 0 && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                              <Upload className="h-3 w-3" />
                              {docFieldsCount} Docs
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Official
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Full width Action Button */}
                      <button
                        onClick={() => {
                          if (hasSubs) {
                            setDrillDownService(service);
                          } else {
                            handleInitiateApply(service);
                          }
                        }}
                        className={`w-full font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-white ${
                          hasSubs
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20'
                            : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
                        }`}
                      >
                        <span>{hasSubs ? `View ${subCount} Sub-Services` : 'Apply Service Online'}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== LOW WALLET BALANCE ALERT MODAL ===== */}
        {lowBalanceAlert.show && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 text-center relative animate-in zoom-in-95">
              <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shrink-0 border-4 border-amber-50 shadow-inner">
                <AlertTriangle className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Insufficient Wallet Balance!
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-amber-700 mt-1">
                  आपके वॉलेट में बैलेंस कम है। कृपया पहले पैसा ऐड करें।
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5 text-left">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Selected Service:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{lowBalanceAlert.serviceName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Required Service Fee:</span>
                  <span className="font-mono font-bold text-rose-600">₹{lowBalanceAlert.requiredFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                  <span>Current Available Balance:</span>
                  <span className="font-mono font-bold text-emerald-600">₹{walletBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setLowBalanceAlert({ show: false, requiredFee: 0, serviceName: '' })}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setLowBalanceAlert({ show: false, requiredFee: 0, serviceName: '' });
                    navigate('/agent/wallet');
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Recharge Wallet</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== APPLICATION FORM MODAL ===== */}
        {selectedService && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-hidden">
            <div className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 relative my-auto animate-in fade-in zoom-in-95 overflow-hidden">

              {/* Modal Header */}
              <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                    {renderLogo(selectedSubService?.iconUrl || selectedService.iconUrl, "h-7 w-7 text-indigo-600")}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {selectedSubService ? `${selectedService.name} — ${selectedSubService.name}` : selectedService.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Fill required service details & upload applicant documents
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">

                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Loading Areas / Operator Status */}
                {areasLoading && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 space-y-2" aria-busy="true">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                )}

                {/* Smart Area / Ward Location Dropdown */}
                {!areasLoading && availableAreas.mode !== 'single' && (
                  <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/70 p-4 rounded-2xl border border-indigo-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        <span>{availableAreas.mode === 'area_wise' ? 'Select Office / Area Branch' : 'Select Gwalior Ward Location'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        Auto-routes to operator
                      </span>
                    </div>

                    {availableAreas.mode === 'area_wise' && (
                      <select
                        value={selectedAreaLabel}
                        onChange={e => setSelectedAreaLabel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                        required
                      >
                        {availableAreas.areas.map((area, idx) => {
                          const detail = availableAreas.areaDetails?.find(a => a.label === area);
                          const priceStr = detail ? ` — Fee: ₹${detail.price.toFixed(2)}` : '';
                          return (
                            <option key={idx} value={area}>
                              📍 {area}{priceStr}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    {availableAreas.mode === 'ward_wise' && (
                      <select
                        value={selectedWardNo}
                        onChange={e => setSelectedWardNo(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                        required
                      >
                        {availableAreas.wards.map((ward, idx) => {
                          const detail = availableAreas.wardDetails?.find(w => w.wardNo === ward);
                          const priceStr = detail ? ` — Fee: ₹${detail.price.toFixed(2)}` : '';
                          return (
                            <option key={idx} value={ward}>
                              🏢 Gwalior Ward #{ward}{priceStr}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                )}

                {!areasLoading && !availableAreas.hasOperators && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Is service ke liye Gwalior mein filhal koi operator available nahi hai.</span>
                  </div>
                )}

                {/* Dynamic Form Fields */}
                {activeFormFields.length > 0 ? (
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span>Required Application Details & Documents</span>
                    </h4>

                    {/* Responsive Grid of Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeFormFields.map((field) => {
                        if (field.docUploader === 'operator') return null;

                        const isFullWidth = field.type === 'textarea' || field.type === 'file';

                        return (
                          <div
                            key={field.id}
                            className={`space-y-1.5 ${isFullWidth ? 'sm:col-span-2' : ''}`}
                          >
                            <label className="block text-xs font-bold text-slate-700">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </label>

                            {field.type === 'file' ? (
                              <div className="border border-dashed border-indigo-200 bg-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-indigo-400 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Upload className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-800 block truncate">
                                      {uploadedFiles[field.id] || 'Choose document file (JPG/PDF)'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Max size 5MB • Scanned copy or photo
                                    </span>
                                  </div>
                                </div>
                                <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-colors shrink-0 shadow-xs">
                                  <span>Browse</span>
                                  <input
                                    type="file"
                                    onChange={e => handleFileChange(field.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            ) : field.type === 'select' ? (
                              <select
                                value={formInputs[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                              >
                                <option value="">{field.placeholder || '-- Select Option --'}</option>
                                {(field.presetType && field.presetType !== 'custom' && DROPDOWN_PRESETS[field.presetType as keyof typeof DROPDOWN_PRESETS]
                                  ? DROPDOWN_PRESETS[field.presetType as keyof typeof DROPDOWN_PRESETS].options
                                  : field.options || []
                                ).map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={formInputs[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Enter address or full details...'}
                                rows={3}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                              />
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={formInputs[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Enter details...'}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Operator Output Deliverable Slots */}
                    {activeFormFields.some(f => f.docUploader === 'operator') && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-2xl text-xs space-y-2">
                        <div className="font-extrabold flex items-center gap-2 text-blue-900">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <span>Official Operator Deliverable Slots ({activeFormFields.filter(f => f.docUploader === 'operator').length})</span>
                        </div>
                        <div className="text-[11px] text-blue-800 space-y-1.5">
                          {activeFormFields.filter(f => f.docUploader === 'operator').map(f => (
                            <div key={f.id} className="flex items-center gap-2 font-semibold bg-white/70 px-2.5 py-1.5 rounded-lg border border-blue-100">
                              <span>📄 {f.label}</span>
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase ml-auto">
                                Handled by Operator
                              </span>
                            </div>
                          ))}
                          <p className="text-[10px] text-blue-600 italic pt-1">
                            (These official document files will be generated and uploaded by your assigned operator upon verification).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No additional form fields required for this service.</p>
                    <p className="text-[11px] text-slate-500">Click below to pay service fee & submit request instantly.</p>
                  </div>
                )}

              </div>

              {/* Modal Footer: Financial Breakdown & Pay Action */}
              <form onSubmit={handleApplyServiceSubmit} className="p-4 sm:p-5 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 text-xs w-full sm:w-auto justify-between sm:justify-start">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Applicable Fee:</span>
                    <span className="font-mono font-black text-base text-slate-900">₹{activeFee.toFixed(2)}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining Balance:</span>
                    <span className={`font-mono font-bold text-sm ${walletBalance >= activeFee ? 'text-emerald-700' : 'text-rose-600'}`}>
                      ₹{(walletBalance - activeFee).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={applyAction.state}
                    disabled={areasLoading || !availableAreas.hasOperators}
                    loadingText="Submitting..."
                    successText="Applied!"
                    errorText="Failed"
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>{`Pay ₹${activeFee.toFixed(2)} & Apply`}</span>
                  </ActionButton>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
