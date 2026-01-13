import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, Clock, User, Share2, Copy, Check, Calendar, MapPin, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ScheduleTeamMember = {
  id: string;
  scheduleId: string;
  name: string;
  role: string;
  serviceType?: string;
  color?: string;
  displayOrder: number;
  assignmentLink?: string;
};

type ScheduleAppointment = {
  id: string;
  scheduleId: string;
  teamMemberId?: string;
  clientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  isVip: boolean;
  isBuffer: boolean;
  notes?: string;
  displayOrder: number;
};

type EventDaySchedule = {
  id: string;
  artistId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  readyByTime?: string;
  notes?: string;
  shareToken?: string;
  status: string;
  teamMembers?: ScheduleTeamMember[];
  appointments?: ScheduleAppointment[];
};

const SERVICE_COLORS = {
  H: "bg-pink-100 border-pink-300 text-pink-800",
  M: "bg-purple-100 border-purple-300 text-purple-800",
  HM: "bg-gradient-to-r from-pink-100 to-purple-100 border-pink-300 text-pink-800",
  buffer: "bg-gray-100 border-gray-300 text-gray-500 italic",
};

const SERVICE_LABELS = {
  H: "Hair",
  M: "Makeup",
  HM: "Hair & Makeup",
};

const DEFAULT_DURATIONS = {
  H: 45,
  M: 60,
  HM: 90,
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  // Handle times that wrap past midnight (e.g., 25:00 becomes 01:00)
  const normalizedMinutes = minutes % (24 * 60);
  const h = Math.floor(normalizedMinutes / 60);
  const m = normalizedMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function ScheduleCreator({ scheduleId }: { scheduleId: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ScheduleAppointment | null>(null);
  
  const [newAppointment, setNewAppointment] = useState({
    clientName: "",
    serviceType: "HM",
    startTime: "08:00",
    endTime: "09:00",
    teamMemberId: "",
    isVip: false,
    isBuffer: false,
    notes: "",
  });

  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    role: "stylist",
    serviceType: "both",
    assignmentLink: "",
  });
  
  const [editingTeamMember, setEditingTeamMember] = useState<ScheduleTeamMember | null>(null);

  const { data: schedule, isLoading } = useQuery<EventDaySchedule>({
    queryKey: ["event-schedule", scheduleId],
    queryFn: async () => {
      const res = await fetch(`/api/event-schedules/${scheduleId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return res.json();
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (member: typeof newTeamMember) => {
      const res = await fetch(`/api/event-schedules/${scheduleId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(member),
      });
      if (!res.ok) throw new Error("Failed to add team member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedule", scheduleId] });
      setShowAddTeamMember(false);
      setNewTeamMember({ name: "", role: "stylist", serviceType: "both", assignmentLink: "" });
      toast({ title: "Team member added" });
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/event-schedules/team/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete team member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedule", scheduleId] });
      toast({ title: "Team member removed" });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; serviceType: string; assignmentLink: string }) => {
      const res = await fetch(`/api/event-schedules/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update team member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedule", scheduleId] });
      setEditingTeamMember(null);
      toast({ title: "Team member updated" });
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointment: typeof newAppointment) => {
      const res = await fetch(`/api/event-schedules/${scheduleId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(appointment),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to add appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedule", scheduleId] });
      setShowAddAppointment(false);
      resetAppointmentForm();
      toast({ title: "Appointment added" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error adding appointment", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof newAppointment) => {
      const res = await fetch(`/api/event-schedules/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedule", scheduleId] });
      setEditingAppointment(null);
      resetAppointmentForm();
      toast({ title: "Appointment updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating appointment", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await fetch(`/api/event-schedules/appointments/${appointmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete appointment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedule", scheduleId] });
      toast({ title: "Appointment deleted" });
    },
  });

  function resetAppointmentForm() {
    setNewAppointment({
      clientName: "",
      serviceType: "HM",
      startTime: "08:00",
      endTime: "09:00",
      teamMemberId: "",
      isVip: false,
      isBuffer: false,
      notes: "",
    });
  }

  function handleServiceTypeChange(type: string) {
    const duration = DEFAULT_DURATIONS[type as keyof typeof DEFAULT_DURATIONS] || 60;
    const startMinutes = timeToMinutes(newAppointment.startTime);
    const newEndTime = minutesToTime(startMinutes + duration);
    setNewAppointment({
      ...newAppointment,
      serviceType: type,
      endTime: newEndTime,
    });
  }

  function handleStartTimeChange(time: string) {
    const duration = DEFAULT_DURATIONS[newAppointment.serviceType as keyof typeof DEFAULT_DURATIONS] || 60;
    const startMinutes = timeToMinutes(time);
    const newEndTime = minutesToTime(startMinutes + duration);
    setNewAppointment({
      ...newAppointment,
      startTime: time,
      endTime: newEndTime,
    });
  }

  function copyShareLink() {
    if (schedule?.shareToken) {
      const url = `${window.location.origin}/schedule/${schedule.shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!", description: "Share this link with planners and clients" });
    }
  }

  function openEditAppointment(apt: ScheduleAppointment) {
    setEditingAppointment(apt);
    setNewAppointment({
      clientName: apt.clientName,
      serviceType: apt.serviceType,
      startTime: apt.startTime,
      endTime: apt.endTime,
      teamMemberId: apt.teamMemberId || "",
      isVip: apt.isVip,
      isBuffer: apt.isBuffer,
      notes: apt.notes || "",
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Schedule not found</p>
          <button
            onClick={() => navigate("/artist/schedules")}
            className="mt-4 px-4 py-2 bg-black text-white rounded"
          >
            Back to Schedules
          </button>
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/artist/schedules")}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-header text-xl sm:text-2xl ink-main">
                {schedule.eventName}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {(() => {
                    const dateOnly = schedule.eventDate.split('T')[0];
                    const [year, month, day] = dateOnly.split('-').map(Number);
                    return format(new Date(year, month - 1, day, 12, 0, 0), "EEEE, MMMM d, yyyy");
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
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm"
            data-testid="button-share"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>

        {/* Ready By Time */}
        {schedule.readyByTime && (
          <div className="bg-gold/20 border border-gold rounded-lg p-3 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            <span className="font-medium">Ready by: {formatTimeDisplay(schedule.readyByTime)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Team Members Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-cream p-4 rounded-lg shadow-sm border border-black/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-header text-lg">Team</h2>
                <button
                  onClick={() => setShowAddTeamMember(true)}
                  className="p-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                  data-testid="button-add-team"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showAddTeamMember && (
                <div className="mb-4 p-3 bg-white rounded border border-black/10">
                  <input
                    type="text"
                    placeholder="Name (e.g., Violet)"
                    value={newTeamMember.name}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded mb-2 text-sm bg-white text-black"
                    data-testid="input-team-name"
                  />
                  <select
                    value={newTeamMember.serviceType}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, serviceType: e.target.value })}
                    className="w-full px-3 py-2 border rounded mb-2 text-sm bg-white text-black"
                    data-testid="select-team-service"
                  >
                    <option value="hair">Hair Only</option>
                    <option value="makeup">Makeup Only</option>
                    <option value="both">Hair & Makeup</option>
                  </select>
                  <input
                    type="url"
                    placeholder="Artist's schedule link (optional, add later)"
                    value={newTeamMember.assignmentLink}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, assignmentLink: e.target.value })}
                    className="w-full px-3 py-2 border rounded mb-2 text-sm bg-white text-black"
                    data-testid="input-team-link"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddTeamMember(false);
                        setNewTeamMember({ name: "", role: "stylist", serviceType: "both", assignmentLink: "" });
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => addTeamMemberMutation.mutate(newTeamMember)}
                      disabled={!newTeamMember.name || addTeamMemberMutation.isPending}
                      className="flex-1 px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                      data-testid="button-save-team"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {teamMembers.map((member) => (
                  editingTeamMember?.id === member.id ? (
                    <div key={member.id} className="p-3 bg-white rounded border border-black/10">
                      <input
                        type="text"
                        placeholder="Name"
                        value={editingTeamMember.name}
                        onChange={(e) => setEditingTeamMember({ ...editingTeamMember, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded mb-2 text-sm bg-white text-black"
                      />
                      <select
                        value={editingTeamMember.serviceType || "both"}
                        onChange={(e) => setEditingTeamMember({ ...editingTeamMember, serviceType: e.target.value })}
                        className="w-full px-3 py-2 border rounded mb-2 text-sm bg-white text-black"
                      >
                        <option value="hair">Hair Only</option>
                        <option value="makeup">Makeup Only</option>
                        <option value="both">Hair & Makeup</option>
                      </select>
                      <input
                        type="url"
                        placeholder="Artist's schedule link (optional)"
                        value={editingTeamMember.assignmentLink || ""}
                        onChange={(e) => setEditingTeamMember({ ...editingTeamMember, assignmentLink: e.target.value })}
                        className="w-full px-3 py-2 border rounded mb-2 text-sm bg-white text-black"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTeamMember(null)}
                          className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => updateTeamMemberMutation.mutate({
                            id: editingTeamMember.id,
                            name: editingTeamMember.name,
                            serviceType: editingTeamMember.serviceType || "both",
                            assignmentLink: editingTeamMember.assignmentLink || "",
                          })}
                          disabled={!editingTeamMember.name || updateTeamMemberMutation.isPending}
                          className="flex-1 px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-black/10 cursor-pointer hover:bg-gray-50"
                      onClick={() => setEditingTeamMember(member)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-sm">{member.name}</span>
                          <span className="text-xs text-gray-500">
                            ({member.serviceType === "hair" ? "H" : member.serviceType === "makeup" ? "M" : "HM"})
                          </span>
                        </div>
                        {member.assignmentLink ? (
                          <span className="text-xs text-green-600 ml-6">Link added</span>
                        ) : (
                          <span className="text-xs text-gray-400 ml-6">Click to add schedule link</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTeamMemberMutation.mutate(member.id);
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        data-testid={`button-delete-team-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Add team members working this event
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="lg:col-span-3">
            <div className="bg-cream p-4 rounded-lg shadow-sm border border-black/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-header text-lg">Timeline</h2>
                <button
                  onClick={() => setShowAddAppointment(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
                  data-testid="button-add-appointment"
                >
                  <Plus className="w-4 h-4" />
                  Add Client
                </button>
              </div>

              {/* Add/Edit Appointment Modal */}
              {(showAddAppointment || editingAppointment) && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-black/10">
                  <h3 className="font-medium mb-3">
                    {editingAppointment ? "Edit Appointment" : "New Appointment"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Client Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Nicole"
                        value={newAppointment.clientName}
                        onChange={(e) => setNewAppointment({ ...newAppointment, clientName: e.target.value })}
                        className="w-full px-3 py-2 border rounded text-sm bg-white text-black"
                        data-testid="input-client-name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Service</label>
                      <select
                        value={newAppointment.serviceType}
                        onChange={(e) => handleServiceTypeChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-sm bg-white text-black"
                        data-testid="select-service-type"
                      >
                        <option value="H">Hair (H) - 45 min</option>
                        <option value="M">Makeup (M) - 60 min</option>
                        <option value="HM">Hair & Makeup (HM) - 90 min</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newAppointment.startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-sm bg-white text-black"
                        data-testid="input-start-time"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={newAppointment.endTime}
                        onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                        className="w-full px-3 py-2 border rounded text-sm bg-white text-black"
                        data-testid="input-end-time"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Assigned To</label>
                      <select
                        value={newAppointment.teamMemberId}
                        onChange={(e) => setNewAppointment({ ...newAppointment, teamMemberId: e.target.value })}
                        className="w-full px-3 py-2 border rounded text-sm bg-white text-black"
                        data-testid="select-team-member"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4 pt-5">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newAppointment.isVip}
                          onChange={(e) => setNewAppointment({ ...newAppointment, isVip: e.target.checked })}
                          className="rounded"
                          data-testid="checkbox-vip"
                        />
                        <Star className="w-4 h-4 text-gold" />
                        VIP (Bride/MOH)
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowAddAppointment(false);
                        setEditingAppointment(null);
                        resetAppointmentForm();
                      }}
                      className="flex-1 px-3 py-2 border rounded hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    {editingAppointment && (
                      <button
                        onClick={() => deleteAppointmentMutation.mutate(editingAppointment.id)}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        data-testid="button-delete-appointment"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (editingAppointment) {
                          updateAppointmentMutation.mutate({
                            id: editingAppointment.id,
                            ...newAppointment,
                          });
                        } else {
                          addAppointmentMutation.mutate(newAppointment);
                        }
                      }}
                      disabled={!newAppointment.clientName || addAppointmentMutation.isPending || updateAppointmentMutation.isPending}
                      className="flex-1 px-3 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 text-sm"
                      data-testid="button-save-appointment"
                    >
                      {editingAppointment ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline Grid */}
              <div className="space-y-4">
                {/* Unassigned appointments */}
                {unassignedAppointments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Unassigned</h3>
                    <div className="space-y-2">
                      {unassignedAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => openEditAppointment(apt)}
                          className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                            apt.isBuffer
                              ? SERVICE_COLORS.buffer
                              : SERVICE_COLORS[apt.serviceType as keyof typeof SERVICE_COLORS] || SERVICE_COLORS.HM
                          }`}
                          data-testid={`appointment-${apt.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {apt.isVip && <Star className="w-4 h-4 text-gold fill-gold" />}
                              <span className="font-medium">{apt.clientName}</span>
                              <span className="text-xs opacity-75">
                                ({apt.serviceType})
                              </span>
                            </div>
                            <span className="text-sm">
                              {formatTimeDisplay(apt.startTime)} - {formatTimeDisplay(apt.endTime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team member columns */}
                {teamMembers.length > 0 && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(teamMembers.length, 3)}, 1fr)` }}>
                    {teamMembers.map((member) => (
                      <div key={member.id} className="bg-white rounded-lg border border-black/10 overflow-hidden">
                        <div className="bg-black text-white px-3 py-2 font-medium text-sm flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {member.name}
                          <span className="text-xs opacity-75">
                            ({member.serviceType === "hair" ? "H" : member.serviceType === "makeup" ? "M" : "HM"})
                          </span>
                        </div>
                        <div className="p-2 space-y-2 min-h-[200px]">
                          {groupedByTeamMember[member.id]?.map((apt) => (
                            <div
                              key={apt.id}
                              onClick={() => openEditAppointment(apt)}
                              className={`p-2 rounded border cursor-pointer hover:shadow-md transition-shadow text-sm ${
                                apt.isBuffer
                                  ? SERVICE_COLORS.buffer
                                  : SERVICE_COLORS[apt.serviceType as keyof typeof SERVICE_COLORS] || SERVICE_COLORS.HM
                              }`}
                              data-testid={`appointment-${apt.id}`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                {apt.isVip && <Star className="w-3 h-3 text-gold fill-gold" />}
                                <span className="font-medium">{apt.clientName}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs opacity-75">
                                <span>{apt.serviceType}</span>
                                <span>
                                  {formatTimeDisplay(apt.startTime)} - {formatTimeDisplay(apt.endTime)}
                                </span>
                              </div>
                            </div>
                          ))}
                          {(!groupedByTeamMember[member.id] || groupedByTeamMember[member.id].length === 0) && (
                            <div className="text-center text-gray-400 text-xs py-8">
                              No appointments
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {appointments.length === 0 && teamMembers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Start by adding team members and appointments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
