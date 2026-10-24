import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  ShieldCheck,
  FileText,
  Wallet,
  Lock,
  Clock,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  PhoneCall,
  Award,
  Zap,
  Info
} from 'lucide-react';

export default function AgentTerms() {
  const [activeTab, setActiveTab] = useState<'kiosk' | 'wallet' | 'privacy' | 'sla' | 'refund' | 'faq'>('kiosk');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'यदि एप्लीकेशन भरते समय वॉलेट से बैलेंस कट गया पर एप्लीकेशन सबमिट नहीं हुआ तो क्या करें?',
      a: 'यदि किसी तकनीकी कारण से बैलेंस कट जाता है और टास्क क्रिएट नहीं होता, तो सिस्टम 24 घंटे के अंदर ऑटो-रीकॉनसाइल करके राशि वापस आपके वॉलेट में क्रेडिट कर देता है। आप Complaint सेक्शन से टिकट दर्ज करके तुरंत स्टेटस भी जांच सकते हैं।'
    },
    {
      q: 'क्या ग्राहक से निर्धारित सेवा शुल्क से अधिक राशि ली जा सकती है?',
      a: 'नहीं, MP Online एवं e-Governance के नियमों के अनुसार केवल पोर्टल पर निर्धारित शुल्क ही ग्राहक से लिया जा सकता है। ओवरचार्जिंग की शिकायत मिलने पर कियोस्क आईडी निलंबित (Suspend) की जा सकती है।'
    },
    {
      q: 'ग्राहक के पर्सनल डॉक्यूमेंट्स (आधार, समग्र आईडी, आय प्रमाण पत्र) की सुरक्षा कैसे रखें?',
      a: 'ग्राहक के सभी दस्तावेज केवल इस अधिकृत पोर्टल पर संबंधित सेवा के आवेदन हेतु अपलोड किए जाने चाहिए। किसी भी डॉक्यूमेंट को निजी इस्तेमाल या अनधिकृत तृतीय पक्ष (Third-party) के साथ साझा करना सख्त मना है।'
    },
    {
      q: 'वॉलेट रिचार्ज की राशि कब तक वॉलेट में दिखाई देती है?',
      a: 'UPI QR, Google Pay, PhonePe या Netbanking से वॉलेट टॉप-अप करने पर राशि तुरंत (Instant) 1-2 सेकंड में आपके शॉप वॉलेट में जुड़ जाती है।'
    },
    {
      q: 'यदि ऑपरेटिंग ऑपरेटर द्वारा एप्लीकेशन रिजेक्ट कर दी जाती है तो क्या फीस वापस मिलेगी?',
      a: 'यदि ऑपरेटर द्वारा आवेदक के गलत दस्तावेजों या अपूर्ण जानकारी के कारण एप्लीकेशन रिजेक्ट होती है, तो पोर्टल रिफंड पॉलिसी के तहत उचित राशि आपके वॉलेट में वापस रिफंड कर दी जाती है।'
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Hero Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-blue-800">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.5) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.4) 0%, transparent 50%)' }} />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs uppercase tracking-wider">
                <Award className="h-3.5 w-3.5" />
                <span>Authorized Kiosk Guidelines & Terms</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-blue-400 shrink-0" />
                <span>Terms, Conditions & Security Policies</span>
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
                Standard Operating Rules, Wallet Auto-Deduction Policies, Data Protection Guidelines & Service SLA Terms for Authorized MP Online Retailers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0 text-center">
              <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
                <Zap className="h-5 w-5 text-amber-300 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">Instant Wallet Top-up</span>
              </div>
              <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
                <Lock className="h-5 w-5 text-emerald-300 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">256-Bit Encrypted Privacy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'kiosk'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Kiosk Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Wallet Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Data Privacy</span>
          </button>

          <button
            onClick={() => setActiveTab('sla')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'sla'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Service SLA</span>
          </button>

          <button
            onClick={() => setActiveTab('refund')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Refund & Dispute</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Operator FAQ</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">

          {/* TAB 1: KIOSK OPERATOR RULES */}
          {activeTab === 'kiosk' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Kiosk Operator Guidelines & Mandatory Regulations (कियोस्क नियम)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Rules and compliance mandates for all registered MP Online & CSC center retailers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Government Prescribed Pricing (शुल्क नियम)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Retailers must adhere strictly to official portal fee rates. Overcharging applicants beyond government prescribed service fees is strictly prohibited.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Mandatory Customer Receipts (पावती रसीद)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Operators must issue an official application acknowledgement receipt or tracking code (Application ID) to every applicant upon successful form submission.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Original Document Verification (दस्तावेज सत्यापन)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Verify applicant original documents (Aadhaar, Samagra ID, Marksheets) before uploading to avoid rejection due to blurred or incorrect files.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Zero Fraud & Anti-Duplication Policy</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Creating fictitious, duplicate, or forged government certificate applications is an offence and leads to immediate permanent kiosk termination.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WALLET POLICIES */}
          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <span>Wallet Deductions, Top-up & Auto-Debit Rules (वॉलेट नीति)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  How shop wallet balances, service fee deductions, and top-up transactions work.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span>Automatic Real-Time Fee Deduction</span>
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    When you submit a service application, the applicable service fee is instantly deducted from your Shop Wallet balance. You can review your transaction ledger anytime in the <strong>Wallet Manage</strong> section.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span>Wallet Top-up Methods</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You can recharge your shop wallet using instant UPI QR Code scanning, Google Pay, PhonePe, Paytm, or Net Banking. Funds are credited instantly without any manual delay.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Minimum Wallet Balance Requirement</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If your wallet balance is less than the required service fee, the system will prompt you with a <strong>Low Balance Alert</strong> and require a wallet top-up before submitting the application.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATA PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600" />
                  <span>Customer Data Confidentiality & Document Security (गोपनीयता नियम)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Strict data protection standards for handling customer personal identity documents.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>256-Bit Encrypted Document Storage</span>
                  </h3>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    All customer uploaded documents (Aadhaar, PAN, Samagra ID, Marksheets) are transmitted and processed over 256-bit SSL encrypted channels.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-slate-900">100% Customer Data Confidentiality</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Retailers are legally prohibited from sharing, copying, selling, or misusing customer personal data. Documents must be used strictly for authorized government service processing.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-slate-900">Credential & Password Security</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Never share your V2 ONLINE kiosk login password or OTP with anyone. Portal support staff will never ask for your password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SERVICE SLA */}
          {activeTab === 'sla' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span>Service SLA & Turnaround Times (सेवा समय सीमा)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Expected processing timelines for certificates and government services.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Service Category</th>
                      <th className="px-4 py-3">Expected SLA (Turnaround Time)</th>
                      <th className="px-4 py-3 rounded-r-xl">Output Document Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">Samagra ID Services (E-KYC / Update)</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">24 to 48 Hours</td>
                      <td className="px-4 py-3">Digital Certificate / PDF Download</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">Income & Domicile Certificate (आय/मूल निवासी)</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">1 to 3 Working Days</td>
                      <td className="px-4 py-3">Digitally Signed Official Certificate</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">Caste Certificate (जाति प्रमाण पत्र)</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">3 to 7 Working Days</td>
                      <td className="px-4 py-3">Official Signed Copy & e-District Verification</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">Driving Licence & RTO Services</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">2 to 5 Working Days</td>
                      <td className="px-4 py-3">Application Form & RTO Receipt Download</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: REFUND & DISPUTE */}
          {activeTab === 'refund' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <span>Refund, Cancellation & Dispute Resolution (रिफंड नीति)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Policies regarding application rejections, failed transactions, and wallet refunds.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Auto-Refund on Technical Failure</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If an application fails to submit due to server technical glitches, the deducted amount will automatically reverse back to your shop wallet within 24 hours.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Processed Applications Non-Refundable</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Once an application is processed and approved/completed by government operators, service fees are non-refundable as government portal fees are already disbursed.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-blue-600" />
                    <span>Dispute & Support Desk</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    For any fee discrepancy or delayed application processing, raise a ticket via the <strong>Complaint</strong> tab on your dashboard or contact your assigned Manager.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FAQ ACCORDION */}
          {activeTab === 'faq' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <span>Frequently Asked Questions for Kiosk Operators (सवाल-जवाब)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Quick answers to common operational questions.
                </p>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100 text-left font-bold text-xs sm:text-sm text-slate-900 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === idx && (
                      <div className="p-4 bg-white text-xs sm:text-sm text-slate-600 border-t border-slate-100 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Commitment Banner */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Authorized MP Online Portal Compliance</h4>
              <p className="text-xs text-emerald-200/80">By using this portal, you agree to comply with all government e-governance kiosk standards.</p>
            </div>
          </div>

          <div className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1.5 rounded-xl shrink-0">
            System Verified Kiosk Operator
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
