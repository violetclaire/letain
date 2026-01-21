import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Plus, Calendar, MapPin, Clock, Trash2, ExternalLink, Share2, CheckSquare, Square, X, Mail, Send, Loader2, CalendarDays, Mic, MicOff, Bot, Sparkles, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import VoiceDictation from "@/components/VoiceDictation";

type EventDaySchedule = {
  id: string;
  artistId: string;
  eventName: string;
  eventDate: string | Date;
  sessionDetails?: string;
  eventLocation?: string;
  readyByTime?: string;
  notes?: string;
  recipientEmails?: string;
  shareToken?: string;
  status: string;
};

function formatEventDate(eventDate: string | Date): string {
  try {
    if (!eventDate) return "Date TBD";
    const dateStr = typeof eventDate === 'string' ? eventDate : eventDate.toISOString();
    const dateOnly = dateStr.split('T')[0];
    return format(new Date(dateOnly + 'T12:00:00'), "EEEE, MMM d, yyyy");
  } catch {
    return "Invalid Date";
  }
}

export default function ScheduleList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Your assistant at your service! Tell me about the schedule you want to create. For example: \"Create a 3-day schedule for the Johnson Wedding on December 14-16 at the Grand Hotel, bride ready by 2pm\"" }
  ]);
  const [pendingScheduleData, setPendingScheduleData] = useState<any>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const [newSchedule, setNewSchedule] = useState({
    eventName: "",
    eventDate: "",
    sessionDetails: "",
    eventLocation: "",
    readyByTime: "",
    recipientEmails: "",
  });

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const sendAIMessage = async (message: string) => {
    if (!message.trim()) return;
    
    const newUserMessage = { role: 'user' as const, content: message };
    const updatedHistory = [...aiMessages, newUserMessage];
    setAiMessages(updatedHistory);
    setAiInput("");
    setAiLoading(true);
    
    try {
      const res = await fetch('/api/ai/schedule-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          message,
          conversationHistory: updatedHistory.slice(1) // Skip initial greeting
        })
      });
      
      if (!res.ok) throw new Error('Failed to get response');
      
      const data = await res.json();
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      
      if (data.scheduleData && !data.needsMoreInfo) {
        setPendingScheduleData(data.scheduleData);
      } else if (data.collectedData) {
        setPendingScheduleData(data.collectedData);
      }
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble understanding that. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const createFromAI = async () => {
    if (!pendingScheduleData) return;
    
    const { 
      eventName, 
      eventDate, 
      dates, 
      location, 
      readyByTime, 
      startTime,
      sessionDetails, 
      recipientEmails,
      timeSlots,
      artistColumns,
      grid,
      numPeople,
      numArtists
    } = pendingScheduleData;
    
    // Support both old format (dates array) and new format (single eventDate)
    const scheduleDates = dates || (eventDate ? [eventDate] : []);
    
    if (!eventName || scheduleDates.length === 0) {
      toast({ title: "Missing info", description: "Need at least event name and date", variant: "destructive" });
      return;
    }
    
    try {
      const sortedDates = [...scheduleDates].sort();
      const createdSchedules = [];
      
      for (let i = 0; i < sortedDates.length; i++) {
        const dayLabel = sortedDates.length > 1 ? ` - Day ${i + 1}` : "";
        
        // Build session details with time slot info
        let enhancedDetails = sessionDetails || "";
        if (numPeople || numArtists) {
          enhancedDetails += enhancedDetails ? "\n" : "";
          if (numPeople) enhancedDetails += `${numPeople} people`;
          if (numPeople && numArtists) enhancedDetails += ", ";
          if (numArtists) enhancedDetails += `${numArtists} artists`;
        }
        if (startTime) {
          enhancedDetails += enhancedDetails ? "\n" : "";
          enhancedDetails += `Start: ${startTime}`;
        }
        
        const res = await fetch("/api/event-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            eventName: `${eventName}${dayLabel}`,
            eventDate: sortedDates[i],
            eventLocation: location || "",
            readyByTime: readyByTime || "",
            sessionDetails: enhancedDetails,
            recipientEmails: recipientEmails || "",
            timeSlots: timeSlots || [],
            artistColumns: artistColumns || [],
            grid: grid || []
          }),
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to create day ${i + 1}`);
        }
        
        const newSchedule = await res.json();
        createdSchedules.push(newSchedule);
        
        // If we have time slots and grid, navigate to edit the schedule
        if (timeSlots && timeSlots.length > 0 && createdSchedules.length === 1) {
          queryClient.invalidateQueries({ queryKey: ["event-schedules"] });
          setPendingScheduleData(null);
          setShowAIChat(false);
          setAiMessages([{ role: 'assistant', content: "Your assistant at your service! Tell me about the schedule you want to create." }]);
          
          toast({ 
            title: "Schedule created with time slots!",
            description: `${timeSlots.length} time slots ready for ${artistColumns?.length || 1} artists`
          });
          
          // Navigate to the schedule builder to edit
          navigate(`/artist/schedule/${newSchedule.id}`);
          return;
        }
      }
      
      if (createdSchedules.length === 0) {
        throw new Error("No schedules were created");
      }
      
      queryClient.invalidateQueries({ queryKey: ["event-schedules"] });
      setPendingScheduleData(null);
      setShowAIChat(false);
      setAiMessages([{ role: 'assistant', content: "Hi! Tell me about the schedule you want to create." }]);
      
      toast({ 
        title: createdSchedules.length > 1 ? `${createdSchedules.length}-day schedule created!` : "Schedule created!",
        description: "Your schedule is ready to edit"
      });
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Failed to create schedule", 
        variant: "destructive" 
      });
    }
  };

  const toggleScheduleSelection = (scheduleId: string) => {
    setSelectedSchedules(prev => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedSchedules(new Set());
  };

  const getSelectedShareTokens = (schedules: EventDaySchedule[]) => {
    return schedules
      .filter(s => selectedSchedules.has(s.id) && s.shareToken)
      .map(s => s.shareToken!);
  };

  const getSelectedShareLink = (schedules: EventDaySchedule[]) => {
    const selectedTokens = getSelectedShareTokens(schedules);
    if (selectedTokens.length === 0) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/schedules/${selectedTokens.join(',')}`;
  };

  // Check SMS configuration on mount
  useEffect(() => {
    fetch('/api/sms/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSmsConfigured(data.configured))
      .catch(() => setSmsConfigured(false));
  }, []);

  const normalizePhoneNumber = (phone: string): string | null => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned.length >= 10 && cleaned.length <= 15 ? cleaned : null;
    }
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return null;
  };

  const sendScheduleSMS = async (schedules: EventDaySchedule[]) => {
    const tokens = getSelectedShareTokens(schedules);
    if (tokens.length === 0) {
      toast({ 
        title: "No shareable schedules", 
        description: "Selected schedules don't have share links yet",
        variant: "destructive"
      });
      return;
    }

    const rawPhones = smsRecipients
      .split(/[,;\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const normalizedPhones = rawPhones
      .map(p => normalizePhoneNumber(p))
      .filter((p): p is string => p !== null);

    if (normalizedPhones.length === 0) {
      toast({ 
        title: "No valid phone numbers", 
        description: "Please enter valid US phone numbers (10 digits) or international numbers with country code (+1234567890)",
        variant: "destructive"
      });
      return;
    }

    const invalidCount = rawPhones.length - normalizedPhones.length;
    if (invalidCount > 0) {
      toast({
        title: "Some numbers skipped",
        description: `${invalidCount} invalid number(s) will be skipped`,
      });
    }

    const phones = normalizedPhones;

    setSendingSms(true);
    try {
      const res = await fetch('/api/event-schedules/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toPhones: phones,
          shareTokens: tokens
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({ 
          title: "Schedule sent via SMS!", 
          description: data.message
        });
        setShowSmsModal(false);
        setSmsRecipients("");
        clearSelection();
      } else {
        throw new Error(data.error || 'Failed to send SMS');
      }
    } catch (err: any) {
      toast({ 
        title: "Failed to send SMS", 
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSendingSms(false);
    }
  };

  const sendScheduleEmail = async (schedules: EventDaySchedule[]) => {
    const tokens = getSelectedShareTokens(schedules);
    if (tokens.length === 0) {
      toast({ 
        title: "No shareable schedules", 
        description: "Selected schedules don't have share links yet",
        variant: "destructive"
      });
      return;
    }

    const emails = emailRecipients
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));

    if (emails.length === 0) {
      toast({ 
        title: "No valid emails", 
        description: "Please enter at least one email address",
        variant: "destructive"
      });
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/event-schedules/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toEmails: emails,
          shareTokens: tokens,
          personalMessage: personalMessage.trim() || undefined
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({ 
          title: "Schedule sent!", 
          description: data.message
        });
        setShowEmailModal(false);
        setEmailRecipients("");
        setPersonalMessage("");
        clearSelection();
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err: any) {
      toast({ 
        title: "Failed to send", 
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const { data: schedules = [], isLoading } = useQuery<EventDaySchedule[]>({
    queryKey: ["event-schedules"],
    queryFn: async () => {
      const res = await fetch("/api/event-schedules", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dates: Date[]) => {
      const results = [];
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const dayLabel = dates.length > 1 ? ` - Day ${i + 1}` : "";
        const schedule = {
          ...newSchedule,
          eventName: `${newSchedule.eventName}${dayLabel}`,
          eventDate: format(date, "yyyy-MM-dd"),
        };
        const res = await fetch("/api/event-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(schedule),
        });
        if (!res.ok) throw new Error("Failed to create schedule");
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["event-schedules"] });
      setShowCreate(false);
      setShowCalendar(false);
      setSelectedDates([]);
      setNewSchedule({ eventName: "", eventDate: "", sessionDetails: "", eventLocation: "", readyByTime: "", recipientEmails: "" });
      if (data.length === 1) {
        navigate(`/schedule-creator/${data[0].id}`);
        toast({ title: "Schedule created!" });
      } else {
        toast({ title: `${data.length} day schedule created!`, description: "All days have been added to your schedules" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/event-schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-schedules"] });
      toast({ title: "Schedule deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-powder flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-powder">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/artist")}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-header text-xl sm:text-2xl ink-main">Day-of Schedules</h1>
              <p className="text-sm text-gray-600">Create and manage wedding day timelines</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                showAIChat ? "bg-pink text-white" : "bg-pink/10 text-pink hover:bg-pink/20"
              }`}
              data-testid="button-ai-assistant"
              title="Create with AI"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Assistant</span>
            </button>
            <button
              onClick={() => navigate("/artist/schedule-builder")}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              data-testid="button-new-schedule"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Schedule</span>
            </button>
          </div>
        </div>

        {/* AI Chat Panel */}
        {showAIChat && (
          <div className="bg-white rounded-lg border border-black/10 mb-6 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-pink/20 to-powder/30 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-pink rounded-full">
                  <Bot size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="font-header text-sm">Your Secretary</h3>
                  <p className="text-[0.65rem] text-gray-500">At your service - describe your schedule</p>
                </div>
              </div>
              <button onClick={() => setShowAIChat(false)} className="p-1 hover:bg-black/5 rounded">
                <X size={16} />
              </button>
            </div>
            
            <div ref={aiChatRef} className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-1.5 rounded-full h-fit ${msg.role === 'user' ? 'bg-black' : 'bg-pink'}`}>
                    {msg.role === 'user' ? <Mic size={12} className="text-white" /> : <Bot size={12} className="text-white" />}
                  </div>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex gap-2">
                  <div className="p-1.5 rounded-full bg-pink h-fit">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <Loader2 size={14} className="animate-spin text-gray-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Pending schedule confirmation */}
            {pendingScheduleData && (
              <div className="px-4 py-3 bg-green-50 border-t border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Ready to create:</p>
                    <p className="text-xs text-green-700">
                      {pendingScheduleData.eventName} • {pendingScheduleData.dates?.length || 1} day(s)
                      {pendingScheduleData.location && ` • ${pendingScheduleData.location}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendingScheduleData(null)}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createFromAI}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Create Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t p-3 bg-gray-50">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendAIMessage(aiInput)}
                  placeholder="e.g., 3-day wedding for Sarah, Dec 14-16 at the Hilton..."
                  className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white text-black"
                  disabled={aiLoading}
                />
                <VoiceDictation 
                  onTranscript={(text) => {
                    setAiInput(prev => prev + (prev ? " " : "") + text);
                  }}
                  size="md"
                />
                <button
                  onClick={() => sendAIMessage(aiInput)}
                  disabled={aiLoading || !aiInput.trim()}
                  className="p-2 bg-pink text-white rounded-full hover:bg-pink/80 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[0.6rem] text-gray-400 mt-2 text-center">
                Tap the mic to speak, or type your schedule details
              </p>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className="bg-cream p-4 sm:p-6 rounded-lg shadow-sm border border-black/10 mb-6">
            <h2 className="font-header text-lg mb-4">Create New Schedule</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g., Smith Wedding"
                  value={newSchedule.eventName}
                  onChange={(e) => setNewSchedule({ ...newSchedule, eventName: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white text-black"
                  data-testid="input-event-name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Event Date(s)</label>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full px-3 py-2 border rounded bg-white text-left flex items-center justify-between hover:border-black transition-colors"
                  data-testid="button-open-calendar"
                >
                  <span className={selectedDates.length > 0 ? "text-black" : "text-gray-400"}>
                    {selectedDates.length === 0 
                      ? "Select date(s)" 
                      : selectedDates.length === 1 
                        ? format(selectedDates[0], "MMM d, yyyy")
                        : `${format(selectedDates[0], "MMM d")} - ${format(selectedDates[selectedDates.length - 1], "MMM d, yyyy")} (${selectedDates.length} days)`
                    }
                  </span>
                  <CalendarDays size={18} className="text-gray-400" />
                </button>
                {showCalendar && (
                  <div className="mt-2 p-3 bg-white border rounded-lg shadow-lg">
                    <p className="text-xs text-gray-500 mb-2">Click dates to select. Click again to deselect.</p>
                    <DayPicker
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      disabled={{ before: new Date() }}
                      className="rdp-custom"
                      classNames={{
                        months: "text-black",
                        month: "text-black",
                        caption: "text-black font-medium",
                        caption_label: "text-black",
                        nav_button: "text-black hover:bg-gray-100",
                        head_cell: "text-gray-500 font-medium",
                        cell: "text-black",
                        day: "rdp-day hover:bg-gray-100 rounded-full transition-colors text-black w-9 h-9",
                        day_selected: "bg-black text-white hover:bg-black",
                        day_today: "font-bold text-pink",
                        day_disabled: "text-gray-300",
                      }}
                    />
                    {selectedDates.length > 0 && (
                      <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                        {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date, i) => (
                          <span key={date.toISOString()} className="inline-flex items-center gap-1 px-2 py-0.5 bg-black text-white rounded text-xs">
                            Day {i + 1}: {format(date, "MMM d")}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="w-full mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      {selectedDates.length > 0 
                        ? `Done (${selectedDates.length} day${selectedDates.length > 1 ? 's' : ''} selected)`
                        : "Close"
                      }
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Session Details (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Morning Session, Afternoon - Bride Only"
                  value={newSchedule.sessionDetails}
                  onChange={(e) => setNewSchedule({ ...newSchedule, sessionDetails: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white text-black"
                  data-testid="input-session-details"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Grand Ballroom Hotel"
                  value={newSchedule.eventLocation}
                  onChange={(e) => setNewSchedule({ ...newSchedule, eventLocation: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white text-black"
                  data-testid="input-event-location"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Ready By Time (Optional)</label>
                <input
                  type="time"
                  value={newSchedule.readyByTime}
                  onChange={(e) => setNewSchedule({ ...newSchedule, readyByTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white text-black"
                  data-testid="input-ready-by"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Send To (Emails)</label>
                <input
                  type="text"
                  placeholder="e.g., bride@email.com, planner@email.com"
                  value={newSchedule.recipientEmails}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipientEmails: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white text-black"
                  data-testid="input-recipient-emails"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setShowCalendar(false);
                  setSelectedDates([]);
                  setNewSchedule({ eventName: "", eventDate: "", sessionDetails: "", eventLocation: "", readyByTime: "", recipientEmails: "" });
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
                  createMutation.mutate(sortedDates);
                }}
                disabled={!newSchedule.eventName || selectedDates.length === 0 || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                data-testid="button-create-schedule"
              >
                {createMutation.isPending 
                  ? "Creating..." 
                  : selectedDates.length > 1 
                    ? `Create ${selectedDates.length}-Day Schedule` 
                    : "Create Schedule"
                }
              </button>
            </div>
          </div>
        )}

        {/* Selection Bar - shows when schedules are selected */}
        {selectedSchedules.size > 0 && (
          <div className="bg-black text-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {selectedSchedules.size} schedule{selectedSchedules.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-white/70 hover:text-white text-sm flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const shareLink = getSelectedShareLink(schedules);
                  if (shareLink) {
                    navigator.clipboard.writeText(shareLink);
                    toast({ 
                      title: "Link copied!", 
                      description: `Share link for ${selectedSchedules.size} schedule${selectedSchedules.size > 1 ? 's' : ''} copied to clipboard`
                    });
                  } else {
                    toast({ 
                      title: "No shareable schedules", 
                      description: "Selected schedules don't have share links yet",
                      variant: "destructive"
                    });
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white rounded hover:bg-white/30 transition-colors text-sm"
                data-testid="button-copy-link"
              >
                <Share2 className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-white text-black rounded hover:bg-gray-100 transition-colors"
                data-testid="button-email-selected"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Email</span>
              </button>
              <button
                onClick={() => {
                  if (smsConfigured === false) {
                    toast({
                      title: "SMS not configured",
                      description: "SMS notifications require Twilio credentials to be set up",
                      variant: "destructive"
                    });
                  } else {
                    setShowSmsModal(true);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded transition-colors ${
                  smsConfigured === false 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                data-testid="button-sms-selected"
                title={smsConfigured === false ? "SMS requires Twilio setup" : "Send via SMS"}
              >
                <Phone className="w-4 h-4" />
                <span>Send via SMS</span>
              </button>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-header text-lg">Send Schedule via Email</h2>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailRecipients("");
                    setPersonalMessage("");
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Sending {selectedSchedules.size} schedule{selectedSchedules.size > 1 ? 's' : ''} to:
                </p>
                <label className="text-sm text-gray-600 block mb-1">
                  Email Addresses <span className="text-gray-400">(separate with commas)</span>
                </label>
                <textarea
                  placeholder="bride@email.com, planner@email.com"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  className="w-full px-3 py-2 border rounded resize-none h-20"
                  data-testid="input-email-recipients"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600 block mb-1">
                  Personal Message <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  placeholder="Looking forward to your big day! Here's the schedule..."
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded resize-none h-24"
                  data-testid="input-personal-message"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailRecipients("");
                    setPersonalMessage("");
                  }}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendScheduleEmail(schedules)}
                  disabled={sendingEmail || !emailRecipients.trim()}
                  className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-send-email"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS Modal */}
        {showSmsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-header text-lg">Send Schedule via SMS</h2>
                <button
                  onClick={() => {
                    setShowSmsModal(false);
                    setSmsRecipients("");
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Sending {selectedSchedules.size} schedule{selectedSchedules.size > 1 ? 's' : ''} to:
                </p>
                <label className="text-sm text-gray-600 block mb-1">
                  Phone Numbers <span className="text-gray-400">(separate with commas)</span>
                </label>
                <textarea
                  placeholder="+1234567890, +0987654321"
                  value={smsRecipients}
                  onChange={(e) => setSmsRecipients(e.target.value)}
                  className="w-full px-3 py-2 border rounded resize-none h-20"
                  data-testid="input-sms-recipients"
                />
                <p className="text-xs text-gray-400 mt-1">
                  US numbers can be entered as 10 digits (e.g., 5551234567)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSmsModal(false);
                    setSmsRecipients("");
                  }}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={sendingSms}
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendScheduleSMS(schedules)}
                  disabled={sendingSms || !smsRecipients.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-send-sms"
                >
                  {sendingSms ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Send SMS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule List */}
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="bg-cream p-8 rounded-lg text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h3 className="font-header text-lg mb-2">No schedules yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first day-of schedule to manage wedding day timelines
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                data-testid="button-create-first"
              >
                Create Your First Schedule
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-2">
                Tip: Check the box next to schedules to share multiple days with one link
              </p>
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`bg-cream p-4 rounded-lg shadow-sm border transition-all ${
                    selectedSchedules.has(schedule.id) 
                      ? 'border-black ring-1 ring-black/20 shadow-md' 
                      : 'border-black/10 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleScheduleSelection(schedule.id)}
                      className="mt-1 p-1 hover:bg-black/5 rounded transition-colors shrink-0"
                      data-testid={`checkbox-${schedule.id}`}
                    >
                      {selectedSchedules.has(schedule.id) ? (
                        <CheckSquare className="w-5 h-5 text-black" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/schedule-creator/${schedule.id}`)}
                        data-testid={`schedule-${schedule.id}`}
                      >
                        <h3 className="font-header text-lg ink-main">
                          {schedule.eventName}
                          {schedule.sessionDetails && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              - {schedule.sessionDetails}
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatEventDate(schedule.eventDate)}
                          </span>
                          {schedule.eventLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {schedule.eventLocation}
                            </span>
                          )}
                          {schedule.readyByTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Ready by {schedule.readyByTime}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded ${
                              schedule.status === "finalized"
                                ? "bg-green-100 text-green-700"
                                : schedule.status === "sent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {schedule.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {schedule.shareToken && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `${window.location.origin}/schedule/${schedule.shareToken}`;
                              navigator.clipboard.writeText(url);
                              toast({ title: "Link copied!" });
                            }}
                            className="p-2 text-gray-500 hover:text-black hover:bg-black/5 rounded"
                            title="Copy share link"
                            data-testid={`button-share-${schedule.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this schedule?")) {
                              deleteMutation.mutate(schedule.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                          data-testid={`button-delete-${schedule.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
