import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, MessageSquare, Send, Loader2, CheckCircle, X, Camera, Upload, Trash2 } from "lucide-react";
import ScheduleChat from "@/components/ScheduleChat";

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
  inspirationPhotos?: string[];
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


function timeToMinutes(time: string): number {
  if (!time) return 0;
  
  // Handle range format like "11:45-1:45" - just take the first time
  const rangeParts = time.split("-");
  const firstTime = rangeParts[0].trim();
  
  // Handle "8:00 AM" or "10:30 PM" format
  const match = firstTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  
  if (period) {
    // If AM/PM is specified, use it
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else {
    // Wedding-smart: 1-7 means PM, 8-11 means AM
    if (hours >= 1 && hours <= 7) {
      hours += 12; // Convert to 24h (1pm = 13, 2pm = 14, etc.)
    }
    // Hours 8-11 stay as-is (AM), 12+ stay as-is (already PM in 24h)
  }
  
  return hours * 60 + minutes;
}

function formatTimeDisplay(time: string): string {
  if (!time) return "";
  
  // If already has AM/PM, just return it cleaned up
  if (time.includes("AM") || time.includes("PM")) {
    return time.trim();
  }
  
  // Handle range format like "11:45-1:45" - just take the first time
  const rangeParts = time.split("-");
  const firstTime = rangeParts[0].trim();
  
  // Handle HH:MM format
  const [hours, minutes] = firstTime.split(":");
  const h = parseInt(hours, 10);
  if (isNaN(h)) return time;
  
  // Wedding-smart logic: hours 1-7 are almost always PM (no one does hair at 1 AM)
  // Hours 8-11 are AM, hours 12+ use standard logic
  let ampm: string;
  if (h >= 1 && h <= 7) {
    ampm = "PM"; // 1:00-7:00 means afternoon/evening
  } else if (h >= 8 && h <= 11) {
    ampm = "AM"; // 8:00-11:00 means morning
  } else {
    ampm = h >= 12 ? "PM" : "AM";
  }
  
  const displayHour = h % 12 || 12;
  const mins = minutes?.split(" ")[0] || "00";
  return `${displayHour}:${mins} ${ampm}`;
}

export default function PublicSchedule({ shareToken }: { shareToken: string }) {
  const queryClient = useQueryClient();
  const [guestNote, setGuestNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingService, setEditingService] = useState("");
  const [appointmentNoteSaved, setAppointmentNoteSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }, 1500);
    },
  });

  const appointmentNameMutation = useMutation({
    mutationFn: async ({ appointmentId, clientName }: { appointmentId: string; clientName: string }) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/appointment/${appointmentId}/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-schedule", shareToken] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ appointmentId, photos }: { appointmentId: string; photos: string[] }) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/appointment/${appointmentId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) throw new Error("Failed to upload photos");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["public-schedule", shareToken] });
      if (selectedAppointment && data.photos) {
        setSelectedAppointment({ ...selectedAppointment, inspirationPhotos: data.photos });
      }
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async ({ appointmentId, photoUrl }: { appointmentId: string; photoUrl: string }) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/appointment/${appointmentId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      if (!res.ok) throw new Error("Failed to delete photo");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["public-schedule", shareToken] });
      if (selectedAppointment && data.photos) {
        setSelectedAppointment({ ...selectedAppointment, inspirationPhotos: data.photos });
      }
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedAppointment) return;
    
    setUploadingPhoto(true);
    try {
      const photoUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        photoUrls.push(dataUrl);
      }
      
      await uploadPhotoMutation.mutateAsync({ appointmentId: selectedAppointment.id, photos: photoUrls });
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Clean Header */}
        <div className="text-center py-8 mb-6 border-b border-[#E8E2D9]">
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
            {schedule.eventName}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[#666] text-sm">
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

        {/* Ready By Time */}
        {schedule.readyByTime && (
          <div className="bg-white border border-[#E8E2D9] rounded-lg p-3 mb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[#1A1A1A]">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Ready by {formatTimeDisplay(schedule.readyByTime)}</span>
            </div>
          </div>
        )}

        {/* Schedule Table - Compact Single View */}
        <div className="bg-white rounded-lg border border-[#E8E2D9] overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E2D9] bg-[#F5F3F0]">
                <th className="px-3 py-2 text-left font-medium text-[#1A1A1A] w-24">Time</th>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <th key={member.id} className="px-2 py-2 text-center font-medium text-[#1A1A1A]">
                      {member.name}
                    </th>
                  ))
                ) : (
                  <th className="px-2 py-2 text-center font-medium text-[#1A1A1A]">Client</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedAppointments.length > 0 ? (
                Array.from(new Set(sortedAppointments.map(a => a.startTime)))
                  .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
                  .map((time) => (
                  <tr key={time} className="border-b border-[#E8E2D9] last:border-0">
                    <td className="px-3 py-2 text-[#666] whitespace-nowrap">{formatTimeDisplay(time)}</td>
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member) => {
                        const apt = groupedByTeamMember[member.id]?.find(a => a.startTime === time);
                        return (
                          <td key={member.id} className="px-2 py-2 text-center">
                            {apt && !apt.isBuffer && (
                              <button
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setEditingNotes(apt.notes || "");
                                  setEditingName(apt.clientName || "");
                                  setEditingService(apt.serviceType || "");
                                }}
                                className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                                  apt.clientName 
                                    ? "text-[#1A1A1A] hover:bg-[#F5F3F0]" 
                                    : "text-[#999] hover:bg-[#F5F3F0] text-xs"
                                }`}
                                data-testid={`appointment-${apt.id}`}
                              >
                                {apt.clientName || "+ add"}
                              </button>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td className="px-2 py-2 text-center">
                        {sortedAppointments.filter(a => a.startTime === time).map(apt => (
                          <button
                            key={apt.id}
                            onClick={() => {
                              if (!apt.isBuffer) {
                                setSelectedAppointment(apt);
                                setEditingNotes(apt.notes || "");
                                setEditingName(apt.clientName || "");
                                setEditingService(apt.serviceType || "");
                              }
                            }}
                            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                              apt.clientName 
                                ? "text-[#1A1A1A] hover:bg-[#F5F3F0]" 
                                : "text-[#999] hover:bg-[#F5F3F0] text-xs"
                            }`}
                            data-testid={`appointment-${apt.id}`}
                          >
                            {apt.clientName || "+ add"}
                          </button>
                        ))}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={teamMembers.length + 1} className="px-3 py-8 text-center text-[#999]">
                    No appointments scheduled
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Guest Notes Section */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E8E2D9]">
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
                className="flex-1 px-3 py-2 border rounded resize-none h-20 bg-white text-black"
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

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-[#999]">
          <p>Schedule shared securely</p>
        </div>
      </div>

      {/* Appointment Edit Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" data-testid="modal-edit-appointment">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
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
              <div className="bg-[#F5F3F0] p-3 rounded-lg">
                <div className="mb-2">
                  <label className="text-xs text-[#666] block mb-1">Name</label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim() && editingName !== selectedAppointment.clientName) {
                        appointmentNameMutation.mutate({ 
                          appointmentId: selectedAppointment.id, 
                          clientName: editingName.trim() 
                        });
                      }
                    }}
                    className="font-medium text-lg bg-white border border-[#E8E2D9] rounded px-2 py-1 focus:outline-none focus:border-[#1A1A1A] w-full"
                    data-testid="input-appointment-name"
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-[#666]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeDisplay(selectedAppointment.startTime)} - {formatTimeDisplay(selectedAppointment.endTime)}
                  </span>
                  <div>
                    <label className="text-xs text-[#666] block mb-1">Service</label>
                    <input
                      type="text"
                      value={editingService}
                      onChange={(e) => setEditingService(e.target.value)}
                      placeholder="Hair, Makeup, etc."
                      className="bg-white border border-[#E8E2D9] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#1A1A1A] w-28"
                      data-testid="input-appointment-service"
                    />
                  </div>
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
                  className="w-full px-3 py-2 border rounded-lg resize-none h-24 bg-white text-black"
                  data-testid="input-appointment-notes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Inspiration Photos
                </label>
                <p className="text-xs text-gray-500 mb-3">Upload photos of looks you love so your stylist can prepare</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  data-testid="input-photo-upload"
                />
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(selectedAppointment.inspirationPhotos || []).map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={photo} alt={`Inspiration ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => deletePhotoMutation.mutate({ appointmentId: selectedAppointment.id, photoUrl: photo })}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-delete-photo-${idx}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 transition-colors"
                    data-testid="button-upload-photo"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs">Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {appointmentNoteSaved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  data-testid="button-cancel-edit"
                >
                  Close
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
      
      {/* AI Chat Widget */}
      <ScheduleChat shareToken={shareToken} />
    </div>
  );
}
