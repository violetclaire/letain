import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Send, Trash2, Edit, FileText, Calendar, MapPin, Clock, DollarSign, X, Check, User, Mail, Building, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Proposal, ProposalLineItem } from "@shared/schema";

interface ProposalFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  eventDate: string;
  eventLocation: string;
  completionTime: string;
  lineItems: ProposalLineItem[];
  travelFee: number;
  discount: number;
  notes: string;
  terms: string;
  validUntil: string;
}

const defaultLineItem: ProposalLineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  services: []
};

const dollarsToCents = (dollars: number) => Math.round(dollars * 100);
const centsToDollars = (cents: number) => cents / 100;

const defaultFormData: ProposalFormData = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientCompany: "",
  eventDate: "",
  eventLocation: "",
  completionTime: "",
  lineItems: [{ ...defaultLineItem }],
  travelFee: 0,
  discount: 0,
  notes: "",
  terms: "50% deposit required to secure your date. Remaining balance due 7 days before the event.",
  validUntil: ""
};

export default function Proposals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProposalFormData>(defaultFormData);
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  // Check for pre-fill params from inquiry (e.g., /artist/proposals?clientName=...&clientEmail=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const clientName = searchParams.get('clientName');
    const clientEmail = searchParams.get('clientEmail');
    const eventDate = searchParams.get('eventDate');
    const serviceType = searchParams.get('serviceType');
    const notes = searchParams.get('notes');
    const budget = searchParams.get('budget');
    
    if (clientName || clientEmail) {
      // Format the event date for the date input if provided
      let formattedDate = "";
      if (eventDate) {
        try {
          const date = new Date(eventDate);
          formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch {
          formattedDate = "";
        }
      }
      
      // Build notes with service type and any message from inquiry
      let proposalNotes = "";
      if (serviceType) {
        proposalNotes += `Service: ${serviceType}\n`;
      }
      if (notes) {
        proposalNotes += `Client notes: ${notes}\n`;
      }
      if (budget) {
        proposalNotes += `Budget mentioned: $${budget}`;
      }
      
      setForm({
        ...defaultFormData,
        clientName: clientName || "",
        clientEmail: clientEmail || "",
        eventDate: formattedDate,
        notes: proposalNotes.trim(),
        // Pre-fill a line item with the service type if available
        lineItems: serviceType 
          ? [{ description: serviceType, quantity: 1, unitPrice: 0, services: [] }]
          : [{ ...defaultLineItem }],
      });
      setShowForm(true);
      
      // Clear the URL params without triggering navigation
      window.history.replaceState({}, '', '/artist/proposals');
      
      toast({
        title: "Proposal Pre-filled",
        description: `Creating proposal for ${clientName}`,
      });
    }
  }, []);

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
    queryFn: async () => {
      const res = await fetch("/api/proposals");
      if (!res.ok) throw new Error("Failed to fetch proposals");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to create proposal" }));
        throw new Error(error.error || "Failed to create proposal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setShowForm(false);
      setForm(defaultFormData);
      toast({ title: "Proposal saved!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update proposal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setShowForm(false);
      setEditingId(null);
      setForm(defaultFormData);
      toast({ title: "Proposal updated!" });
    }
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/proposals/${id}/send`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to send proposal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Please try again", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal deleted" });
    }
  });

  const calculateSubtotal = () => {
    return form.lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + form.travelFee - form.discount;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const proposalData = {
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone || null,
      clientCompany: form.clientCompany || null,
      eventDate: form.eventDate ? new Date(form.eventDate + "T12:00:00").toISOString() : null,
      eventLocation: form.eventLocation || null,
      completionTime: form.completionTime || null,
      lineItems: form.lineItems,
      subtotal: calculateSubtotal(),
      travelFee: form.travelFee,
      discount: form.discount,
      total: calculateTotal(),
      notes: form.notes || null,
      terms: form.terms || null,
      validUntil: form.validUntil ? new Date(form.validUntil + "T23:59:59").toISOString() : null
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: proposalData });
    } else {
      createMutation.mutate(proposalData);
    }
  };

  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...defaultLineItem }]
    }));
  };

  const updateLineItem = (index: number, field: keyof ProposalLineItem, value: any) => {
    setForm(prev => {
      const updated = [...prev.lineItems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, lineItems: updated };
    });
  };

  const removeLineItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const startEdit = (proposal: Proposal) => {
    setForm({
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      clientPhone: proposal.clientPhone || "",
      clientCompany: proposal.clientCompany || "",
      eventDate: proposal.eventDate ? format(new Date(proposal.eventDate), "yyyy-MM-dd") : "",
      eventLocation: proposal.eventLocation || "",
      completionTime: proposal.completionTime || "",
      lineItems: proposal.lineItems || [{ ...defaultLineItem }],
      travelFee: proposal.travelFee || 0,
      discount: proposal.discount || 0,
      notes: proposal.notes || "",
      terms: proposal.terms || "",
      validUntil: proposal.validUntil ? format(new Date(proposal.validUntil), "yyyy-MM-dd") : ""
    });
    setEditingId(proposal.id);
    setShowForm(true);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-header text-2xl text-[#2C2C2C]">
              {editingId ? "Edit Proposal" : "New Proposal"}
            </h1>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(defaultFormData);
              }}
              className="p-2 hover:bg-[#f0efe9] transition-colors"
            >
              <X size={24} className="text-[#2C2C2C]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
              <div className="border border-[#2C2C2C] p-6">
                <h3 className="font-medium text-[#2C2C2C] mb-4 flex items-center gap-2">
                  <User size={18} />
                  Client Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Name *</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      required
                      data-testid="input-client-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.clientEmail}
                      onChange={(e) => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      required
                      data-testid="input-client-email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.clientPhone}
                      onChange={(e) => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      data-testid="input-client-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Company</label>
                    <input
                      type="text"
                      value={form.clientCompany}
                      onChange={(e) => setForm(prev => ({ ...prev, clientCompany: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      data-testid="input-client-company"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
              <div className="border border-[#2C2C2C] p-6">
                <h3 className="font-medium text-[#2C2C2C] mb-4 flex items-center gap-2">
                  <Calendar size={18} />
                  Event Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Date</label>
                    <input
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => setForm(prev => ({ ...prev, eventDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      data-testid="input-event-date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Location</label>
                    <input
                      type="text"
                      value={form.eventLocation}
                      onChange={(e) => setForm(prev => ({ ...prev, eventLocation: e.target.value }))}
                      placeholder="e.g., Carneros Resort"
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      data-testid="input-event-location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Complete By</label>
                    <input
                      type="text"
                      value={form.completionTime}
                      onChange={(e) => setForm(prev => ({ ...prev, completionTime: e.target.value }))}
                      placeholder="e.g., 2pm"
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      data-testid="input-completion-time"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
              <div className="border border-[#2C2C2C] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-[#2C2C2C] flex items-center gap-2">
                    <FileText size={18} />
                    Services
                  </h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 px-3 py-1 text-sm border border-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                  >
                    <Plus size={16} />
                    Add Service
                  </button>
                </div>
                
                <div className="space-y-3">
                  {form.lineItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="e.g., Bride - Hair & Makeup"
                        className="flex-1 px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                        data-testid={`input-line-description-${index}`}
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-16 px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] text-center"
                        data-testid={`input-line-qty-${index}`}
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">$</span>
                        <input
                          type="number"
                          value={item.unitPrice / 100}
                          onChange={(e) => updateLineItem(index, 'unitPrice', Math.round(parseFloat(e.target.value) * 100) || 0)}
                          min="0"
                          step="0.01"
                          className="w-24 pl-7 pr-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                          data-testid={`input-line-price-${index}`}
                        />
                      </div>
                      {form.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-[#2C2C2C]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666]">Subtotal</span>
                    <span className="font-medium text-[#2C2C2C]">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] w-24">Travel Fee</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">$</span>
                      <input
                        type="number"
                        value={form.travelFee / 100}
                        onChange={(e) => setForm(prev => ({ ...prev, travelFee: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-1 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                        data-testid="input-travel-fee"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] w-24">Discount</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">$</span>
                      <input
                        type="number"
                        value={form.discount / 100}
                        onChange={(e) => setForm(prev => ({ ...prev, discount: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-1 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                        data-testid="input-discount"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2C2C2C]">
                    <span className="font-medium text-[#2C2C2C]">Total</span>
                    <span className="text-xl font-bold text-[#2C2C2C]">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
              <div className="border border-[#2C2C2C] p-6">
                <h3 className="font-medium text-[#2C2C2C] mb-4">Additional Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Any additional information..."
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] resize-none"
                      data-testid="input-notes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Terms & Conditions</label>
                    <textarea
                      value={form.terms}
                      onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] resize-none"
                      data-testid="input-terms"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(defaultFormData);
                }}
                className="flex-1 px-6 py-3 border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2C2C2C] text-[#FFFEF9] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                data-testid="button-save-proposal"
              >
                <Check size={18} />
                {editingId ? "Update Proposal" : "Save Proposal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-header text-2xl text-[#2C2C2C]">Proposals</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2C] text-[#FFFEF9] hover:bg-[#1a1a1a] transition-colors"
            data-testid="button-new-proposal"
          >
            <Plus size={18} />
            New Proposal
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border border-[#2C2C2C] mx-auto mb-4" />
            <p className="text-[#666]">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
            <div className="border border-[#2C2C2C] p-12 text-center">
              <FileText className="w-16 h-16 text-[#ccc] mx-auto mb-4" />
              <h3 className="font-header text-xl text-[#2C2C2C] mb-2">No proposals yet</h3>
              <p className="text-[#666] mb-6">Create your first proposal to send to clients</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-[#2C2C2C] text-[#FFFEF9] hover:bg-[#1a1a1a] transition-colors"
              >
                Create Proposal
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
              >
                <div className="border border-[#2C2C2C] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-[#2C2C2C]">{proposal.clientName}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium uppercase ${getStatusColor(proposal.status)}`}>
                          {proposal.status || 'draft'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#666]">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {proposal.clientEmail}
                        </span>
                        {proposal.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {format(new Date(proposal.eventDate), "MMM d, yyyy")}
                          </span>
                        )}
                        {proposal.eventLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {proposal.eventLocation}
                          </span>
                        )}
                      </div>
                      {proposal.lineItems && proposal.lineItems.length > 0 && (
                        <div className="mt-2 text-sm text-[#666]">
                          {proposal.lineItems.map((item, i) => item.description).filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#2C2C2C] mb-2">
                        {formatCurrency(proposal.total || 0)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewProposal(proposal)}
                          className="p-2 border border-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                          title="Preview Email"
                        >
                          <Eye size={16} className="text-[#2C2C2C]" />
                        </button>
                        <button
                          onClick={() => startEdit(proposal)}
                          className="p-2 border border-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-[#2C2C2C]" />
                        </button>
                        {proposal.status === 'draft' && (
                          <button
                            onClick={() => sendMutation.mutate(proposal.id)}
                            disabled={sendMutation.isPending}
                            className="flex items-center gap-1 px-3 py-2 bg-[#2C2C2C] text-[#FFFEF9] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                            title="Send"
                          >
                            <Send size={16} />
                            Send
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(proposal.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-red-500 border border-red-300 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {previewProposal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#FAF9F7] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-1 border border-[#2C2C2C]">
                <div className="border border-[#2C2C2C]">
                  {/* Header */}
                  <div className="p-6 text-center border-b border-[#2C2C2C]">
                    <h2 className="font-header text-2xl text-[#2C2C2C]">Violet / The Makeup Dolls</h2>
                    <p className="text-sm text-[#666] mt-1">Service Proposal</p>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <p className="mb-4">Hi {previewProposal.clientName},</p>
                    <p className="mb-6 text-[#666]">Thank you for your inquiry! Here is a detailed proposal for your upcoming event:</p>
                    
                    {/* Event Details */}
                    <div className="bg-[#FFFEF9] p-4 border border-[#2C2C2C] mb-6">
                      {previewProposal.eventDate && (
                        <div className="mb-2">
                          <strong>Event Date:</strong> {format(new Date(previewProposal.eventDate), "EEEE, MMMM d, yyyy")}
                        </div>
                      )}
                      {previewProposal.eventLocation && (
                        <div className="mb-2">
                          <strong>Location:</strong> {previewProposal.eventLocation}
                        </div>
                      )}
                      {previewProposal.completionTime && (
                        <div>
                          <strong>Complete By:</strong> {previewProposal.completionTime}
                        </div>
                      )}
                    </div>
                    
                    {/* Services Table */}
                    <table className="w-full mb-6">
                      <thead>
                        <tr className="bg-[#FAF9F7] border-b-2 border-[#2C2C2C]">
                          <th className="p-3 text-left font-semibold">Service</th>
                          <th className="p-3 text-center font-semibold">Qty</th>
                          <th className="p-3 text-right font-semibold">Rate</th>
                          <th className="p-3 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewProposal.lineItems?.map((item, i) => (
                          <tr key={i} className="border-b border-[#eee]">
                            <td className="p-3">{item.description}</td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-3 text-right">{formatCurrency(item.unitPrice * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Totals */}
                    <div className="bg-[#FAF9F7] p-4 border border-[#2C2C2C]">
                      <div className="flex justify-between py-2">
                        <span>Subtotal</span>
                        <span>{formatCurrency(previewProposal.subtotal || 0)}</span>
                      </div>
                      {previewProposal.travelFee ? (
                        <div className="flex justify-between py-2">
                          <span>Travel Fee</span>
                          <span>{formatCurrency(previewProposal.travelFee)}</span>
                        </div>
                      ) : null}
                      {previewProposal.discount ? (
                        <div className="flex justify-between py-2">
                          <span>Discount</span>
                          <span>-{formatCurrency(previewProposal.discount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between py-2 border-t-2 border-[#2C2C2C] mt-2 pt-4 text-lg font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(previewProposal.total || 0)}</span>
                      </div>
                    </div>
                    
                    {/* Notes */}
                    {previewProposal.notes && (
                      <div className="mt-6 p-4 bg-[#FAF9F7] border border-[#2C2C2C]">
                        <strong>Notes:</strong>
                        <p className="mt-2 text-[#666] whitespace-pre-wrap">{previewProposal.notes}</p>
                      </div>
                    )}
                    
                    {/* Terms */}
                    {previewProposal.terms && (
                      <div className="mt-4 p-4 bg-[#FAF9F7] border border-[#2C2C2C]">
                        <strong>Terms:</strong>
                        <p className="mt-2 text-[#666] whitespace-pre-wrap">{previewProposal.terms}</p>
                      </div>
                    )}
                    
                    {/* Valid Until */}
                    {previewProposal.validUntil && (
                      <div className="mt-6 text-center p-3 bg-[#FAF9F7] border border-[#2C2C2C] text-sm text-[#666]">
                        This proposal is valid until {format(new Date(previewProposal.validUntil), "MMMM d, yyyy")}
                      </div>
                    )}
                    
                    <p className="mt-6 text-sm text-[#666]">
                      To accept this proposal, please reply to this email or contact me directly.
                    </p>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-4 text-center border-t border-[#2C2C2C] text-sm text-[#666]">
                    Sent via <span className="text-[#2C2C2C]">Beauvette</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 p-4 border-t border-[#2C2C2C] bg-[#FFFEF9]">
                <button
                  onClick={() => setPreviewProposal(null)}
                  className="flex-1 px-4 py-3 border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                >
                  Close
                </button>
                {previewProposal.status === 'draft' && (
                  <button
                    onClick={() => {
                      sendMutation.mutate(previewProposal.id);
                      setPreviewProposal(null);
                    }}
                    disabled={sendMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2C2C2C] text-[#FFFEF9] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                    Send Proposal
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
