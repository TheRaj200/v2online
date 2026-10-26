import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient, { FILE_BASE_URL } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonCards, SkeletonTableRows } from '../../components/ui/Skeleton';
import { useAsyncAction, useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Upload,
  X,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  IndianRupee,
  Plus,
  AlertCircle
} from 'lucide-react';

interface OperatorRejectFormData {
  reason: string;
}

interface OperatorPriceRequestFormData {
  assignmentId: string;
  requestedPrice: number;
  reason?: string;
}

interface ApplicationDoc {
  label: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  fileSizeKb?: number;
}

interface FormFieldItem {
  id: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  docUploader?: 'shop' | 'operator';
  targetRole?: 'shop' | 'operator';
  helpText?: string;
}

interface ApplicationItem {
  id: string | number;
  applicationNo: string;
  serviceName: string;
  subServiceName?: string;
  serviceCode: string;
  category?: string;
  feeDeducted: number;
  operatorPayout: number;
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'verified' | 'rejected';
  govtAckNo?: string;
  rejectionReason?: string;
  customerName?: string;
  customerMobile?: string;
  district?: string;
  tehsil?: string;
  wardNo?: string;
  formData?: string | Record<string, any>;
  subServiceFormSchema?: string | FormFieldItem[];
  serviceFormSchema?: string | FormFieldItem[];
  createdAt: string;
  completedAt?: string;
  agentName?: string;
  shopName?: string;
  documents?: ApplicationDoc[];
  completionOutputData?: string | CompletionOutput;
}

// Backend completion_output_data: note + files + operator ke bhare hue field values (key -> value)
interface CompletionOutput {
  note?: string;
  files?: any[];
  outputValues?: Record<string, any>;
}

// MySQL 'YYYY-MM-DD HH:MM:SS' Safari me Invalid Date deta hai, isliye 'T' lagate hain
const parseDate = (value?: string) => new Date(String(value || '').replace(' ', 'T'));

export default function OperatorServiceRequests() {
  const [tasks, setTasks] = useState<ApplicationItem[]>([]);
  // Pehli load par skeleton; baad ke refresh par sirf icon spin
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED' | 'VERIFIED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Combined Modal State (Selected task for View & Complete / View Details)
  const [selectedTask, setSelectedTask] = useState<ApplicationItem | null>(null);
  const [outputNote, setOutputNote] = useState('');
  const [deliverableFiles, setDeliverableFiles] = useState<Record<string, File>>({});
  const [operatorInputValues, setOperatorInputValues] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const completeAction = useAsyncAction();
  const downloadAction = useKeyedAsyncAction();

  // Reject Modal State
  const [rejectModalTask, setRejectModalTask] = useState<ApplicationItem | null>(null);
  const [rejectErrorMsg, setRejectErrorMsg] = useState('');
  const rejectAction = useAsyncAction();

  const {
    register: registerReject,
    handleSubmit: handleRejectSubmitForm,
    reset: resetRejectForm,
    formState: { errors: rejectErrors }
  } = useForm<OperatorRejectFormData>({
    defaultValues: { reason: '' }
  });

  // Price Request Modal State
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [myPriceRequests, setMyPriceRequests] = useState<any[]>([]);
  const [isPriceRequestsLoading, setIsPriceRequestsLoading] = useState(true);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [priceSubServiceId, setPriceSubServiceId] = useState('');
  const [priceAssignmentId, setPriceAssignmentId] = useState('');
  const [priceRoutingMode, setPriceRoutingMode] = useState('single');
  const [priceAreaOrWardLabel, setPriceAreaOrWardLabel] = useState('');
  const [priceModalError, setPriceModalError] = useState('');
  const [priceModalSuccess, setPriceModalSuccess] = useState('');
  const priceAction = useAsyncAction();
  // Selected assignment ref me bhi rakhte hain taaki fetch callback ko dependency na banana pade
  const priceAssignmentIdRef = useRef('');

  const {
    register: registerPrice,
    handleSubmit: handlePriceSubmitForm,
    setValue: setPriceFormValue,
    reset: resetPriceForm,
    formState: { errors: priceErrors }
  } = useForm<OperatorPriceRequestFormData>({
    defaultValues: {
      assignmentId: '',
      requestedPrice: undefined,
      reason: ''
    }
  });

  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiClient.get('/applications/operator-queue');
      if (res.data.status === 'success' && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch operator queue:', e);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  const fetchPriceRequests = useCallback(async () => {
    try {
      const res = await apiClient.get('/services/price-requests');
      if (res.data.status === 'success' && Array.isArray(res.data.data)) {
        setMyPriceRequests(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch price requests', e);
    } finally {
      setIsPriceRequestsLoading(false);
    }
  }, []);

  // Dropdown selection -> service / routing / area fields set karna
  const selectAssignment = useCallback((a: any) => {
    const id = String(a.id ?? '');
    priceAssignmentIdRef.current = id;
    setPriceAssignmentId(id);
    setPriceFormValue('assignmentId', id, { shouldValidate: true });
    setPriceSubServiceId(a.subServiceId);
    setPriceRoutingMode(a.assignmentMode || 'single');
    setPriceAreaOrWardLabel(a.areaLabel || (a.wardNo ? `Ward #${a.wardNo}` : 'Default Service'));
  }, [setPriceFormValue]);

  // forceSelectFirst = modal open par hamesha pehla assignment select karo; warna sirf jab kuch selected na ho
  const fetchMyAssignments = useCallback(async (forceSelectFirst = false) => {
    try {
      const res = await apiClient.get('/operator-assignments');
      if (res.data.status === 'success') {
        const list = res.data.data || [];
        setMyAssignments(list);
        if (list.length > 0 && (forceSelectFirst || !priceAssignmentIdRef.current)) {
          selectAssignment(list[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch my assignments', e);
    }
  }, [selectAssignment]);

  // Mount par sirf ek baar (dropdown change se queue refetch nahi hoti)
  useEffect(() => {
    fetchQueue();
    fetchPriceRequests();
    fetchMyAssignments();
  }, [fetchQueue, fetchPriceRequests, fetchMyAssignments]);

  // Manual refresh: spinner on, phir queue reload
  const refreshQueue = () => {
    setIsLoading(true);
    fetchQueue();
  };

  const handleOpenPriceModal = () => {
    setPriceModalError('');
    setPriceModalSuccess('');
    resetPriceForm();
    setShowPriceModal(true);
    fetchMyAssignments(true);
  };

  const onPriceRequestSubmit = (data: OperatorPriceRequestFormData) => {
    setPriceModalError('');
    setPriceModalSuccess('');

    const val = Number(data.requestedPrice);
    if (!priceSubServiceId || isNaN(val) || val <= 0) {
      setPriceModalError('Kripya valid service aur new rate enter karein.');
      return;
    }

    priceAction.run(async () => {
      try {
        const res = await apiClient.post('/services/price-requests', {
          subServiceId: priceSubServiceId,
          assignmentId: data.assignmentId || priceAssignmentId || undefined,
          routingMode: priceRoutingMode,
          areaOrWardLabel: priceAreaOrWardLabel || undefined,
          requestedPrice: val,
          reason: data.reason?.trim() || ''
        });

        if (res.data.status !== 'success') {
          setPriceModalError(res.data.message || 'Failed to submit price request.');
          return false;
        }
        setPriceModalSuccess(res.data.message || 'Price change request submitted!');
        resetPriceForm();
        await fetchPriceRequests();
        setTimeout(() => setPriceModalSuccess(''), 4000);
      } catch (err: any) {
        setPriceModalError(err.response?.data?.message || 'Failed to submit price request.');
        throw err;
      }
    });
  };

  const getFileUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http') || filePath.startsWith('blob:')) return filePath;
    return `${FILE_BASE_URL}${filePath}`;
  };

  const handleDownloadFile = (filePath: string, fileName: string) => {
    const url = getFileUrl(filePath);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const parsedFormData = (data?: string | Record<string, any>): Record<string, any> => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  };

  const getOperatorNote = (data?: string | CompletionOutput): string => {
    if (!data) return '';
    if (typeof data === 'object') return data.note || '';
    try {
      const parsed = JSON.parse(data);
      return parsed.note || '';
    } catch {
      return String(data);
    }
  };

  const getParsedCompletionOutput = (data?: string | object) => {
    if (!data) return null;
    if (typeof data === 'object') return data as CompletionOutput;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? (parsed as CompletionOutput) : null;
    } catch {
      return null;
    }
  };

  const getDocumentCategories = (documents?: ApplicationDoc[], completionOutputData?: string | object) => {
    if (!Array.isArray(documents) || documents.length === 0) {
      return { clientDocs: [], operatorDocs: [] };
    }

    const compOutput = getParsedCompletionOutput(completionOutputData);
    const outputFiles = Array.isArray(compOutput?.files) ? compOutput.files : [];

    const operatorDocs: ApplicationDoc[] = [];
    const clientDocs: ApplicationDoc[] = [];

    documents.forEach((doc) => {
      const labelLower = (doc.label || '').toLowerCase();
      const matchesOutputFile = outputFiles.some((of: any) => {
        const matchPath = of.filePath && doc.filePath && of.filePath === doc.filePath;
        const matchLabel = of.label && doc.label && of.label.toLowerCase() === doc.label.toLowerCase();
        return matchPath || matchLabel;
      });

      const isOperatorLabel =
        labelLower === 'response' ||
        labelLower.includes('deliverable') ||
        labelLower.includes('output certificate') ||
        labelLower.startsWith('deliverable_');

      if (matchesOutputFile || isOperatorLabel) {
        operatorDocs.push(doc);
      } else {
        clientDocs.push(doc);
      }
    });

    if (operatorDocs.length === 0 && outputFiles.length > 0) {
      outputFiles.forEach((f: any) => {
        operatorDocs.push({
          label: f.label || 'Operator Output File',
          fileName: f.fileName,
          filePath: f.filePath,
          mimeType: f.mimeType || 'application/pdf'
        });
      });
    }

    return { clientDocs, operatorDocs };
  };

  const isApplicantFormField = (label: string, value: any): boolean => {
    const strVal = String(value || '');
    const labelLower = label.toLowerCase();
    if (strVal.includes('Uploaded Document')) return false;
    if (strVal.includes('Pending Operator File Upload')) return false;
    if (labelLower.startsWith('[operator') || labelLower.includes('operator deliverable')) return false;
    return true;
  };

  // Parse Form Schema for selected application
  const parsedFormSchema = useMemo<FormFieldItem[]>(() => {
    if (!selectedTask) return [];
    const schemaRaw = selectedTask.subServiceFormSchema || selectedTask.serviceFormSchema;
    if (!schemaRaw) return [];
    if (Array.isArray(schemaRaw)) return schemaRaw;
    if (typeof schemaRaw === 'object') return [schemaRaw as any];
    try {
      const parsed = JSON.parse(schemaRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [selectedTask]);

  // Filter fields configured specifically for Operator Response by Admin
  const operatorFields = useMemo(() => {
    return parsedFormSchema.filter((f) =>
      f.docUploader === 'operator' || f.targetRole === 'operator' || (f as any).role === 'operator'
    );
  }, [parsedFormSchema]);

  // Operator ke submit kiye field values (outputValues) -> label + value rows
  // Label service form schema se resolve hota hai (key = field.id || field.label), na mile to key hi dikhate hain
  const getOperatorOutputRows = (data?: string | object): { key: string; label: string; value: string }[] => {
    const values = getParsedCompletionOutput(data)?.outputValues;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return [];
    return Object.entries(values)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([key, v]) => {
        const field = parsedFormSchema.find(f => (f.id || f.label) === key || f.id === key || f.label === key);
        return {
          key,
          label: field?.label || key,
          value: typeof v === 'object' ? JSON.stringify(v) : String(v)
        };
      });
  };

  const handleOpenCombinedModal = (t: ApplicationItem) => {
    setSelectedTask(t);
    setOutputNote('');
    setDeliverableFiles({});
    setOperatorInputValues({});
    setErrorMsg('');
  };

  const handleCompleteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTask) return;
    setErrorMsg('');
    const task = selectedTask;

    // Strict validation for required operator fields configured by Admin
    for (const field of operatorFields) {
      if (field.required) {
        const fieldKey = field.label || field.id;
        if (field.type === 'file') {
          if (!deliverableFiles[fieldKey]) {
            setErrorMsg(`Required File Missing: Please upload "${field.label || 'Required Output Certificate'}".`);
            return;
          }
        } else {
          const val = operatorInputValues[field.id || field.label];
          if (!val || !val.trim()) {
            setErrorMsg(`Required Field Missing: Please fill "${field.label || 'Required Field'}".`);
            return;
          }
        }
      }
    }

    const formDataPayload = new FormData();
    formDataPayload.append('outputNote', outputNote.trim());

    if (Object.keys(operatorInputValues).length > 0) {
      formDataPayload.append('operatorInputValues', JSON.stringify(operatorInputValues));
    }

    Object.entries(deliverableFiles).forEach(([key, file]) => {
      formDataPayload.append(`deliverable_${key}`, file);
    });

    completeAction.run(async () => {
      try {
        const res = await apiClient.post(`/applications/${task.id}/complete`, formDataPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.status !== 'success') {
          setErrorMsg(res.data.message || 'Failed to complete task.');
          return false;
        }
        setSuccessMsg(`Task "${task.applicationNo}" marked as COMPLETED! Submitted to Admin/Manager for Verification.`);
        setSelectedTask(null);
        await fetchQueue();
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Server error while completing task.');
        throw err;
      }
    });
  };

  const openRejectModal = (t: ApplicationItem) => {
    setRejectErrorMsg('');
    resetRejectForm();
    setRejectModalTask(t);
  };

  const onRejectSubmit = (data: OperatorRejectFormData) => {
    if (!rejectModalTask) return;
    const task = rejectModalTask;
    setRejectErrorMsg('');

    rejectAction.run(async () => {
      try {
        const res = await apiClient.patch(`/applications/${task.id}/reject`, {
          reason: data.reason.trim()
        });

        if (res.data.status !== 'success') {
          setRejectErrorMsg(res.data.message || 'Failed to reject task.');
          return false;
        }
        setSuccessMsg(`Task "${task.applicationNo}" REJECTED & fee refunded back to shop wallet.`);
        setRejectModalTask(null);
        resetRejectForm();
        await fetchQueue();
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err: any) {
        setRejectErrorMsg(err.response?.data?.message || 'Failed to reject task.');
        throw err;
      }
    });
  };

  const filtered = tasks.filter(t => {
    const s = (t.status || '').toLowerCase();
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PENDING'
          ? s === 'pending' || s === 'assigned' || s === 'processing'
          : activeTab === 'COMPLETED'
            ? s === 'completed'
            : activeTab === 'VERIFIED'
              ? s === 'verified'
              : s === 'rejected';

    const matchesSearch =
      t.applicationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.govtAckNo && t.govtAckNo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-teal-600" />
              <span>Operator Service Requests & Work Queue</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live incoming citizen applications from MySQL database. Inspect applicant documents, upload dynamic deliverable certificates configured by Admin, and submit to Admin for verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenPriceModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <IndianRupee className="h-4 w-4" />
              <span>Request Price Change</span>
            </button>

            <button
              onClick={refreshQueue}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Action Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
          {(['PENDING', 'COMPLETED', 'VERIFIED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeTab === tab
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {tab} (
              {tab === 'ALL'
                ? tasks.length
                : tab === 'PENDING'
                  ? tasks.filter(t => ['pending', 'assigned', 'processing'].includes(t.status?.toLowerCase())).length
                  : tab === 'COMPLETED'
                    ? tasks.filter(t => t.status?.toLowerCase() === 'completed').length
                    : tab === 'VERIFIED'
                      ? tasks.filter(t => t.status?.toLowerCase() === 'verified').length
                      : tasks.filter(t => t.status?.toLowerCase() === 'rejected').length}
              )
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Application No, Customer Name, Mobile, Service Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Work Cards */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Assigned Applications ({filtered.length})</h2>
          </div>

          <div className="p-4 sm:p-6 space-y-4 bg-slate-50/60">
            {isLoading && !hasLoadedOnce ? (
              <SkeletonCards count={4} />
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs sm:text-sm bg-white rounded-2xl border border-dashed border-slate-200">
                No service applications found in this filter.
              </div>
            ) : (
              filtered.map((item) => {
                const s = (item.status || '').toLowerCase();
                const isPending = s === 'pending' || s === 'assigned' || s === 'processing';
                const isRej = s === 'rejected';

                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 space-y-3.5 relative overflow-hidden">

                    {/* Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                          {item.applicationNo}
                        </span>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full border shadow-2xs ${s === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : s === 'completed'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : isRej
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                        {s === 'verified' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : isRej ? <XCircle className="h-3.5 w-3.5 text-red-600" /> : <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{s.toUpperCase()}</span>
                      </span>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Service Requested</span>
                        <div className="font-bold text-slate-900 text-sm">{item.serviceName}</div>
                        <div className="text-teal-700 text-xs font-mono font-semibold mt-0.5">{item.serviceCode}</div>
                      </div>



                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Your Payout Earning</span>
                        <div className="text-emerald-700 font-mono font-black text-sm">
                          + ₹ {Number(item.operatorPayout || 0).toFixed(2)}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">Credited on Admin verification</div>
                      </div>
                    </div>

                    {/* Attached Documents Count Indicator */}
                    {(() => {
                      const { clientDocs } = getDocumentCategories(item.documents, item.completionOutputData);
                      if (clientDocs.length === 0) return null;
                      return (
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <span className="font-semibold">{clientDocs.length} Client Proof Documents Attached</span>
                        </div>
                      );
                    })()}

                    {/* Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-slate-400 text-[11px] font-mono">
                        Applied On: {parseDate(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleOpenCombinedModal(item)}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4.5 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View & Complete</span>
                            </button>

                            <button
                              onClick={() => openRejectModal(item)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenCombinedModal(item)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="h-4 w-4 text-slate-600" />
                            <span>View Details</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Combined View & Complete Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 relative overflow-hidden my-auto animate-in fade-in zoom-in-95">

              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 border border-teal-500/40 rounded-xl text-teal-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <span>Application #{selectedTask.applicationNo}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${selectedTask.status === 'verified' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                          selectedTask.status === 'completed' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' :
                            selectedTask.status === 'rejected' ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                              'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}>
                        {selectedTask.status}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Service: <strong className="text-white">{selectedTask.serviceName}</strong>
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

                {/* Payout Earning Banner */}
                <div className="bg-teal-50 border border-teal-200/80 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Operator Share Earning</span>
                    <span className="text-xs text-teal-700">Credited automatically upon Admin verification</span>
                  </div>
                  <div className="font-mono text-lg font-black text-teal-800">
                    + ₹ {Number(selectedTask.operatorPayout || 0).toFixed(2)}
                  </div>
                </div>

                {/* Error Msg */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Applicant Submission Details */}
                {(() => {
                  const { clientDocs } = getDocumentCategories(selectedTask.documents, selectedTask.completionOutputData);
                  const validFormEntries = Object.entries(parsedFormData(selectedTask.formData)).filter(([k, v]) => isApplicantFormField(k, v));

                  return (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Applicant Submission Details</h4>

                      {validFormEntries.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {validFormEntries.map(([label, value]) => {
                            const cleanLabel = label.replace(/^\[.*?\]:\s*/, '');
                            return (
                              <div key={label} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">{cleanLabel}</span>
                                <span className="text-xs font-bold text-slate-900 break-words">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Uploaded Client Document Proofs */}
                      {clientDocs.length > 0 && (
                        <div className="space-y-2.5 pt-2 border-t border-slate-200">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-emerald-600" />
                            <span>Attached Client Proof Documents ({clientDocs.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {clientDocs.map((doc, idx) => (
                              <div key={idx} className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
                                <div className="overflow-hidden">
                                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">{doc.label}</span>
                                  <span className="font-mono text-xs font-bold text-slate-900 truncate block">{doc.fileName}</span>
                                </div>
                                <ActionButton
                                  state={downloadAction.stateOf(`client-${idx}`)}
                                  onClick={() => downloadAction.run(`client-${idx}`, () => handleDownloadFile(doc.filePath, doc.fileName))}
                                  loadingText="Opening..."
                                  successText="Opened"
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download Document</span>
                                </ActionButton>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Execution Completion Section (Dynamic Operator Fields configured by Admin) */}
                {['pending', 'assigned', 'processing'].includes(selectedTask.status?.toLowerCase()) && (
                  <div className="space-y-4 pt-3 border-t border-slate-200 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                    {operatorFields.length > 0 && (
                      <>
                        <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Upload className="h-4 w-4 text-teal-600" />
                          <span>Operator Response & Deliverables ({operatorFields.length})</span>
                        </h4>

                        {operatorFields.map((field) => {
                          const fieldKey = field.id || field.label;
                          const isReq = !!field.required;

                          if (field.type === 'file') {
                            return (
                              <div key={fieldKey} className="bg-white p-3.5 rounded-xl border border-teal-200/80 space-y-1.5">
                                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                                  <span>{field.label || 'Output Document'} {isReq && <span className="text-red-500">*</span>}</span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${isReq ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                    {isReq ? 'Required Upload' : 'Optional Upload'}
                                  </span>
                                </label>
                                {field.helpText && <p className="text-[11px] text-slate-500">{field.helpText}</p>}

                                <div className="border border-dashed border-teal-300 bg-teal-50/40 p-2.5 rounded-xl flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                                    <span className="text-xs font-medium text-slate-800 truncate max-w-[240px]">
                                      {deliverableFiles[field.label || fieldKey]?.name || 'Choose output file...'}
                                    </span>
                                  </div>
                                  <label className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0">
                                    Browse File
                                    <input
                                      type="file"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const fileKey = field.label || fieldKey;
                                          setDeliverableFiles(prev => ({
                                            ...prev,
                                            [fileKey]: file
                                          }));
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          }

                          if (field.type === 'textarea') {
                            return (
                              <div key={fieldKey} className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700">
                                  {field.label} {isReq && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder={field.placeholder || `Enter ${field.label}...`}
                                  value={operatorInputValues[fieldKey] || ''}
                                  onChange={(e) => setOperatorInputValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                                />
                              </div>
                            );
                          }

                          if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
                            return (
                              <div key={fieldKey} className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700">
                                  {field.label} {isReq && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                  value={operatorInputValues[fieldKey] || ''}
                                  onChange={(e) => setOperatorInputValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                                >
                                  <option value="">Select option...</option>
                                  {field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          return (
                            <div key={fieldKey} className="space-y-1">
                              <label className="block text-xs font-bold text-slate-700">
                                {field.label} {isReq && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                placeholder={field.placeholder || `Enter ${field.label}...`}
                                value={operatorInputValues[fieldKey] || ''}
                                onChange={(e) => setOperatorInputValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                              />
                            </div>
                          );
                        })}
                      </>)}

                    {/* Additional Operator Remarks */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Additional Operator Remarks / Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Enter any optional notes for shop/admin..."
                        value={outputNote}
                        onChange={(e) => setOutputNote(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                )}

                {/* Submitted Operator Deliverables (for completed/verified tasks) */}
                {['completed', 'verified'].includes(selectedTask.status?.toLowerCase()) && (
                  (() => {
                    const { operatorDocs } = getDocumentCategories(selectedTask.documents, selectedTask.completionOutputData);
                    const opNote = getOperatorNote(selectedTask.completionOutputData);
                    const outputRows = getOperatorOutputRows(selectedTask.completionOutputData);
                    if (!opNote && operatorDocs.length === 0 && outputRows.length === 0) return null;

                    return (
                      <div className="space-y-3 pt-3 border-t border-slate-200 bg-teal-50/70 p-4 rounded-2xl border border-teal-200">
                        <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-teal-600" />
                          <span>Submitted Operator Deliverables ({operatorDocs.length})</span>
                        </h4>

                        {outputRows.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-teal-700 uppercase block">Operator Output Details</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {outputRows.map(row => (
                                <div key={row.key} className="bg-white p-3 rounded-xl border border-teal-200">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{row.label}</span>
                                  <span className="text-xs font-bold text-slate-900 break-words">{row.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {opNote && (
                          <div>
                            <span className="text-[10px] font-bold text-teal-700 uppercase block mb-1">Completion Note / Remarks</span>
                            <p className="text-slate-800 font-medium italic bg-white p-3 rounded-xl border border-teal-200">
                              "{opNote}"
                            </p>
                          </div>
                        )}

                        {operatorDocs.length > 0 && (
                          <div className="space-y-2">
                            {operatorDocs.map((doc, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-teal-200 flex items-center justify-between gap-2">
                                <div className="overflow-hidden">
                                  <span className="text-[10px] font-bold text-teal-700 uppercase block">{doc.label}</span>
                                  <span className="font-mono text-xs font-bold text-slate-900 truncate block">{doc.fileName}</span>
                                </div>
                                <ActionButton
                                  state={downloadAction.stateOf(`operator-${idx}`)}
                                  onClick={() => downloadAction.run(`operator-${idx}`, () => handleDownloadFile(doc.filePath, doc.fileName))}
                                  loadingText="Opening..."
                                  successText="Opened"
                                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download Deliverable</span>
                                </ActionButton>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div>
                  {['pending', 'assigned', 'processing'].includes(selectedTask.status?.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const taskToReject = selectedTask;
                        setSelectedTask(null);
                        openRejectModal(taskToReject);
                      }}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Reject Request</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Close
                  </button>

                  {['pending', 'assigned', 'processing'].includes(selectedTask.status?.toLowerCase()) && (
                    <ActionButton
                      state={completeAction.state}
                      onClick={() => handleCompleteSubmit()}
                      loadingText="Submitting..."
                      successText="Submitted!"
                      errorText="Failed"
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Complete & Submit to Admin</span>
                    </ActionButton>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModalTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Reject Task & Refund Shop</span>
                </div>
                <button onClick={() => setRejectModalTask(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 space-y-1.5 text-xs text-red-900">
                <div className="font-bold text-sm">{rejectModalTask.serviceName}</div>
                <div>Application No: <strong className="font-mono text-slate-800">{rejectModalTask.applicationNo}</strong></div>
              </div>

              {rejectErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{rejectErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleRejectSubmitForm(onRejectSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specify why this request cannot be fulfilled (e.g. invalid document)..."
                    {...registerReject('reason', {
                      required: 'Rejection reason enter karein.',
                      minLength: { value: 5, message: 'Reason kam se kam 5 characters ka hona chahiye.' }
                    })}
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      rejectErrors.reason ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-red-500'
                    }`}
                  />
                  {rejectErrors.reason && (
                    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{rejectErrors.reason.message}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetRejectForm();
                      setRejectModalTask(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={rejectAction.state}
                    loadingText="Rejecting..."
                    successText="Rejected!"
                    errorText="Failed"
                    className="px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Confirm Rejection & Refund</span>
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Price Update Request Modal */}
        {showPriceModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <IndianRupee className="h-5 w-5 text-teal-600" />
                  <span>Request Operator Rate Modification</span>
                </div>
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1">
                {priceModalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{priceModalError}</span>
                  </div>
                )}

                {priceModalSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{priceModalSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePriceSubmitForm(onPriceRequestSubmit)} className="space-y-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-200 shadow-2xs" noValidate>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-teal-600" />
                    <span>Submit New Rate Change Request</span>
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Assigned Service / Area Scope *</label>
                    <div className="relative">
                      <select
                        {...registerPrice('assignmentId', {
                          required: 'Assigned service / scope select karein.'
                        })}
                        value={priceAssignmentId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const match = myAssignments.find(a => String(a.id) === selectedId);
                          if (match) {
                            selectAssignment(match);
                          } else {
                            priceAssignmentIdRef.current = selectedId;
                            setPriceAssignmentId(selectedId);
                            setPriceFormValue('assignmentId', selectedId, { shouldValidate: true });
                          }
                        }}
                        className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 shadow-2xs cursor-pointer ${
                          priceErrors.assignmentId ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-teal-500/80 focus:ring-teal-600'
                        }`}
                      >
                        {myAssignments.length === 0 ? (
                          <option value="">No custom assignments found</option>
                        ) : (
                          myAssignments.map((as: any) => {
                            const total = Number(as.totalFee ?? as.currentFee ?? 0);
                            const comm = Number(as.adminCommissionPercent ?? 0);
                            const share = Number(as.operatorShare ?? (total - (total * comm) / 100));
                            const modeLabel = (as.areaLabel && as.areaLabel.trim())
                              ? `Area: ${as.areaLabel}`
                              : (as.wardNo && String(as.wardNo).trim())
                                ? `Ward #${as.wardNo}`
                                : as.assignmentMode === 'area_wise' && as.areaLabel
                                  ? `Area: ${as.areaLabel}`
                                  : as.assignmentMode === 'ward_wise' && as.wardNo
                                    ? `Ward #${as.wardNo}`
                                    : 'Single Operator Service';
                            
                            return (
                              <option key={as.id} value={as.id} className="py-1 font-semibold text-slate-900">
                                {as.serviceName || as.subServiceName} ({modeLabel}) — Current Rate: ₹{share.toFixed(2)}
                              </option>
                            );
                          })
                        )}
                      </select>
                      {priceErrors.assignmentId && (
                        <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{priceErrors.assignmentId.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Requested Price (₹) *</label>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="e.g. 150.00"
                      {...registerPrice('requestedPrice', {
                        required: 'New requested rate enter karein.',
                        min: { value: 1, message: 'Minimum requested price ₹1 hona chahiye.' },
                        valueAsNumber: true
                      })}
                      className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 ${
                        priceErrors.requestedPrice ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-300 focus:ring-teal-600'
                      }`}
                    />
                    {priceErrors.requestedPrice && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{priceErrors.requestedPrice.message}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Rationale (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Explain why rate modification is required..."
                      {...registerPrice('reason')}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <ActionButton
                      type="submit"
                      state={priceAction.state}
                      disabled={myAssignments.length === 0}
                      loadingText="Submitting..."
                      successText="Submitted!"
                      errorText="Failed"
                      className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Submit Request to Admin</span>
                    </ActionButton>
                  </div>
                </form>

                {/* Status Table of Submitted Requests */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">My Price Change Requests History ({myPriceRequests.length})</h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">Request No</th>
                          <th className="p-2.5">Service / Scope</th>
                          <th className="p-2.5">Requested Rate</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Admin Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {isPriceRequestsLoading && myPriceRequests.length === 0 ? (
                          <SkeletonTableRows rows={3} cols={5} />
                        ) : myPriceRequests.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 italic">No price change requests submitted yet.</td>
                          </tr>
                        ) : (
                          myPriceRequests.map((pr: any) => {
                            const reqPrice = Number(pr.requestedPrice || 0);
                            const comm = Number(pr.adminCommissionPercent || 0);
                            const netOperatorRate = Number(pr.requestedOperatorShare ?? (reqPrice - (reqPrice * comm) / 100));

                            return (
                              <tr key={pr.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono font-bold text-blue-700">{pr.requestNo}</td>
                                <td className="p-2.5 font-semibold text-slate-800">
                                  {pr.subServiceName}
                                  <span className="text-[10px] text-slate-400 block font-normal">{pr.areaOrWardLabel}</span>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-teal-700">₹{netOperatorRate.toFixed(2)}</td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    pr.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    pr.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                    'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {String(pr.status || '').toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-500 italic text-[11px]">{pr.adminRemarks || 'N/A'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
