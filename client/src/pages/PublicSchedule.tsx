import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, User, Star, MessageSquare, Send, CreditCard, DollarSign, Loader2, CheckCircle, XCircle, Edit3, X } from "lucide-react";

type ScheduleTeamMember = {
  id: string;
  name: string;
  role: string;
  serviceType?: string;
};

type ScheduleAppointment = {
  id: string;
  teamMemberId?: string;
  clientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  isVip: boolean;
  isBuffer: boolean;
  notes?: string;
};

type EventDaySchedule = {
  id: string;
  eventName: string;
  eventDate: string;
  sessionDetails?: string;
  eventLocation?: string;
  readyByTime?: string;
  notes?: string;
  guestNotes?: string;
  status: string;
  teamMembers?: ScheduleTeamMember[];
  appointments?: ScheduleAppointment[];
  artistId?: string;
  vendorName?: string;
};

const SERVICE_COLORS = {
  H: "bg-pink-100 border-pink-300 text-pink-800",
  M: "bg-purple-100 border-purple-300 text-purple-800",
  HM: "bg-gradient-to-r from-pink-100 to-purple-100 border-pink-300 text-pink-800",
  buffer: "bg-gray-100 border-gray-300 text-gray-500 italic",
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function PublicSchedule({ shareToken }: { shareToken: string }) {
  const queryClient = useQueryClient();
  const [guestNote, setGuestNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [appointmentNoteSaved, setAppointmentNoteSaved] = useState(false);
  
  // Check for payment success/cancel in URL
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');

  const { data: schedule, isLoading, error } = useQuery<EventDaySchedule>({
    queryKey: ["public-schedule", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}`);
      if (!res.ok) throw new Error("Schedule not found");
      return res.json();
    },
  });

  const guestNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/guest-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestNote: note }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-schedule", shareToken] });
      setNoteSaved(true);
      setGuestNote("");
      setTimeout(() => setNoteSaved(false), 3000);
    },
  });

  const appointmentNoteMutation = useMutation({
    mutationFn: async ({ appointmentId, notes }: { appointmentId: string; notes: string }) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/appointment/${appointmentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-schedule", shareToken] });
      setAppointmentNoteSaved(true);
      setTimeout(() => {
        setAppointmentNoteSaved(false);
        setSelectedAppointment(null);
      }, 1500);
    },
  });

  const handleSendPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setProcessingPayment(true);
    try {
      const res = await fetch("/api/payments/schedule-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken,
          amount: Math.round(amount * 100),
          eventName: schedule?.eventName || "Beauty Services",
        }),
      });
      
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const error = await res.json();
        alert(error.message || "Failed to create payment. Please try again.");
      }
    } catch (err) {
      alert("Failed to create payment. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="font-header text-2xl mb-2">Schedule Not Found</h1>
          <p className="text-gray-600">This schedule may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const teamMembers = schedule.teamMembers || [];
  const appointments = schedule.appointments || [];

  const sortedAppointments = [...appointments].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const groupedByTeamMember = teamMembers.reduce((acc, member) => {
    acc[member.id] = sortedAppointments.filter((apt) => apt.teamMemberId === member.id);
    return acc;
  }, {} as Record<string, ScheduleAppointment[]>);

  const unassignedAppointments = sortedAppointments.filter((apt) => !apt.teamMemberId);

  return (
    <div className="min-h-screen bg-powder">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Payment Status Banner */}
        {paymentStatus === 'success' && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">Payment Successful!</p>
              <p className="text-sm text-green-700">Thank you for your payment. Your beauty team has been notified.</p>
            </div>
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Payment Cancelled</p>
              <p className="text-sm text-yellow-700">No worries - you can complete your payment anytime below.</p>
            </div>
          </div>
        )}

        {/* Header with gingham */}
        <div className="gingham-check rounded-xl p-6 mb-8 text-center border border-[#6B4A55]/20 flex items-center justify-center">
          <div className="bg-[#FAF7F2] px-8 py-5 border border-black">
            <h1 className="font-header text-2xl sm:text-3xl text-[#6B4A55] mb-2">
              {schedule.eventName}
              {schedule.sessionDetails && (
                <span className="block text-lg font-normal text-[#6B4A55]/70 mt-1">
                  {schedule.sessionDetails}
                </span>
              )}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[#6B4A55]/80">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {(() => {
                  try {
                    const dateStr = schedule.eventDate;
                    const date = dateStr.includes('T') 
                      ? new Date(dateStr) 
                      : new Date(dateStr + 'T12:00:00');
                    return format(date, "EEEE, MMMM d, yyyy");
                  } catch {
                    return schedule.eventDate;
                  }
                })()}
              </span>
              {schedule.eventLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {schedule.eventLocation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ready By Time */}
        {schedule.readyByTime && (
          <div className="bg-gold/20 border border-gold rounded-lg p-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-gold" />
              <span className="font-header text-lg">Ready by: {formatTimeDisplay(schedule.readyByTime)}</span>
            </div>
          </div>
        )}

        {/* Team Legend */}
        {teamMembers.length > 0 && (
          <div className="bg-cream p-4 rounded-lg mb-6">
            <h2 className="font-header text-lg mb-3 text-center">Your Beauty Team</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{member.name}</span>
                  <span className="text-xs text-gray-500">
                    ({member.serviceType === "hair" ? "Hair" : member.serviceType === "makeup" ? "Makeup" : "Hair & Makeup"})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        <div className="bg-cream p-4 sm:p-6 rounded-lg">
          <h2 className="font-header text-xl mb-4 text-center">Timeline</h2>

          {/* Unassigned appointments */}
          {unassignedAppointments.length > 0 && (
            <div className="mb-6">
              <div className="space-y-2">
                {unassignedAppointments.map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => {
                      if (!apt.isBuffer) {
                        setSelectedAppointment(apt);
                        setEditingNotes(apt.notes || "");
                      }
                    }}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      apt.isBuffer
                        ? SERVICE_COLORS.buffer
                        : SERVICE_COLORS[apt.serviceType as keyof typeof SERVICE_COLORS] || SERVICE_COLORS.HM
                    } ${!apt.isBuffer ? "hover:shadow-md hover:scale-[1.01] cursor-pointer" : ""}`}
                    data-testid={`appointment-card-${apt.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {apt.isVip && <Star className="w-4 h-4 text-gold fill-gold" />}
                        <span className="font-medium">{apt.clientName}</span>
                        <span className="text-sm opacity-75">
                          ({apt.serviceType === "H" ? "Hair" : apt.serviceType === "M" ? "Makeup" : "Hair & Makeup"})
                        </span>
                        {!apt.isBuffer && <Edit3 className="w-3 h-3 opacity-50" />}
                      </div>
                      <span className="font-medium">
                        {formatTimeDisplay(apt.startTime)} - {formatTimeDisplay(apt.endTime)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team member columns */}
          {teamMembers.length > 0 && (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(teamMembers.length, 3)}, 1fr)` }}>
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-lg border border-black/10 overflow-hidden">
                  <div className="bg-black text-white px-4 py-3 font-medium text-center">
                    <div className="flex items-center justify-center gap-2">
                      <User className="w-4 h-4" />
                      {member.name}
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">
                      {member.serviceType === "hair" ? "Hair" : member.serviceType === "makeup" ? "Makeup" : "Hair & Makeup"}
                    </div>
                  </div>
                  <div className="p-3 space-y-2 min-h-[200px]">
                    {groupedByTeamMember[member.id]?.map((apt) => (
                      <button
                        key={apt.id}
                        onClick={() => {
                          if (!apt.isBuffer) {
                            setSelectedAppointment(apt);
                            setEditingNotes(apt.notes || "");
                          }
                        }}
                        className={`w-full p-3 rounded border text-left transition-all ${
                          apt.isBuffer
                            ? SERVICE_COLORS.buffer
                            : SERVICE_COLORS[apt.serviceType as keyof typeof SERVICE_COLORS] || SERVICE_COLORS.HM
                        } ${!apt.isBuffer ? "hover:shadow-md cursor-pointer" : ""}`}
                        data-testid={`appointment-card-${apt.id}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {apt.isVip && <Star className="w-4 h-4 text-gold fill-gold" />}
                          <span className="font-medium">{apt.clientName}</span>
                          {!apt.isBuffer && <Edit3 className="w-3 h-3 opacity-50 ml-auto" />}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="opacity-75">
                            {apt.serviceType === "H" ? "Hair" : apt.serviceType === "M" ? "Makeup" : "H&M"}
                          </span>
                          <span className="font-medium">
                            {formatTimeDisplay(apt.startTime)} - {formatTimeDisplay(apt.endTime)}
                          </span>
                        </div>
                      </button>
                    ))}
                    {(!groupedByTeamMember[member.id] || groupedByTeamMember[member.id].length === 0) && (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No appointments
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {appointments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No appointments scheduled yet</p>
            </div>
          )}
        </div>

        {/* Guest Notes Section */}
        <div className="bg-cream p-4 sm:p-6 rounded-lg shadow-sm border border-black/10 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <h2 className="font-header text-lg ink-main">Guest Notes</h2>
          </div>
          
          {/* Display existing guest notes */}
          {schedule.guestNotes && (
            <div className="bg-white p-3 rounded border mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedule.guestNotes}</p>
            </div>
          )}
          
          {/* Add new note form */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Share your room number, arrival time, or any questions with your beauty team:
            </p>
            <div className="flex gap-2">
              <textarea
                value={guestNote}
                onChange={(e) => setGuestNote(e.target.value)}
                placeholder="e.g., Room 412, Tower B. Will be ready by 6am. Can I have coffee first?"
                className="flex-1 px-3 py-2 border rounded resize-none h-20"
                data-testid="input-guest-note"
              />
            </div>
            <div className="flex items-center justify-between">
              {noteSaved && (
                <span className="text-sm text-green-600">Note saved successfully!</span>
              )}
              {!noteSaved && <span />}
              <button
                onClick={() => guestNoteMutation.mutate(guestNote)}
                disabled={!guestNote.trim() || guestNoteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                data-testid="button-save-guest-note"
              >
                <Send className="w-4 h-4" />
                {guestNoteMutation.isPending ? "Saving..." : "Send Note"}
              </button>
            </div>
          </div>
        </div>

        {/* Send Payment Section */}
        <div className="bg-cream p-4 sm:p-6 rounded-lg shadow-sm border border-black/10 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <h2 className="font-header text-lg ink-main">Send Payment</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Send a payment for your beauty services. Apple Pay, Google Pay, and all major cards accepted.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="1"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-3 border rounded-lg text-lg"
                data-testid="input-payment-amount"
              />
            </div>
            <button
              onClick={handleSendPayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || processingPayment}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              data-testid="button-send-payment"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay Now
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center">
            Secure payment powered by Stripe
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by Beauvette</p>
          <p className="mt-1">
            <a href="/" className="text-gray-400 hover:text-gray-600 underline" data-testid="link-home">Explore Beauvette</a>
          </p>
        </div>
      </div>

      {/* Appointment Edit Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl" data-testid="modal-edit-appointment">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-header text-lg">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1 hover:bg-gray-100 rounded"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-cream p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {selectedAppointment.isVip && <Star className="w-4 h-4 text-gold fill-gold" />}
                  <span className="font-medium text-lg">{selectedAppointment.clientName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeDisplay(selectedAppointment.startTime)} - {formatTimeDisplay(selectedAppointment.endTime)}
                  </span>
                  <span>
                    {selectedAppointment.serviceType === "H" ? "Hair" : selectedAppointment.serviceType === "M" ? "Makeup" : "Hair & Makeup"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Add a note for your stylist
                </label>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="e.g., I'd like a natural look, allergic to latex..."
                  className="w-full px-3 py-2 border rounded-lg resize-none h-24"
                  data-testid="input-appointment-notes"
                />
              </div>

              {appointmentNoteSaved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Note saved successfully!
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </button>
                <button
                  onClick={() => appointmentNoteMutation.mutate({ 
                    appointmentId: selectedAppointment.id, 
                    notes: editingNotes 
                  })}
                  disabled={appointmentNoteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  data-testid="button-save-appointment-notes"
                >
                  {appointmentNoteMutation.isPending ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
