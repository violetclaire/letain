import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { AlertTriangle, TrendingUp, Activity, Users, FileText, CreditCard, HeadphonesIcon, RefreshCw, LogOut, Brain, Sparkles, MessageSquare, Shield, CheckCircle, XCircle, AlertCircle, Upload, ShieldAlert, Settings, Zap, BarChart3, Clock, Target, CheckCheck } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import type { User, Booking, SupportCase, CdiScore, CdiAiInsight as AiInsight, CdiCompositeScore, ProfileReport, IqsPattern, IqsLearningRun } from "@shared/schema";

interface PendingVendor {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profile: {
    businessName: string | null;
    bio: string | null;
    location: string | null;
    specialties: string[] | null;
    portfolioUrls: string[] | null;
    instagramHandle: string | null;
    websiteUrl: string | null;
    verificationStatus: string | null;
  };
}

interface InvisibleLaborPivot {
  id: string;
  messageId: string;
  conversationId: string;
  senderId: string;
  pivotType: string | null;
  pivotSeverity: number | null;
  urgencyLevel: number;
  clientImpact: string | null;
  clientImpactScore: number;
  taskType: string | null;
  estimatedLaborMinutes: number | null;
  sentiment: string;
  confidenceScore: number;
  aiSummary: string | null;
  createdAt: string;
}

interface VendorMetrics {
  vendorId: string;
  vendorName: string;
  avgTimeToFirstResponseMinutes: number | null;
  terminalStateUnder24hPercent: number;
  holdExpiryRate: number;
  confirmSuccessCount: number;
  confirmFailedCount: number;
  totalInquiries: number;
}

export default function AdminDashboard() {
  const isAuthorized = useCallback((u: any) => {
    const authorizedAdmins = ['49899480', '50616407']; // Violet's accounts
    return u.role === 'admin' || authorizedAdmins.includes(u.id);
  }, []);

  const { user, authLoading: isLoading, toast, setLocation } = useDashboard("admin", isAuthorized);
  
  const [cdiScores, setCdiScores] = useState<CdiScore[]>([]);
  const [compositeScores, setCompositeScores] = useState<CdiCompositeScore[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [supportCases, setSupportCases] = useState<SupportCase[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCdi, setSelectedCdi] = useState<CdiScore | null>(null);
  const [selectedComposite, setSelectedComposite] = useState<CdiCompositeScore | null>(null);
  const [selectedAiInsight, setSelectedAiInsight] = useState<AiInsight | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'legacy' | 'dimensions'>('dimensions');
  const [mainView, setMainView] = useState<'cdi' | 'safety' | 'labor' | 'iqs' | 'metrics'>('cdi');
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [profileReports, setProfileReports] = useState<ProfileReport[]>([]);
  const [invisibleLaborPivots, setInvisibleLaborPivots] = useState<InvisibleLaborPivot[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [iqsPatterns, setIqsPatterns] = useState<IqsPattern[]>([]);
  const [iqsLearningRuns, setIqsLearningRuns] = useState<IqsLearningRun[]>([]);
  const [triggeringLearning, setTriggeringLearning] = useState(false);
  const [vendorMetrics, setVendorMetrics] = useState<VendorMetrics[]>([]);

  useEffect(() => {
    const authorizedAdminIds = ['49899480', '50616407'];
    if (user && (user?.role === 'admin' || authorizedAdminIds.includes(user?.id || ''))) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    setLoadingData(true);
    try {
      const [usersRes, casesRes, bookingsRes, cdiRes, compositeRes, vendorsRes, reportsRes, pivotsRes, iqsPatternsRes, iqsLearningRes, vendorMetricsRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/support-cases", { credentials: "include" }),
        fetch("/api/admin/bookings", { credentials: "include" }),
        fetch("/api/admin/cdi/scores", { credentials: "include" }),
        fetch("/api/admin/cdi/composite-scores", { credentials: "include" }),
        fetch("/api/admin/vendors/pending", { credentials: "include" }),
        fetch("/api/admin/reports", { credentials: "include" }),
        fetch("/api/admin/invisible-labor/pivots?limit=50", { credentials: "include" }),
        fetch("/api/iqs/patterns", { credentials: "include" }),
        fetch("/api/admin/iqs/learning-runs", { credentials: "include" }),
        fetch("/api/admin/vendor-metrics?limit=10&sinceDays=14", { credentials: "include" }),
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (casesRes.ok) setSupportCases(await casesRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (cdiRes.ok) setCdiScores(await cdiRes.json());
      if (compositeRes.ok) setCompositeScores(await compositeRes.json());
      if (vendorsRes.ok) setPendingVendors(await vendorsRes.json());
      if (reportsRes.ok) setProfileReports(await reportsRes.json());
      if (pivotsRes.ok) setInvisibleLaborPivots(await pivotsRes.json());
      if (iqsPatternsRes.ok) setIqsPatterns(await iqsPatternsRes.json());
      if (iqsLearningRes.ok) setIqsLearningRuns(await iqsLearningRes.json());
      if (vendorMetricsRes.ok) setVendorMetrics(await vendorMetricsRes.json());
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
    setLoadingData(false);
  };
  
  const approveVendor = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/vendors/${userId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setPendingVendors(prev => prev.filter(v => v.id !== userId));
        toast({ title: "Vendor Approved", description: "The vendor can now appear in search results." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve vendor", variant: "destructive" });
    }
  };
  
  const rejectVendor = async (userId: string, reason: string) => {
    try {
      const res = await fetch(`/api/admin/vendors/${userId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setPendingVendors(prev => prev.filter(v => v.id !== userId));
        setShowRejectModal(null);
        setRejectReason('');
        toast({ title: "Vendor Rejected", description: "The vendor has been notified." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject vendor", variant: "destructive" });
    }
  };
  
  const suspendVendor = async (userId: string, reason: string) => {
    try {
      const res = await fetch(`/api/admin/vendors/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        toast({ title: "Vendor Suspended", description: "The vendor has been removed from search results." });
        fetchAdminData();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to suspend vendor", variant: "destructive" });
    }
  };
  
  const reviewReport = async (reportId: string, status: string, actionTaken: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, actionTaken }),
      });
      if (res.ok) {
        setProfileReports(prev => prev.map(r => 
          r.id === reportId ? { ...r, status, actionTaken } : r
        ));
        toast({ title: "Report Reviewed", description: "The report has been processed." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to review report", variant: "destructive" });
    }
  };

  const recalculateCdi = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/cdi/calculate/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const newScore = await res.json();
        setCdiScores(prev => {
          const existing = prev.findIndex(s => s.userId === userId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newScore;
            return updated;
          }
          return [...prev, newScore];
        });
        toast({ title: "CDI Recalculated", description: `New score: ${newScore.score}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to recalculate CDI", variant: "destructive" });
    }
  };

  const fetchAiInsight = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/cdi/ai/insights/${userId}/latest`, {
        credentials: "include",
      });
      if (res.ok) {
        const insight = await res.json();
        setSelectedAiInsight(insight);
      } else {
        setSelectedAiInsight(null);
      }
    } catch (error) {
      console.error("Error fetching AI insight:", error);
      setSelectedAiInsight(null);
    }
  };

  const triggerAiAnalysis = async (userId: string) => {
    setAnalyzingAi(true);
    try {
      const res = await fetch(`/api/admin/cdi/ai/analyze/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const result = await res.json();
        setSelectedAiInsight(result);
        toast({ title: "AI Analysis Complete", description: "Client sentiment has been analyzed" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to run AI analysis", variant: "destructive" });
    }
    setAnalyzingAi(false);
  };

  const submitAdminOverride = async (insightId: string, decision: string, reason: string) => {
    try {
      const res = await fetch("/api/admin/cdi/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          insightId,
          originalDecision: selectedAiInsight?.sentiment || "unknown",
          overrideDecision: decision,
          reason,
        }),
      });
      if (res.ok) {
        toast({ title: "Override Recorded", description: "Your feedback has been logged for AI learning" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to record override", variant: "destructive" });
    }
  };

  const triggerIqsLearning = async () => {
    setTriggeringLearning(true);
    try {
      const res = await fetch("/api/admin/iqs/learn", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const result = await res.json();
        toast({ title: "Learning Cycle Complete", description: `Processed ${result.feedbackProcessed || 0} feedback items` });
        fetchAdminData();
      } else {
        toast({ title: "Error", description: "Learning cycle failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to trigger learning", variant: "destructive" });
    }
    setTriggeringLearning(false);
  };

  const toggleIqsPattern = async (patternId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/iqs/patterns/${patternId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setIqsPatterns(prev => prev.map(p => 
          p.id === patternId ? { ...p, isActive } : p
        ));
        toast({ title: isActive ? "Pattern Enabled" : "Pattern Disabled" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update pattern", variant: "destructive" });
    }
  };

  const updatePatternWeight = async (patternId: string, weight: number) => {
    try {
      const res = await fetch(`/api/admin/iqs/patterns/${patternId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weight }),
      });
      if (res.ok) {
        setIqsPatterns(prev => prev.map(p => 
          p.id === patternId ? { ...p, weight } : p
        ));
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update weight", variant: "destructive" });
    }
  };

  const getPatternTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'unrealistic_expectations': 'bg-purple-100 text-purple-700',
      'price_haggling': 'bg-yellow-100 text-yellow-700',
      'timeline_pressure': 'bg-orange-100 text-orange-700',
      'scope_creep': 'bg-blue-100 text-blue-700',
      'communication_red_flag': 'bg-red-100 text-red-700',
      'payment_concern': 'bg-pink-100 text-pink-700',
      'boundary_violation': 'bg-rose-100 text-rose-700',
      'ghosting_pattern': 'bg-gray-100 text-gray-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getUserName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    if (!u) return "Unknown";
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    if (u.firstName) return u.firstName;
    return u.email || "Unknown";
  };

  const getCdiColor = (score: number) => {
    if (score >= 70) return "text-[#dc2626]";
    if (score >= 50) return "text-[#ea580c]";
    if (score >= 25) return "text-[#ca8a04]";
    return "text-[#16a34a]";
  };

  const getRiskBadge = (riskLevel: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700",
    };
    return colors[riskLevel] || "bg-gray-100 text-gray-700";
  };

  // Stats calculations
  const avgCdi = cdiScores.length > 0 
    ? (cdiScores.reduce((sum, s) => sum + s.score, 0) / cdiScores.length).toFixed(1)
    : "0";
  const highRiskCount = cdiScores.filter(s => s.riskLevel === "high" || s.riskLevel === "critical").length;
  const openCases = supportCases.filter(c => c.status === "open" || c.status === "in_progress").length;
  const clientCount = users.filter(u => u.role === "client").length;

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm text-black/60">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-powder-blue p-4">
      {/* LIVE INDICATOR */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white shadow-sm animate-pulse">
        <div className="h-2 w-2 rounded-full bg-white"></div>
        CDI LIVE
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="frame-outer shadow-sm">
          <div className="frame-inner">
            {/* HEADER */}
            <header className="flex items-baseline justify-between mb-8">
              <div>
                <h1 className="font-script text-3xl ink-main">
                  Your Private Secretary
                </h1>
                <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] ink-soft">
                  Admin Dashboard
                </p>
                <p className="mt-1 text-[0.72rem] ink-soft">
                  Choreography Depth Index (CDI) Monitoring
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/import"
                  className="px-3 py-1.5 bg-[#262329] text-white text-xs rounded-md hover:bg-[#262329]/90 flex items-center gap-1.5 transition-colors"
                  data-testid="link-import-bookings"
                >
                  <Upload size={14} /> Import Bookings
                </Link>
                <Link
                  href="/admin/inbound-replies"
                  className="px-3 py-1.5 border border-[#262329]/30 text-[#262329] text-xs rounded-md hover:bg-[#262329]/5 flex items-center gap-1.5 transition-colors"
                  data-testid="link-inbound-replies"
                >
                  <MessageSquare size={14} /> Inbound Replies
                </Link>
                <button
                  onClick={fetchAdminData}
                  className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors"
                  data-testid="button-refresh"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
                <a href="/api/logout" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors">
                  <LogOut size={14} /> Logout
                </a>
                <Link href="/" className="text-[0.7rem] ink-soft underline">
                  Back to home
                </Link>
              </div>
            </header>

            {/* MAIN NAVIGATION TABS */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMainView('cdi')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  mainView === 'cdi' 
                    ? 'bg-[#262329] text-white' 
                    : 'bg-white text-[#262329] hover:bg-gray-100'
                }`}
                data-testid="tab-cdi"
              >
                <Activity size={14} className="inline mr-2" />
                CDI Monitoring
              </button>
              <button
                onClick={() => setMainView('safety')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  mainView === 'safety' 
                    ? 'bg-[#262329] text-white' 
                    : 'bg-white text-[#262329] hover:bg-gray-100'
                }`}
                data-testid="tab-safety"
              >
                <Shield size={14} />
                Trust & Safety
                {(pendingVendors.length > 0 || profileReports.filter(r => r.status === 'pending').length > 0) && (
                  <span className="bg-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full">
                    {pendingVendors.length + profileReports.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMainView('labor')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  mainView === 'labor' 
                    ? 'bg-gradient-to-r from-[#3D5A3B] to-[#C9A961] text-white' 
                    : 'bg-white text-[#262329] hover:bg-gray-100'
                }`}
                data-testid="tab-labor"
              >
                <Sparkles size={14} />
                Invisible Labor
                {invisibleLaborPivots.length > 0 && (
                  <span className="bg-gold text-white text-[0.6rem] px-1.5 py-0.5 rounded-full">
                    {invisibleLaborPivots.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMainView('iqs')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  mainView === 'iqs' 
                    ? 'bg-gradient-to-r from-[#E8B4B8] to-[#dc2626] text-white' 
                    : 'bg-white text-[#262329] hover:bg-gray-100'
                }`}
                data-testid="tab-iqs"
              >
                <ShieldAlert size={14} />
                Lead Quality (IQS)
                {iqsPatterns.filter(p => !p.isActive).length > 0 && (
                  <span className="bg-gray-400 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full">
                    {iqsPatterns.filter(p => !p.isActive).length} off
                  </span>
                )}
              </button>
              <button
                onClick={() => setMainView('metrics')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  mainView === 'metrics' 
                    ? 'bg-gradient-to-r from-[#3D5A3B] to-[#5D7A5B] text-white' 
                    : 'bg-white text-[#262329] hover:bg-gray-100'
                }`}
                data-testid="tab-metrics"
              >
                <BarChart3 size={14} />
                Vendor Metrics
                {vendorMetrics.length > 0 && (
                  <span className="bg-green-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full">
                    {vendorMetrics.length}
                  </span>
                )}
              </button>
            </div>

            {/* TRUST & SAFETY VIEW */}
            {mainView === 'safety' && (
              <div className="space-y-6">
                {/* PENDING VENDOR VERIFICATION */}
                <div className="card-frame rounded-md p-6">
                  <h2 className="font-header text-xl ink-main mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-600" />
                    Vendor Verification Queue
                    {pendingVendors.length > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        {pendingVendors.length} pending
                      </span>
                    )}
                  </h2>
                  
                  {pendingVendors.length === 0 ? (
                    <div className="text-center py-8 text-sm ink-soft">
                      <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                      No vendors waiting for approval
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingVendors.map((vendor) => (
                        <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 bg-white" data-testid={`vendor-card-${vendor.id}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{vendor.profile?.businessName || `${vendor.firstName} ${vendor.lastName}`}</h3>
                              <p className="text-sm text-gray-600">{vendor.email}</p>
                              {vendor.profile?.location && (
                                <p className="text-xs text-gray-500">{vendor.profile.location}</p>
                              )}
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PENDING</span>
                          </div>
                          
                          {vendor.profile?.bio && (
                            <p className="text-sm text-gray-700 mb-3 line-clamp-2">{vendor.profile.bio}</p>
                          )}
                          
                          {vendor.profile?.specialties && vendor.profile.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {vendor.profile.specialties.map((s, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{s}</span>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex gap-2 mb-3">
                            {vendor.profile?.instagramHandle && (
                              <a href={`https://instagram.com/${vendor.profile.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                @{vendor.profile.instagramHandle}
                              </a>
                            )}
                            {vendor.profile?.websiteUrl && (
                              <a href={vendor.profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                Website
                              </a>
                            )}
                          </div>
                          
                          {vendor.profile?.portfolioUrls && vendor.profile.portfolioUrls.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1">Portfolio:</p>
                              <div className="flex flex-wrap gap-2">
                                {vendor.profile.portfolioUrls.slice(0, 3).map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                    Link {i + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => approveVendor(vendor.id)}
                              className="flex-1 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                              data-testid={`button-approve-${vendor.id}`}
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => setShowRejectModal(vendor.id)}
                              className="flex-1 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                              data-testid={`button-reject-${vendor.id}`}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* PROFILE REPORTS */}
                <div className="card-frame rounded-md p-6">
                  <h2 className="font-header text-xl ink-main mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-orange-600" />
                    Profile Reports
                    {profileReports.filter(r => r.status === 'pending').length > 0 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        {profileReports.filter(r => r.status === 'pending').length} new
                      </span>
                    )}
                  </h2>
                  
                  {profileReports.length === 0 ? (
                    <div className="text-center py-8 text-sm ink-soft">
                      <Shield size={32} className="mx-auto mb-2 text-green-500" />
                      No profile reports
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profileReports.map((report) => (
                        <div key={report.id} className={`border rounded-lg p-4 ${report.status === 'pending' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`} data-testid={`report-card-${report.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                report.reason === 'scam' ? 'bg-red-100 text-red-800' :
                                report.reason === 'fake' ? 'bg-orange-100 text-orange-800' :
                                report.reason === 'inappropriate' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {report.reason.toUpperCase()}
                              </span>
                              <p className="text-sm font-medium mt-2">
                                Reported: {getUserName(report.reportedUserId)}
                              </p>
                              <p className="text-xs text-gray-500">
                                By: {getUserName(report.reporterId)} • {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date'}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                              report.status === 'action_taken' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(report.status || 'pending').toUpperCase()}
                            </span>
                          </div>
                          
                          {report.description && (
                            <p className="text-sm text-gray-700 mb-3">{report.description}</p>
                          )}
                          
                          {report.status === 'pending' && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => reviewReport(report.id, 'dismissed', 'No violation found')}
                                className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                data-testid={`button-dismiss-${report.id}`}
                              >
                                Dismiss
                              </button>
                              <button
                                onClick={() => {
                                  reviewReport(report.id, 'action_taken', 'Vendor suspended');
                                  suspendVendor(report.reportedUserId, `Suspended due to report: ${report.reason}`);
                                }}
                                className="flex-1 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-suspend-${report.id}`}
                              >
                                Suspend Vendor
                              </button>
                            </div>
                          )}
                          
                          {report.actionTaken && (
                            <p className="text-xs text-gray-500 mt-2">
                              Action: {report.actionTaken}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REJECT MODAL */}
            {showRejectModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="font-header text-lg mb-4">Reject Vendor</h3>
                  <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection (this will be shared with the vendor):</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Portfolio links don't work, suspicious business details..."
                    className="w-full border rounded p-3 text-sm mb-4 h-24"
                    data-testid="input-reject-reason"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRejectModal(null);
                        setRejectReason('');
                      }}
                      className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      data-testid="button-cancel-reject"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => rejectVendor(showRejectModal, rejectReason)}
                      className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      data-testid="button-confirm-reject"
                    >
                      Reject Vendor
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INVISIBLE LABOR VIEW */}
            {mainView === 'labor' && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-forest/5 to-gold/5">
                    <div className="font-header mb-1 text-4xl text-forest">{invisibleLaborPivots.length}</div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Total Pivots</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-forest/5 to-gold/5">
                    <div className="font-header mb-1 text-4xl text-forest">
                      {invisibleLaborPivots.reduce((sum, p) => sum + (p.estimatedLaborMinutes || 0), 0) >= 60
                        ? `${Math.round(invisibleLaborPivots.reduce((sum, p) => sum + (p.estimatedLaborMinutes || 0), 0) / 60)}h`
                        : `${invisibleLaborPivots.reduce((sum, p) => sum + (p.estimatedLaborMinutes || 0), 0)}m`}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Labor Captured</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-forest/5 to-gold/5">
                    <div className="font-header mb-1 text-4xl text-forest">
                      {invisibleLaborPivots.filter(p => p.clientImpact === 'saved_disaster' || p.clientImpact === 'prevented_issue').length}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Crises Prevented</div>
                  </div>
                </div>

                {/* Pivot Types Breakdown */}
                <div className="card-frame rounded-md p-6">
                  <h2 className="font-header text-xl ink-main mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-gold" />
                    Pivot Analysis
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {['schedule_change', 'last_minute_save', 'crisis_averted', 'client_accommodation', 'vendor_coordination', 'problem_resolution'].map(type => {
                      const count = invisibleLaborPivots.filter(p => p.pivotType === type).length;
                      const labels: Record<string, { label: string; color: string }> = {
                        schedule_change: { label: 'Schedule', color: 'bg-blue-100 text-blue-700' },
                        last_minute_save: { label: 'Quick Fix', color: 'bg-yellow-100 text-yellow-700' },
                        crisis_averted: { label: 'Crisis', color: 'bg-green-100 text-green-700' },
                        client_accommodation: { label: 'Accommodation', color: 'bg-purple-100 text-purple-700' },
                        vendor_coordination: { label: 'Coordination', color: 'bg-pink-100 text-pink-700' },
                        problem_resolution: { label: 'Resolved', color: 'bg-orange-100 text-orange-700' }
                      };
                      return (
                        <div key={type} className={`rounded-lg p-3 text-center ${labels[type]?.color || 'bg-gray-100'}`}>
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-xs">{labels[type]?.label || type}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Pivots Log */}
                <div className="card-frame rounded-md p-6">
                  <h2 className="font-header text-xl ink-main mb-4 flex items-center gap-2">
                    <MessageSquare size={20} />
                    Recent Pivots Log
                  </h2>
                  
                  {invisibleLaborPivots.length === 0 ? (
                    <div className="text-center py-8 text-sm ink-soft">
                      <Sparkles size={32} className="mx-auto mb-2 text-gold/50" />
                      <p>No pivots detected yet</p>
                      <p className="text-xs mt-1">Pivots are detected when vendors/planners coordinate behind the scenes</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {invisibleLaborPivots.map((pivot) => {
                        const pivotColors: Record<string, string> = {
                          schedule_change: 'border-l-blue-500',
                          last_minute_save: 'border-l-yellow-500',
                          crisis_averted: 'border-l-green-500',
                          client_accommodation: 'border-l-purple-500',
                          vendor_coordination: 'border-l-pink-500',
                          problem_resolution: 'border-l-orange-500'
                        };
                        return (
                          <div 
                            key={pivot.id} 
                            className={`border-l-4 ${pivotColors[pivot.pivotType || ''] || 'border-l-gray-300'} pl-4 py-2 bg-white rounded-r-lg shadow-sm`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-medium capitalize">
                                {pivot.pivotType?.replace(/_/g, ' ') || 'General'}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {new Date(pivot.createdAt).toLocaleDateString()} {new Date(pivot.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            {pivot.aiSummary && (
                              <p className="text-sm text-gray-700 mb-1">{pivot.aiSummary}</p>
                            )}
                            <div className="flex gap-2 text-[10px] text-gray-500">
                              <span>Urgency: {pivot.urgencyLevel}/10</span>
                              {pivot.estimatedLaborMinutes && <span>Labor: ~{pivot.estimatedLaborMinutes}m</span>}
                              {pivot.clientImpact && <span>Impact: {pivot.clientImpact.replace(/_/g, ' ')}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="bg-gradient-to-r from-forest/10 to-gold/10 rounded-lg p-6">
                  <h3 className="font-header text-lg mb-2 flex items-center gap-2">
                    <Brain size={18} />
                    What is Invisible Labor?
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Invisible labor</strong> is the behind-the-scenes work that clients never see but is essential to their event's success. 
                    This includes last-minute schedule changes, crisis management, vendor coordination, and client accommodations. 
                    Our AI analyzes Business Chat conversations to detect and quantify this work, creating a complete picture of the value vendors provide.
                    This data feeds into the CDI system, connecting team coordination to client satisfaction outcomes.
                  </p>
                </div>
              </div>
            )}

            {/* IQS (LEAD QUALITY) VIEW */}
            {mainView === 'iqs' && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-pink/10 to-red-100">
                    <div className="font-header mb-1 text-4xl text-[#dc2626]">{iqsPatterns.length}</div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Total Patterns</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-green-50 to-green-100">
                    <div className="font-header mb-1 text-4xl text-green-600">{iqsPatterns.filter(p => p.isActive).length}</div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Active Patterns</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-blue-50 to-blue-100">
                    <div className="font-header mb-1 text-4xl text-blue-600">{iqsLearningRuns.length}</div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Learning Cycles</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="font-header mb-1 text-4xl text-purple-600">
                      {iqsLearningRuns.reduce((sum, r) => sum + (r.feedbackProcessed || 0), 0)}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Feedback Processed</div>
                  </div>
                </div>

                {/* Learning Controls */}
                <div className="card-frame rounded-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-header text-xl ink-main flex items-center gap-2">
                      <Zap size={20} className="text-yellow-500" />
                      Machine Learning
                    </h2>
                    <button
                      onClick={triggerIqsLearning}
                      disabled={triggeringLearning}
                      className="px-4 py-2 bg-gradient-to-r from-[#E8B4B8] to-[#dc2626] text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                      data-testid="button-trigger-learning"
                    >
                      {triggeringLearning ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          Trigger Learning Cycle
                        </>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    The IQS system learns from vendor feedback to improve red flag detection. 
                    When vendors mark warnings as helpful or not, the system adjusts pattern weights accordingly.
                  </p>

                  {/* Recent Learning Runs */}
                  {iqsLearningRuns.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">Recent Learning Runs</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {iqsLearningRuns.slice(0, 5).map((run) => (
                          <div key={run.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg" data-testid={`learning-run-${run.id}`}>
                            <div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                run.status === 'completed' ? 'bg-green-100 text-green-700' :
                                run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {run.status.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(run.startedAt).toLocaleDateString()} {new Date(run.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {run.feedbackProcessed || 0} feedback • {run.patternsUpdated || 0} updated
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Red Flag Patterns */}
                <div className="card-frame rounded-md p-6">
                  <h2 className="font-header text-xl ink-main mb-4 flex items-center gap-2">
                    <Settings size={20} />
                    Red Flag Patterns
                  </h2>
                  
                  {iqsPatterns.length === 0 ? (
                    <div className="text-center py-8 text-sm ink-soft">
                      <ShieldAlert size={32} className="mx-auto mb-2 text-gray-400" />
                      <p>No patterns configured yet</p>
                      <p className="text-xs mt-1">Patterns are created when the system analyzes client interactions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {iqsPatterns.map((pattern) => (
                        <div key={pattern.id} className={`border rounded-lg p-4 ${pattern.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'}`} data-testid={`pattern-card-${pattern.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-1 rounded ${getPatternTypeColor(pattern.patternType)}`}>
                                  {pattern.patternType.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <h3 className="font-medium text-sm">{pattern.name}</h3>
                              </div>
                              {pattern.description && (
                                <p className="text-xs text-gray-600">{pattern.description}</p>
                              )}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pattern.isActive}
                                onChange={(e) => toggleIqsPattern(pattern.id, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300"
                                data-testid={`toggle-pattern-${pattern.id}`}
                              />
                              <span className="text-xs text-gray-500">{pattern.isActive ? 'Enabled' : 'Disabled'}</span>
                            </label>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Severity:</span>
                              <span className={`text-xs font-medium ${
                                pattern.baseSeverity >= 8 ? 'text-red-600' :
                                pattern.baseSeverity >= 5 ? 'text-orange-600' :
                                'text-yellow-600'
                              }`}>
                                {pattern.baseSeverity}/10
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-gray-500">Weight:</span>
                              <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={pattern.weight}
                                onChange={(e) => updatePatternWeight(pattern.id, parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                data-testid={`weight-slider-${pattern.id}`}
                              />
                              <span className="text-xs font-mono w-8">{pattern.weight.toFixed(1)}x</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="bg-gradient-to-r from-pink/10 to-red-50 rounded-lg p-6">
                  <h3 className="font-header text-lg mb-2 flex items-center gap-2">
                    <Brain size={18} />
                    What is IQS (Interaction Quality Scoring)?
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>IQS</strong> helps vendors spot potential red flags in client interactions before they become problems.
                    The AI analyzes booking requests, messages, and inquiry patterns to detect warning signs like unrealistic expectations,
                    price haggling, timeline pressure, and communication issues. Vendors can provide feedback on each warning,
                    and the system learns from this feedback to improve its accuracy over time.
                  </p>
                </div>
              </div>
            )}

            {/* VENDOR METRICS VIEW */}
            {mainView === 'metrics' && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-green-50 to-green-100">
                    <div className="font-header mb-1 text-4xl text-green-600">{vendorMetrics.length}</div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Vendors Tracked</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-blue-50 to-blue-100">
                    <div className="font-header mb-1 text-4xl text-blue-600">
                      {vendorMetrics.length > 0 
                        ? Math.round(vendorMetrics.filter(v => v.avgTimeToFirstResponseMinutes !== null).reduce((sum, v) => sum + (v.avgTimeToFirstResponseMinutes || 0), 0) / Math.max(vendorMetrics.filter(v => v.avgTimeToFirstResponseMinutes !== null).length, 1))
                        : 0}m
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Avg First Response</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="font-header mb-1 text-4xl text-purple-600">
                      {vendorMetrics.length > 0 
                        ? Math.round(vendorMetrics.reduce((sum, v) => sum + v.terminalStateUnder24hPercent, 0) / vendorMetrics.length)
                        : 0}%
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Resolved &lt;24h</div>
                  </div>
                  <div className="card-frame rounded-md px-5 py-4 text-center bg-gradient-to-br from-orange-50 to-orange-100">
                    <div className="font-header mb-1 text-4xl text-orange-600">
                      {vendorMetrics.reduce((sum, v) => sum + v.confirmSuccessCount, 0)}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Confirmed Bookings</div>
                  </div>
                </div>

                {/* Vendor Metrics Table */}
                <div className="card-frame rounded-md p-6">
                  <h2 className="font-header text-xl ink-main mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-green-600" />
                    Proving Ground Metrics (Last 14 Days)
                  </h2>
                  
                  {vendorMetrics.length === 0 ? (
                    <div className="text-center py-8 text-sm ink-soft">
                      <BarChart3 size={32} className="mx-auto mb-2 text-gray-400" />
                      <p>No vendor metrics available yet</p>
                      <p className="text-xs mt-1">Metrics are calculated from inquiry activity</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2 font-medium text-gray-600">Vendor</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">
                              <div className="flex items-center justify-center gap-1">
                                <Clock size={14} />
                                <span>First Response</span>
                              </div>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">
                              <div className="flex items-center justify-center gap-1">
                                <Target size={14} />
                                <span>&lt;24h Rate</span>
                              </div>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Hold Expiry</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">
                              <div className="flex items-center justify-center gap-1">
                                <CheckCheck size={14} />
                                <span>Confirmed</span>
                              </div>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Failed</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorMetrics.map((vm) => (
                            <tr key={vm.vendorId} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`metrics-row-${vm.vendorId}`}>
                              <td className="py-3 px-2">
                                <div className="font-medium text-gray-900">{vm.vendorName}</div>
                                <div className="text-xs text-gray-500">{vm.totalInquiries} inquiries</div>
                              </td>
                              <td className="text-center py-3 px-2">
                                {vm.avgTimeToFirstResponseMinutes !== null ? (
                                  <span className={`font-medium ${vm.avgTimeToFirstResponseMinutes <= 60 ? 'text-green-600' : vm.avgTimeToFirstResponseMinutes <= 240 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {vm.avgTimeToFirstResponseMinutes < 60 
                                      ? `${vm.avgTimeToFirstResponseMinutes}m` 
                                      : `${Math.round(vm.avgTimeToFirstResponseMinutes / 60)}h`}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="text-center py-3 px-2">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${vm.terminalStateUnder24hPercent >= 80 ? 'bg-green-500' : vm.terminalStateUnder24hPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${vm.terminalStateUnder24hPercent}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium ${vm.terminalStateUnder24hPercent >= 80 ? 'text-green-600' : vm.terminalStateUnder24hPercent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {vm.terminalStateUnder24hPercent}%
                                  </span>
                                </div>
                              </td>
                              <td className="text-center py-3 px-2">
                                <span className={`font-medium ${vm.holdExpiryRate <= 10 ? 'text-green-600' : vm.holdExpiryRate <= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {vm.holdExpiryRate}%
                                </span>
                              </td>
                              <td className="text-center py-3 px-2">
                                <span className="text-green-600 font-bold">{vm.confirmSuccessCount}</span>
                              </td>
                              <td className="text-center py-3 px-2">
                                <span className={`font-medium ${vm.confirmFailedCount === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                                  {vm.confirmFailedCount}
                                </span>
                              </td>
                              <td className="text-center py-3 px-2">
                                <span className="text-gray-600">{vm.totalInquiries}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Metrics Legend */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                  <h3 className="font-header text-lg mb-3 flex items-center gap-2">
                    <Brain size={18} />
                    Metrics Explained
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <div className="font-medium flex items-center gap-1 mb-1">
                        <Clock size={14} className="text-blue-600" /> Time to First Response
                      </div>
                      <p className="text-xs text-gray-600">Average time from inquiry creation to vendor's first action (propose, hold, or confirm).</p>
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1 mb-1">
                        <Target size={14} className="text-purple-600" /> Terminal State &lt;24h
                      </div>
                      <p className="text-xs text-gray-600">Percentage of inquiries reaching a final state (confirmed, declined, expired) within 24 hours.</p>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Hold Expiry Rate</div>
                      <p className="text-xs text-gray-600">Percentage of holds that expired without being converted to bookings.</p>
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1 mb-1">
                        <CheckCheck size={14} className="text-green-600" /> Confirm Success vs Failed
                      </div>
                      <p className="text-xs text-gray-600">Successful confirmations vs those that failed (e.g., incomplete data, payment issues).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mainView === 'cdi' && (
            <>
            {/* CDI STATS ROW */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="card-frame rounded-md px-5 py-4 text-center">
                <div className="font-header mb-1 text-4xl text-black">{avgCdi}</div>
                <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Avg Behavioral CDI</div>
              </div>
              <div className="card-frame rounded-md px-5 py-4 text-center">
                <div className="font-header mb-1 text-4xl text-[#ea580c]">{highRiskCount}</div>
                <div className="text-[0.65rem] uppercase tracking-widest ink-soft">High Risk Clients</div>
              </div>
              <div className="card-frame rounded-md px-5 py-4 text-center">
                <div className="font-header mb-1 text-4xl text-black">{openCases}</div>
                <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Open Support Cases</div>
              </div>
              <div className="card-frame rounded-md px-5 py-4 text-center">
                <div className="font-header mb-1 text-4xl text-[#16a34a]">{clientCount}</div>
                <div className="text-[0.65rem] uppercase tracking-widest ink-soft">Total Clients</div>
              </div>
            </div>

            {/* TABS */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
              {/* LEFT: CDI SCORES LIST */}
              <div className="space-y-4 lg:col-span-1">
                <h2 className="font-header text-lg ink-main mb-2 flex items-center gap-2">
                  <Activity size={18} /> Behavioral CDI
                </h2>
                
                {cdiScores.length === 0 ? (
                  <div className="card-frame rounded-md p-6 text-center">
                    <p className="text-sm ink-soft">No CDI scores calculated yet</p>
                    <p className="text-xs ink-soft mt-2">Scores are calculated from client activity</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {cdiScores.map((cdi) => (
                      <div
                        key={cdi.id}
                        onClick={() => {
                          setSelectedCdi(cdi);
                          setSelectedUser(users.find(u => u.id === cdi.userId) || null);
                          fetchAiInsight(cdi.userId);
                        }}
                        className={`card-frame rounded-md p-4 cursor-pointer hover:shadow-md transition-all ${
                          cdi.riskLevel === 'critical' ? 'border-l-4 border-l-[#dc2626]' :
                          cdi.riskLevel === 'high' ? 'border-l-4 border-l-[#ea580c]' : ''
                        } ${selectedCdi?.id === cdi.id ? 'ring-2 ring-black' : ''}`}
                        data-testid={`cdi-card-${cdi.userId}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold ink-main mb-1">{getUserName(cdi.userId)}</div>
                            <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-semibold ${getRiskBadge(cdi.riskLevel)}`}>
                              {cdi.riskLevel.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-center">
                            <div className={`font-header text-2xl font-bold leading-none ${getCdiColor(cdi.score)}`}>
                              {cdi.score}
                            </div>
                            <div className="text-[0.6rem] font-bold uppercase tracking-wide mt-1 ink-soft">CDI</div>
                          </div>
                        </div>
                        
                        {(cdi.riskLevel === 'critical' || cdi.riskLevel === 'high') && (
                          <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] font-bold text-[#dc2626]">
                            <AlertTriangle size={12} />
                            <span>ATTENTION NEEDED</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ALL CLIENTS */}
                <h2 className="font-header text-lg ink-main mb-2 mt-6 flex items-center gap-2">
                  <Users size={18} /> All Clients
                </h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {users.filter(u => u.role === 'client').map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setSelectedCdi(cdiScores.find(c => c.userId === u.id) || null);
                        fetchAiInsight(u.id);
                      }}
                      className={`card-frame rounded-md p-3 cursor-pointer hover:shadow-sm transition-all text-sm ${selectedUser?.id === u.id ? 'ring-2 ring-black' : ''}`}
                      data-testid={`user-card-${u.id}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="ink-main">{u.firstName} {u.lastName}</span>
                        {cdiScores.find(c => c.userId === u.id) ? (
                          <span className={`text-xs font-bold ${getCdiColor(cdiScores.find(c => c.userId === u.id)!.score)}`}>
                            CDI: {cdiScores.find(c => c.userId === u.id)!.score}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              recalculateCdi(u.id);
                            }}
                            className="text-[0.65rem] px-2 py-1 bg-black text-white rounded hover:bg-gray-800"
                            data-testid={`button-calc-cdi-${u.id}`}
                          >
                            Calculate CDI
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: DETAIL PANEL */}
              <div className="card-frame rounded-md px-6 py-6 lg:col-span-2">
                {selectedUser && selectedCdi ? (
                  <>
                    <div className="mb-6 border-b border-[#e5e8f2] pb-4">
                      <h2 className="font-header text-2xl ink-main mb-2">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h2>
                      <div className="flex items-center gap-3 text-xs ink-soft">
                        <span>{selectedUser.email}</span>
                        <span className="h-1 w-1 rounded-full bg-[#c5ccd8]"></span>
                        <span className={`font-semibold ${getRiskBadge(selectedCdi.riskLevel)} px-2 py-0.5 rounded`}>
                          {selectedCdi.riskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>

                    {/* CDI BREAKDOWN */}
                    <div className="mb-6 rounded border border-[#e5e8f2] bg-[#fbfcff] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xs font-semibold ink-main uppercase tracking-wide">Behavioral CDI Breakdown</h3>
                        <div className={`flex items-center gap-1 text-lg font-bold ${getCdiColor(selectedCdi.score)}`}>
                          <span>{selectedCdi.score}/100</span>
                        </div>
                      </div>
                      
                      {selectedCdi.factors && (
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedCdi.factors).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-xs border-b border-[#e5e8f2] pb-2">
                              <span className="ink-soft capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="font-semibold">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <button
                        onClick={() => recalculateCdi(selectedUser.id)}
                        className="mt-4 w-full flex items-center justify-center gap-2 text-xs bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors"
                        data-testid="button-recalculate-cdi"
                      >
                        <RefreshCw size={14} /> Recalculate CDI
                      </button>
                    </div>

                    {/* THREE-DIMENSION CDI (TOILE SYSTEMS) */}
                    {compositeScores.find(c => c.userId === selectedUser.id) && (
                      <div className="mb-6 rounded border-2 border-[#7c3aed]/30 bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-xs font-semibold ink-main uppercase tracking-wide flex items-center gap-2">
                            <Shield size={14} className="text-[#7c3aed]" /> AI Commentary
                            <span className="text-[0.6rem] text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 rounded-full">annotation</span>
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              compositeScores.find(c => c.userId === selectedUser.id)?.trustLevel === 'exceptional' ? 'bg-green-100 text-green-800' :
                              compositeScores.find(c => c.userId === selectedUser.id)?.trustLevel === 'high' ? 'bg-blue-100 text-blue-800' :
                              compositeScores.find(c => c.userId === selectedUser.id)?.trustLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                              compositeScores.find(c => c.userId === selectedUser.id)?.trustLevel === 'low' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {compositeScores.find(c => c.userId === selectedUser.id)?.trustLevel?.toUpperCase()}
                            </span>
                            <span className="text-lg font-bold text-[#7c3aed]">
                              {compositeScores.find(c => c.userId === selectedUser.id)?.compositeScore}
                            </span>
                          </div>
                        </div>
                        
                        {(() => {
                          const cs = compositeScores.find(c => c.userId === selectedUser.id)!;
                          return (
                            <>
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-white/60 rounded-lg p-3 text-center border border-[#7c3aed]/20">
                                  <div className="text-[0.6rem] font-bold uppercase tracking-wide text-[#7c3aed]/70 mb-1">Emotional Fidelity</div>
                                  <div className="text-2xl font-bold text-[#7c3aed]">{cs.emotionalFidelityScore}</div>
                                  <div className="text-[0.55rem] text-gray-500">40% weight</div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div 
                                      className="bg-[#7c3aed] h-1.5 rounded-full transition-all" 
                                      style={{ width: `${cs.emotionalFidelityScore}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-3 text-center border border-[#2563eb]/20">
                                  <div className="text-[0.6rem] font-bold uppercase tracking-wide text-[#2563eb]/70 mb-1">Choreography Awareness</div>
                                  <div className="text-2xl font-bold text-[#2563eb]">{cs.choreographyAwarenessScore}</div>
                                  <div className="text-[0.55rem] text-gray-500">30% weight</div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div 
                                      className="bg-[#2563eb] h-1.5 rounded-full transition-all" 
                                      style={{ width: `${cs.choreographyAwarenessScore}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-3 text-center border border-[#059669]/20">
                                  <div className="text-[0.6rem] font-bold uppercase tracking-wide text-[#059669]/70 mb-1">Role-Specific Recall</div>
                                  <div className="text-2xl font-bold text-[#059669]">{cs.roleSpecificRecallScore}</div>
                                  <div className="text-[0.55rem] text-gray-500">30% weight</div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div 
                                      className="bg-[#059669] h-1.5 rounded-full transition-all" 
                                      style={{ width: `${cs.roleSpecificRecallScore}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[0.65rem] border-t border-[#7c3aed]/20 pt-3">
                                <div className="flex items-center gap-2">
                                  <span className="ink-soft">HACO Decision:</span>
                                  <span className={`px-2 py-0.5 rounded font-medium ${
                                    cs.hacoOverallDecision === 'intuition_aligned' ? 'bg-green-100 text-green-800' :
                                    cs.hacoOverallDecision === 'complementarity_activated' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {cs.hacoOverallDecision?.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                </div>
                                {cs.interventionRecommended && (
                                  <div className="flex items-center gap-1 text-red-600 font-semibold">
                                    <AlertTriangle size={12} />
                                    <span>Intervention Recommended</span>
                                  </div>
                                )}
                                {cs.predictedSuccess && (
                                  <div className="flex items-center gap-1">
                                    <span className="ink-soft">Success Prediction:</span>
                                    <span className="font-bold">{cs.predictedSuccess}%</span>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* AI INSIGHTS (HACO FRAMEWORK) */}
                    <div className="mb-6 rounded border border-[#e5e8f2] bg-gradient-to-br from-[#f8f9fc] to-[#eef1f8] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xs font-semibold ink-main uppercase tracking-wide flex items-center gap-2">
                          <Brain size={14} /> AI Sentiment Analysis
                          <span className="text-[0.6rem] text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 rounded-full">HACO</span>
                        </h3>
                        <button
                          onClick={() => triggerAiAnalysis(selectedUser.id)}
                          disabled={analyzingAi}
                          className="text-[0.65rem] px-3 py-1.5 bg-[#7c3aed] text-white rounded hover:bg-[#6d28d9] disabled:opacity-50 flex items-center gap-1"
                          data-testid="button-run-ai-analysis"
                        >
                          {analyzingAi ? (
                            <>
                              <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} /> Run AI Analysis
                            </>
                          )}
                        </button>
                      </div>
                      
                      {selectedAiInsight ? (
                        <div className="space-y-4">
                          {/* Sentiment & Confidence */}
                          <div className="flex items-center justify-between p-3 rounded bg-white/60">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                selectedAiInsight.sentiment === 'distressed' ? 'bg-red-100 text-red-600' :
                                selectedAiInsight.sentiment === 'negative' ? 'bg-orange-100 text-orange-600' :
                                selectedAiInsight.sentiment === 'neutral' ? 'bg-gray-100 text-gray-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                <MessageSquare size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold capitalize">{selectedAiInsight.sentiment}</div>
                                <div className="text-[0.65rem] ink-soft">Sentiment</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-[#7c3aed]">{selectedAiInsight.confidenceScore}%</div>
                              <div className="text-[0.65rem] ink-soft">Confidence</div>
                            </div>
                          </div>
                          
                          {/* HACO Decision */}
                          <div className="p-3 rounded bg-white/60">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield size={14} className="text-[#7c3aed]" />
                              <span className="text-[0.7rem] font-semibold uppercase tracking-wide ink-main">HACO Decision</span>
                            </div>
                            <div className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                              selectedAiInsight.hacoDecision === 'intuition_aligned' ? 'bg-green-100 text-green-700' :
                              selectedAiInsight.hacoDecision === 'complementarity_activated' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {selectedAiInsight.hacoDecision === 'intuition_aligned' && <CheckCircle size={12} />}
                              {selectedAiInsight.hacoDecision === 'complementarity_activated' && <Sparkles size={12} />}
                              {selectedAiInsight.hacoDecision === 'observation_only' && <AlertCircle size={12} />}
                              {selectedAiInsight.hacoDecision.replace(/_/g, ' ')}
                            </div>
                            {selectedAiInsight.aiRationale && (
                              <p className="text-[0.7rem] ink-soft mt-2 italic">"{selectedAiInsight.aiRationale}"</p>
                            )}
                          </div>
                          
                          {/* Distress Signals */}
                          {selectedAiInsight.distressSignals && selectedAiInsight.distressSignals.length > 0 && (
                            <div className="p-3 rounded bg-red-50/50 border border-red-100">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} className="text-red-500" />
                                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-red-700">Distress Signals Detected</span>
                              </div>
                              <div className="space-y-2">
                                {selectedAiInsight.distressSignals.map((signal, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs">
                                    <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                                      signal.severity >= 7 ? 'bg-red-200 text-red-800' :
                                      signal.severity >= 4 ? 'bg-orange-200 text-orange-800' :
                                      'bg-yellow-200 text-yellow-800'
                                    }`}>
                                      {signal.severity}/10
                                    </span>
                                    <div>
                                      <span className="font-medium capitalize">{signal.type.replace(/_/g, ' ')}</span>
                                      <p className="text-[0.65rem] ink-soft">{signal.evidence}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Raw Metrics */}
                          {selectedAiInsight.rawMetrics && (
                            <div className="grid grid-cols-5 gap-2 text-center">
                              <div className="p-2 rounded bg-white/60">
                                <div className="text-sm font-bold text-red-500">{selectedAiInsight.rawMetrics.anxietyLevel}</div>
                                <div className="text-[0.55rem] ink-soft uppercase">Anxiety</div>
                              </div>
                              <div className="p-2 rounded bg-white/60">
                                <div className="text-sm font-bold text-orange-500">{selectedAiInsight.rawMetrics.frustrationLevel}</div>
                                <div className="text-[0.55rem] ink-soft uppercase">Frustration</div>
                              </div>
                              <div className="p-2 rounded bg-white/60">
                                <div className="text-sm font-bold text-yellow-600">{selectedAiInsight.rawMetrics.confusionLevel}</div>
                                <div className="text-[0.55rem] ink-soft uppercase">Confusion</div>
                              </div>
                              <div className="p-2 rounded bg-white/60">
                                <div className="text-sm font-bold text-green-500">{selectedAiInsight.rawMetrics.satisfactionLevel}</div>
                                <div className="text-[0.55rem] ink-soft uppercase">Satisfaction</div>
                              </div>
                              <div className="p-2 rounded bg-white/60">
                                <div className="text-sm font-bold text-purple-500">{selectedAiInsight.rawMetrics.urgencyLevel}</div>
                                <div className="text-[0.55rem] ink-soft uppercase">Urgency</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Admin Override Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#e5e8f2]">
                            <span className="text-[0.65rem] ink-soft">Override AI decision:</span>
                            <button
                              onClick={() => submitAdminOverride(selectedAiInsight.id, 'agree', 'Admin confirmed AI assessment')}
                              className="text-[0.6rem] px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
                              data-testid="button-override-agree"
                            >
                              <CheckCircle size={10} /> Agree
                            </button>
                            <button
                              onClick={() => submitAdminOverride(selectedAiInsight.id, 'escalate', 'Admin escalated case')}
                              className="text-[0.6rem] px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-1"
                              data-testid="button-override-escalate"
                            >
                              <TrendingUp size={10} /> Escalate
                            </button>
                            <button
                              onClick={() => submitAdminOverride(selectedAiInsight.id, 'dismiss', 'Admin dismissed AI assessment')}
                              className="text-[0.6rem] px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                              data-testid="button-override-dismiss"
                            >
                              <XCircle size={10} /> Dismiss
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Brain size={24} className="mx-auto mb-2 text-[#7c3aed]/30" />
                          <p className="text-xs ink-soft">No AI analysis available yet</p>
                          <p className="text-[0.65rem] ink-soft">Click "Run AI Analysis" to analyze client sentiment</p>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="grid grid-cols-2 gap-4">
                      <button className="flex items-center justify-center gap-2 rounded border border-[#e5e8f2] bg-white py-3 text-xs font-semibold hover:bg-gray-50 transition-colors">
                        <FileText size={14} /> View Contracts
                      </button>
                      <button className="flex items-center justify-center gap-2 rounded border border-[#e5e8f2] bg-white py-3 text-xs font-semibold hover:bg-gray-50 transition-colors">
                        <CreditCard size={14} /> Payment History
                      </button>
                      <button className="flex items-center justify-center gap-2 rounded border border-[#e5e8f2] bg-white py-3 text-xs font-semibold hover:bg-gray-50 transition-colors">
                        <HeadphonesIcon size={14} /> Support Cases
                      </button>
                      <button className="flex items-center justify-center gap-2 rounded bg-[#dc2626] py-3 text-xs font-bold text-white hover:bg-red-700 transition-colors">
                        <Activity size={14} /> INITIATE INTERVENTION
                      </button>
                    </div>
                  </>
                ) : selectedUser ? (
                  <div className="text-center py-8">
                    <h2 className="font-header text-xl ink-main mb-4">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h2>
                    <p className="text-sm ink-soft mb-4">No CDI score calculated for this client yet.</p>
                    <button
                      onClick={() => recalculateCdi(selectedUser.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800"
                      data-testid="button-calculate-cdi"
                    >
                      <Activity size={14} /> Calculate CDI Score
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity size={32} className="mx-auto mb-4 text-black/20" />
                    <p className="text-sm ink-soft">Select a client or CDI score to view details</p>
                  </div>
                )}
              </div>
            </div>

            {/* SUPPORT CASES SECTION */}
            <div className="mt-8">
              <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
                <HeadphonesIcon size={18} /> Recent Support Cases
              </h2>
              {supportCases.length === 0 ? (
                <div className="card-frame rounded-md p-6 text-center">
                  <p className="text-sm ink-soft">No support cases yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supportCases.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className={`card-frame rounded-md p-4 ${
                        c.priority === 'emergency' ? 'border-l-4 border-l-[#dc2626]' :
                        c.priority === 'high' ? 'border-l-4 border-l-[#ea580c]' : ''
                      }`}
                      data-testid={`support-case-${c.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold ink-main">{c.subject}</span>
                        <span className={`text-[0.65rem] px-2 py-0.5 rounded font-semibold ${
                          c.status === 'open' ? 'bg-red-100 text-red-700' :
                          c.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {c.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs ink-soft">{getUserName(c.userId)}</p>
                      <p className="text-[0.65rem] ink-soft mt-1">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
