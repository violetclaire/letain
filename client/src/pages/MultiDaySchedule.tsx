import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Users, ChevronDown, ChevronUp, Edit3, X, Star, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ScheduleAppointment {
  id: string;
  teamMemberId: string | null;
  clientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  notes?: string;
  isVip?: boolean;
  isBuffer?: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
}

interface EventDaySchedule {
  id: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  teamMembers?: TeamMember[];
  appointments?: ScheduleAppointment[];
  shareToken?: string;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function DaySchedule({ 
  schedule, 
  dayNumber, 
  totalDays, 
  defaultExpanded,
  onSelectAppointment 
}: { 
  schedule: EventDaySchedule; 
  dayNumber: number; 
  totalDays: number; 
  defaultExpanded: boolean;
  onSelectAppointment: (apt: ScheduleAppointment, shareToken: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const teamMembers = schedule.teamMembers || [];
  const appointments = schedule.appointments || [];

  const sortedAppointments = [...appointments].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const groupedByTeamMember = teamMembers.reduce((acc, member) => {
    acc[member.id] = sortedAppointments.filter((apt) => apt.teamMemberId === member.id);
    return acc;
  }, {} as Record<string, ScheduleAppointment[]>);

  const dateStr = schedule.eventDate.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day, 12, 0, 0);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-cream hover:bg-cream/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {totalDays > 1 && (
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
              <div className="text-center">
                <div className="text-[0.6rem] uppercase leading-none">Day</div>
                <div className="text-lg font-bold leading-none">{dayNumber}</div>
              </div>
            </div>
          )}
          {totalDays === 1 && <Calendar size={18} className="text-gold" />}
          <div className="text-left">
            <h3 className="font-header text-lg">{schedule.eventName}</h3>
            <p className="text-sm text-black/60">{formattedDate}</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div className="p-4">
          {schedule.eventLocation && (
            <div className="flex items-center gap-2 mb-4 text-sm text-black/60">
              <MapPin size={14} />
              <span>{schedule.eventLocation}</span>
            </div>
          )}

          {teamMembers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs uppercase tracking-wide text-black/50 mb-2 flex items-center gap-1">
                <Users size={12} /> Team
              </h4>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map((member) => (
                  <span
                    key={member.id}
                    className="px-2 py-1 bg-powder rounded text-xs"
                  >
                    {member.name} ({member.role})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {teamMembers.map((member) => {
              const memberAppts = groupedByTeamMember[member.id] || [];
              if (memberAppts.length === 0) return null;

              return (
                <div key={member.id}>
                  <h4 className="font-medium text-sm mb-2 text-pink">{member.name}</h4>
                  <div className="space-y-2 pl-3 border-l-2 border-pink/30">
                    {memberAppts.map((apt) => (
                      <button
                        key={apt.id}
                        onClick={() => !apt.isBuffer && schedule.shareToken && onSelectAppointment(apt, schedule.shareToken)}
                        className={`w-full text-left bg-powder/50 rounded p-2 transition-all ${!apt.isBuffer ? "hover:bg-powder hover:shadow-sm cursor-pointer" : ""}`}
                        data-testid={`appointment-card-${apt.id}`}
                      >
                        <div className="flex items-center gap-2 text-xs text-black/60 mb-1">
                          <Clock size={10} />
                          <span>
                            {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                          </span>
                          {!apt.isBuffer && <Edit3 size={10} className="ml-auto opacity-50" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {apt.isVip && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                          <p className="text-sm font-medium">{apt.clientName}</p>
                        </div>
                        <p className="text-xs text-black/60">{apt.serviceType}</p>
                        {apt.notes && (
                          <p className="text-xs text-black/50 mt-1 italic">{apt.notes}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MultiDaySchedule({ tokens }: { tokens: string }) {
  const tokenList = tokens.split(",");
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
  const [selectedShareToken, setSelectedShareToken] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState("");
  const [appointmentNoteSaved, setAppointmentNoteSaved] = useState(false);

  const appointmentNoteMutation = useMutation({
    mutationFn: async ({ appointmentId, notes, shareToken }: { appointmentId: string; notes: string; shareToken: string }) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/appointment/${appointmentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multi-schedule", tokens] });
      setAppointmentNoteSaved(true);
      setTimeout(() => {
        setAppointmentNoteSaved(false);
        setSelectedAppointment(null);
      }, 1500);
    },
  });

  const handleSelectAppointment = (apt: ScheduleAppointment, shareToken: string) => {
    setSelectedAppointment(apt);
    setSelectedShareToken(shareToken);
    setEditingNotes(apt.notes || "");
  };

  const { data: schedules, isLoading, error } = useQuery<EventDaySchedule[]>({
    queryKey: ["multi-schedule", tokens],
    queryFn: async () => {
      const results = await Promise.all(
        tokenList.map(async (token) => {
          const res = await fetch(`/api/event-schedules/share/${token.trim()}`);
          if (!res.ok) return null;
          return res.json();
        })
      );
      return results.filter(Boolean).sort((a, b) => {
        const parseDate = (d: string) => {
          const dateOnly = d.split('T')[0];
          const [y, m, day] = dateOnly.split('-').map(Number);
          return new Date(y, m - 1, day);
        };
        return parseDate(a.eventDate).getTime() - parseDate(b.eventDate).getTime();
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !schedules || schedules.length === 0) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="font-header text-2xl mb-2">Schedule Not Found</h1>
          <p className="text-gray-600">This schedule may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Get event name (use first schedule's name, or find common name)
  const eventName = schedules[0]?.eventName?.split(' - ')[0] || schedules[0]?.eventName || "Event Schedule";
  
  const parseEventDate = (d: string) => {
    const dateOnly = d.split('T')[0];
    const [y, m, day] = dateOnly.split('-').map(Number);
    return new Date(y, m - 1, day, 12, 0, 0);
  };

  // Format date range like a travel app
  const formatDateRange = () => {
    if (schedules.length === 1) {
      const date = parseEventDate(schedules[0].eventDate);
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      });
    }
    
    const firstDate = parseEventDate(schedules[0].eventDate);
    const lastDate = parseEventDate(schedules[schedules.length - 1].eventDate);
    
    const sameMonth = firstDate.getMonth() === lastDate.getMonth();
    const sameYear = firstDate.getFullYear() === lastDate.getFullYear();
    
    if (sameMonth && sameYear) {
      // "Dec 8-10, 2024"
      return `${firstDate.toLocaleDateString("en-US", { month: "short" })} ${firstDate.getDate()}-${lastDate.getDate()}, ${firstDate.getFullYear()}`;
    } else if (sameYear) {
      // "Dec 8 - Jan 2, 2024"
      return `${firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${firstDate.getFullYear()}`;
    } else {
      // "Dec 31, 2024 - Jan 2, 2025"
      return `${firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
  };

  return (
    <div className="min-h-screen bg-powder">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Travel-app style header with gingham */}
        <div className="gingham-check rounded-xl p-6 mb-6 text-center border border-[#6B4A55]/20 flex items-center justify-center">
          <div className="bg-[#FAF7F2] px-8 py-5 border border-black">
            <h1 className="font-header text-2xl sm:text-3xl mb-2 text-[#6B4A55]">{eventName}</h1>
            <div className="flex items-center justify-center gap-3 text-[#6B4A55]/80">
              <Calendar size={18} />
              <span className="text-lg font-medium">{formatDateRange()}</span>
            </div>
            {schedules.length > 1 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-[#6B4A55]/10 px-4 py-1.5 rounded-full text-sm text-[#6B4A55]">
                <span>{schedules.length} Days</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {schedules.map((schedule, index) => (
            <DaySchedule 
              key={schedule.id} 
              schedule={{ ...schedule, shareToken: tokenList[index]?.trim() }}
              dayNumber={index + 1}
              totalDays={schedules.length}
              defaultExpanded={index === 0}
              onSelectAppointment={handleSelectAppointment}
            />
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Your Private Secretary</p>
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
                    {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                  </span>
                  <span>{selectedAppointment.serviceType}</span>
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
                    notes: editingNotes,
                    shareToken: selectedShareToken
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
