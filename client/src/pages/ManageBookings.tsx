import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GooglePlacesInput from "@/components/GooglePlacesInput";
import DayOfReadiness from "@/components/DayOfReadiness";
import { ArrowLeft, Edit2, Trash2, Loader2 } from "lucide-react";

interface Booking {
  id: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  artistId: string;
  plannerId?: string;
  status: string;
  eventDate: string;
  location: string;
  serviceType: string;
  notes?: string;
  amount?: number;
  paymentStatus?: string;
}

export default function ManageBookings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Booking>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role === 'artist') {
      fetchBookings();
    }
  }, [authLoading, user]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/artist/${user.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const normalizeEventDate = (dateStr: string): string => {
    // Parse and create a noon local time to avoid timezone shifts
    const date = new Date(dateStr);
    const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    return localNoon.toISOString();
  };

  const handleEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setEditFormData({
      ...booking,
      eventDate: normalizeEventDate(booking.eventDate)
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const res = await fetch(`/api/bookings/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        const updated = await res.json();
        setBookings(prev => prev.map(b => b.id === editingId ? updated : b));
        setEditingId(null);
        setEditFormData({});
        toast({
          title: "Success",
          description: "Booking updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update booking",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bookingId: string) => {
    setDeletingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        toast({
          title: "Success",
          description: "Booking deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete booking",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error deleting booking:", err);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  if (!user || user.role !== 'artist') {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-[#262329]">Access Denied</CardTitle>
            <CardDescription>Only vendors can manage bookings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-2xl font-serif text-[#262329]">Manage Bookings</h1>
            <p className="text-sm text-[#262329]/60">Edit or delete your imported bookings</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#E8B4B8]" />
            <p className="text-[#262329]/60 mt-2">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="bg-white border-[#E8B4B8]/20">
            <CardContent className="py-12 text-center">
              <p className="text-[#262329]/60">No bookings yet. Import some bookings to get started.</p>
              <Button
                onClick={() => setLocation("/artist")}
                className="mt-4 bg-[#262329] hover:bg-[#262329]/90 text-white"
                data-testid="button-go-to-dashboard"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="bg-white border-[#E8B4B8]/20">
                <CardContent className="py-4">
                  {editingId === booking.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-[#262329]">Service Type</Label>
                          <Input
                            value={editFormData.serviceType || ""}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                            className="h-8 text-sm"
                            data-testid="input-service-type"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#262329]">Event Date</Label>
                          <Input
                            type="date"
                            value={editFormData.eventDate ? (() => {
                              const d = new Date(editFormData.eventDate);
                              const year = d.getFullYear();
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const day = String(d.getDate()).padStart(2, '0');
                              return `${year}-${month}-${day}`;
                            })() : ""}
                            onChange={(e) => {
                              const dateValue = e.target.value;
                              if (dateValue) {
                                const [year, month, day] = dateValue.split('-').map(Number);
                                const localNoon = new Date(year, month - 1, day, 12, 0, 0);
                                setEditFormData(prev => ({ ...prev, eventDate: localNoon.toISOString() }));
                              }
                            }}
                            className="h-8 text-sm"
                            data-testid="input-event-date"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-[#262329]">Location</Label>
                        <GooglePlacesInput
                          value={editFormData.location || ""}
                          onChange={(value) => setEditFormData(prev => ({ ...prev, location: value }))}
                          placeholder="Start typing venue name or address..."
                          className="h-8 text-sm"
                          data-testid="input-location"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#262329]">Notes</Label>
                        <Input
                          value={editFormData.notes || ""}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                          className="h-8 text-sm"
                          data-testid="input-notes"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-[#262329]">Total Amount ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editFormData.amount ? (editFormData.amount / 100).toFixed(2) : ""}
                            onChange={(e) => {
                              const dollars = parseFloat(e.target.value) || 0;
                              setEditFormData(prev => ({ ...prev, amount: Math.round(dollars * 100) }));
                            }}
                            placeholder="0.00"
                            className="h-8 text-sm"
                            data-testid="input-amount"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#262329]">Payment Status</Label>
                          <select
                            value={editFormData.paymentStatus || "pending"}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                            className="w-full h-8 text-sm px-2 border border-gray-300 rounded"
                            data-testid="select-payment-status"
                          >
                            <option value="pending">Pending</option>
                            <option value="deposit_paid">Retainer Paid</option>
                            <option value="paid">Paid in Full</option>
                            <option value="partial">Partial Payment</option>
                            <option value="overdue">Overdue</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-[#262329]">Booking Status</Label>
                        <select
                          value={editFormData.status || ""}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full h-8 text-sm px-2 border border-gray-300 rounded"
                          data-testid="select-status"
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditFormData({});
                          }}
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="bg-[#3D5A3B] hover:bg-[#3D5A3B]/90 text-white"
                          data-testid="button-save-edit"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#262329]">{booking.clientName || 'Unknown Client'}</p>
                        <p className="text-sm text-[#262329]/60">
                          {booking.serviceType} • {(() => {
                            const d = new Date(booking.eventDate);
                            return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          })()}
                        </p>
                        <p className="text-sm text-[#262329]/60">
                          {booking.location}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {booking.amount ? (
                            <span className="text-sm font-medium text-[#3D5A3B]">
                              ${(booking.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-sm text-[#262329]/40 italic">No amount set</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            booking.paymentStatus === 'deposit_paid' ? 'bg-blue-100 text-blue-700' :
                            booking.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            booking.paymentStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {booking.paymentStatus === 'deposit_paid' ? 'Retainer Paid' :
                             booking.paymentStatus === 'paid' ? 'Paid' :
                             booking.paymentStatus === 'partial' ? 'Partial' :
                             booking.paymentStatus === 'overdue' ? 'Overdue' :
                             'Payment Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-[#262329]/50 mt-1">
                          Status: <span className="font-medium">{booking.status}</span>
                          {booking.clientEmail && <span className="ml-2">• {booking.clientEmail}</span>}
                        </p>
                        
                        {/* Day-of Readiness Checklist */}
                        {(booking.status === 'confirmed' || booking.status === 'accepted') && (
                          <DayOfReadiness
                            booking={{
                              id: booking.id,
                              clientName: booking.clientName || 'Client',
                              eventDate: booking.eventDate,
                              eventLocation: booking.location,
                              notes: booking.notes,
                              serviceType: booking.serviceType,
                            }}
                            className="mt-3"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-start mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(booking)}
                          data-testid={`button-edit-${booking.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(booking.id)}
                          disabled={deletingId === booking.id}
                          className="text-red-500 hover:text-red-600"
                          data-testid={`button-delete-${booking.id}`}
                        >
                          {deletingId === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
