import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Upload, Copy, Check, Plus, Users, FileText, Link2, Mail, Table, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportedBooking {
  booking: any;
  contract: any;
  clientInvitation: any;
  plannerInvitation: any | null;
  clientInviteLink: string;
  plannerInviteLink: string | null;
}

export default function AdminImport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [importedBookings, setImportedBookings] = useState<ImportedBooking[]>([]);
  const [batchData, setBatchData] = useState("");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<{success: number; failed: number; errors: string[]}>({ success: 0, failed: 0, errors: [] });
  
  // Email template state
  const [clientTemplateData, setClientTemplateData] = useState({
    name: "",
    eventDate: "",
    inviteLink: ""
  });
  const [plannerTemplateData, setPlannerTemplateData] = useState({
    name: "",
    clientName: "",
    eventDate: "",
    inviteLink: ""
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const { data: allInvitations } = useQuery({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
    enabled: user?.role === 'admin',
  });

  const [formData, setFormData] = useState({
    clientEmail: "",
    clientFirstName: "",
    clientLastName: "",
    plannerEmail: "",
    plannerFirstName: "",
    plannerLastName: "",
    eventDate: "",
    eventLocation: "",
    serviceType: "Bridal Beauty",
    notes: "",
    totalAmount: "",
    depositAmount: "",
    depositPaid: true,
    contractFileUrl: "",
    packageDetails: "",
  });

  const importMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/import-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          totalAmount: Math.round(parseFloat(data.totalAmount) * 100), // Convert to cents
          depositAmount: Math.round(parseFloat(data.depositAmount) * 100),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import booking");
      }
      return res.json();
    },
    onSuccess: (result) => {
      setImportedBookings((prev) => [...prev, result]);
      toast({
        title: "Booking Imported!",
        description: `Created booking for ${formData.clientFirstName} ${formData.clientLastName}. Invitation links generated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      // Reset form for next entry
      setFormData({
        clientEmail: "",
        clientFirstName: "",
        clientLastName: "",
        plannerEmail: "",
        plannerFirstName: "",
        plannerLastName: "",
        eventDate: "",
        eventLocation: "",
        serviceType: "Bridal Beauty",
        notes: "",
        totalAmount: "",
        depositAmount: "",
        depositPaid: true,
        contractFileUrl: "",
        packageDetails: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (link: string, type: string) => {
    const fullUrl = `${window.location.origin}${link}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedLink(link);
    toast({
      title: "Link Copied!",
      description: `${type} invitation link copied to clipboard.`,
    });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const copyEmailToClipboard = async (email: string, type: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(type);
    toast({
      title: "Email Copied!",
      description: `${type} email template copied to clipboard.`,
    });
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const generateClientEmail = (firstName: string, inviteLink: string, eventDate: string) => {
    return `Subject: Welcome - Your Wedding Beauty Portal

Hi ${firstName}!

I'm so excited to work with you on your special day! I've created a personal account for you on my wedding beauty platform.

Through your portal, you'll be able to:
✨ View your booking details and timeline
✨ Share inspiration photos and preferences
✨ Message me directly with any questions
✨ Track your contract and payment details

Click the link below to set up your account:
${window.location.origin}${inviteLink}

Your wedding date: ${eventDate}

I can't wait to help make you feel absolutely radiant!

With love,
Violet
Your Private Secretary`;
  };

  const generatePlannerEmail = (firstName: string, clientName: string, inviteLink: string, eventDate: string) => {
    return `Subject: Collaboration - ${clientName}'s Wedding

Hi ${firstName}!

I'm thrilled to be working with you on ${clientName}'s wedding! I've set up a coordinator account for you on my wedding beauty platform.

Through your portal, you'll be able to:
📋 View all your clients' booking details
📅 Coordinate schedules and timelines
💬 Message directly with me and your clients
📄 Access contracts and payment status

Click the link below to set up your account:
${window.location.origin}${inviteLink}

Wedding date: ${eventDate}

Looking forward to creating something beautiful together!

Best,
Violet
Your Private Secretary`;
  };

  const processBatchImport = async () => {
    setBatchProcessing(true);
    setBatchResults({ success: 0, failed: 0, errors: [] });
    
    const lines = batchData.trim().split('\n').filter(line => line.trim());
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        // Expected format: ClientFirst,ClientLast,ClientEmail,EventDate,Location,Total,Deposit,PlannerFirst,PlannerLast,PlannerEmail
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 7) {
          throw new Error(`Line ${i + 1}: Not enough fields (need at least 7: first,last,email,date,location,total,deposit)`);
        }

        const [clientFirst, clientLast, clientEmail, eventDate, location, total, deposit, plannerFirst, plannerLast, plannerEmail] = parts;

        const res = await fetch("/api/admin/import-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientFirstName: clientFirst,
            clientLastName: clientLast,
            clientEmail: clientEmail,
            eventDate: eventDate,
            eventLocation: location,
            totalAmount: Math.round(parseFloat(total) * 100),
            depositAmount: Math.round(parseFloat(deposit) * 100),
            depositPaid: true,
            serviceType: "Bridal Beauty",
            plannerFirstName: plannerFirst || "",
            plannerLastName: plannerLast || "",
            plannerEmail: plannerEmail || "",
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(`Line ${i + 1}: ${error.error || "Import failed"}`);
        }

        const result = await res.json();
        setImportedBookings(prev => [...prev, result]);
        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(error.message);
      }
    }

    setBatchResults({ success: successCount, failed: failedCount, errors });
    setBatchProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });

    if (successCount > 0) {
      toast({
        title: "Batch Import Complete",
        description: `Successfully imported ${successCount} bookings${failedCount > 0 ? `, ${failedCount} failed` : ""}.`,
      });
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-[#262329]">Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-[#262329]">Access Denied</CardTitle>
            <CardDescription>You need admin access to import bookings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="bg-white border-b border-[#E8B4B8]/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif text-[#262329]">Import Existing Bookings</h1>
            <p className="text-sm text-[#262329]/60">Add your 2026 bookings and generate invitation links</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="bg-white border flex-wrap">
            <TabsTrigger value="import" className="data-[state=active]:bg-[#E8B4B8]/20">
              <Plus className="h-4 w-4 mr-2" />
              Single Import
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-[#E8B4B8]/20">
              <Table className="h-4 w-4 mr-2" />
              Batch Import
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-[#E8B4B8]/20">
              <FileText className="h-4 w-4 mr-2" />
              Recent ({importedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="emails" className="data-[state=active]:bg-[#E8B4B8]/20">
              <Mail className="h-4 w-4 mr-2" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-[#E8B4B8]/20">
              <Link2 className="h-4 w-4 mr-2" />
              Invitations ({allInvitations?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329] flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#E8B4B8]" />
                    Client Information
                  </CardTitle>
                  <CardDescription>Enter the client details for this booking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientFirstName">First Name *</Label>
                      <Input
                        id="clientFirstName"
                        value={formData.clientFirstName}
                        onChange={(e) => setFormData({ ...formData, clientFirstName: e.target.value })}
                        placeholder="Sarah"
                        data-testid="input-client-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientLastName">Last Name *</Label>
                      <Input
                        id="clientLastName"
                        value={formData.clientLastName}
                        onChange={(e) => setFormData({ ...formData, clientLastName: e.target.value })}
                        placeholder="Johnson"
                        data-testid="input-client-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      placeholder="sarah@example.com"
                      data-testid="input-client-email"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329] flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#3D5A3B]" />
                    Planner Information (Optional)
                  </CardTitle>
                  <CardDescription>If there's a wedding planner involved</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plannerFirstName">First Name</Label>
                      <Input
                        id="plannerFirstName"
                        value={formData.plannerFirstName}
                        onChange={(e) => setFormData({ ...formData, plannerFirstName: e.target.value })}
                        placeholder="Emily"
                        data-testid="input-planner-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plannerLastName">Last Name</Label>
                      <Input
                        id="plannerLastName"
                        value={formData.plannerLastName}
                        onChange={(e) => setFormData({ ...formData, plannerLastName: e.target.value })}
                        placeholder="Davis"
                        data-testid="input-planner-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plannerEmail">Email</Label>
                    <Input
                      id="plannerEmail"
                      type="email"
                      value={formData.plannerEmail}
                      onChange={(e) => setFormData({ ...formData, plannerEmail: e.target.value })}
                      placeholder="emily@planningcompany.com"
                      data-testid="input-planner-email"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329]">Event Details</CardTitle>
                  <CardDescription>When and where is the event?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      data-testid="input-event-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventLocation">Location *</Label>
                    <Input
                      id="eventLocation"
                      value={formData.eventLocation}
                      onChange={(e) => setFormData({ ...formData, eventLocation: e.target.value })}
                      placeholder="The Grand Ballroom, San Francisco"
                      data-testid="input-event-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Input
                      id="serviceType"
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      placeholder="Bridal Beauty"
                      data-testid="input-service-type"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any special requirements or notes..."
                      rows={3}
                      data-testid="input-notes"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329] flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#C9A961]" />
                    Contract & Payment
                  </CardTitle>
                  <CardDescription>Financial details for this booking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageDetails">Package Description</Label>
                    <Input
                      id="packageDetails"
                      value={formData.packageDetails}
                      onChange={(e) => setFormData({ ...formData, packageDetails: e.target.value })}
                      placeholder="Bridal Beauty Package - Hair & Makeup"
                      data-testid="input-package-details"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Total Amount ($) *</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                        placeholder="2500.00"
                        data-testid="input-total-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">Retainer Amount ($) *</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        step="0.01"
                        value={formData.depositAmount}
                        onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                        placeholder="500.00"
                        data-testid="input-deposit-amount"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#FAF9F7] rounded-lg">
                    <Label htmlFor="depositPaid" className="cursor-pointer">Retainer Already Paid</Label>
                    <Switch
                      id="depositPaid"
                      checked={formData.depositPaid}
                      onCheckedChange={(checked) => setFormData({ ...formData, depositPaid: checked })}
                      data-testid="switch-deposit-paid"
                    />
                  </div>
                  {formData.totalAmount && formData.depositAmount && (
                    <div className="p-3 bg-[#3D5A3B]/10 rounded-lg">
                      <p className="text-sm text-[#3D5A3B] font-medium">
                        Remaining Balance: ${(parseFloat(formData.totalAmount) - (formData.depositPaid ? parseFloat(formData.depositAmount) : 0)).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="contractFileUrl">Contract File URL (Optional)</Label>
                    <Input
                      id="contractFileUrl"
                      value={formData.contractFileUrl}
                      onChange={(e) => setFormData({ ...formData, contractFileUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      data-testid="input-contract-url"
                    />
                    <p className="text-xs text-[#262329]/60">Link to the signed contract (Google Drive, Dropbox, etc.)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                onClick={() => importMutation.mutate(formData)}
                disabled={
                  importMutation.isPending ||
                  !formData.clientEmail ||
                  !formData.clientFirstName ||
                  !formData.clientLastName ||
                  !formData.eventDate ||
                  !formData.eventLocation ||
                  !formData.totalAmount ||
                  !formData.depositAmount
                }
                className="bg-[#262329] hover:bg-[#262329]/90 text-white"
                data-testid="button-import-booking"
              >
                {importMutation.isPending ? (
                  "Importing..."
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Booking & Generate Links
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="batch">
            <div className="space-y-6">
              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329] flex items-center gap-2">
                    <Table className="h-5 w-5 text-[#C9A961]" />
                    Batch Import from CSV
                  </CardTitle>
                  <CardDescription>
                    Paste your booking data in CSV format to import multiple bookings at once
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-[#FAF9F7] rounded-lg">
                    <p className="text-sm font-medium text-[#262329] mb-2">Expected Format (one booking per line):</p>
                    <code className="text-xs text-[#262329]/80 block">
                      ClientFirst, ClientLast, ClientEmail, EventDate (YYYY-MM-DD), Location, Total, Deposit, PlannerFirst, PlannerLast, PlannerEmail
                    </code>
                    <p className="text-xs text-[#262329]/60 mt-2">
                      Note: Planner fields are optional. Deposit is assumed to be paid.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Paste Your Booking Data</Label>
                    <Textarea
                      value={batchData}
                      onChange={(e) => setBatchData(e.target.value)}
                      placeholder={`Sarah, Johnson, sarah@email.com, 2026-05-15, The Grand Ballroom, 2500, 500, Emily, Davis, emily@planner.com
Jessica, Williams, jess@email.com, 2026-06-20, Sunset Gardens, 3000, 600
Maria, Garcia, maria@email.com, 2026-07-10, Beach Resort, 2800, 500, Amy, Chen, amy@events.com`}
                      rows={10}
                      className="font-mono text-sm"
                      data-testid="textarea-batch-data"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#262329]/60">
                      {batchData.trim() ? batchData.trim().split('\n').filter(l => l.trim()).length : 0} bookings ready to import
                    </p>
                    <Button
                      onClick={processBatchImport}
                      disabled={batchProcessing || !batchData.trim()}
                      className="bg-[#262329] hover:bg-[#262329]/90 text-white"
                      data-testid="button-batch-import"
                    >
                      {batchProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import All Bookings
                        </>
                      )}
                    </Button>
                  </div>

                  {(batchResults.success > 0 || batchResults.failed > 0) && (
                    <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center gap-4">
                        {batchResults.success > 0 && (
                          <span className="text-sm text-[#3D5A3B] flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            {batchResults.success} successful
                          </span>
                        )}
                        {batchResults.failed > 0 && (
                          <span className="text-sm text-red-600">
                            {batchResults.failed} failed
                          </span>
                        )}
                      </div>
                      {batchResults.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 space-y-1">
                          {batchResults.errors.map((err, i) => (
                            <p key={i}>{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="emails">
            <div className="space-y-6">
              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329] flex items-center gap-2">
                    <Mail className="h-5 w-5 text-[#E8B4B8]" />
                    Client Invitation Email Template
                  </CardTitle>
                  <CardDescription>
                    Use this template when sending invitation links to clients
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <Input
                      placeholder="Client First Name"
                      value={clientTemplateData.name}
                      onChange={(e) => setClientTemplateData({ ...clientTemplateData, name: e.target.value })}
                      data-testid="input-template-client-name"
                    />
                    <Input
                      placeholder="Event Date (e.g., May 15, 2026)"
                      value={clientTemplateData.eventDate}
                      onChange={(e) => setClientTemplateData({ ...clientTemplateData, eventDate: e.target.value })}
                      data-testid="input-template-event-date"
                    />
                    <Input
                      placeholder="Invite Link (e.g., /invite/abc123)"
                      value={clientTemplateData.inviteLink}
                      onChange={(e) => setClientTemplateData({ ...clientTemplateData, inviteLink: e.target.value })}
                      data-testid="input-template-invite-link"
                    />
                  </div>
                  <div className="relative">
                    <pre className="p-4 bg-[#FAF9F7] rounded-lg text-sm text-[#262329] whitespace-pre-wrap overflow-auto max-h-80">
                      {generateClientEmail(
                        clientTemplateData.name || '[Client Name]',
                        clientTemplateData.inviteLink || '/invite/[token]',
                        clientTemplateData.eventDate || '[Event Date]'
                      )}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyEmailToClipboard(
                        generateClientEmail(
                          clientTemplateData.name || '[Client Name]',
                          clientTemplateData.inviteLink || '/invite/[token]',
                          clientTemplateData.eventDate || '[Event Date]'
                        ),
                        'Client'
                      )}
                      data-testid="button-copy-client-email"
                    >
                      {copiedEmail === 'Client' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E8B4B8]/20">
                <CardHeader>
                  <CardTitle className="text-[#262329] flex items-center gap-2">
                    <Mail className="h-5 w-5 text-[#3D5A3B]" />
                    Planner Invitation Email Template
                  </CardTitle>
                  <CardDescription>
                    Use this template when sending invitation links to wedding planners
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <Input
                      placeholder="Planner First Name"
                      value={plannerTemplateData.name}
                      onChange={(e) => setPlannerTemplateData({ ...plannerTemplateData, name: e.target.value })}
                      data-testid="input-template-planner-name"
                    />
                    <Input
                      placeholder="Client Name"
                      value={plannerTemplateData.clientName}
                      onChange={(e) => setPlannerTemplateData({ ...plannerTemplateData, clientName: e.target.value })}
                      data-testid="input-template-planner-client-name"
                    />
                    <Input
                      placeholder="Event Date"
                      value={plannerTemplateData.eventDate}
                      onChange={(e) => setPlannerTemplateData({ ...plannerTemplateData, eventDate: e.target.value })}
                      data-testid="input-template-planner-event-date"
                    />
                    <Input
                      placeholder="Invite Link"
                      value={plannerTemplateData.inviteLink}
                      onChange={(e) => setPlannerTemplateData({ ...plannerTemplateData, inviteLink: e.target.value })}
                      data-testid="input-template-planner-invite-link"
                    />
                  </div>
                  <div className="relative">
                    <pre className="p-4 bg-[#FAF9F7] rounded-lg text-sm text-[#262329] whitespace-pre-wrap overflow-auto max-h-80">
                      {generatePlannerEmail(
                        plannerTemplateData.name || '[Planner Name]',
                        plannerTemplateData.clientName || '[Client Name]',
                        plannerTemplateData.inviteLink || '/invite/[token]',
                        plannerTemplateData.eventDate || '[Event Date]'
                      )}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyEmailToClipboard(
                        generatePlannerEmail(
                          plannerTemplateData.name || '[Planner Name]',
                          plannerTemplateData.clientName || '[Client Name]',
                          plannerTemplateData.inviteLink || '/invite/[token]',
                          plannerTemplateData.eventDate || '[Event Date]'
                        ),
                        'Planner'
                      )}
                      data-testid="button-copy-planner-email"
                    >
                      {copiedEmail === 'Planner' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {importedBookings.length > 0 && (
                <Card className="bg-white border-[#C9A961]/30">
                  <CardHeader>
                    <CardTitle className="text-[#262329] flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#C9A961]" />
                      Quick Generate from Recent Imports
                    </CardTitle>
                    <CardDescription>
                      Click on a recent import to auto-fill the client email template
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {importedBookings.slice(0, 5).map((item, index) => (
                        <div 
                          key={index}
                          className="p-3 bg-[#FAF9F7] rounded-lg flex items-center justify-between hover:bg-[#E8B4B8]/10 cursor-pointer transition-colors"
                          onClick={() => {
                            setClientTemplateData({
                              name: item.clientInvitation.firstName,
                              eventDate: new Date(item.booking.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                              inviteLink: item.clientInviteLink
                            });
                            if (item.plannerInvitation) {
                              setPlannerTemplateData({
                                name: item.plannerInvitation.firstName,
                                clientName: `${item.clientInvitation.firstName} ${item.clientInvitation.lastName}`,
                                eventDate: new Date(item.booking.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                                inviteLink: item.plannerInviteLink || ''
                              });
                            }
                            toast({
                              title: "Template Populated",
                              description: `Email templates filled for ${item.clientInvitation.firstName}.`,
                            });
                          }}
                          data-testid={`button-quick-generate-${index}`}
                        >
                          <div>
                            <p className="font-medium text-[#262329]">
                              {item.clientInvitation.firstName} {item.clientInvitation.lastName}
                            </p>
                            <p className="text-xs text-[#262329]/60">
                              {new Date(item.booking.eventDate).toLocaleDateString()} 
                              {item.plannerInvitation && ` • with ${item.plannerInvitation.firstName}`}
                            </p>
                          </div>
                          <span className="text-xs text-[#C9A961]">Click to use</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent">
            {importedBookings.length === 0 ? (
              <Card className="bg-white border-[#E8B4B8]/20">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-[#262329]/20 mx-auto mb-4" />
                  <p className="text-[#262329]/60">No bookings imported yet in this session.</p>
                  <p className="text-sm text-[#262329]/40 mt-2">Import a booking to see invitation links here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {importedBookings.map((item, index) => (
                  <Card key={index} className="bg-white border-[#E8B4B8]/20">
                    <CardHeader>
                      <CardTitle className="text-[#262329]">
                        {item.clientInvitation.firstName} {item.clientInvitation.lastName}
                      </CardTitle>
                      <CardDescription>
                        {new Date(item.booking.eventDate).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} at {item.booking.location}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-[#FAF9F7] rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#262329]">Client Invitation Link</p>
                            <p className="text-xs text-[#262329]/60">{item.clientInvitation.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(item.clientInviteLink, "Client")}
                            data-testid={`button-copy-client-link-${index}`}
                          >
                            {copiedLink === item.clientInviteLink ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <code className="block text-xs bg-white p-2 rounded border break-all">
                          {window.location.origin}{item.clientInviteLink}
                        </code>
                      </div>

                      {item.plannerInvitation && (
                        <div className="p-4 bg-[#3D5A3B]/5 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[#262329]">Planner Invitation Link</p>
                              <p className="text-xs text-[#262329]/60">{item.plannerInvitation.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(item.plannerInviteLink!, "Planner")}
                              data-testid={`button-copy-planner-link-${index}`}
                            >
                              {copiedLink === item.plannerInviteLink ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <code className="block text-xs bg-white p-2 rounded border break-all">
                            {window.location.origin}{item.plannerInviteLink}
                          </code>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 text-center pt-2">
                        <div>
                          <p className="text-lg font-semibold text-[#262329]">
                            ${(item.contract.totalAmount / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-[#262329]/60">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#3D5A3B]">
                            ${(item.contract.depositAmount / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-[#262329]/60">Retainer</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#E8B4B8]">
                            ${(item.contract.remainingAmount / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-[#262329]/60">Remaining</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations">
            {!allInvitations || allInvitations.length === 0 ? (
              <Card className="bg-white border-[#E8B4B8]/20">
                <CardContent className="py-12 text-center">
                  <Link2 className="h-12 w-12 text-[#262329]/20 mx-auto mb-4" />
                  <p className="text-[#262329]/60">No invitations created yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allInvitations.map((invitation: any) => (
                  <Card key={invitation.id} className="bg-white border-[#E8B4B8]/20">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            invitation.role === 'client' ? 'bg-[#E8B4B8]/20' : 'bg-[#3D5A3B]/20'
                          }`}>
                            <Users className={`h-5 w-5 ${
                              invitation.role === 'client' ? 'text-[#E8B4B8]' : 'text-[#3D5A3B]'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-[#262329]">
                              {invitation.firstName} {invitation.lastName}
                            </p>
                            <p className="text-sm text-[#262329]/60">{invitation.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            invitation.status === 'pending' 
                              ? 'bg-[#C9A961]/20 text-[#C9A961]'
                              : invitation.status === 'accepted'
                              ? 'bg-[#3D5A3B]/20 text-[#3D5A3B]'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {invitation.status}
                          </span>
                          <span className="text-xs text-[#262329]/40 capitalize">
                            {invitation.role}
                          </span>
                          {invitation.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`/invite/${invitation.token}`, invitation.role)}
                              data-testid={`button-copy-invitation-${invitation.id}`}
                            >
                              {copiedLink === `/invite/${invitation.token}` ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
