import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Check, 
  AlertCircle, 
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trash2,
  Edit2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedBooking {
  clientFirst: string;
  clientLast: string;
  clientEmail: string;
  eventDate: string;
  location: string;
  total: string;
  deposit: string;
  plannerFirst?: string;
  plannerLast?: string;
  plannerEmail?: string;
  isValid: boolean;
  errors: string[];
}

export default function VendorImport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [rawData, setRawData] = useState("");
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: number; failed: number}>({ success: 0, failed: 0 });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const parseDate = (dateStr: string): string | null => {
    const cleaned = dateStr.trim();
    
    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // 2026-3-15 or 2026-03-15
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // 3/15/2026 or 03/15/2026
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // 3-15-2026
      /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/, // March 15, 2026 or March 15 2026
      /^(\d{1,2})\s+(\w+)\s+(\d{4})$/, // 15 March 2026
    ];

    // YYYY-MM-DD
    let match = cleaned.match(formats[0]);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // MM/DD/YYYY
    match = cleaned.match(formats[1]);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // MM-DD-YYYY
    match = cleaned.match(formats[2]);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Month DD, YYYY
    match = cleaned.match(formats[3]);
    if (match) {
      const [, monthName, day, year] = match;
      const monthNum = getMonthNumber(monthName);
      if (monthNum) {
        return `${year}-${monthNum}-${day.padStart(2, '0')}`;
      }
    }

    // DD Month YYYY
    match = cleaned.match(formats[4]);
    if (match) {
      const [, day, monthName, year] = match;
      const monthNum = getMonthNumber(monthName);
      if (monthNum) {
        return `${year}-${monthNum}-${day.padStart(2, '0')}`;
      }
    }

    return null;
  };

  const getMonthNumber = (monthName: string): string | null => {
    const months: Record<string, string> = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09', sept: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12',
    };
    return months[monthName.toLowerCase()] || null;
  };

  const parseBookings = () => {
    const lines = rawData.trim().split('\n').filter(line => line.trim());
    const parsed: ParsedBooking[] = [];

    for (const line of lines) {
      // Skip header rows
      if (line.toLowerCase().includes('first') && line.toLowerCase().includes('email')) {
        continue;
      }

      const parts = line.split(/[,\t]/).map(p => p.trim());
      const errors: string[] = [];

      const clientFirst = parts[0] || '';
      const clientLast = parts[1] || '';
      const clientEmail = parts[2] || '';
      const eventDateRaw = parts[3] || '';
      const location = parts[4] || '';
      const totalRaw = parts[5] || '';
      const depositRaw = parts[6] || '';
      const plannerFirst = parts[7] || '';
      const plannerLast = parts[8] || '';
      const plannerEmail = parts[9] || '';

      // Validate required fields
      if (!clientFirst) errors.push('Missing client first name');
      if (!clientLast) errors.push('Missing client last name');
      if (!clientEmail) errors.push('Missing client email');
      else if (!clientEmail.includes('@')) errors.push('Invalid email format');
      
      const eventDate = parseDate(eventDateRaw);
      if (!eventDate) errors.push('Invalid date format');
      
      if (!location) errors.push('Missing location');
      
      const total = totalRaw.replace(/[$,]/g, '');
      if (!total || isNaN(parseFloat(total))) errors.push('Invalid total amount');
      
      const deposit = depositRaw.replace(/[$,]/g, '');
      if (!deposit || isNaN(parseFloat(deposit))) errors.push('Invalid deposit amount');

      // Validate planner email if provided
      if (plannerEmail && !plannerEmail.includes('@')) {
        errors.push('Invalid planner email format');
      }

      parsed.push({
        clientFirst,
        clientLast,
        clientEmail,
        eventDate: eventDate || eventDateRaw,
        location,
        total,
        deposit,
        plannerFirst,
        plannerLast,
        plannerEmail,
        isValid: errors.length === 0,
        errors,
      });
    }

    setParsedBookings(parsed);
    setStep(2);
  };

  const updateBooking = (index: number, field: keyof ParsedBooking, value: string) => {
    setParsedBookings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Re-validate
      const errors: string[] = [];
      const b = updated[index];
      if (!b.clientFirst) errors.push('Missing client first name');
      if (!b.clientLast) errors.push('Missing client last name');
      if (!b.clientEmail || !b.clientEmail.includes('@')) errors.push('Invalid email');
      if (!parseDate(b.eventDate)) errors.push('Invalid date');
      if (!b.location) errors.push('Missing location');
      if (!b.total || isNaN(parseFloat(b.total))) errors.push('Invalid total');
      if (!b.deposit || isNaN(parseFloat(b.deposit))) errors.push('Invalid deposit');
      
      updated[index].errors = errors;
      updated[index].isValid = errors.length === 0;
      
      return updated;
    });
  };

  const removeBooking = (index: number) => {
    setParsedBookings(prev => prev.filter((_, i) => i !== index));
  };

  const importBookings = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const booking of parsedBookings.filter(b => b.isValid)) {
      try {
        const res = await fetch("/api/vendor/import-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientFirstName: booking.clientFirst,
            clientLastName: booking.clientLast,
            clientEmail: booking.clientEmail,
            eventDate: booking.eventDate,
            eventLocation: booking.location,
            totalAmount: Math.round(parseFloat(booking.total) * 100),
            depositAmount: Math.round(parseFloat(booking.deposit) * 100),
            depositPaid: true,
            serviceType: "Bridal Beauty",
            plannerFirstName: booking.plannerFirst || "",
            plannerLastName: booking.plannerLast || "",
            plannerEmail: booking.plannerEmail || "",
          }),
        });

        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setImportResults({ success, failed });
    setImporting(false);
    setStep(3);
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });

    toast({
      title: "Import Complete!",
      description: `Successfully imported ${success} bookings${failed > 0 ? `, ${failed} failed` : ""}.`,
    });
  };

  const downloadTemplate = () => {
    // Server-side generation avoids antivirus false positives from client-side Blob creation
    const link = document.createElement('a');
    link.href = '/api/template/booking-csv';
    link.download = 'booking-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-[#262329]">Loading...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-[#262329]">Vendor Access Required</CardTitle>
            <CardDescription>You need a vendor account to import bookings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const validCount = parsedBookings.filter(b => b.isValid).length;
  const invalidCount = parsedBookings.filter(b => !b.isValid).length;

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="bg-white border-b border-[#E8B4B8]/20 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/artist")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif text-[#262329]">Import Your Bookings</h1>
            <p className="text-sm text-[#262329]/60">Bring your existing 2026-2027 bookings into your dashboard</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#E8B4B8] text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <span className={`text-sm ${step >= 1 ? 'text-[#262329]' : 'text-gray-400'}`}>Paste Data</span>
          </div>
          <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-[#E8B4B8]' : 'bg-gray-200'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#E8B4B8] text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <span className={`text-sm ${step >= 2 ? 'text-[#262329]' : 'text-gray-400'}`}>Review</span>
          </div>
          <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-[#E8B4B8]' : 'bg-gray-200'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#3D5A3B] text-white' : 'bg-gray-200 text-gray-500'}`}>
              <Check className="h-5 w-5" />
            </div>
            <span className={`text-sm ${step >= 3 ? 'text-[#262329]' : 'text-gray-400'}`}>Done</span>
          </div>
        </div>

        {/* Step 1: Paste Data */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="bg-white border-[#E8B4B8]/20">
              <CardHeader>
                <CardTitle className="text-[#262329] flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-[#E8B4B8]" />
                  Step 1: Paste Your Booking Data
                </CardTitle>
                <CardDescription>
                  Copy from Excel, Google Sheets, or type it out. We'll figure out the format!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                    data-testid="button-download-template"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                <div className="p-4 bg-[#FAF9F7] rounded-lg">
                  <p className="text-sm font-medium text-[#262329] mb-2">Format:</p>
                  <code className="text-xs text-[#262329]/80 block">
                    Client First, Client Last, Email, Date, Location, Total, Deposit, Planner First, Planner Last, Planner Email
                  </code>
                  <p className="text-xs text-[#262329]/60 mt-2">
                    Dates can be: 2026-05-15, 5/15/2026, May 15 2026, or 15 May 2026
                  </p>
                  <p className="text-xs text-[#262329]/60">
                    Planner fields are optional - leave blank if no planner
                  </p>
                </div>

                <Textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder={`Sarah, Johnson, sarah@email.com, May 15 2026, The Grand Ballroom, 2500, 500, Emily, Davis, emily@planner.com
Jessica, Williams, jess@email.com, 6/20/2026, Sunset Gardens, 3000, 600
Maria, Garcia, maria@email.com, 2026-07-10, Beach Resort, 2800, 500`}
                  rows={12}
                  className="font-mono text-sm"
                  data-testid="textarea-booking-data"
                />

                <div className="flex justify-between items-center">
                  <p className="text-sm text-[#262329]/60">
                    {rawData.trim() ? rawData.trim().split('\n').filter(l => l.trim()).length : 0} rows detected
                  </p>
                  <Button
                    onClick={parseBookings}
                    disabled={!rawData.trim()}
                    className="bg-[#262329] hover:bg-[#262329]/90 text-white"
                    data-testid="button-parse-bookings"
                  >
                    Review Bookings
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Review & Edit */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                data-testid="button-back-to-paste"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <div className="flex items-center gap-4">
                {validCount > 0 && (
                  <span className="text-sm text-[#3D5A3B] flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    {validCount} ready to import
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {invalidCount} need fixes
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {parsedBookings.map((booking, index) => (
                <Card 
                  key={index} 
                  className={`bg-white ${booking.isValid ? 'border-[#3D5A3B]/30' : 'border-red-300'}`}
                >
                  <CardContent className="py-4">
                    {editingIndex === index ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">First Name</Label>
                            <Input
                              value={booking.clientFirst}
                              onChange={(e) => updateBooking(index, 'clientFirst', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Last Name</Label>
                            <Input
                              value={booking.clientLast}
                              onChange={(e) => updateBooking(index, 'clientLast', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Email</Label>
                            <Input
                              value={booking.clientEmail}
                              onChange={(e) => updateBooking(index, 'clientEmail', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input
                              value={booking.eventDate}
                              onChange={(e) => updateBooking(index, 'eventDate', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Location</Label>
                            <Input
                              value={booking.location}
                              onChange={(e) => updateBooking(index, 'location', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total ($)</Label>
                            <Input
                              value={booking.total}
                              onChange={(e) => updateBooking(index, 'total', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Deposit ($)</Label>
                            <Input
                              value={booking.deposit}
                              onChange={(e) => updateBooking(index, 'deposit', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setEditingIndex(null)}
                            className="bg-[#3D5A3B] hover:bg-[#3D5A3B]/90 text-white"
                          >
                            Done Editing
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${booking.isValid ? 'bg-[#3D5A3B]/10' : 'bg-red-100'}`}>
                            {booking.isValid ? (
                              <Check className="h-4 w-4 text-[#3D5A3B]" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#262329]">
                              {booking.clientFirst} {booking.clientLast}
                            </p>
                            <p className="text-sm text-[#262329]/60">
                              {booking.eventDate} • {booking.location} • ${booking.total}
                            </p>
                            {!booking.isValid && (
                              <p className="text-xs text-red-500 mt-1">
                                {booking.errors.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingIndex(index)}
                            data-testid={`button-edit-${index}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBooking(index)}
                            className="text-red-500 hover:text-red-600"
                            data-testid={`button-remove-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {parsedBookings.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={importBookings}
                  disabled={validCount === 0 || importing}
                  className="bg-[#262329] hover:bg-[#262329]/90 text-white"
                  data-testid="button-import-all"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {validCount} Booking{validCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Card className="bg-white border-[#3D5A3B]/30">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-[#3D5A3B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-[#3D5A3B]" />
              </div>
              <h2 className="text-2xl font-serif text-[#262329] mb-2">Import Complete!</h2>
              <p className="text-[#262329]/60 mb-6">
                Successfully imported {importResults.success} booking{importResults.success !== 1 ? 's' : ''}
                {importResults.failed > 0 && ` (${importResults.failed} failed)`}
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setRawData("");
                    setParsedBookings([]);
                  }}
                  data-testid="button-import-more"
                >
                  Import More Bookings
                </Button>
                <Button
                  onClick={() => setLocation("/artist")}
                  className="bg-[#262329] hover:bg-[#262329]/90 text-white"
                  data-testid="button-go-to-dashboard"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
