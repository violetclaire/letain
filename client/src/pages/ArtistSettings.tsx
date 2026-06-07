import { useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, Check, ArrowLeft, Image, ExternalLink, Loader2, Copy, Code, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormDesigner } from "@/components/FormDesigner";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ArtistSettingsData {
  userId: string;
  artistSlug: string;
  businessName: string;
  artistName: string;
  contactEmail?: string;
  infoSheetType: 'template' | 'custom' | 'pdf';
  infoSheetContent?: string;
  infoSheetPdfUrl?: string;
  infoSheetEnabled: boolean;
  formSuccessMessage?: string;
  autoResponderMode?: 'off' | 'info_sheet' | 'smart' | 'paused' | 'paused_with_referral' | 'availability_smart';
  pauseMessage?: string;
  customResponse?: string;
  politeDeclineTemplate?: string;
  referralListTemplate?: string;
  pricingInfo?: string;
  plannerInfoSheet?: string;
  plannerPricing?: string;
}

export default function ArtistSettings() {
  const [, params] = useRoute("/:artistSlug/settings");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const artistSlug = params?.artistSlug || "";
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";
  
  // Token auth takes priority - if token is present, always use it
  // This prevents stale sessions from interfering with magic link access
  const useSessionAuth = !token && isAuthenticated && user?.role === 'artist';
  
  // Use current origin for internal links
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dateinquiry.com';
  // Production URL for embed code (artists paste this into their external website)
  const embedApiUrl = 'https://dateinquiry.com';

  const [uploading, setUploading] = useState(false);
  const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [squareConnecting, setSquareConnecting] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    notes: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Check for Square OAuth callback
  const squareConnected = searchParams.get("square") === "connected";

  // Square connection status
  const { data: squareStatus } = useQuery<{ connected: boolean; merchantId?: string }>({
    queryKey: ["/api/square/connect/status", artistSlug],
    queryFn: async () => {
      const res = await fetch(`/api/square/connect/status/${artistSlug}`);
      if (!res.ok) return { connected: false };
      return res.json();
    },
    enabled: !!artistSlug,
  });

  const handleSquareConnect = async () => {
    setSquareConnecting(true);
    window.location.href = `/api/square/connect/start/${artistSlug}`;
  };

  const handleCreateClient = async () => {
    if (!newClientData.clientName || !newClientData.clientEmail) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setCreatingClient(true);
    try {
      const res = await fetch(`/api/public/artists/settings/create-client?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create client");
      }
      const data = await res.json();
      toast({ title: "Client added successfully" });
      setShowAddClient(false);
      setNewClientData({ clientName: "", clientEmail: "", clientPhone: "", eventDate: "", notes: "" });
      if (data.threadToken) {
        window.location.href = `/inquiry/${data.threadToken}`;
      }
    } catch (error: any) {
      toast({ title: "Failed to add client", description: error.message, variant: "destructive" });
    } finally {
      setCreatingClient(false);
    }
  };

  const { data: settings, isLoading, error } = useQuery<ArtistSettingsData>({
    queryKey: ["/api/artist/settings", token, useSessionAuth],
    queryFn: async () => {
      // If using session auth, call the authenticated endpoint
      if (useSessionAuth) {
        const res = await fetch(`/api/artist/settings`, { credentials: 'include' });
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      }
      // Otherwise use token auth
      const res = await fetch(`/api/public/artists/settings?token=${token}`);
      if (!res.ok) throw new Error("Invalid or expired settings link");
      return res.json();
    },
    enabled: !!token || useSessionAuth
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<ArtistSettingsData>) => {
      const url = useSessionAuth ? `/api/artist/settings` : `/api/public/artists/settings?token=${token}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: useSessionAuth ? 'include' : 'same-origin',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      // Reset local state first so refetch shows the saved value
      setLocalSuccessMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/artist/settings", token, useSessionAuth] });
      toast({
        title: "Settings saved",
        description: "Your info sheet settings have been updated."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateSlug = useMutation({
    mutationFn: async (slug: string) => {
      const url = token ? `/api/public/artist/slug?token=${token}` : `/api/artist/slug`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ newSlug: slug })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update link");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist/settings", token, useSessionAuth] });
      toast({
        title: "Link updated",
        description: data.message || "Your form link has been updated."
      });
      setEditingSlug(false);
      // Redirect to new slug URL with token preserved
      if (data.artistSlug) {
        const tokenParam = data.editToken ? `?token=${data.editToken}` : (token ? `?token=${token}` : '');
        setLocation(`/${data.artistSlug}/settings${tokenParam}`);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update link. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateEmail = useMutation({
    mutationFn: async (email: string) => {
      // Use token-based endpoint when token is present, session-based otherwise
      const endpoint = token 
        ? `/api/public/artist/email?token=${encodeURIComponent(token)}`
        : `/api/artist/email`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update email");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist/settings", token, useSessionAuth] });
      toast({
        title: "Email updated",
        description: data.message || "Your contact email has been updated."
      });
      setEditingEmail(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update email. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPG, PNG, WebP).",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Use session-based endpoint if logged in, otherwise use token-based
      const uploadUrl = useSessionAuth 
        ? `/api/artist/settings/upload`
        : `/api/public/artists/settings/upload?token=${token}`;
      
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: useSessionAuth ? 'include' : 'same-origin',
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64,
          mimeType: file.type
        })
      });

      if (!res.ok) {
        let errorMsg = "Upload failed";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse upload error response:", e);
        }
        throw new Error(errorMsg);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/artist/settings", token, useSessionAuth] });
      
      toast({
        title: "File uploaded",
        description: "Your info sheet has been uploaded successfully."
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Wait for auth to finish loading before deciding if link is invalid
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <p className="text-[#666]">Loading...</p>
      </div>
    );
  }

  if (!token && !useSessionAuth) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-black mb-4">Invalid Link</h1>
          <p className="text-[#666]">This settings link is missing or invalid. Please use the link from your welcome email.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-[#666]">Loading...</div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-black mb-4">Link Expired or Invalid</h1>
          <p className="text-[#666]">This settings link may have expired or is invalid. Please contact support if you need access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-[#E8E2D9]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation(`/admin/${settings.artistSlug || artistSlug}${token ? `?token=${token}` : ''}`)}
            className="text-[#555] hover:text-black transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-serif text-black">{settings.businessName}</h1>
            <p className="text-sm text-[#666]">Settings</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Response Settings Section */}
          <section className="border border-[#E8E2D9] rounded p-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#888] mb-2">Response Settings</p>
            <h2 className="text-lg font-serif text-black mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Response Mode
            </h2>
            <p className="text-[#666] text-sm mb-5">
              Choose how you handle new inquiries.
            </p>

            <div className="space-y-3">
              {/* Manual Review - Default */}
              <label 
                className={`flex items-start gap-4 p-4 rounded cursor-pointer transition-all ${
                  (settings.autoResponderMode === 'smart' || settings.autoResponderMode === 'off' || !settings.autoResponderMode)
                    ? 'bg-[#F5F0E8] ring-1 ring-[#F5F0E8]' 
                    : 'border border-[#E8E2D9] hover:border-[#999]'
                }`}
                title="You review each inquiry and decide how to respond"
              >
                <input type="radio" name="autoResponderMode" value="smart" checked={settings.autoResponderMode === 'smart' || settings.autoResponderMode === 'off' || !settings.autoResponderMode} onChange={() => updateSettings.mutate({ autoResponderMode: 'smart' })} className="sr-only" data-testid="radio-smart" />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${(settings.autoResponderMode === 'smart' || settings.autoResponderMode === 'off' || !settings.autoResponderMode) ? 'text-[#1A1A1A]' : 'text-black'}`}>Manual Review</p>
                  <p className={`text-xs mt-1 ${(settings.autoResponderMode === 'smart' || settings.autoResponderMode === 'off' || !settings.autoResponderMode) ? 'text-[#1A1A1A]/60' : 'text-[#777]'}`}>
                    Review each inquiry, then one-click to accept (sends pricing sheet to clients, availability to planners), refer to your circle, or decline
                  </p>
                </div>
              </label>

              {/* Calendar Smart - Availability-aware */}
              <label 
                className={`flex items-start gap-4 p-4 rounded cursor-pointer transition-all ${
                  settings.autoResponderMode === 'availability_smart'
                    ? 'bg-[#F5F0E8] ring-1 ring-[#F5F0E8]' 
                    : 'border border-[#E8E2D9] hover:border-[#999]'
                }`}
                title="Checks your calendar first. If available, sends your pricing. If booked, sends referrals to your circle."
              >
                <input type="radio" name="autoResponderMode" value="availability_smart" checked={settings.autoResponderMode === 'availability_smart'} onChange={() => updateSettings.mutate({ autoResponderMode: 'availability_smart' })} className="sr-only" data-testid="radio-calendar-smart" />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${settings.autoResponderMode === 'availability_smart' ? 'text-[#1A1A1A]' : 'text-black'}`}>Calendar Smart</p>
                  <p className={`text-xs mt-1 ${settings.autoResponderMode === 'availability_smart' ? 'text-[#1A1A1A]/60' : 'text-[#777]'}`}>
                    Checks your calendar first. If available, auto-sends pricing. If booked, auto-sends referrals to your circle.
                  </p>
                </div>
              </label>

              {/* Vacation / Auto Response */}
              <label 
                className={`flex items-start gap-4 p-4 rounded cursor-pointer transition-all ${
                  (settings.autoResponderMode === 'paused' || settings.autoResponderMode === 'paused_with_referral')
                    ? 'bg-[#F5F0E8] ring-1 ring-[#F5F0E8]' 
                    : 'border border-[#E8E2D9] hover:border-[#999]'
                }`}
                title="Sends your away message to all new inquiries"
              >
                <input type="radio" name="autoResponderMode" value="paused" checked={settings.autoResponderMode === 'paused' || settings.autoResponderMode === 'paused_with_referral'} onChange={() => updateSettings.mutate({ autoResponderMode: 'paused' })} className="sr-only" data-testid="radio-vacation" />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${(settings.autoResponderMode === 'paused' || settings.autoResponderMode === 'paused_with_referral') ? 'text-[#1A1A1A]' : 'text-black'}`}>Vacation / Away</p>
                  <p className={`text-xs mt-1 ${(settings.autoResponderMode === 'paused' || settings.autoResponderMode === 'paused_with_referral') ? 'text-[#1A1A1A]/60' : 'text-[#777]'}`}>
                    Automatically send a custom message to all new inquiries while you're unavailable
                  </p>
                </div>
              </label>
            </div>

            {/* Pause Message Editor - shows when vacation mode is selected */}
            {(settings.autoResponderMode === 'paused' || settings.autoResponderMode === 'paused_with_referral') && (
              <div className="mt-4 pt-4 border-t border-[#E8E2D9]">
                <label className="block text-sm text-[#555] mb-2">Your Custom Pause Message</label>
                <textarea
                  value={settings.pauseMessage || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      updateSettings.mutate({ customResponse: value });
                    }, 800);
                  }}
                  placeholder="Thank you! I'll respond shortly."
                  className="w-full bg-[#F5F2ED] border border-[#E8E2D9] rounded p-3 text-sm text-black placeholder:text-[#999] focus:outline-none focus:border-[#6B4A55] min-h-[120px] resize-none"
                  data-testid="textarea-pause-message"
                />
                <p className="text-xs text-[#888] mt-2">This message will be sent automatically to anyone who inquires while you're away.</p>
              </div>
            )}
          </section>

          {/* Your Form Link */}
          <section className="border border-[#E8E2D9] rounded p-6">
            <h2 className="text-lg font-serif text-black mb-2">Your Form Link</h2>
            <p className="text-[#666] text-sm mb-4">
              This is the link clients use to inquire about your services.
            </p>
            
            {editingSlug ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#777]">atbriarwood.com/</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="yourname"
                    className="flex-1 border border-[#E8E2D9] bg-transparent rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-[#6B4A55]"
                    data-testid="input-new-slug"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateSlug.mutate(newSlug)}
                    disabled={updateSlug.isPending || !newSlug || newSlug.length < 3}
                    className="bg-[#F5F0E8] hover:bg-white text-[#1A1A1A]"
                    data-testid="button-save-slug"
                  >
                    {updateSlug.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setEditingSlug(false); setNewSlug(""); }}
                    className="border-[#E8E2D9] text-black hover:bg-[#F5F2ED]"
                    data-testid="button-cancel-slug"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F5F2ED] rounded px-4 py-3">
                  <p className="text-sm font-medium text-black">atbriarwood.com/{settings.artistSlug}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingSlug(true); setNewSlug(settings.artistSlug || ""); }}
                  className="border-[#E8E2D9] text-black hover:bg-[#F5F2ED]"
                  data-testid="button-edit-slug"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
          </section>

          {/* Contact Email */}
          <section className="border border-[#E8E2D9] rounded p-6">
            <h2 className="text-lg font-serif text-black mb-2">Contact Email</h2>
            <p className="text-[#666] text-sm mb-4">
              This email appears in Reply-To on client emails. Make sure it's correct.
            </p>
            
            {editingEmail ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
                  placeholder="your@email.com"
                  className="w-full border border-[#E8E2D9] bg-transparent rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-[#6B4A55]"
                  data-testid="input-new-email"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateEmail.mutate(newEmail)}
                    disabled={updateEmail.isPending || !newEmail || !newEmail.includes('@')}
                    className="bg-[#F5F0E8] hover:bg-white text-[#1A1A1A]"
                    data-testid="button-save-email"
                  >
                    {updateEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setEditingEmail(false); setNewEmail(""); }}
                    className="border-[#E8E2D9] text-black hover:bg-[#F5F2ED]"
                    data-testid="button-cancel-email"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F5F2ED] rounded px-4 py-3">
                  <p className="text-sm font-medium text-black">{settings.contactEmail || 'Not set'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingEmail(true); setNewEmail(settings.contactEmail || ""); }}
                  className="border-[#E8E2D9] text-black hover:bg-[#F5F2ED]"
                  data-testid="button-edit-email"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
          </section>

          {/* Square Payment Connection */}
          <section className="border border-[#E8E2D9] rounded p-6">
            <h2 className="text-lg font-serif text-black mb-2">Payment Processing</h2>
            <p className="text-[#666] text-sm mb-4">
              Connect Square to send invoices and collect payments from clients.
            </p>
            
            {(squareStatus?.connected || squareConnected) ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded">
                <Check className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-emerald-400 font-medium">Square Connected</p>
                  <p className="text-[#777] text-xs">You can now send invoices from inquiry threads</p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleSquareConnect}
                disabled={squareConnecting}
                className="bg-[#F5F0E8] text-[#1A1A1A] hover:bg-white"
                data-testid="button-connect-square"
              >
                {squareConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Square"
                )}
              </Button>
            )}
          </section>

          {/* Add Client */}
          <section className="border border-[#E8E2D9] rounded p-6">
            <h2 className="text-lg font-serif text-black mb-2">Add New Client</h2>
            <p className="text-[#666] text-sm mb-4">
              Manually add a client to send them an invoice or contract.
            </p>
            <Button
              onClick={() => setShowAddClient(true)}
              className="bg-[#F5F0E8] text-[#1A1A1A] hover:bg-white"
              data-testid="button-add-client-settings"
            >
              Add Client
            </Button>
          </section>

          {/* Upload Your Info Sheet */}
          <section className="border border-[#E8E2D9] rounded p-6">
            <h2 className="text-lg font-serif text-black mb-2">Upload Your Info Sheet</h2>
            <p className="text-[#666] text-sm mb-6">
              Your pricing guide or info sheet. Sent to clients when you accept their inquiry.
            </p>

            <div className="space-y-4">
              {settings.infoSheetPdfUrl && (
                <div className="bg-[#F5F2ED] rounded p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#F5F0E8] rounded flex items-center justify-center flex-shrink-0">
                      {settings.infoSheetPdfUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                        <Image className="w-6 h-6 text-[#1A1A1A]" />
                      ) : (
                        <FileText className="w-6 h-6 text-[#1A1A1A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate">Current Info Sheet</p>
                      <p className="text-xs text-[#777]">
                        {settings.infoSheetPdfUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? 'Image' : 'PDF'} uploaded
                      </p>
                      <a
                        href={settings.infoSheetPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-black hover:underline mt-2"
                        data-testid="link-view-info-sheet"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View current file
                      </a>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-dashed border-[#E8E2D9] rounded p-4 hover:border-[#999] transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  data-testid="input-file-upload"
                />
                
                {uploading ? (
                  <div className="flex items-center justify-center gap-3 py-2">
                    <Loader2 className="w-5 h-5 text-black animate-spin" />
                    <p className="text-[#666] text-sm">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-[#888]" />
                      <div>
                        <p className="text-sm text-[#666]">PDF, JPG, PNG, or WebP</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="border-[#E8E2D9] text-black hover:bg-[#F5F0E8] hover:text-[#1A1A1A]"
                      data-testid="button-upload-file"
                    >
                      {settings.infoSheetPdfUrl ? 'Replace' : 'Upload'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="border border-[#E8E2D9] rounded p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-black" />
              <h2 className="text-lg font-serif text-black">Customize Your Inquiry Form</h2>
            </div>
            <p className="text-[#666] text-sm mb-6">
              Add, remove, or reorder fields on your inquiry form. Core fields (name, email, date) cannot be removed but can be customized.
            </p>
            
            <FormDesigner artistId={settings.userId} token={token} />
          </section>

          <section className="border border-[#E8E2D9] rounded p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-black" />
              <h2 className="text-lg font-serif text-black">Your Contact Form</h2>
            </div>
            <p className="text-[#666] text-sm mb-6">
              Add this to your website's contact page. Clients stay on your site, see your brand. No redirects, invisible to your clients.
            </p>
            
            <div className="space-y-4">
                <div className="mb-4">
                  <Label className="text-sm text-[#555] mb-2 block">Success Message (shown after client submits)</Label>
                  <input
                    type="text"
                    value={localSuccessMessage !== null ? localSuccessMessage : (settings.formSuccessMessage || "Thank you! I'll respond shortly.")}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocalSuccessMessage(value);
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      debounceRef.current = setTimeout(() => {
                        updateSettings.mutate({ formSuccessMessage: value });
                      }, 1500);
                    }}
                    onBlur={() => {
                      // Save immediately when leaving the field
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      if (localSuccessMessage !== null) {
                        updateSettings.mutate({ formSuccessMessage: localSuccessMessage });
                      }
                    }}
                    placeholder="Thank you! I'll respond shortly."
                    className="w-full px-3 py-2 border border-[#E8E2D9] bg-transparent rounded text-sm text-black focus:outline-none focus:border-[#6B4A55]"
                    data-testid="input-success-message"
                  />
                </div>
                
                <div className="bg-[#1a1a1a] rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
{`<!-- Contact Form - Style however you want! -->
<form id="contact-form">
  <input type="text" name="clientName" placeholder="Your name" required />
  <input type="email" name="clientEmail" placeholder="Email" required />
  <input type="date" name="eventDate" />
  <textarea name="message" placeholder="Tell me about your event"></textarea>
  <button type="submit">Submit Inquiry</button>
</form>
<div id="form-success" style="display:none;">
  ${escapeHtml(settings.formSuccessMessage || "Thank you! I'll respond shortly.")}
</div>

<script>
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  
  try {
    const res = await fetch('${embedApiUrl}/api/public/contact-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistSlug: '${settings.artistSlug}',
        source: 'website',
        clientName: form.clientName.value,
        clientEmail: form.clientEmail.value,
        eventDate: form.eventDate.value,
        message: form.message.value
      })
    });
    
    if (res.ok) {
      form.style.display = 'none';
      document.getElementById('form-success').style.display = 'block';
    } else {
      throw new Error('Failed');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Submit Inquiry';
    alert('Something went wrong. Please try again.');
  }
});
</script>`}
                  </pre>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const successMsg = escapeHtml(settings.formSuccessMessage || "Thank you! I'll respond shortly.");
                      const embedCode = `<!-- Contact Form - Style however you want! -->
<form id="contact-form">
  <input type="text" name="clientName" placeholder="Your name" required />
  <input type="email" name="clientEmail" placeholder="Email" required />
  <input type="date" name="eventDate" />
  <textarea name="message" placeholder="Tell me about your event"></textarea>
  <button type="submit">Submit Inquiry</button>
</form>
<div id="form-success" style="display:none;">
  ${successMsg}
</div>

<script>
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  
  try {
    const res = await fetch('${embedApiUrl}/api/public/contact-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistSlug: '${settings.artistSlug}',
        source: 'website',
        clientName: form.clientName.value,
        clientEmail: form.clientEmail.value,
        eventDate: form.eventDate.value,
        message: form.message.value
      })
    });
    
    if (res.ok) {
      form.style.display = 'none';
      document.getElementById('form-success').style.display = 'block';
    } else {
      throw new Error('Failed');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Submit Inquiry';
    alert('Something went wrong. Please try again.');
  }
});
<\/script>`;
                      navigator.clipboard.writeText(embedCode);
                      toast({ title: "Embed code copied!" });
                    }}
                    className="border-[#E8E2D9] text-black hover:bg-[#F5F2ED]"
                    data-testid="button-copy-embed-code"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Embed Code
                  </Button>
                </div>
                <p className="text-xs text-[#777] mt-3">
                  Advanced: Style the form however you want. Form submits without redirect.
                </p>
                
                <div className="mt-6 pt-4 border-t border-[#E8E2D9]">
                  <p className="text-xs text-[#555] font-medium mb-3">Easy Embed (for Square, Wix, Squarespace):</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const simpleEmbed = `<iframe src="https://dateinquiry.com/inquire/${settings.artistSlug}" width="100%" height="800" frameborder="0" style="border: none;"></iframe>`;
                      navigator.clipboard.writeText(simpleEmbed);
                      toast({ title: "Simple embed code copied!" });
                    }}
                    className="border-[#E8E2D9] text-black hover:bg-[#F5F2ED]"
                    data-testid="button-copy-simple-embed"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Simple Embed
                  </Button>
                  <p className="text-xs text-[#777] mt-2">
                    Just paste this one line. Your inquiry form appears on your site.
                  </p>
                </div>
                
                <div className="mt-4 p-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded">
                  <p className="text-xs text-[#555] font-medium mb-1">For Instagram / Social Media:</p>
                  <p className="text-xs text-[#777]">
                    Share your direct link: atbriarwood.com/inquire/{settings.artistSlug}
                  </p>
                </div>
            </div>
          </section>
        </motion.div>
      </main>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-serif text-black mb-4">Add New Client</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#666] mb-1">Client Name *</label>
                <input
                  type="text"
                  value={newClientData.clientName}
                  onChange={(e) => setNewClientData({ ...newClientData, clientName: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#C4A35A]"
                  data-testid="input-settings-client-name"
                />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">Email *</label>
                <input
                  type="email"
                  value={newClientData.clientEmail}
                  onChange={(e) => setNewClientData({ ...newClientData, clientEmail: e.target.value })}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#C4A35A]"
                  data-testid="input-settings-client-email"
                />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClientData.clientPhone}
                  onChange={(e) => setNewClientData({ ...newClientData, clientPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#C4A35A]"
                  data-testid="input-settings-client-phone"
                />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">Event Date</label>
                <input
                  type="date"
                  value={newClientData.eventDate}
                  onChange={(e) => setNewClientData({ ...newClientData, eventDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#C4A35A]"
                  data-testid="input-settings-client-date"
                />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">Notes</label>
                <textarea
                  value={newClientData.notes}
                  onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
                  placeholder="Any notes about this client..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#C4A35A] resize-none"
                  data-testid="input-settings-client-notes"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddClient(false);
                  setNewClientData({ clientName: "", clientEmail: "", clientPhone: "", eventDate: "", notes: "" });
                }}
                className="flex-1 px-4 py-2 border border-[#E8E2D9] rounded text-sm hover:bg-[#F5F2ED]"
                data-testid="button-cancel-add-client-settings"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={creatingClient || !newClientData.clientName || !newClientData.clientEmail}
                className="flex-1 px-4 py-2 bg-[#C4A35A] hover:bg-[#C4A35A]/90 text-[#1A1A1A] rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-create-client-settings"
              >
                {creatingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
