import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient, { FILE_BASE_URL } from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../store/apiError';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Store,
  User,
  Eye,
  X,
  Download,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface ApplicationDoc {
  label: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  fileSizeKb?: number;
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
  formData?: string | Record<string, any>;
  createdAt: string;
  completedAt?: string;
  operatorName?: string;
  agentName?: string;
  shopName?: string;
  documents?: ApplicationDoc[];
  completionOutputData?: string | CompletionOutput;
  subServiceFormSchema?: unknown;
  serviceFormSchema?: unknown;
}

interface CompletionOutput {
  note?: string;
  files?: ApplicationDoc[];
  outputValues?: Record<string, unknown>;
}

// MySQL 'YYYY-MM-DD HH:MM:SS' Safari me Invalid Date deta hai — ' ' ko 'T' se replace karke parse
const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

// form_schema JSON string / array / { formFields: [] } kuch bhi ho sakta hai — safe parse
const parseSchemaFields = (schema: unknown): { id?: string; label?: string }[] => {
  let parsed: unknown = schema;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter(f => f && typeof f === 'object');
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as { formFields?: unknown; fields?: unknown };
    const list = Array.isArray(obj.formFields) ? obj.formFields : Array.isArray(obj.fields) ? obj.fields : [];
    return list.filter(f => f && typeof f === 'object');
  }
  return [];
};

export default function AdminTaskVerification() {
  const [tasks, setTasks] = useState<ApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPLETED' | 'VERIFIED' | 'REJECTED'>('COMPLETED');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [viewModalTask, setViewModalTask] = useState<ApplicationItem | null>(null);
  const [rejectModalTask, setRejectModalTask] = useState<ApplicationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Skeleton sirf pehli baar load par
  const [hasLoaded, setHasLoaded] = useState(false);
  const verifyAction = useAsyncAction();
  const rejectAction = useAsyncAction();

  const fetchVerificationQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/applications/verification-queue', { params: { limit: 1000 } });
      if (res.data.status === 'success') {
        setTasks(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch verification queue:', e);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  // Reject modal band karte waqt purana reason clear karna zaroori hai
  const closeRejectModal = () => {
    setRejectModalTask(null);
    setRejectReason('');
  };

  useEffect(() => {
    fetchVerificationQueue();
  }, [fetchVerificationQueue]);

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

  const getOperatorNote = (data?: string | { note?: string; files?: ApplicationDoc[] }): string => {
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
      return JSON.parse(data) as CompletionOutput;
    } catch {
      return null;
    }
  };

  // Operator dwara bhare gaye output fields — key (field id / label) se schema label resolve
  const getOperatorOutputRows = (task: ApplicationItem): { label: string; value: string }[] => {
    const output = getParsedCompletionOutput(task.completionOutputData);
    const values = output?.outputValues;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return [];
    const fields = [...parseSchemaFields(task.subServiceFormSchema), ...parseSchemaFields(task.serviceFormSchema)];
    return Object.entries(values)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([key, v]) => {
        const field = fields.find(f => f.id === key || f.label === key);
        return { label: field?.label || key, value: typeof v === 'object' ? JSON.stringify(v) : String(v) };
      });
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

  // 3-stage button (useAsyncAction) double-click / duplicate request khud rokta hai
  const handleVerify = (task: ApplicationItem) =>
    verifyAction.run(async () => {
      setErrorMsg('');
      try {
        const res = await apiClient.patch(`/applications/${task.id}/verify`);
        if (res.data.status !== 'success') throw new Error(res.data.message || 'Failed to verify task.');
      } catch (err) {
        setErrorMsg(getApiErrorMessage(err, 'Failed to verify task.'));
        throw err;
      }
      setSuccessMsg(`Task "${task.applicationNo}" verified & confirmed! ₹${Number(task.operatorPayout || 0).toFixed(2)} credited to operator wallet.`);
      setViewModalTask(null);
      await fetchVerificationQueue();
      setTimeout(() => setSuccessMsg(''), 5000);
    });

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    const task = rejectModalTask;
    if (!task) return;

    rejectAction.run(async () => {
      setErrorMsg('');
      try {
        const res = await apiClient.patch(`/applications/${task.id}/reject`, {
          reason: rejectReason || 'Rejected by Admin during verification'
        });
        if (res.data.status !== 'success') throw new Error(res.data.message || 'Failed to reject task.');
      } catch (err) {
        setErrorMsg(getApiErrorMessage(err, 'Failed to reject task.'));
        throw err;
      }
      setSuccessMsg(`Task "${task.applicationNo}" REJECTED & fee refunded back to agent wallet.`);
      closeRejectModal();
      setViewModalTask(null);
      await fetchVerificationQueue();
      setTimeout(() => setSuccessMsg(''), 5000);
    });
  };

  const filtered = tasks.filter(t => {
    const s = (t.status || '').toLowerCase();

    const matchesFilter =
      activeFilter === 'ALL'
        ? true
        : activeFilter === 'COMPLETED'
          ? s === 'completed'
          : activeFilter === 'VERIFIED'
            ? s === 'verified'
            : s === 'rejected';

    const term = searchTerm.trim().toLowerCase();
    if (!term) return matchesFilter;

    return (
      matchesFilter &&
      (t.applicationNo?.toLowerCase().includes(term) ||
        t.operatorName?.toLowerCase().includes(term) ||
        t.shopName?.toLowerCase().includes(term) ||
        t.agentName?.toLowerCase().includes(term) ||
        t.serviceName?.toLowerCase().includes(term) ||
        (t.govtAckNo && t.govtAckNo.toLowerCase().includes(term)))
    );
  });

  const awaitingCount = tasks.filter(t => t.status?.toLowerCase() === 'completed').length;
  const verifiedCount = tasks.filter(t => t.status?.toLowerCase() === 'verified').length;
  const rejectedCount = tasks.filter(t => t.status?.toLowerCase() === 'rejected').length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <span>Operator Task Verification & Audit</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify operator service executions from MySQL database, review deliverables, and release earnings to operator wallet.
            </p>
          </div>

          <button
            onClick={fetchVerificationQueue}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert (backend message) */}
        {errorMsg && !viewModalTask && !rejectModalTask && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFilter('COMPLETED')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeFilter === 'COMPLETED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Awaiting Verification ({awaitingCount})
          </button>
          <button
            onClick={() => setActiveFilter('VERIFIED')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeFilter === 'VERIFIED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Verified & Approved ({verifiedCount})
          </button>
          <button
            onClick={() => setActiveFilter('REJECTED')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeFilter === 'REJECTED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            ALL ({tasks.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Application No, Operator Name, Shop Name, or Service Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Task Cards Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Operator Work Verification Desk ({filtered.length})</h2>
          </div>

          <div className="p-4 sm:p-5 space-y-3 bg-slate-50/50">
            {!hasLoaded && tasks.length === 0 ? (
              <SkeletonCards count={3} />
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  {activeFilter === 'COMPLETED'
                    ? 'All operator tasks have been verified! (No tasks currently awaiting verification).'
                    : 'No operator tasks found in this section.'}
                </p>
              </div>
            ) : (
              filtered.map((item) => {
                const s = (item.status || '').toLowerCase();
                const isVerified = s === 'verified';
                const isCompleted = s === 'completed';
                const isRejected = s === 'rejected';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all p-4 space-y-3"
                  >
                    {/* Top Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                          {item.applicationNo}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {item.serviceName}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-0.5 rounded-full border ${isVerified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isCompleted
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : isRejected
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                      >
                        {isVerified ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        ) : isCompleted ? (
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                        ) : isRejected ? (
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>
                          {isVerified
                            ? 'VERIFIED & APPROVED'
                            : isCompleted
                              ? 'AWAITING VERIFICATION'
                              : isRejected
                                ? 'REJECTED'
                                : s.toUpperCase()}
                        </span>
                      </span>
                    </div>

                    {/* Middle Info Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Operator</span>
                          <span className="font-semibold text-slate-800">{item.operatorName || 'Assigned Operator'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Requesting Kiosk</span>
                          <span className="font-semibold text-slate-800">{item.shopName || item.agentName || 'Agent'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Operator Share</span>
                        <span className="font-mono font-bold text-emerald-700">₹ {Number(item.operatorPayout || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Operator Remark on Card */}
                    {getOperatorNote(item.completionOutputData) && (
                      <div className="bg-teal-50/80 p-3 rounded-xl border border-teal-200/80 text-xs">
                        <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-teal-600" />
                          <span>Operator Remarks / Work Note:</span>
                        </span>
                        <p className="text-slate-800 font-medium italic pl-3 border-l-2 border-teal-500">
                          "{getOperatorNote(item.completionOutputData)}"
                        </p>
                      </div>
                    )}

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-slate-400 text-[11px]">
                        Applied: {formatDateTime(item.createdAt)}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewModalTask(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect & Verify</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal for Inspecting & Verifying Task Data */}
        {viewModalTask && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 relative overflow-hidden my-auto">

              <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 border border-blue-200/60 rounded-xl text-blue-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Audit Application #{viewModalTask.applicationNo}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Inspect operator output certificate & applicant submitted details</p>
                  </div>
                </div>

                <button onClick={() => { setViewModalTask(null); setErrorMsg(''); }} className="text-slate-400 hover:text-slate-700 p-2 rounded-xl">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">

                {/* Service Details Banner */}
                <div className="bg-slate-900 p-4 rounded-2xl text-white space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Service Executed</span>
                      <h4 className="text-base font-bold text-white">{viewModalTask.serviceName}</h4>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">ID: {viewModalTask.serviceCode}</div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-right">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase block">Operator Share</span>
                      <div className="text-base font-black text-emerald-400 font-mono">+ ₹ {Number(viewModalTask.operatorPayout || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-slate-300 text-xs">
                    <div>Operator: <strong className="text-white">{viewModalTask.operatorName || 'Operator'}</strong></div>
                    <div>Outlet: <strong className="text-white">{viewModalTask.shopName || viewModalTask.agentName}</strong></div>
                  </div>
                </div>

                {/* 1. Operator Completion Remarks & Deliverables Section */}
                {(() => {
                  const { operatorDocs } = getDocumentCategories(viewModalTask.documents, viewModalTask.completionOutputData);
                  const opNote = getOperatorNote(viewModalTask.completionOutputData);
                  if (!opNote && operatorDocs.length === 0) return null;

                  return (
                    <div className="space-y-3 bg-teal-50/80 p-4 rounded-2xl border border-teal-200/80">
                      <span className="text-xs font-bold text-teal-900 uppercase tracking-wider block flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-teal-600" />
                        <span>Operator Work Completion & Deliverables</span>
                      </span>

                      {opNote && (
                        <div>
                          <span className="text-[10px] font-bold text-teal-700 uppercase block mb-1">Work Note / Remarks</span>
                          <p className="text-slate-800 font-medium italic bg-white p-3 rounded-xl border border-teal-200/60">
                            "{opNote}"
                          </p>
                        </div>
                      )}

                      {operatorDocs.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-teal-800 uppercase block">
                            📄 Output Certificate / Response Files ({operatorDocs.length})
                          </span>
                          {operatorDocs.map((doc, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-teal-200/80 flex items-center justify-between gap-2">
                              <div className="overflow-hidden">
                                <span className="text-[10px] font-bold text-teal-700 uppercase block">{doc.label}</span>
                                <span className="font-mono text-xs font-bold text-slate-900 truncate block">{doc.fileName}</span>
                              </div>
                              <button
                                onClick={() => handleDownloadFile(doc.filePath, doc.fileName)}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download Output</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 1b. Operator dwara bhare gaye output fields */}
                {(() => {
                  const outputRows = getOperatorOutputRows(viewModalTask);
                  if (outputRows.length === 0) return null;
                  return (
                    <div className="space-y-2 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200/80">
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                        Operator Output Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {outputRows.map((row, idx) => (
                          <div key={`${row.label}-${idx}`} className="bg-white p-3 rounded-xl border border-indigo-200/60 space-y-0.5">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase block">{row.label}</span>
                            <span className="text-xs font-semibold text-slate-900 break-words">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Applicant Submission Details & Proof Documents */}
                {(() => {
                  const { clientDocs } = getDocumentCategories(viewModalTask.documents, viewModalTask.completionOutputData);
                  const validFormEntries = Object.entries(parsedFormData(viewModalTask.formData)).filter(([k, v]) => isApplicantFormField(k, v));

                  return (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      {/* Form Details */}
                      {validFormEntries.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Applicant Form Information
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {validFormEntries.map(([label, value]) => {
                              const cleanLabel = label.replace(/^\[.*?\]:\s*/, '');
                              return (
                                <div key={label} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{cleanLabel}</span>
                                  <span className="text-xs font-semibold text-slate-900 break-words">{String(value)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Client Proof Documents */}
                      {clientDocs.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            📁 Applicant Attached Proof Documents ({clientDocs.length})
                          </span>
                          <div className="space-y-2">
                            {clientDocs.map((doc, idx) => (
                              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                                <div className="overflow-hidden">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{doc.label}</span>
                                  <span className="font-mono text-xs font-bold text-slate-900 truncate block">{doc.fileName}</span>
                                </div>
                                <button
                                  onClick={() => handleDownloadFile(doc.filePath, doc.fileName)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

              {errorMsg && !rejectModalTask && (
                <div className="mx-6 mb-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => { setViewModalTask(null); setErrorMsg(''); }}
                  className="px-4.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {/* Reject sirf open / completed (payout se pehle) task par — verified/rejected par nahi */}
                  {!['verified', 'rejected'].includes(viewModalTask.status?.toLowerCase()) && (
                  <button
                    onClick={() => {
                      const t = viewModalTask;
                      setErrorMsg('');
                      setRejectReason('');
                      setRejectModalTask(t);
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Reject & Refund Agent</span>
                  </button>
                  )}

                  {/* Payout sirf operator dwara completed task par */}
                  {viewModalTask.status?.toLowerCase() === 'completed' && (
                    <ActionButton
                      state={verifyAction.state}
                      onClick={() => handleVerify(viewModalTask)}
                      disabled={rejectAction.isLoading}
                      loadingText="Releasing Payout..."
                      successText="Payout Released!"
                      errorText="Verification Failed"
                      className="disabled:opacity-60 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Approve & Release Payout</span>
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
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Reject Task & Refund Agent Wallet</span>
                </div>
                <button onClick={closeRejectModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 space-y-1 text-xs text-red-900">
                <div>App No: <strong className="font-mono text-slate-800">{rejectModalTask.applicationNo}</strong></div>
                <div>Refund Amount to Agent: <strong className="font-mono font-bold text-emerald-700">₹ {Number(rejectModalTask.feeDeducted || 0).toFixed(2)}</strong></div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">{errorMsg}</div>
              )}

              <form onSubmit={handleReject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specify audit rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeRejectModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    state={rejectAction.state}
                    disabled={verifyAction.isLoading}
                    loadingText="Rejecting..."
                    successText="Rejected & Refunded"
                    errorText="Rejection Failed"
                    className="disabled:opacity-60 disabled:cursor-not-allowed px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Confirm Rejection & Refund</span>
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
