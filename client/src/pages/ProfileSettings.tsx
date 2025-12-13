import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Save, User, Mail, Phone, Building, Instagram, Globe, Camera, Plus, Trash2, Edit2, FileText, Upload, Download, DollarSign, Clock, X, Mic, ChevronUp, ChevronDown, Check, Bell, Copy, Link2, ExternalLink } from "lucide-react";
import type { NotificationPreferences } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtistService } from "@shared/schema";
import VoiceDictation from "@/components/VoiceDictation";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function ProfileSettings() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    venmoHandle: "",
  });

  const [businessData, setBusinessData] = useState({
    businessName: "",
    bio: "",
    location: "",
    priceRange: "",
    instagramHandle: "",
    tiktokHandle: "",
    pinterestHandle: "",
    websiteUrl: "",
    portfolioUrl: "",
    logoUrl: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [infoSheetData, setInfoSheetData] = useState({
    infoSheetType: "template" as "template" | "custom" | "pdf",
    infoSheetContent: "",
    infoSheetPdfUrl: "",
    infoSheetEnabled: true,
  });
  const [uploadingInfoSheet, setUploadingInfoSheet] = useState(false);

  const [saving, setSaving] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ArtistService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    category: "bridal",
  });
  const [voiceInput, setVoiceInput] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [editPortfolioMode, setEditPortfolioMode] = useState(false);
  const [savingPortfolioOrder, setSavingPortfolioOrder] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const defaultNotificationPrefs: NotificationPreferences = {
    channels: { email: true, sms: false },
    types: { newBookings: true, newMessages: true, paymentReminders: true, scheduleUpdates: true, marketingUpdates: false }
  };
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultNotificationPrefs);

  const movePortfolioPhoto = (index: number, direction: 'up' | 'down') => {
    const newUrls = [...portfolioUrls];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newUrls.length) return;
    [newUrls[index], newUrls[newIndex]] = [newUrls[newIndex], newUrls[index]];
    setPortfolioUrls(newUrls);
  };

  const savePortfolioOrder = async () => {
    setSavingPortfolioOrder(true);
    try {
      const res = await fetch(`/api/artist-profiles/${user?.id}/portfolio/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ portfolioUrls }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["artistProfile"] });
        toast({ title: "Order Saved", description: "Your portfolio order has been updated." });
        setEditPortfolioMode(false);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to save order");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPortfolioOrder(false);
    }
  };

  useEffect(() => {
    if (user?.profileImageUrl) {
      setProfileImageUrl(user.profileImageUrl);
    }
  }, [user]);

  const handleGetUploadParameters = async () => {
    const res = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await res.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log("Upload result:", result);
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      console.log("Uploaded URL:", uploadedUrl);
      if (uploadedUrl) {
        setUploadingImage(true);
        try {
          const res = await fetch("/api/profile-image", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ imageURL: uploadedUrl }),
          });
          const data = await res.json();
          console.log("Profile image response:", data, "Status:", res.status);
          if (res.ok) {
            setProfileImageUrl(data.objectPath);
            queryClient.invalidateQueries({ queryKey: ["user"] });
            toast({ title: "Profile Picture Updated", description: "Your profile picture has been saved." });
          } else {
            throw new Error(data.error || "Failed to save profile image");
          }
        } catch (err: any) {
          console.error("Profile image error:", err);
          toast({ title: "Upload Failed", description: err.message || "Could not save your profile picture. Please try again.", variant: "destructive" });
        } finally {
          setUploadingImage(false);
        }
      }
    } else if (result.failed && result.failed.length > 0) {
      console.error("Upload failed:", result.failed);
      toast({ title: "Upload Failed", description: "File upload failed. Please try again.", variant: "destructive" });
    }
  };

  const handlePortfolioUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      if (uploadedUrl) {
        setUploadingPortfolio(true);
        try {
          const res = await fetch(`/api/artist-profiles/${user?.id}/portfolio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ imageURL: uploadedUrl }),
          });
          const data = await res.json();
          if (res.ok) {
            setPortfolioUrls(data.portfolioUrls || []);
            queryClient.invalidateQueries({ queryKey: ["artistProfile"] });
            toast({ title: "Portfolio Updated", description: "Your portfolio photo has been added." });
          } else {
            throw new Error(data.error || "Failed to save portfolio image");
          }
        } catch (err: any) {
          console.error("Portfolio upload error:", err);
          toast({ title: "Upload Failed", description: err.message || "Could not save your portfolio photo.", variant: "destructive" });
        } finally {
          setUploadingPortfolio(false);
        }
      }
    }
  };

  const handleDeletePortfolioImage = async (imageUrl: string) => {
    try {
      const res = await fetch(`/api/artist-profiles/${user?.id}/portfolio`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setPortfolioUrls(data.portfolioUrls || []);
        queryClient.invalidateQueries({ queryKey: ["artistProfile"] });
        toast({ title: "Photo Removed", description: "Portfolio photo has been deleted." });
      } else {
        throw new Error(data.error || "Failed to delete photo");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Access Required",
        description: "Please log in to access settings.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        venmoHandle: user.venmoHandle || "",
      });
      if (user.notificationPreferences) {
        setNotificationPrefs(user.notificationPreferences);
      }
    }
  }, [user]);

  const { data: artistIntake } = useQuery({
    queryKey: ["artistIntake", user?.id],
    queryFn: async () => {
      if (!user || user.role !== "artist") return null;
      const res = await fetch(`/api/intakes/artist/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && user.role === "artist",
  });

  const { data: artistProfile } = useQuery({
    queryKey: ["artistProfile", user?.id],
    queryFn: async () => {
      if (!user || user.role !== "artist") return null;
      const res = await fetch(`/api/artist-profiles/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && user.role === "artist",
  });

  const { data: services = [] } = useQuery<ArtistService[]>({
    queryKey: ["artistServices", user?.id],
    queryFn: async () => {
      if (!user || user.role !== "artist") return [];
      const res = await fetch(`/api/artist-services/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && user.role === "artist",
  });

  useEffect(() => {
    if (artistProfile) {
      setBusinessData(prev => ({
        ...prev,
        businessName: artistProfile.businessName || prev.businessName,
        bio: artistProfile.bio || "",
        location: artistProfile.location || "",
        priceRange: artistProfile.priceRange || artistIntake?.priceRange || "",
        instagramHandle: artistProfile.instagramHandle || artistIntake?.instagramHandle || "",
        tiktokHandle: artistProfile.tiktokHandle || artistIntake?.tiktokHandle || "",
        pinterestHandle: artistProfile.pinterestHandle || artistIntake?.pinterestHandle || "",
        websiteUrl: artistProfile.websiteUrl || artistIntake?.websiteUrl || "",
        portfolioUrl: artistProfile.portfolioUrl || artistIntake?.portfolioUrl || "",
        logoUrl: artistProfile.logoUrl || "",
      }));
      if (artistProfile.portfolioUrls && Array.isArray(artistProfile.portfolioUrls)) {
        setPortfolioUrls(artistProfile.portfolioUrls);
      }
      setInfoSheetData({
        infoSheetType: artistProfile.infoSheetType || "template",
        infoSheetContent: artistProfile.infoSheetContent || "",
        infoSheetPdfUrl: artistProfile.infoSheetPdfUrl || "",
        infoSheetEnabled: artistProfile.infoSheetEnabled !== false,
      });
    } else if (artistIntake) {
      setBusinessData(prev => ({
        ...prev,
        businessName: artistIntake.businessName || "",
        priceRange: artistIntake.priceRange || "",
        instagramHandle: artistIntake.instagramHandle || "",
        tiktokHandle: artistIntake.tiktokHandle || "",
        pinterestHandle: artistIntake.pinterestHandle || "",
        websiteUrl: artistIntake.websiteUrl || "",
        portfolioUrl: artistIntake.portfolioUrl || "",
      }));
    }
  }, [artistIntake, artistProfile]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast({ title: "Profile Updated", description: "Your personal information has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateNotificationPrefsMutation = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationPreferences: prefs }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update notification preferences");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast({ title: "Preferences Updated", description: "Your notification preferences have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: typeof serviceForm) => {
      const res = await fetch("/api/artist-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: data.price ? parseInt(data.price) * 100 : null,
          duration: data.duration ? parseInt(data.duration) : null,
          category: data.category,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistServices", user?.id] });
      toast({ title: "Service Added", description: "Your new service has been added to your menu." });
      setShowServiceModal(false);
      setServiceForm({ name: "", description: "", price: "", duration: "", category: "bridal" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof serviceForm }) => {
      const res = await fetch(`/api/artist-services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: data.price ? parseInt(data.price) * 100 : null,
          duration: data.duration ? parseInt(data.duration) : null,
          category: data.category,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistServices", user?.id] });
      toast({ title: "Service Updated", description: "Your service has been updated." });
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({ name: "", description: "", price: "", duration: "", category: "bridal" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/artist-services/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistServices", user?.id] });
      toast({ title: "Service Deleted", description: "The service has been removed from your menu." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: typeof businessData) => {
      const res = await fetch(`/api/artist-profiles/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: data.businessName,
          bio: data.bio,
          location: data.location,
          priceRange: data.priceRange,
          instagramHandle: data.instagramHandle,
          tiktokHandle: data.tiktokHandle,
          pinterestHandle: data.pinterestHandle,
          websiteUrl: data.websiteUrl,
          portfolioUrl: data.portfolioUrl,
          logoUrl: data.logoUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update business profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistProfile", user?.id] });
      toast({ title: "Business Profile Updated", description: "Your business information has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateInfoSheetMutation = useMutation({
    mutationFn: async (data: typeof infoSheetData) => {
      const res = await fetch(`/api/artist-profiles/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update info sheet");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistProfile", user?.id] });
      toast({ title: "Info Sheet Saved", description: "Your info sheet will be auto-sent to new inquiries." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessMutation.mutate(businessData);
  };

  const handleSaveInfoSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    updateInfoSheetMutation.mutate(infoSheetData);
  };

  const openEditService = (service: ArtistService) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || "",
      price: service.price ? (service.price / 100).toString() : "",
      duration: service.duration?.toString() || "",
      category: service.category || "bridal",
    });
    setShowServiceModal(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: serviceForm });
    } else {
      createServiceMutation.mutate(serviceForm);
    }
  };

  const handleVoiceAddService = async (transcript: string) => {
    if (!transcript.trim()) return;
    
    setIsProcessingVoice(true);
    
    const fallbackToManual = () => {
      setServiceForm({
        name: "",
        description: transcript,
        price: "",
        duration: "",
        category: "bridal",
      });
      setShowServiceModal(true);
      toast({ 
        title: "Manual Entry", 
        description: "Fill in the service details from your description."
      });
    };
    
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: `Parse this service and return ONLY JSON (no markdown, no explanation): {"service": {"name": "service name", "description": "brief description", "price": "number only", "duration": "minutes only", "category": "bridal|bridesmaid|trial|engagement|touch-up|other"}}. Parse: "${transcript}"`,
          attachments: []
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          try {
            const jsonMatch = data.response.match(/\{[\s\S]*"service"[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.service && parsed.service.name) {
                const priceStr = String(parsed.service.price || "");
                const durationStr = String(parsed.service.duration || "");
                setServiceForm({
                  name: parsed.service.name,
                  description: parsed.service.description || "",
                  price: priceStr.replace(/[^0-9.]/g, ''),
                  duration: durationStr.replace(/[^0-9]/g, ''),
                  category: ["bridal", "bridesmaid", "trial", "engagement", "touch-up", "other"].includes(parsed.service.category) 
                    ? parsed.service.category 
                    : "bridal",
                });
                setShowServiceModal(true);
                toast({ title: "Service Parsed", description: "Review and save your service details." });
                setVoiceInput("");
                setIsProcessingVoice(false);
                return;
              }
            }
          } catch (parseErr) {
            console.log("JSON parse error, falling back to manual:", parseErr);
          }
        }
      }
      fallbackToManual();
    } catch (err) {
      fallbackToManual();
    } finally {
      setIsProcessingVoice(false);
      setVoiceInput("");
    }
  };

  const generateServicesTemplate = () => {
    const menuHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>${businessData.businessName || "Services Menu"}</title>
  <style>
    body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #262329; background: #F5F1E8; }
    h1 { text-align: center; color: #262329; border-bottom: 2px solid #C9A961; padding-bottom: 10px; }
    .service { margin: 20px 0; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .service-name { font-size: 18px; font-weight: bold; color: #262329; }
    .service-desc { color: #666; margin: 8px 0; font-size: 14px; }
    .service-details { display: flex; justify-content: space-between; color: #C9A961; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${businessData.businessName || "Services Menu"}</h1>
  ${services.map(s => `
    <div class="service">
      <div class="service-name">${s.name}</div>
      ${s.description ? `<div class="service-desc">${s.description}</div>` : ''}
      <div class="service-details">
        ${s.price ? `<span>$${(s.price / 100).toFixed(0)}</span>` : '<span>Price on request</span>'}
        ${s.duration ? `<span>${s.duration} min</span>` : ''}
      </div>
    </div>
  `).join('')}
  <div class="footer">Beauvette | For Life's Most Important Days</div>
</body>
</html>`;
    const blob = new Blob([menuHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'services-menu.html';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Menu Generated", description: "Your services menu has been downloaded." });
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "artist": return "/artist";
      case "client": return "/client";
      case "planner": return "/planner";
      case "admin": return "/admin";
      default: return "/";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="animate-pulse text-black/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-powder py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={getDashboardLink()}>
            <button className="p-2 hover:bg-black/10 rounded-full transition-colors" data-testid="button-back">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="font-header text-2xl ink-main">Profile Settings</h1>
        </div>

        <form onSubmit={handleSavePersonal} className="card-frame rounded-lg p-6 mb-6">
          <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
            <User size={18} /> Personal Information
          </h2>
          
          {/* Profile Picture Section */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-3">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-black/20"
                  data-testid="img-profile-picture"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-black/10 flex items-center justify-center border-2 border-black/20">
                  <User size={32} className="text-black/40" />
                </div>
              )}
            </div>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={5242880}
              allowedFileTypes={["image/*"]}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="bg-black hover:bg-gray-800 text-white text-sm px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <Camera size={14} />
                {uploadingImage ? "Saving..." : "Upload Photo"}
              </div>
            </ObjectUploader>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Your first name"
                data-testid="input-first-name"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Your last name"
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wide text-black/60 mb-1 flex items-center gap-1">
              <Mail size={12} /> Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="your@email.com"
              data-testid="input-email"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wide text-black/60 mb-1 flex items-center gap-1">
              <Phone size={12} /> Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="(555) 123-4567"
              data-testid="input-phone"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wide text-black/60 mb-1 flex items-center gap-1">
              <DollarSign size={12} /> Venmo Handle
            </label>
            <input
              type="text"
              value={formData.venmoHandle}
              onChange={(e) => setFormData(prev => ({ ...prev, venmoHandle: e.target.value }))}
              className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="@your-venmo-username"
              data-testid="input-venmo-handle"
            />
            <p className="text-xs text-black/40 mt-1">Alternative payment option for clients</p>
          </div>

          <button
            type="submit"
            disabled={updateUserMutation.isPending}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="button-save-personal"
          >
            <Save size={16} />
            {updateUserMutation.isPending ? "Saving..." : "Save Personal Info"}
          </button>
        </form>

        {/* Notification Preferences Section */}
        <div className="card-frame rounded-lg p-6 mb-6">
          <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
            <Bell size={18} /> Notification Preferences
          </h2>
          <p className="text-sm text-black/60 mb-4">
            Choose how you'd like to receive updates and reminders.
          </p>

          <h3 className="text-sm font-medium mb-3">Notification Channels</h3>
          <div className="space-y-3 mb-6">
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-black/60" />
                <div>
                  <span className="text-sm font-medium">Email</span>
                  <p className="text-xs text-black/50">Receive notifications via email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationPrefs.channels.email}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  channels: { ...prev.channels, email: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-email-channel"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-black/60" />
                <div>
                  <span className="text-sm font-medium">SMS Text Messages</span>
                  <p className="text-xs text-black/50">Receive notifications via text message</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationPrefs.channels.sms}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  channels: { ...prev.channels, sms: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-sms-channel"
              />
            </label>
          </div>

          <h3 className="text-sm font-medium mb-3">Notification Types</h3>
          <div className="space-y-3 mb-6">
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <span className="text-sm">New Booking Requests</span>
              <input
                type="checkbox"
                checked={notificationPrefs.types.newBookings}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  types: { ...prev.types, newBookings: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-new-bookings"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <span className="text-sm">New Messages</span>
              <input
                type="checkbox"
                checked={notificationPrefs.types.newMessages}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  types: { ...prev.types, newMessages: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-new-messages"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <span className="text-sm">Payment Reminders</span>
              <input
                type="checkbox"
                checked={notificationPrefs.types.paymentReminders}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  types: { ...prev.types, paymentReminders: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-payment-reminders"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <span className="text-sm">Schedule Updates</span>
              <input
                type="checkbox"
                checked={notificationPrefs.types.scheduleUpdates}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  types: { ...prev.types, scheduleUpdates: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-schedule-updates"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-white border border-black/10 rounded cursor-pointer hover:bg-black/5 transition-colors">
              <span className="text-sm">Marketing & Promotions</span>
              <input
                type="checkbox"
                checked={notificationPrefs.types.marketingUpdates}
                onChange={(e) => setNotificationPrefs(prev => ({
                  ...prev,
                  types: { ...prev.types, marketingUpdates: e.target.checked }
                }))}
                className="w-5 h-5 accent-black cursor-pointer"
                data-testid="checkbox-marketing-updates"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => updateNotificationPrefsMutation.mutate(notificationPrefs)}
            disabled={updateNotificationPrefsMutation.isPending}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="button-save-notifications"
          >
            <Save size={16} />
            {updateNotificationPrefsMutation.isPending ? "Saving..." : "Save Notification Preferences"}
          </button>
        </div>

        {user?.role === "artist" && (
          <>
          {/* Share Your Profile Link */}
          <div className="card-frame rounded-lg p-6 mb-6 bg-gradient-to-r from-[#A8929C]/10 to-[#9A9472]/10 border-2 border-[#A8929C]/30">
            <h2 className="font-header text-lg ink-main mb-2 flex items-center gap-2">
              <Link2 size={18} /> Share Your Beauvette Profile
            </h2>
            <p className="text-sm text-black/60 mb-4">
              Post this link on your social media to direct clients to your Beauvette page.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/artist/${user?.id}`}
                className="flex-1 border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none"
                data-testid="input-profile-link"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/artist/${user?.id}`);
                  setLinkCopied(true);
                  toast({ title: "Link Copied!", description: "Your profile link has been copied to clipboard." });
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  linkCopied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
                data-testid="button-copy-profile-link"
              >
                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                {linkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <a
              href={`/artist/${user?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#6B5A50] hover:underline"
              data-testid="link-view-profile"
            >
              <ExternalLink size={14} /> View your public profile
            </a>
          </div>

          <form onSubmit={handleSaveBusiness} className="card-frame rounded-lg p-6 mb-6">
            <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
              <Building size={18} /> Business Information
            </h2>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Business Name</label>
              <input
                type="text"
                value={businessData.businessName}
                onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Your business name"
                data-testid="input-business-name"
              />
            </div>

            {/* Business Logo Upload */}
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-2">Business Logo</label>
              <p className="text-xs text-black/50 mb-3">Your logo will appear on branded emails sent to clients.</p>
              <div className="flex items-center gap-4">
                {businessData.logoUrl ? (
                  <div className="relative">
                    <img
                      src={businessData.logoUrl}
                      alt="Business Logo"
                      className="w-20 h-20 object-contain border border-black/20 rounded bg-white p-1"
                      data-testid="img-business-logo"
                    />
                    <button
                      type="button"
                      onClick={() => setBusinessData(prev => ({ ...prev, logoUrl: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      title="Remove logo"
                      data-testid="button-remove-logo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-black/20 rounded flex items-center justify-center bg-black/5">
                    <Building size={24} className="text-black/30" />
                  </div>
                )}
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={2097152}
                  allowedFileTypes={["image/*"]}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={async (result) => {
                    if (result.successful && result.successful.length > 0) {
                      const uploadedUrl = result.successful[0].uploadURL;
                      if (uploadedUrl) {
                        setUploadingLogo(true);
                        try {
                          const res = await fetch(`/api/artist-profiles/${user?.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ logoUrl: uploadedUrl }),
                          });
                          if (res.ok) {
                            setBusinessData(prev => ({ ...prev, logoUrl: uploadedUrl }));
                            queryClient.invalidateQueries({ queryKey: ["artistProfile", user?.id] });
                            toast({ title: "Logo Uploaded", description: "Your business logo has been saved." });
                          }
                        } catch (err) {
                          toast({ title: "Upload Failed", description: "Could not save your logo.", variant: "destructive" });
                        } finally {
                          setUploadingLogo(false);
                        }
                      }
                    }
                  }}
                  buttonClassName="bg-black hover:bg-gray-800 text-white text-sm px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Upload size={14} />
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </div>
                </ObjectUploader>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Bio</label>
              <textarea
                value={businessData.bio}
                onChange={(e) => setBusinessData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                placeholder="Tell clients about yourself and your services..."
                data-testid="input-bio"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Location</label>
              <input
                type="text"
                value={businessData.location}
                onChange={(e) => setBusinessData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Los Angeles, CA"
                data-testid="input-location"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-1 flex items-center gap-1">
                <DollarSign size={12} /> Price Range
              </label>
              <input
                type="text"
                value={businessData.priceRange}
                onChange={(e) => setBusinessData(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="e.g., $300-$800 per event"
                data-testid="input-price-range"
              />
              <p className="text-xs text-black/50 mt-1">This is displayed on your public profile</p>
            </div>

            <h3 className="text-sm font-medium mb-3 mt-6">Social Media</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-black/60 mb-1 flex items-center gap-1">
                  <Instagram size={12} /> Instagram
                </label>
                <input
                  type="text"
                  value={businessData.instagramHandle}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, instagramHandle: e.target.value }))}
                  className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="@yourhandle"
                  data-testid="input-instagram"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">TikTok</label>
                <input
                  type="text"
                  value={businessData.tiktokHandle}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, tiktokHandle: e.target.value }))}
                  className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="@yourhandle"
                  data-testid="input-tiktok"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Pinterest</label>
                <input
                  type="text"
                  value={businessData.pinterestHandle}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, pinterestHandle: e.target.value }))}
                  className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="@yourhandle"
                  data-testid="input-pinterest"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-black/60 mb-1 flex items-center gap-1">
                  <Globe size={12} /> Website
                </label>
                <input
                  type="url"
                  value={businessData.websiteUrl}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="https://yourwebsite.com"
                  data-testid="input-website"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateBusinessMutation.isPending}
              className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-save-business"
            >
              <Save size={16} />
              {updateBusinessMutation.isPending ? "Saving..." : "Save Business Info"}
            </button>
          </form>
          </>
        )}

        {/* Portfolio Photos Section - Artists Only */}
        {user?.role === "artist" && (
          <div className="card-frame rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-header text-lg ink-main flex items-center gap-2">
                <Camera size={18} /> Portfolio Photos
              </h2>
              {portfolioUrls.length > 1 && !editPortfolioMode && (
                <button
                  type="button"
                  onClick={() => setEditPortfolioMode(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-black/20 rounded hover:bg-black/5 transition-colors"
                  data-testid="button-edit-portfolio"
                >
                  <Edit2 size={14} /> Rearrange
                </button>
              )}
              {editPortfolioMode && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPortfolioMode(false)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-black/20 rounded hover:bg-black/5 transition-colors"
                    data-testid="button-cancel-edit-portfolio"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePortfolioOrder}
                    disabled={savingPortfolioOrder}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                    data-testid="button-save-portfolio-order"
                  >
                    <Check size={14} /> {savingPortfolioOrder ? "Saving..." : "Save Order"}
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-black/60 mb-4">
              Upload photos of your work to showcase on your public profile.
              {editPortfolioMode && " Use the arrows to rearrange photos. The first photo will be your cover image."}
            </p>
            
            {/* Upload Area */}
            {!editPortfolioMode && (
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <label className="w-full sm:w-auto">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={uploadingPortfolio}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setUploadingPortfolio(true);
                        
                        try {
                          const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                          
                          const match = base64.match(/^data:([^;]+);base64,(.+)$/);
                          if (!match) throw new Error("Invalid image");
                          
                          const res = await fetch(`/api/artist-profiles/${user?.id}/portfolio`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ imageData: match[2], mimeType: match[1] }),
                          });
                          
                          const data = await res.json();
                          if (res.ok) {
                            setPortfolioUrls(data.portfolioUrls || []);
                            queryClient.invalidateQueries({ queryKey: ["artistProfile"] });
                            toast({ title: "Photo Added" });
                          } else {
                            throw new Error(data.error || "Upload failed");
                          }
                        } catch (err: any) {
                          toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
                        } finally {
                          setUploadingPortfolio(false);
                          e.target.value = "";
                        }
                      }}
                      data-testid="input-portfolio-upload"
                    />
                    <div className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-black text-white rounded-lg cursor-pointer active:bg-gray-700 ${uploadingPortfolio ? 'opacity-50' : ''}`}>
                      <Upload size={18} />
                      <span>{uploadingPortfolio ? "Uploading..." : "Add Photo"}</span>
                    </div>
                  </label>
                  <span className="text-sm text-black/50">
                    {portfolioUrls.length} photo{portfolioUrls.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Portfolio Grid */}
            {portfolioUrls.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {portfolioUrls.map((url, index) => (
                  <div 
                    key={url} 
                    className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Position badge */}
                    {editPortfolioMode && (
                      <div className="absolute top-2 left-2 w-7 h-7 flex items-center justify-center bg-black/70 text-white text-sm font-bold rounded-full">
                        {index + 1}
                      </div>
                    )}
                    {/* Cover photo badge */}
                    {index === 0 && !editPortfolioMode && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-gold text-black text-xs font-semibold rounded">
                        Cover
                      </div>
                    )}
                    {/* Move buttons in edit mode */}
                    {editPortfolioMode && (
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => movePortfolioPhoto(index, 'up')}
                          disabled={index === 0}
                          className="w-8 h-8 flex items-center justify-center bg-white/90 text-black rounded-full shadow-lg disabled:opacity-30"
                          data-testid={`button-moveup-portfolio-${index}`}
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePortfolioPhoto(index, 'down')}
                          disabled={index === portfolioUrls.length - 1}
                          className="w-8 h-8 flex items-center justify-center bg-white/90 text-black rounded-full shadow-lg disabled:opacity-30"
                          data-testid={`button-movedown-portfolio-${index}`}
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeletePortfolioImage(url)}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full shadow-lg active:bg-red-600"
                      data-testid={`button-delete-portfolio-${index}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-black/20 rounded-lg">
                <Camera size={32} className="mx-auto text-black/30 mb-2" />
                <p className="text-sm text-black/50">No photos yet</p>
              </div>
            )}
          </div>
        )}

        {/* Services Menu Section - Artists Only */}
        {user?.role === "artist" && (
          <div className="card-frame rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-header text-lg ink-main flex items-center gap-2">
                <FileText size={18} /> Services Menu
              </h2>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 px-3 py-1.5 text-xs border border-black/20 rounded cursor-pointer hover:bg-black/5 transition-colors">
                  <Upload size={14} /> Upload PDF
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        toast({ title: "PDF Uploaded", description: "Your services menu PDF has been uploaded." });
                      }
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    setEditingService(null);
                    setServiceForm({ name: "", description: "", price: "", duration: "", category: "bridal" });
                    setShowServiceModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800 transition-colors"
                  data-testid="button-add-service"
                >
                  <Plus size={14} /> Add Service
                </button>
              </div>
            </div>

            <p className="text-sm text-black/60 mb-4">
              Create your services menu here. Clients will see this when they request a booking, or you can generate a beautiful template to share.
            </p>

            {/* Voice Add Service Box */}
            <div className="bg-[#f5f7fc] border border-black/10 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Mic size={16} className="text-black/60" />
                <span className="text-sm font-medium ink-main">Add Service by Voice</span>
              </div>
              <p className="text-xs text-black/50 mb-3">
                Say something like: "Bridal makeup, 150 dollars, 90 minutes, includes airbrush foundation and lash application"
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voiceInput}
                  onChange={(e) => setVoiceInput(e.target.value)}
                  placeholder="Speak or type service details..."
                  className="flex-1 border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && voiceInput.trim()) {
                      handleVoiceAddService(voiceInput);
                    }
                  }}
                  data-testid="input-voice-service"
                />
                <VoiceDictation 
                  onTranscript={(text) => {
                    setVoiceInput(text);
                    handleVoiceAddService(text);
                  }} 
                  size="md" 
                />
                <button
                  onClick={() => voiceInput.trim() && handleVoiceAddService(voiceInput)}
                  disabled={!voiceInput.trim() || isProcessingVoice}
                  className="px-3 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-voice-add"
                >
                  {isProcessingVoice ? "..." : "Add"}
                </button>
              </div>
            </div>

            {services.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 rounded-lg p-8 text-center">
                <FileText size={32} className="mx-auto mb-2 text-black/30" />
                <p className="text-sm text-black/50 mb-2">No services added yet</p>
                <p className="text-xs text-black/40">Add your services or upload an existing menu PDF</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div 
                    key={service.id} 
                    className="flex items-center justify-between p-3 bg-white border border-black/10 rounded-lg hover:border-black/30 transition-colors"
                    data-testid={`service-item-${service.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{service.name}</span>
                        {service.category && (
                          <span className="text-[0.65rem] uppercase tracking-wide px-2 py-0.5 bg-black/5 rounded-full text-black/60">
                            {service.category}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs text-black/50 mt-1 truncate">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {service.price && (
                          <span className="flex items-center gap-1 text-xs text-black/70">
                            <DollarSign size={12} /> {(service.price / 100).toFixed(0)}
                          </span>
                        )}
                        {service.duration && (
                          <span className="flex items-center gap-1 text-xs text-black/70">
                            <Clock size={12} /> {service.duration} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => openEditService(service)}
                        className="p-2 hover:bg-black/5 rounded-full transition-colors"
                        data-testid={`button-edit-service-${service.id}`}
                      >
                        <Edit2 size={14} className="text-black/50" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this service?")) {
                            deleteServiceMutation.mutate(service.id);
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                        data-testid={`button-delete-service-${service.id}`}
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {services.length > 0 && (
              <button
                onClick={generateServicesTemplate}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-black/20 rounded hover:bg-black hover:text-white transition-colors text-sm"
                data-testid="button-generate-menu"
              >
                <Download size={16} /> Generate & Download Menu Template
              </button>
            )}
          </div>
        )}

        {/* Info Sheet Section - Artists Only */}
        {user?.role === "artist" && (
          <div className="card-frame rounded-lg p-6 mb-6">
            <form onSubmit={handleSaveInfoSheet}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-header text-lg ink-main flex items-center gap-2">
                  <FileText size={18} /> Inquiry Auto-Response
                </h2>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infoSheetData.infoSheetEnabled}
                    onChange={(e) => setInfoSheetData(prev => ({ ...prev, infoSheetEnabled: e.target.checked }))}
                    className="rounded border-black/30"
                    data-testid="checkbox-info-sheet-enabled"
                  />
                  <span className="text-black/70">Auto-send on inquiry</span>
                </label>
              </div>
              
              <p className="text-xs text-black/60 mb-4">
                {infoSheetData.infoSheetEnabled 
                  ? "When clients inquire, they'll automatically receive your info sheet. Set up your content below:"
                  : "Enable auto-send above to automatically share your info with inquiring clients. You can set up your content anytime:"}
              </p>

              {/* Option Selector */}
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setInfoSheetData(prev => ({ ...prev, infoSheetType: "pdf" }))}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                    infoSheetData.infoSheetType === "pdf" 
                      ? "border-black bg-black text-white" 
                      : "border-black/20 hover:border-black/40"
                  }`}
                  data-testid="button-info-type-pdf"
                >
                  <Upload size={16} className="mx-auto mb-1" />
                  Upload Your Own
                </button>
                <button
                  type="button"
                  onClick={() => setInfoSheetData(prev => ({ ...prev, infoSheetType: "custom" }))}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                    infoSheetData.infoSheetType === "custom" 
                      ? "border-black bg-black text-white" 
                      : "border-black/20 hover:border-black/40"
                  }`}
                  data-testid="button-info-type-custom"
                >
                  <Edit2 size={16} className="mx-auto mb-1" />
                  Write Your Own
                </button>
                <button
                  type="button"
                  onClick={() => setInfoSheetData(prev => ({ ...prev, infoSheetType: "template" }))}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                    infoSheetData.infoSheetType === "template" 
                      ? "border-black bg-black text-white" 
                      : "border-black/20 hover:border-black/40"
                  }`}
                  data-testid="button-info-type-template"
                >
                  <FileText size={16} className="mx-auto mb-1" />
                  Use Our Template
                </button>
              </div>

              {/* PDF Upload Option */}
              {infoSheetData.infoSheetType === "pdf" && (
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-wide text-black/60 mb-2">
                    Upload Your Pricing Sheet (PDF or Image)
                  </label>
                  {infoSheetData.infoSheetPdfUrl ? (
                    <div className="border border-black/20 rounded-lg p-4 bg-[#f5f7fc]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={20} className="text-black/60" />
                          <span className="text-sm">Your pricing sheet is uploaded</span>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={infoSheetData.infoSheetPdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 border border-black/20 rounded hover:bg-black hover:text-white transition-colors"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => setInfoSheetData(prev => ({ ...prev, infoSheetPdfUrl: "" }))}
                            className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-black/20 rounded-lg p-6 text-center">
                      <ObjectUploader
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={async (result) => {
                          if (result.successful?.[0]?.uploadURL) {
                            setUploadingInfoSheet(true);
                            try {
                              const res = await fetch("/api/objects/finalize", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ uploadURL: result.successful[0].uploadURL }),
                              });
                              const data = await res.json();
                              if (res.ok && data.objectPath) {
                                setInfoSheetData(prev => ({ ...prev, infoSheetPdfUrl: data.objectPath }));
                                toast({ title: "File Uploaded", description: "Your pricing sheet has been uploaded." });
                              }
                            } catch (err: any) {
                              toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
                            } finally {
                              setUploadingInfoSheet(false);
                            }
                          }
                        }}
                        allowedFileTypes={[".pdf", "image/*"]}
                        maxFileSize={10 * 1024 * 1024}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Upload size={24} className="text-black/40" />
                          <span className="text-sm text-black/60">Click to upload your pricing sheet</span>
                          <span className="text-xs text-black/40">PDF, JPG, or PNG up to 10MB</span>
                        </div>
                      </ObjectUploader>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Text Option */}
              {infoSheetData.infoSheetType === "custom" && (
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                    Your Custom Info Sheet
                  </label>
                  <p className="text-xs text-black/50 mb-2">
                    Write your own welcome message, pricing, and booking policies. This will be formatted and sent as an email.
                  </p>
                  <textarea
                    value={infoSheetData.infoSheetContent}
                    onChange={(e) => setInfoSheetData(prev => ({ ...prev, infoSheetContent: e.target.value }))}
                    className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black min-h-[300px]"
                    placeholder="Paste or write your info sheet content here..."
                    data-testid="textarea-info-sheet-custom"
                  />
                </div>
              )}

              {/* Template Option */}
              {infoSheetData.infoSheetType === "template" && (
                <div className="mb-4 space-y-4">
                  <p className="text-xs text-black/50">
                    Fill in the template below with your own information. Leave sections blank if they don't apply.
                  </p>
                  <textarea
                    value={infoSheetData.infoSheetContent}
                    onChange={(e) => setInfoSheetData(prev => ({ ...prev, infoSheetContent: e.target.value }))}
                    className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black min-h-[350px]"
                    placeholder={`Welcome

Thank you so much for considering me to be part of your special day. There's nothing I love more than creating beautiful, timeless looks that make brides feel confident, radiant, and truly themselves on their wedding day.

Trial Session
A two-hour consultation to collaborate on your bridal look.
Price: $500 and up

Wedding Day Services
Bridal Makeup & Hair (includes individual lash application)
Price: $1500

Single Service (Makeup or Hair)
Price: $750

Touch-Up Services
Price: $200/hour

A La Carte Services
Bridesmaids/Additional Ladies
Makeup: $200 and up
Hair: $200 and up
Makeup & Hair Together: $400 and up

Booking Information
Dates are secured with a signed contract and non-refundable retainer on a first come first serve basis.

Additional Details
- For parties over 10, an additional fee of $300 for each extra artist will apply
- Weekend minimum charge: $2400
- Travel fees vary based on location and start time
- For start times before 8 AM or locations over 50 miles away, hotel accommodation for the night prior is necessary

For further inquiries or to book your session, please contact us.
Thank you for considering us for your special day!`}
                    data-testid="textarea-info-sheet-template"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={updateInfoSheetMutation.isPending || uploadingInfoSheet}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                data-testid="button-save-info-sheet"
              >
                <Save size={16} />
                {updateInfoSheetMutation.isPending ? "Saving..." : "Save Info Sheet Settings"}
              </button>
            </form>
          </div>
        )}

        {/* Service Add/Edit Modal */}
        {showServiceModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-header text-lg ink-main">
                  {editingService ? "Edit Service" : "Add New Service"}
                </h3>
                <button 
                  onClick={() => {
                    setShowServiceModal(false);
                    setEditingService(null);
                  }}
                  className="p-1 hover:bg-black/5 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleServiceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Service Name *</label>
                  <input
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="e.g., Bridal Makeup"
                    required
                    data-testid="input-service-name"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Description</label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                    placeholder="Brief description of the service..."
                    data-testid="input-service-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="150"
                      data-testid="input-service-price"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={serviceForm.duration}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="60"
                      data-testid="input-service-duration"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Category</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    data-testid="select-service-category"
                  >
                    <option value="bridal">Bridal</option>
                    <option value="bridesmaid">Bridesmaid</option>
                    <option value="trial">Trial / Consultation</option>
                    <option value="engagement">Engagement / Special Event</option>
                    <option value="touch-up">Touch-Up</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowServiceModal(false);
                      setEditingService(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm rounded border border-black/20 hover:bg-black/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                    className="flex-1 px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                    data-testid="button-save-service"
                  >
                    {createServiceMutation.isPending || updateServiceMutation.isPending 
                      ? "Saving..." 
                      : editingService ? "Update Service" : "Add Service"
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Privacy Settings */}
        <div className="bg-cream p-5 rounded-sm shadow-sm border border-black/10">
          <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Privacy Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-3 border border-black/10 rounded">
              <div className="flex-1">
                <h3 className="font-medium text-sm ink-main">Service Quality Monitoring</h3>
                <p className="text-xs text-black/60 mt-1">
                  Allow Beauvette to use automated monitoring to ensure the best experience. 
                  This helps us detect and resolve issues proactively.
                </p>
                <p className="text-xs text-black/40 mt-2">
                  {user?.cdiConsentGiven 
                    ? `Consent given${user?.cdiConsentDate ? ` on ${new Date(user.cdiConsentDate).toLocaleDateString()}` : ''}` 
                    : 'Not yet enabled'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  user?.cdiConsentGiven && !user?.cdiOptOut 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {user?.cdiConsentGiven && !user?.cdiOptOut ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const isCurrentlyEnabled = user?.cdiConsentGiven && !user?.cdiOptOut;
                    const newOptOut = isCurrentlyEnabled; // If currently enabled, opt out; if disabled, opt in
                    try {
                      const res = await fetch(`/api/users/${user?.id}/cdi-consent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ optOut: newOptOut }),
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ['auth'] });
                        toast({
                          title: newOptOut ? 'Monitoring Disabled' : 'Monitoring Enabled',
                          description: newOptOut 
                            ? 'You have opted out of service quality monitoring.' 
                            : 'Service quality monitoring is now active.',
                        });
                      }
                    } catch (err) {
                      toast({ title: 'Error', description: 'Failed to update privacy settings.', variant: 'destructive' });
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    user?.cdiConsentGiven && !user?.cdiOptOut
                      ? 'bg-black/10 text-black hover:bg-black/20'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                  data-testid="toggle-cdi-consent"
                >
                  {user?.cdiConsentGiven && !user?.cdiOptOut ? 'Turn Off' : 'Turn On'}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-black/50">
              You can change these settings anytime. For questions about how we protect your data, 
              please contact support.
            </p>
          </div>
        </div>

        {/* Danger Zone - Delete Account */}
        <div className="bg-red-50 p-5 rounded-sm shadow-sm border border-red-200">
          <h2 className="font-header text-lg text-red-700 mb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </h2>
          
          <div className="space-y-4">
            <div className="p-3 border border-red-200 rounded bg-white">
              <h3 className="font-medium text-sm text-red-700">Delete Account</h3>
              <p className="text-xs text-black/60 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete your account? This action CANNOT be undone. All your data, bookings, messages, and profile information will be permanently deleted.")) {
                    if (window.confirm("This is your final warning. Press OK to permanently delete your account.")) {
                      fetch(`/api/users/${user?.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      })
                        .then((res) => {
                          if (res.ok) {
                            toast({
                              title: "Account Deleted",
                              description: "Your account has been permanently deleted.",
                            });
                            window.location.href = "/";
                          } else {
                            return res.json().then((err) => {
                              throw new Error(err.error || "Failed to delete account");
                            });
                          }
                        })
                        .catch((err) => {
                          toast({
                            title: "Error",
                            description: err.message,
                            variant: "destructive",
                          });
                        });
                    }
                  }
                }}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                data-testid="button-delete-account"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-black/50">
          <p>Logged in as {user?.email}</p>
          <p className="mt-1">Role: {user?.role || "Not set"}</p>
        </div>
      </div>
    </div>
  );
}
