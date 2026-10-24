import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiClient, { FILE_BASE_URL } from '../../api/client';
import { useAsyncAction, useKeyedAsyncAction } from '../../hooks/useAsyncAction';
import { ActionButton } from '../../components/ui/ActionButton';
import { SkeletonTableRows } from '../../components/ui/Skeleton';
import {
  FileCheck,
  Search,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  X,
  FileText,
  Printer,
  ShieldCheck,
  ArrowLeft,
  XCircle,
  RotateCcw,
  RefreshCw,
  User
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
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'verified' | 'rejected';
  govtAckNo?: string;
  rejectionReason?: string;
  customerName?: string;
  customerMobile?: string;
  district?: string;
  tehsil?: string;
  wardNo?: string;
  formData?: string | Record<string, any>;
  createdAt: string;
  completedAt?: string;
  shopName?: string;
  documents?: ApplicationDoc[];
  completionOutputData?: string | { note?: string; files?: ApplicationDoc[]; outputValues?: Record<string, unknown> };
  subServiceFormSchema?: unknown;
  serviceFormSchema?: unknown;
}

interface SchemaField {
  id?: string;
  label?: string;
}

// Form schema JSON string ya array dono ho sakta hai — safe parse
const parseSchemaFields = (raw: unknown): SchemaField[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as SchemaField[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// MySQL 'YYYY-MM-DD HH:MM:SS' Safari me Invalid Date deta hai — ' ' ko 'T' se replace
const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
};

export default function AgentServiceRequests() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const refreshAction = useAsyncAction();
  const downloadAction = useKeyedAsyncAction();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);

  // true = success, false = fail (refresh button ke 3-stage ke liye)
  const fetchApplications = useCallback(async (): Promise<boolean> => {
    setLoadError('');
    try {
      const res = await apiClient.get('/applications/my-requests');
      if (res.data.status === 'success') {
        setApplications(Array.isArray(res.data.data) ? res.data.data : []);
        return true;
      }
      setLoadError(res.data.message || 'Applications load nahi ho paayi.');
      return false;
    } catch (e: any) {
      console.error('Failed to fetch applications:', e);
      setLoadError(e.response?.data?.message || e.message || 'Applications load nahi ho paayi.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getFileUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http') || filePath.startsWith('blob:')) return filePath;
    return `${FILE_BASE_URL}${filePath}`;
  };

  // Cross-origin URL par `download` attribute ignore hota hai — isliye blob fetch karke download
  const handleDownloadFile = async (filePath: string, fileName: string) => {
    const url = getFileUrl(filePath);
    if (!url) throw new Error('File path missing');
    const a = document.createElement('a');
    a.download = fileName || 'document.pdf';
    let objectUrl = '';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`File download failed (${res.status})`);
      objectUrl = URL.createObjectURL(await res.blob());
      a.href = objectUrl;
    } catch (e) {
      // Blob fetch fail (CORS / network) — fallback: naye tab me kholna
      console.warn('Blob download failed, opening in new tab:', e);
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
    if (typeof data === 'object') return data as { note?: string; files?: any[]; outputValues?: Record<string, unknown> };
    try {
      return JSON.parse(data) as { note?: string; files?: any[]; outputValues?: Record<string, unknown> };
    } catch {
      return null;
    }
  };

  // Operator dwara bhare gaye output fields — key (field id / label) se schema label resolve
  const getOperatorOutputRows = (app: ApplicationItem): { label: string; value: string }[] => {
    const values = getParsedCompletionOutput(app.completionOutputData)?.outputValues;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return [];
    const fields = [...parseSchemaFields(app.subServiceFormSchema), ...parseSchemaFields(app.serviceFormSchema)];
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

  const filteredApps = applications.filter(app => {
    const s = (app.status || '').toLowerCase();
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PENDING'
          ? ['pending', 'assigned', 'processing'].includes(s)
          : activeTab === 'COMPLETED'
            ? ['completed', 'verified'].includes(s)
            : s === 'rejected';

    const matchesSearch =
      app.applicationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.govtAckNo && app.govtAckNo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const getTabCount = (tab: 'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED') => {
    if (tab === 'ALL') return applications.length;
    if (tab === 'PENDING') return applications.filter(a => ['pending', 'assigned', 'processing'].includes(a.status?.toLowerCase())).length;
    if (tab === 'COMPLETED') return applications.filter(a => ['completed', 'verified'].includes(a.status?.toLowerCase())).length;
    return applications.filter(a => a.status?.toLowerCase() === 'rejected').length;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/agent/services" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Services</span>
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-blue-600" />
              <span>Applied Service Requests & Track Status</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live status from MySQL database, official operator outputs & verified certificates.
            </p>
          </div>

          <ActionButton
            state={refreshAction.state}
            onClick={() => refreshAction.run(fetchApplications)}
            disabled={isLoading}
            loadingText="Refreshing..."
            successText="Updated"
            errorText="Failed"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
            <span>Refresh</span>
          </ActionButton>
        </div>

        {loadError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
          {(['ALL', 'PENDING', 'COMPLETED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {tab === 'ALL' ? 'All Requests' : tab === 'PENDING' ? 'In Progress' : tab === 'COMPLETED' ? 'Completed & Verified' : tab} ({getTabCount(tab)})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Application No (e.g. APP-2026-1001), Service Name, or Ref No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Applied Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Service Applications ({filteredApps.length})
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Shop: {user?.shop_name || 'My Kiosk Center'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Application No & Service</th>
                  <th className="py-3.5 px-4">Fee Deducted</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4 text-center">Operator Status</th>
                  <th className="py-3.5 px-4 text-center">Admin Approval Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {isLoading && applications.length === 0 ? (
                  <SkeletonTableRows rows={5} cols={6} />
                ) : filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No service requests found in this filter.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const isRej = app.status === 'rejected';
                    const isVerified = app.status === 'verified';
                    const isCompleted = app.status === 'completed';

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-blue-700 block">{app.applicationNo}</span>
                          <span className="font-bold text-slate-900 block">
                            {app.subServiceName && app.subServiceName !== app.serviceName ? `${app.serviceName} (${app.subServiceName})` : app.serviceName}
                          </span>
                          <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.2 rounded mt-0.5">
                            {app.serviceCode}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          ₹ {Number(app.feeDeducted || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                          {parseDate(app.createdAt)?.toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          }) || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isCompleted || isVerified ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>COMPLETED</span>
                            </span>
                          ) : app.status === 'processing' ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-300">
                              <Clock className="h-3.5 w-3.5 text-blue-600" />
                              <span>IN PROGRESS</span>
                            </span>
                          ) : app.status === 'assigned' ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-300">
                              <User className="h-3.5 w-3.5 text-indigo-600" />
                              <span>ASSIGNED</span>
                            </span>
                          ) : isRej ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-red-800 bg-red-50 px-3 py-1 rounded-full border border-red-300">
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                              <span>REJECTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              <span>PENDING ASSIGNMENT</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>APPROVED & VERIFIED</span>
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              <span>AWAITING ADMIN APPROVAL</span>
                            </span>
                          ) : isRej ? (
                            <div className="bg-red-50 p-2 rounded-xl border border-red-200 text-left max-w-xs mx-auto">
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-red-700 uppercase block mb-0.5">
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                                REJECTED BY ADMIN
                              </span>
                              {app.rejectionReason && (
                                <span className="text-xs text-red-900 font-medium break-words block">
                                  {app.rejectionReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              <span>In Progress</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isRej ? (
                            <Link
                              to="/agent/services"
                              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Re-Apply</span>
                            </Link>
                          ) : (
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>View Details</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Response Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-hidden">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 relative overflow-hidden my-auto animate-in fade-in zoom-in-95">

              {/* Modal Header */}
              <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 border border-blue-200/60 rounded-xl text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Application Details & Documents
                    </h3>
                    <p className="text-xs text-slate-500 font-mono font-medium">#{selectedApp.applicationNo}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">

                {/* Primary Overview Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Application Number:</span>
                    <span className="font-mono font-bold text-blue-700 text-sm">{selectedApp.applicationNo}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Service:</span>
                    <span className="font-bold text-slate-900 text-right">{selectedApp.serviceName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className={`font-bold text-xs uppercase px-2.5 py-0.5 rounded-full border ${selectedApp.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                        selectedApp.status === 'completed' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                          selectedApp.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-300' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                      {selectedApp.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Fee Deducted:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">₹ {Number(selectedApp.feeDeducted || 0).toFixed(2)}</span>
                  </div>

                  {selectedApp.govtAckNo && (
                    <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-800 font-bold">Govt Ack / Ref No:</span>
                      <span className="font-mono font-bold text-emerald-900 text-xs sm:text-sm">{selectedApp.govtAckNo}</span>
                    </div>
                  )}

                </div>

                {/* Operator Work Remarks & Output Deliverables */}
              

                {/* Client / Customer Form Information Section */}
                {(() => {
                  const { clientDocs } = getDocumentCategories(selectedApp.documents, selectedApp.completionOutputData);
                  const validFormEntries = Object.entries(parsedFormData(selectedApp.formData)).filter(([k, v]) => isApplicantFormField(k, v));

                  return (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-4 w-4 text-blue-600" />
                        <span>Client / Customer Form Information</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      
                        {selectedApp.district && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 col-span-1 sm:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">District / Area</span>
                            <span className="font-semibold text-slate-900">
                              {selectedApp.district} {selectedApp.tehsil ? `• ${selectedApp.tehsil}` : ''} {selectedApp.wardNo ? `• Ward ${selectedApp.wardNo}` : ''}
                            </span>
                          </div>
                        )}

                        {validFormEntries.map(([label, value]) => {
                          const cleanLabel = label.replace(/^\[.*?\]:\s*/, '');
                          return (
                            <div key={label} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">{cleanLabel}</span>
                              <span className="font-semibold text-slate-900 break-words">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Uploaded Client Proof Documents */}
                      {clientDocs.length > 0 && (
                        <div className="space-y-2.5 pt-3 border-t border-slate-200">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            📁 Attached Client Proof Documents ({clientDocs.length})
                          </h4>
                          <div className="space-y-2">
                            {clientDocs.map((doc, idx) => (
                              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                                <div className="overflow-hidden">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{doc.label}</span>
                                  <span className="font-mono text-xs font-bold text-slate-800 truncate block">{doc.fileName}</span>
                                </div>
                                <ActionButton
                                  state={downloadAction.stateOf(`client-${idx}-${doc.filePath}`)}
                                  onClick={() => downloadAction.run(`client-${idx}-${doc.filePath}`, () => handleDownloadFile(doc.filePath, doc.fileName))}
                                  loadingText="Downloading..."
                                  successText="Downloaded"
                                  errorText="Failed"
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </ActionButton>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                  {(() => {
                  const { operatorDocs } = getDocumentCategories(selectedApp.documents, selectedApp.completionOutputData);
                  const opNote = getOperatorNote(selectedApp.completionOutputData);
                  const outputRows = getOperatorOutputRows(selectedApp);
                  if (!opNote && operatorDocs.length === 0 && outputRows.length === 0) return null;

                  return (
                    <div className="bg-teal-50/80 p-4 rounded-2xl border border-teal-200/80 space-y-3">
                      <span className="text-xs font-bold text-teal-900 uppercase tracking-wider block flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-teal-600" />
                        <span>Operator Work Completion & Deliverables</span>
                      </span>

                      {opNote && (
                        <div>
                          <span className="text-[10px] font-bold text-teal-700 uppercase block mb-1">Operator Remarks / Note</span>
                          <p className="text-slate-800 font-medium italic bg-white p-3 rounded-xl border border-teal-200/60">
                            "{opNote}"
                          </p>
                        </div>
                      )}

                      {outputRows.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-teal-800 uppercase block">
                            🧾 Operator Output Details ({outputRows.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {outputRows.map((row, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-teal-200/80">
                                <span className="text-[10px] font-bold text-teal-700 uppercase block">{row.label}</span>
                                <span className="font-semibold text-slate-900 break-words">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {operatorDocs.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-teal-800 uppercase block">
                            📄 Output Certificate / Deliverable Files ({operatorDocs.length})
                          </span>
                          {operatorDocs.map((doc, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-teal-200/80 flex items-center justify-between gap-2">
                              <div className="overflow-hidden">
                                <span className="text-[10px] font-bold text-teal-700 uppercase block">{doc.label}</span>
                                <span className="font-mono text-xs font-bold text-slate-900 truncate block">{doc.fileName}</span>
                              </div>
                              <ActionButton
                                state={downloadAction.stateOf(`op-${idx}-${doc.filePath}`)}
                                onClick={() => downloadAction.run(`op-${idx}-${doc.filePath}`, () => handleDownloadFile(doc.filePath, doc.fileName))}
                                loadingText="Downloading..."
                                successText="Downloaded"
                                errorText="Failed"
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
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
                })()}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-md transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
