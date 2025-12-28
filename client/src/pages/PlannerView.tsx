import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Mail, Phone, DollarSign, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface PlannerViewProps {
  bookingId: string;
}

export default function PlannerView({ bookingId }: PlannerViewProps) {
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["/api/bookings/planner-view", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/planner-view`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load booking");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5A1F2B]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Booking</h2>
            <p className="text-gray-600 mb-4">{(error as Error).message}</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="font-medium text-[#5A1F2B]">Your Private Secretary</span>
            <span>•</span>
            <span>Booking Details</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            {booking.packageType || "Beauty Services"}
          </h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-[#5A1F2B]" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5A1F2B]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#5A1F2B]" />
                </div>
                <div>
                  <p className="font-medium">{booking.clientName || "Client"}</p>
                  <p className="text-sm text-gray-500">Client</p>
                </div>
              </div>
              {booking.clientEmail && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{booking.clientEmail}</span>
                </div>
              )}
              {booking.clientPhone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{booking.clientPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-[#5A1F2B]" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event Date</p>
                  <p className="font-medium">{formatDate(booking.eventDate)}</p>
                </div>
                {booking.eventTime && (
                  <div>
                    <p className="text-sm text-gray-500">Event Time</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{booking.eventTime}</span>
                    </div>
                  </div>
                )}
              </div>
              {booking.eventLocation && (
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{booking.eventLocation}</span>
                  </div>
                </div>
              )}
              {booking.eventType && (
                <div>
                  <p className="text-sm text-gray-500">Event Type</p>
                  <p className="font-medium capitalize">{booking.eventType}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[#5A1F2B]" />
                Services & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.packageType && (
                <div>
                  <p className="text-sm text-gray-500">Package</p>
                  <p className="font-medium">{booking.packageType}</p>
                </div>
              )}
              {booking.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
                </div>
              )}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(booking.totalAmount)}</span>
                </div>
                {booking.depositAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit</span>
                    <span className="font-medium">{formatCurrency(booking.depositAmount)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-[#5A1F2B]" />
                Artist Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5A1F2B]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#5A1F2B]" />
                </div>
                <div>
                  <p className="font-medium">{booking.artistName || "Beauty Artist"}</p>
                  <p className="text-sm text-gray-500">Beauty Artist</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500 py-4">
            <p>This booking is shared via <span className="font-medium text-[#5A1F2B]">Your Private Secretary</span></p>
            <p className="mt-1">For questions, please contact the artist directly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
