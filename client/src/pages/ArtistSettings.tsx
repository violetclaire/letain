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
  infoSheetType: 'template' | 'custom' | 'pdf';
  infoSheetContent?: string;
  infoSheetPdfUrl?: string;
  infoSheetEnabled: boolean;
  formSuccessMessage?: string;
  autoResponderMode?: 'off' | 'info_sheet' | 'smart' | 'paused' | 'paused_with_referral';
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
  const { user, isAuthenticated } = useAuth();
  
  const artistSlug = params?.artistSlug || "";
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";
  
  // Support both token and session-based auth
  const useSessionAuth = isAuthenticated && user?.role === 'artist';
  
  // Use current origin for internal links
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dateinquiry.com';
  // Production URL for embed code (artists paste this into their external website)
  const embedApiUrl = 'https://dateinquiry.com';

  const [uploading, setUploading] = useState(false);
  const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState("");

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
      const res = await fetch(`/api/artist/slug`, {
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
      // Redirect to new slug URL
      if (data.artistSlug) {
        setLocation(`/${data.artistSlug}/settings`);
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
      
      const res = await fetch(`/api/public/artists/settings/upload?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64,
          mimeType: file.type
        })
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/public/artists/settings", token] });
      
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

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#6B4A55] mb-4">Invalid Link</h1>
          <p className="text-gray-600">This settings link is missing or invalid. Please use the link from your welcome email.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="animate-pulse text-[#6B4A55]">Loading...</div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#6B4A55] mb-4">Link Expired or Invalid</h1>
          <p className="text-gray-600">This settings link may have expired or is invalid. Please contact support if you need access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <header className="bg-[#3d1a22]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation(`/${artistSlug}`)}
            className="text-[#f5f3ef]/70 hover:text-[#f5f3ef] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-serif text-[#f5f3ef]">{settings.businessName}</h1>
            <p className="text-sm text-[#f5f3ef]/60">Settings</p>
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
          <section className="bg-[#3d1a22] rounded-xl p-6 shadow-sm">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#f5f3ef]/50 mb-2">Response Settings</p>
            <h2 className="text-lg font-serif text-[#f5f3ef] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Auto-Responder Mode
            </h2>
            <p className="text-[#f5f3ef]/70 text-sm mb-5">
              Control how you respond to new inquiries.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {/* Smart */}
              <label className={`flex flex-col items-center justify-center text-center px-3 py-3 rounded-lg cursor-pointer transition-all ${
                settings.autoResponderMode === 'smart' 
                  ? 'bg-[#f5f3ef] ring-2 ring-[#f5f3ef]' 
                  : 'border border-[#f5f3ef]/20 hover:border-[#f5f3ef]/40'
              }`}>
                <input type="radio" name="autoResponderMode" value="smart" checked={settings.autoResponderMode === 'smart'} onChange={() => updateSettings.mutate({ autoResponderMode: 'smart' })} className="sr-only" data-testid="radio-smart" />
                <p className={`font-medium text-sm ${settings.autoResponderMode === 'smart' ? 'text-[#3d1a22]' : 'text-[#f5f3ef]'}`}>Smart</p>
                <p className={`text-[10px] mt-0.5 ${settings.autoResponderMode === 'smart' ? 'text-[#3d1a22]/60' : 'text-[#f5f3ef]/50'}`}>Calendar-aware</p>
              </label>

              {/* Info Sheet */}
              <label className={`flex flex-col items-center justify-center text-center px-3 py-3 rounded-lg cursor-pointer transition-all ${
                settings.autoResponderMode === 'info_sheet' 
                  ? 'bg-[#f5f3ef] ring-2 ring-[#f5f3ef]' 
                  : 'border border-[#f5f3ef]/20 hover:border-[#f5f3ef]/40'
              }`}>
                <input type="radio" name="autoResponderMode" value="info_sheet" checked={settings.autoResponderMode === 'info_sheet'} onChange={() => updateSettings.mutate({ autoResponderMode: 'info_sheet' })} className="sr-only" data-testid="radio-info-sheet" />
                <p className={`font-medium text-sm ${settings.autoResponderMode === 'info_sheet' ? 'text-[#3d1a22]' : 'text-[#f5f3ef]'}`}>Info Sheet</p>
                <p className={`text-[10px] mt-0.5 ${settings.autoResponderMode === 'info_sheet' ? 'text-[#3d1a22]/60' : 'text-[#f5f3ef]/50'}`}>Auto-send always</p>
              </label>

              {/* Paused + Refer */}
              <label className={`flex flex-col items-center justify-center text-center px-3 py-3 rounded-lg cursor-pointer transition-all ${
                settings.autoResponderMode === 'paused_with_referral' 
                  ? 'bg-[#f5f3ef] ring-2 ring-[#f5f3ef]' 
                  : 'border border-[#f5f3ef]/20 hover:border-[#f5f3ef]/40'
              }`}>
                <input type="radio" name="autoResponderMode" value="paused_with_referral" checked={settings.autoResponderMode === 'paused_with_referral'} onChange={() => updateSettings.mutate({ autoResponderMode: 'paused_with_referral' })} className="sr-only" data-testid="radio-paused-referral" />
                <p className={`font-medium text-sm ${settings.autoResponderMode === 'paused_with_referral' ? 'text-[#3d1a22]' : 'text-[#f5f3ef]'}`}>Paused + Refer</p>
                <p className={`text-[10px] mt-0.5 ${settings.autoResponderMode === 'paused_with_referral' ? 'text-[#3d1a22]/60' : 'text-[#f5f3ef]/50'}`}>Send to circle</p>
              </label>

              {/* Paused */}
              <label className={`flex flex-col items-center justify-center text-center px-3 py-3 rounded-lg cursor-pointer transition-all ${
                settings.autoResponderMode === 'paused' 
                  ? 'bg-[#f5f3ef] ring-2 ring-[#f5f3ef]' 
                  : 'border border-[#f5f3ef]/20 hover:border-[#f5f3ef]/40'
              }`}>
                <input type="radio" name="autoResponderMode" value="paused" checked={settings.autoResponderMode === 'paused'} onChange={() => updateSettings.mutate({ autoResponderMode: 'paused' })} className="sr-only" data-testid="radio-paused" />
                <p className={`font-medium text-sm ${settings.autoResponderMode === 'paused' ? 'text-[#3d1a22]' : 'text-[#f5f3ef]'}`}>Paused</p>
                <p className={`text-[10px] mt-0.5 ${settings.autoResponderMode === 'paused' ? 'text-[#3d1a22]/60' : 'text-[#f5f3ef]/50'}`}>No response</p>
              </label>

              {/* Off - spans full width */}
              <label className={`col-span-2 flex flex-col items-center justify-center text-center px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                (settings.autoResponderMode === 'off' || !settings.autoResponderMode)
                  ? 'bg-[#f5f3ef] ring-2 ring-[#f5f3ef]' 
                  : 'border border-[#f5f3ef]/20 hover:border-[#f5f3ef]/40'
              }`}>
                <input type="radio" name="autoResponderMode" value="off" checked={settings.autoResponderMode === 'off' || !settings.autoResponderMode} onChange={() => updateSettings.mutate({ autoResponderMode: 'off' })} className="sr-only" data-testid="radio-off" />
                <p className={`font-medium text-sm ${(settings.autoResponderMode === 'off' || !settings.autoResponderMode) ? 'text-[#3d1a22]' : 'text-[#f5f3ef]'}`}>Off</p>
                <p className={`text-[10px] mt-0.5 ${(settings.autoResponderMode === 'off' || !settings.autoResponderMode) ? 'text-[#3d1a22]/60' : 'text-[#f5f3ef]/50'}`}>Manual review only</p>
              </label>
            </div>
          </section>

          {/* Your Form Link */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-serif text-[#6B4A55] mb-2">Your Form Link</h2>
            <p className="text-gray-600 text-sm mb-4">
              This is the link clients use to inquire about your services.
            </p>
            
            {editingSlug ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">dateinquiry.com/</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="yourname"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4A55]"
                    data-testid="input-new-slug"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateSlug.mutate(newSlug)}
                    disabled={updateSlug.isPending || !newSlug || newSlug.length < 3}
                    className="bg-[#6B4A55] hover:bg-[#5a3d47] text-white"
                    data-testid="button-save-slug"
                  >
                    {updateSlug.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setEditingSlug(false); setNewSlug(""); }}
                    data-testid="button-cancel-slug"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#FAF8F5] rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-[#6B4A55]">dateinquiry.com/{settings.artistSlug}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingSlug(true); setNewSlug(settings.artistSlug || ""); }}
                  data-testid="button-edit-slug"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
          </section>

          {/* Upload Your Info Sheet */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-serif text-[#6B4A55] mb-2">Upload Your Info Sheet</h2>
            <p className="text-gray-600 text-sm mb-6">
              Your pricing guide or info sheet. Sent to clients when you accept their inquiry.
            </p>

            <div className="space-y-4">
              {settings.infoSheetPdfUrl && (
                <div className="bg-[#FAF8F5] rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#6B4A55] rounded-lg flex items-center justify-center flex-shrink-0">
                      {settings.infoSheetPdfUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                        <Image className="w-6 h-6 text-white" />
                      ) : (
                        <FileText className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#6B4A55] truncate">Current Info Sheet</p>
                      <p className="text-xs text-gray-500">
                        {settings.infoSheetPdfUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? 'Image' : 'PDF'} uploaded
                      </p>
                      <a
                        href={settings.infoSheetPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#6B4A55] hover:underline mt-2"
                        data-testid="link-view-info-sheet"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View current file
                      </a>
                    </div>
                    <div className="flex items-center text-green-600">
                      <Check className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#6B4A55] transition-colors">
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
                    <Loader2 className="w-5 h-5 text-[#6B4A55] animate-spin" />
                    <p className="text-gray-600 text-sm">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">PDF, JPG, PNG, or WebP</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="border-[#6B4A55] text-[#6B4A55] hover:bg-[#6B4A55] hover:text-white"
                      data-testid="button-upload-file"
                    >
                      {settings.infoSheetPdfUrl ? 'Replace' : 'Upload'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-[#6B4A55]" />
              <h2 className="text-lg font-serif text-[#6B4A55]">Customize Your Inquiry Form</h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Add, remove, or reorder fields on your inquiry form. Core fields (name, email, date) cannot be removed but can be customized.
            </p>
            
            <FormDesigner artistId={settings.userId} token={token} />
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-[#6B4A55]" />
              <h2 className="text-lg font-serif text-[#6B4A55]">Your Contact Form</h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Add this to your website's contact page. Clients stay on your site, see your brand. No redirects, no Beauvette branding visible anywhere.
            </p>
            
            <div className="space-y-4">
                <div className="mb-4">
                  <Label className="text-sm text-gray-700 mb-2 block">Success Message (shown after client submits)</Label>
                  <input
                    type="text"
                    value={localSuccessMessage !== null ? localSuccessMessage : (settings.formSuccessMessage || "Thank you! I'll respond shortly.")}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocalSuccessMessage(value);
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      debounceRef.current = setTimeout(() => {
                        updateSettings.mutate({ formSuccessMessage: value });
                        setLocalSuccessMessage(null);
                      }, 800);
                    }}
                    placeholder="Thank you! I'll respond shortly."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4A55]/20 focus:border-[#6B4A55]"
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
                    className="border-[#6B4A55] text-[#6B4A55]"
                    data-testid="button-copy-embed-code"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Embed Code
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Style the form and success message however you want. Client never leaves your site, never sees any redirect.
                </p>
                
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium mb-1">For Instagram / Social Media:</p>
                  <p className="text-xs text-amber-700">
                    Share your own website's contact page URL (e.g., themakeupdolls.com/contact). 
                    Clients see only your brand, never ours.
                  </p>
                </div>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
