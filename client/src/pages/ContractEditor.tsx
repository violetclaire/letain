import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Save, FileText, Upload, Download, DollarSign, Calendar, MapPin, Users, Percent, Building, User, X, Plus, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ServiceItem {
  clientType: string;
  qty: number;
  service: string;
  price: number;
  total: number;
}

interface ContractFormData {
  clientName: string;
  contractDate: string;
  eventDate: string;
  eventDates: string;
  eventLocation: string;
  serviceLocation: string;
  numberOfServices: number;
  serviceDetails: string;
  totalAmount: number;
  depositPercent: number;
  depositAmount: number;
  remainingBalance: number;
  businessName: string;
  artistName: string;
  serviceItems: ServiceItem[];
  serviceStartTime: string;
  serviceEndTime: string;
  clientContact: string;
  photographerInfo: string;
  balanceDueDate: string;
}

export default function ContractEditor() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ContractFormData>({
    clientName: "",
    contractDate: new Date().toISOString().split('T')[0],
    eventDate: "",
    eventDates: "",
    eventLocation: "",
    serviceLocation: "",
    numberOfServices: 1,
    serviceDetails: "",
    totalAmount: 0,
    depositPercent: 50,
    depositAmount: 0,
    remainingBalance: 0,
    businessName: "",
    artistName: "",
    serviceItems: [],
    serviceStartTime: "TBD",
    serviceEndTime: "TBD",
    clientContact: "",
    photographerInfo: "",
    balanceDueDate: "Two weeks before wedding date",
  });

  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: artistProfile } = useQuery({
    queryKey: ["artistProfile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/artist-profiles/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["artistBookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/bookings/artist/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      const bookings = await res.json();
      return bookings.map((b: any) => ({
        id: b.id,
        name: b.clientName,
        email: b.clientEmail,
        eventDate: b.eventDate,
        location: b.location,
        bookingId: b.id,
      }));
    },
    enabled: !!user,
  });

  const { data: existingContracts = [] } = useQuery({
    queryKey: ["artistContracts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/contracts/artist/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: artistServices = [] } = useQuery({
    queryKey: ["artistServices", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/artist-services/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  const { data: selectedContract } = useQuery({
    queryKey: ["contract", selectedContractId],
    queryFn: async () => {
      if (!selectedContractId) return null;
      const res = await fetch(`/api/contracts/${selectedContractId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedContractId,
  });

  useEffect(() => {
    if (selectedContract) {
      setIsLoadingContract(true);
      const totalInDollars = selectedContract.totalAmount ? selectedContract.totalAmount / 100 : 0;
      const depositInDollars = selectedContract.depositAmount ? selectedContract.depositAmount / 100 : 0;
      const remainingInDollars = selectedContract.remainingAmount ? selectedContract.remainingAmount / 100 : (totalInDollars - depositInDollars);
      const depositPct = totalInDollars > 0 ? Math.round((depositInDollars / totalInDollars) * 100) : 30;
      
      setFormData(prev => ({
        ...prev,
        clientName: selectedContract.clientName || "",
        contractDate: selectedContract.createdAt ? new Date(selectedContract.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        eventDate: selectedContract.eventDate ? new Date(selectedContract.eventDate).toISOString().split('T')[0] : "",
        eventLocation: selectedContract.eventLocation || "",
        serviceLocation: selectedContract.eventLocation || "",
        numberOfServices: 1,
        serviceDetails: selectedContract.packageDetails || "Bridal Beauty Services",
        totalAmount: totalInDollars,
        depositPercent: depositPct,
        depositAmount: depositInDollars,
        remainingBalance: remainingInDollars,
      }));
      
      toast({ 
        title: "Contract Loaded", 
        description: `Viewing contract for ${selectedContract.clientName || 'client'}` 
      });
      
      setTimeout(() => setIsLoadingContract(false), 100);
    }
  }, [selectedContract]);

  useEffect(() => {
    if (artistProfile) {
      setFormData(prev => ({
        ...prev,
        businessName: artistProfile.businessName || "",
      }));
    }
    if (user) {
      setFormData(prev => ({
        ...prev,
        artistName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      }));
    }
  }, [artistProfile, user]);

  useEffect(() => {
    if (isLoadingContract) return;
    const deposit = Math.round((formData.totalAmount * formData.depositPercent) / 100);
    const remaining = formData.totalAmount - deposit;
    setFormData(prev => ({
      ...prev,
      depositAmount: deposit,
      remainingBalance: remaining,
    }));
  }, [formData.totalAmount, formData.depositPercent, isLoadingContract]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Access Required",
        description: "Please log in to create contracts.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
    
    if (!authLoading && user && user.role !== 'artist') {
      toast({
        title: "Access Denied",
        description: "Contract editor is for vendors only.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user]);

  const isFormValid = () => {
    return (
      formData.clientName.trim().length > 0 &&
      formData.eventDate &&
      formData.totalAmount > 0
    );
  };

  const selectClient = (client: any) => {
    setFormData(prev => ({
      ...prev,
      clientName: client.name,
      eventDate: client.eventDate ? new Date(client.eventDate).toISOString().split('T')[0] : "",
      eventLocation: client.location || "",
      serviceLocation: client.location || "",
    }));
    setSelectedBookingId(client.bookingId || null);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setUploadedPdf(file);
        setUseCustomTemplate(true);
        toast({ title: "PDF Uploaded", description: `${file.name} has been uploaded.` });
      } else {
        toast({ title: "Invalid File", description: `Please upload a PDF file. Got: ${file.type || 'unknown type'}`, variant: "destructive" });
      }
    } else {
      toast({ title: "No File Selected", description: "Please select a file to upload.", variant: "destructive" });
    }
  };

  const generateContract = async () => {
    const contractHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Beauty Services Contract - ${formData.clientName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@400;500&display=swap');
    body { 
      font-family: 'Inter', sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px; 
      color: #262329; 
      background: #fff;
      line-height: 1.6;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #C9A961; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    .header h1 { 
      font-family: 'Playfair Display', serif;
      font-size: 28px; 
      margin: 0 0 5px 0;
      color: #262329;
    }
    .header p { 
      color: #666; 
      font-size: 14px;
      margin: 5px 0;
    }
    .section { 
      margin: 25px 0; 
      padding: 20px; 
      background: #f9f9f9; 
      border-radius: 8px;
    }
    .section h2 { 
      font-family: 'Playfair Display', serif;
      font-size: 18px; 
      margin: 0 0 15px 0;
      color: #262329;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
    }
    .row { 
      display: flex; 
      justify-content: space-between; 
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px dotted #ddd;
    }
    .row:last-child { border-bottom: none; }
    .label { color: #666; font-size: 14px; }
    .value { font-weight: 500; font-size: 14px; }
    .amount { 
      font-size: 18px; 
      color: #C9A961; 
      font-weight: 600;
    }
    .terms { 
      font-size: 12px; 
      color: #666; 
      margin-top: 30px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .terms h3 { 
      font-size: 14px; 
      margin: 15px 0 8px 0;
      color: #262329;
    }
    .terms p { margin: 5px 0; }
    .signature-section {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .signature-box {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .signature-line {
      border-bottom: 1px solid #262329;
      height: 40px;
      margin: 20px 0 10px 0;
    }
    .signature-label {
      font-size: 12px;
      color: #666;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${formData.businessName || "Beauty Services"}</h1>
    <p>Professional Beauty Services Contract</p>
    <p>Contract Date: ${new Date(formData.contractDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>

  <div class="section">
    <h2>Client Information</h2>
    <div class="row">
      <span class="label">Client Name</span>
      <span class="value">${formData.clientName}</span>
    </div>
    <div class="row">
      <span class="label">Event Date</span>
      <span class="value">${formData.eventDate ? new Date(formData.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}</span>
    </div>
    <div class="row">
      <span class="label">Event Location</span>
      <span class="value">${formData.eventLocation || 'TBD'}</span>
    </div>
    <div class="row">
      <span class="label">Services Location</span>
      <span class="value">${formData.serviceLocation || 'TBD'}</span>
    </div>
  </div>

  <div class="section">
    <h2>Services</h2>
    <div class="row">
      <span class="label">Service Type</span>
      <span class="value">${formData.serviceDetails}</span>
    </div>
    <div class="row">
      <span class="label">Number of Services</span>
      <span class="value">${formData.numberOfServices}</span>
    </div>
  </div>

  <div class="section">
    <h2>Payment Details</h2>
    <div class="row">
      <span class="label">Total Amount</span>
      <span class="amount">$${formData.totalAmount.toLocaleString()}</span>
    </div>
    <div class="row">
      <span class="label">Deposit (${formData.depositPercent}%)</span>
      <span class="value">$${formData.depositAmount.toLocaleString()}</span>
    </div>
    <div class="row">
      <span class="label">Remaining Balance (Due day of event)</span>
      <span class="value">$${formData.remainingBalance.toLocaleString()}</span>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <strong>Service Provider</strong>
      <div class="signature-line"></div>
      <p class="signature-label">${formData.artistName || formData.businessName}</p>
      <p class="signature-label">Date: _________________</p>
    </div>
    <div class="signature-box">
      <strong>Client</strong>
      <div class="signature-line"></div>
      <p class="signature-label">${formData.clientName}</p>
      <p class="signature-label">Date: _________________</p>
    </div>
  </div>

  <div class="footer">
    <p>${formData.businessName} | Beauvette | For Life's Most Important Days</p>
  </div>
</body>
</html>`;

    // Download locally
    const blob = new Blob([contractHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${formData.clientName.replace(/\s+/g, '-').toLowerCase()}-${formData.contractDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Also save to the platform if a booking is selected
    if (selectedBookingId) {
      setIsSaving(true);
      try {
        const fileContent = btoa(unescape(encodeURIComponent(contractHtml)));
        const res = await fetch(`/api/bookings/${selectedBookingId}/upload-contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileContent,
            fileName: `contract-${formData.clientName.replace(/\s+/g, '-').toLowerCase()}.html`,
            mimeType: 'text/html',
            packageDetails: formData.serviceDetails,
            totalAmount: formData.totalAmount * 100,
            depositAmount: formData.depositAmount * 100,
          }),
        });
        
        if (res.ok) {
          toast({ title: "Contract Saved", description: "Contract downloaded and saved to the booking folder." });
          queryClient.invalidateQueries({ queryKey: ["artistContracts"] });
        } else {
          toast({ title: "Contract Downloaded", description: "Contract downloaded. Could not save to platform." });
        }
      } catch (err) {
        toast({ title: "Contract Downloaded", description: "Contract downloaded locally." });
      } finally {
        setIsSaving(false);
      }
    } else {
      toast({ title: "Contract Downloaded", description: "Select a client from a booking to also save to the platform." });
    }
  };
  
  // Handle PDF upload to the platform
  const handleSavePdfToBooking = async () => {
    if (!uploadedPdf) {
      toast({ title: "Missing PDF", description: "Please upload a PDF file first.", variant: "destructive" });
      return;
    }
    if (!selectedBookingId) {
      toast({ title: "No Client Selected", description: "Please select a client from the list first.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(uploadedPdf);
      });
      
      const res = await fetch(`/api/bookings/${selectedBookingId}/upload-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileContent: base64Content,
          fileName: uploadedPdf.name,
          mimeType: 'application/pdf',
          packageDetails: formData.serviceDetails || 'Beauty Services',
          totalAmount: Math.round(formData.totalAmount * 100) || 0,
          depositAmount: Math.round(formData.depositAmount * 100) || 0,
        }),
      });
      
      if (res.ok) {
        toast({ title: "PDF Saved", description: "Your contract PDF has been saved to the booking." });
        queryClient.invalidateQueries({ queryKey: ["artistContracts"] });
        setUploadedPdf(null);
      } else {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: "Upload Failed", description: error.error || "Could not save PDF to booking.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("PDF upload error:", err);
      toast({ title: "Upload Failed", description: err.message || "Could not upload PDF.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm text-black/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen overflow-y-auto p-4 bg-powder-blue">
      <div className="max-w-4xl mx-auto frame-outer shadow-sm">
        <div className="frame-inner">
          <header className="flex items-center justify-between mb-6">
            <div>
              <Link href="/artist" className="text-xs flex items-center gap-1 hover:underline ink-soft mb-2">
                <ArrowLeft size={12} /> Back to Dashboard
              </Link>
              <h1 className="font-script text-2xl ink-main">Contract Editor</h1>
              <p className="text-xs ink-soft">Create contracts for your clients in 3 simple steps</p>
            </div>
          </header>

          {/* Simple Step Indicator */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <div className={`flex items-center gap-2 ${selectedBookingId ? 'text-green-600' : 'text-blue-600 font-semibold'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${selectedBookingId ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>1</span>
                Select Client
              </div>
              <div className="h-px bg-blue-300 flex-1 mx-2" />
              <div className={`flex items-center gap-2 ${selectedBookingId && formData.totalAmount > 0 ? 'text-green-600' : selectedBookingId ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${selectedBookingId && formData.totalAmount > 0 ? 'bg-green-500 text-white' : selectedBookingId ? 'bg-blue-500 text-white' : 'bg-gray-300 text-white'}`}>2</span>
                Fill Details
              </div>
              <div className="h-px bg-blue-300 flex-1 mx-2" />
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-5 h-5 rounded-full bg-gray-300 text-white flex items-center justify-center text-[10px]">3</span>
                Download & Send via DocuSign
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="card-frame rounded-lg p-5">
                <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
                  <FileText size={18} /> Contract Details
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <User size={12} className="inline mr-1" /> Client Name *
                      </label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Enter client name"
                        data-testid="input-client-name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <Calendar size={12} className="inline mr-1" /> Contract Date
                      </label>
                      <input
                        type="date"
                        value={formData.contractDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractDate: e.target.value }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        data-testid="input-contract-date"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <Calendar size={12} className="inline mr-1" /> Event Date
                      </label>
                      <input
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        data-testid="input-event-date"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <MapPin size={12} className="inline mr-1" /> Event Location
                      </label>
                      <input
                        type="text"
                        value={formData.eventLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, eventLocation: e.target.value }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Venue name or address"
                        data-testid="input-event-location"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <MapPin size={12} className="inline mr-1" /> Services Location
                      </label>
                      <input
                        type="text"
                        value={formData.serviceLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, serviceLocation: e.target.value }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Where services will be provided"
                        data-testid="input-service-location"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <Users size={12} className="inline mr-1" /> Number of Services
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.numberOfServices}
                        onChange={(e) => setFormData(prev => ({ ...prev, numberOfServices: parseInt(e.target.value) || 1 }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        data-testid="input-num-services"
                      />
                    </div>
                  </div>

                  {artistServices.length > 0 && (
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-2">Select Services</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-black/20 rounded p-3 bg-white">
                        {artistServices.filter((s: any) => s.isActive !== false).map((service: any) => (
                          <label 
                            key={service.id} 
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            data-testid={`service-option-${service.id}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.id)}
                              onChange={(e) => {
                                const newSelected = e.target.checked
                                  ? [...selectedServices, service.id]
                                  : selectedServices.filter(id => id !== service.id);
                                setSelectedServices(newSelected);
                                
                                const selectedServicesList = artistServices.filter((s: any) => newSelected.includes(s.id));
                                const totalPrice = selectedServicesList.reduce((sum: number, s: any) => sum + (s.price || 0), 0) / 100;
                                const serviceNames = selectedServicesList.map((s: any) => `${s.name} - $${((s.price || 0) / 100).toFixed(0)}`).join('\n');
                                
                                setFormData(prev => ({
                                  ...prev,
                                  serviceDetails: serviceNames || prev.serviceDetails,
                                  totalAmount: totalPrice || prev.totalAmount,
                                }));
                              }}
                              className="w-4 h-4 accent-plum"
                              data-testid={`checkbox-service-${service.id}`}
                            />
                            <div className="flex-1">
                              <span className="font-medium text-sm">{service.name}</span>
                              {service.description && (
                                <p className="text-xs text-black/50">{service.description}</p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-plum">
                              ${((service.price || 0) / 100).toFixed(0)}
                            </span>
                          </label>
                        ))}
                      </div>
                      {selectedServices.length > 0 && (
                        <p className="text-xs text-black/60 mt-1">
                          {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                      Service Details {artistServices.length > 0 && <span className="text-black/40">(or add custom)</span>}
                    </label>
                    <textarea
                      value={formData.serviceDetails}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceDetails: e.target.value }))}
                      rows={2}
                      className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                      placeholder="Describe the services included..."
                      data-testid="input-service-details"
                    />
                  </div>
                </div>
              </div>

              <div className="card-frame rounded-lg p-5">
                <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
                  <DollarSign size={18} /> Payment Information
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <DollarSign size={12} className="inline mr-1" /> Total Amount ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="0"
                        data-testid="input-total-amount"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">
                        <Percent size={12} className="inline mr-1" /> Deposit Percentage
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.depositPercent}
                        onChange={(e) => setFormData(prev => ({ ...prev, depositPercent: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        data-testid="input-deposit-percent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="text-xs text-black/60 uppercase tracking-wide">Deposit Due</p>
                      <p className="text-lg font-semibold text-gold">${formData.depositAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-black/60 uppercase tracking-wide">Remaining Balance</p>
                      <p className="text-lg font-semibold">${formData.remainingBalance.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/10">
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-2">Itemized Services (for Attachment A)</label>
                    <div className="space-y-2">
                      {formData.serviceItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Client (e.g., Bride)"
                            value={item.clientType}
                            onChange={(e) => {
                              const newItems = [...formData.serviceItems];
                              newItems[index].clientType = e.target.value;
                              setFormData(prev => ({ ...prev, serviceItems: newItems }));
                            }}
                            className="col-span-3 border border-black/20 rounded px-2 py-1 text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const newItems = [...formData.serviceItems];
                              const qty = parseInt(e.target.value) || 1;
                              newItems[index].qty = qty;
                              newItems[index].total = qty * newItems[index].price;
                              setFormData(prev => ({ ...prev, serviceItems: newItems }));
                            }}
                            className="col-span-1 border border-black/20 rounded px-2 py-1 text-xs text-center"
                          />
                          <input
                            type="text"
                            placeholder="Service"
                            value={item.service}
                            onChange={(e) => {
                              const newItems = [...formData.serviceItems];
                              newItems[index].service = e.target.value;
                              setFormData(prev => ({ ...prev, serviceItems: newItems }));
                            }}
                            className="col-span-4 border border-black/20 rounded px-2 py-1 text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            value={item.price / 100}
                            onChange={(e) => {
                              const newItems = [...formData.serviceItems];
                              const price = (parseFloat(e.target.value) || 0) * 100;
                              newItems[index].price = price;
                              newItems[index].total = newItems[index].qty * price;
                              setFormData(prev => ({ ...prev, serviceItems: newItems }));
                            }}
                            className="col-span-2 border border-black/20 rounded px-2 py-1 text-xs"
                          />
                          <span className="col-span-1 text-xs text-right">${(item.total / 100).toFixed(0)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = formData.serviceItems.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, serviceItems: newItems }));
                            }}
                            className="col-span-1 text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 flex-wrap">
                        {artistServices.length > 0 && (
                          <select
                            onChange={(e) => {
                              const serviceId = e.target.value;
                              if (!serviceId) return;
                              const service = artistServices.find((s: any) => s.id === serviceId);
                              if (service) {
                                const price = service.price || 0;
                                setFormData(prev => ({
                                  ...prev,
                                  serviceItems: [...prev.serviceItems, {
                                    clientType: 'Bride',
                                    qty: 1,
                                    service: service.name,
                                    price: price,
                                    total: price
                                  }]
                                }));
                              }
                              e.target.value = '';
                            }}
                            className="text-xs border border-black/20 rounded px-2 py-1 bg-white"
                          >
                            <option value="">+ Add from your services...</option>
                            {artistServices.filter((s: any) => s.isActive !== false).map((service: any) => (
                              <option key={service.id} value={service.id}>
                                {service.name} - ${((service.price || 0) / 100).toFixed(0)}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              serviceItems: [...prev.serviceItems, { clientType: '', qty: 1, service: '', price: 0, total: 0 }]
                            }));
                          }}
                          className="flex items-center gap-1 text-xs text-plum hover:text-plum/80"
                        >
                          <Plus size={12} /> Add custom line
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Balance Due Date</label>
                    <input
                      type="text"
                      value={formData.balanceDueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, balanceDueDate: e.target.value }))}
                      className="w-full border border-black/20 rounded px-2 py-2 text-sm"
                      placeholder="Two weeks before event date"
                    />
                  </div>
                </div>
              </div>

              <div className="card-frame rounded-lg p-5">
                <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
                  <Users size={18} /> Additional Info
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Client Contact Info</label>
                      <input
                        type="text"
                        value={formData.clientContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientContact: e.target.value }))}
                        className="w-full border border-black/20 rounded px-2 py-2 text-sm"
                        placeholder="Phone or email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Photographer</label>
                      <input
                        type="text"
                        value={formData.photographerInfo}
                        onChange={(e) => setFormData(prev => ({ ...prev, photographerInfo: e.target.value }))}
                        className="w-full border border-black/20 rounded px-2 py-2 text-sm"
                        placeholder="Photographer name/contact"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-frame rounded-lg p-5">
                <h2 className="font-header text-lg ink-main mb-4 flex items-center gap-2">
                  <Building size={18} /> Business Information
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="Your business name"
                      data-testid="input-business-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-black/60 mb-1">Artist/Provider Name</label>
                    <input
                      type="text"
                      value={formData.artistName}
                      onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
                      className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="Your name"
                      data-testid="input-artist-name"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card-frame rounded-lg p-5">
                <h3 className="font-header text-md ink-main mb-3">Your Contracts</h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {existingContracts.length === 0 ? (
                    <p className="text-xs text-black/50 text-center py-4">No contracts yet</p>
                  ) : (
                    existingContracts.map((contract: any, index: number) => (
                      <button
                        key={contract.id || index}
                        onClick={() => setSelectedContractId(contract.id)}
                        className={`w-full text-left p-2 text-xs border rounded transition-colors ${
                          selectedContractId === contract.id 
                            ? 'border-black bg-white' 
                            : 'border-black/10 hover:border-black hover:bg-white'
                        }`}
                        data-testid={`button-select-contract-${index}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{contract.clientName || 'Unnamed'}</p>
                          <span className={`text-[0.6rem] px-1.5 py-0.5 rounded ${
                            contract.status === 'signed' ? 'bg-green-100 text-green-700' : 
                            contract.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {contract.status || 'draft'}
                          </span>
                        </div>
                        <p className="text-black/50">{contract.eventDate ? new Date(contract.eventDate).toLocaleDateString() : 'No date'}</p>
                        <p className="text-black/40 text-[0.65rem]">${contract.totalAmount ? (contract.totalAmount / 100).toLocaleString() : 0}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              <div className="card-frame rounded-lg p-5 border-2 border-blue-300">
                <h3 className="font-header text-md ink-main mb-1">Step 1: Select Client</h3>
                <p className="text-[0.65rem] text-black/50 mb-3">Choose a booking to auto-fill contract details</p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {clients.length === 0 ? (
                    <p className="text-xs text-black/50 text-center py-4">No clients with bookings</p>
                  ) : (
                    clients.map((client: any, index: number) => (
                      <button
                        key={`${client.bookingId}-${index}`}
                        onClick={() => selectClient(client)}
                        className={`w-full text-left p-2 text-xs border rounded transition-colors ${
                          selectedBookingId === client.bookingId 
                            ? 'border-black bg-white font-semibold' 
                            : 'border-black/10 hover:border-black hover:bg-white'
                        }`}
                        data-testid={`button-select-client-${index}`}
                      >
                        <p className="font-medium">{client.name}</p>
                        <p className="text-black/50">{client.eventDate ? new Date(client.eventDate).toLocaleDateString() : ''} - {client.location || 'No location'}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="card-frame rounded-lg p-5">
                <h3 className="font-header text-md ink-main mb-1">Or: Upload Your Own Contract</h3>
                <p className="text-[0.65rem] text-black/50 mb-3">Already have a PDF? Upload it here</p>
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-black/20 rounded-lg cursor-pointer hover:border-black transition-colors bg-white">
                  <Upload size={16} />
                  <span className="text-sm">Upload PDF</span>
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf" 
                    className="sr-only" 
                    onChange={handlePdfUpload}
                    data-testid="input-upload-pdf"
                  />
                </label>
                {uploadedPdf && (
                  <div className="mt-2 space-y-2">
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-xs flex items-center gap-2">
                      <Check size={14} className="text-green-600" />
                      <span>{uploadedPdf.name}</span>
                    </div>
                    <button
                      onClick={handleSavePdfToBooking}
                      disabled={!selectedBookingId || isSaving}
                      className="w-full bg-black text-white py-2 rounded text-xs hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      data-testid="button-save-pdf-to-booking"
                    >
                      {isSaving ? (
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Save size={12} />
                      )}
                      Save to Booking
                    </button>
                    {!selectedBookingId && (
                      <p className="text-[0.6rem] text-center text-red-500">Select a client from a booking first</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-header text-sm ink-main text-center mb-2">Step 3: Download & Send</h3>
                <button
                  onClick={generateContract}
                  disabled={!isFormValid()}
                  className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-generate-contract"
                >
                  <Download size={16} />
                  Download Contract
                </button>
                {!isFormValid() && (
                  <p className="text-[0.65rem] text-center text-red-500">
                    Please fill in client name, event date, and total amount
                  </p>
                )}
                <p className="text-[0.65rem] text-center text-black/60">
                  After downloading, upload to DocuSign to send for signature
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
