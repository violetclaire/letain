import { useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, Check, ArrowLeft, Image, ExternalLink, Loader2, Copy, Code, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  autoResponderMode?: 'manual' | 'auto_info_sheet' | 'smart';
  politeDeclineTemplate?: string;
  referralListTemplate?: string;
}

export default function ArtistSettings() {
  const [, params] = useRoute("/:artistSlug/settings");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const artistSlug = params?.artistSlug || "";
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";
  
  // Use current origin for internal links
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dateinquiry.com';
  // Production URL for embed code (artists paste this into their external website)
  const embedApiUrl = 'https://dateinquiry.com';

  const [uploading, setUploading] = useState(false);
  const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { data: settings, isLoading, error } = useQuery<ArtistSettingsData>({
    queryKey: ["/api/public/artists/settings", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/artists/settings?token=${token}`);
      if (!res.ok) throw new Error("Invalid or expired settings link");
      return res.json();
    },
    enabled: !!token
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<ArtistSettingsData>) => {
      const res = await fetch(`/api/public/artists/settings?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/artists/settings", token] });
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
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation(`/${artistSlug}`)}
            className="text-[#6B4A55] hover:text-[#5A1F2B] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-serif text-[#6B4A55]">{settings.businessName}</h1>
            <p className="text-sm text-gray-500">Settings</p>
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
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-2">Response Settings</p>
            <h2 className="text-lg font-serif text-[#6B4A55] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Response Settings
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Control how you respond to new inquiries.
            </p>

            <div className="space-y-4 mb-8">
              <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400">Auto-Responder</p>
              
              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-[#6B4A55] transition-colors">
                <input
                  type="radio"
                  name="autoResponderMode"
                  value="manual"
                  checked={settings.autoResponderMode === 'manual' || !settings.autoResponderMode}
                  onChange={() => updateSettings.mutate({ autoResponderMode: 'manual' })}
                  className="mt-1"
                  data-testid="radio-manual-approval"
                />
                <div>
                  <p className="font-medium text-[#6B4A55]">Manual Approval</p>
                  <p className="text-sm text-gray-500">Review each inquiry and choose: Accept, Refer, or Decline</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-[#6B4A55] transition-colors">
                <input
                  type="radio"
                  name="autoResponderMode"
                  value="auto_info_sheet"
                  checked={settings.autoResponderMode === 'auto_info_sheet'}
                  onChange={() => updateSettings.mutate({ autoResponderMode: 'auto_info_sheet' })}
                  className="mt-1"
                  data-testid="radio-auto-info-sheet"
                />
                <div>
                  <p className="font-medium text-[#6B4A55]">Auto-Send Info Sheet</p>
                  <p className="text-sm text-gray-500">Automatically send your info sheet to every inquiry</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-[#6B4A55] transition-colors">
                <input
                  type="radio"
                  name="autoResponderMode"
                  value="smart"
                  checked={settings.autoResponderMode === 'smart'}
                  onChange={() => updateSettings.mutate({ autoResponderMode: 'smart' })}
                  className="mt-1"
                  data-testid="radio-smart-response"
                />
                <div>
                  <p className="font-medium text-[#6B4A55]">Smart Response</p>
                  <p className="text-sm text-gray-500">Check your calendar: if available, send info sheet. If booked, wait for your manual response.</p>
                </div>
              </label>
            </div>
          </section>

          {/* Response Templates Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-2">Response Templates</p>
            <h2 className="text-lg font-serif text-[#6B4A55] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Response Templates
            </h2>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400 mb-3">Referral List</p>
                <p className="text-sm text-gray-500 mb-3">This is sent when you refer a client to your trusted colleagues.</p>
                <textarea
                  value={settings.referralListTemplate || "Thank you so much for thinking of me!\nUnfortunately, I'm already booked for that date.\n\nI'd love to recommend some talented colleagues who may be available:"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      updateSettings.mutate({ referralListTemplate: value });
                    }, 800);
                  }}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4A55]/20 focus:border-[#6B4A55]"
                  data-testid="input-referral-template"
                />
              </div>

              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400 mb-3">Polite Decline</p>
                <p className="text-sm text-gray-500 mb-3">This is sent when you politely decline an inquiry.</p>
                <textarea
                  value={settings.politeDeclineTemplate || "Thank you so much for reaching out!\nUnfortunately, I'm not available for your date.\n\nI wish you all the best for your special day!"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      updateSettings.mutate({ politeDeclineTemplate: value });
                    }, 800);
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4A55]/20 focus:border-[#6B4A55]"
                  data-testid="input-decline-template"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-serif text-[#6B4A55] mb-4">Pricing & Info Sheet</h2>
            <p className="text-gray-600 text-sm mb-6">
              Upload your pricing guide or info sheet. This will be automatically sent to clients when they inquire about your services.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="info-sheet-enabled" className="text-[#6B4A55] font-medium">
                    Auto-send to clients
                  </Label>
                  <p className="text-sm text-gray-500">Send your info sheet when clients submit an inquiry</p>
                </div>
                <Switch
                  id="info-sheet-enabled"
                  checked={settings.infoSheetEnabled}
                  onCheckedChange={(checked) => updateSettings.mutate({ infoSheetEnabled: checked })}
                  data-testid="switch-info-sheet-enabled"
                />
              </div>

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

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#6B4A55] transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  data-testid="input-file-upload"
                />
                
                {uploading ? (
                  <div className="space-y-3">
                    <Loader2 className="w-10 h-10 mx-auto text-[#6B4A55] animate-spin" />
                    <p className="text-gray-600">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-2">
                      {settings.infoSheetPdfUrl ? 'Upload a new file to replace' : 'Drag and drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">PDF, JPG, PNG, or WebP (max 10MB)</p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="border-[#6B4A55] text-[#6B4A55] hover:bg-[#6B4A55] hover:text-white"
                      data-testid="button-upload-file"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {settings.infoSheetPdfUrl ? 'Replace File' : 'Choose File'}
                    </Button>
                  </>
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
