import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Send, MessageCircle, ChevronDown, ChevronUp, Upload, Camera, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleSlot {
  time: string;
  artist1: string;
  artist2: string;
  artist3: string;
  artist4: string;
}

interface InspirationPhoto {
  id: string;
  personName: string;
  imageUrl: string;
  uploadedAt: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  message: string;
  sentAt: string;
}

export default function SimpleScheduleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Event info
  const [eventName, setEventName] = useState("Kelly Burk Wedding");
  const [eventDate, setEventDate] = useState("2026-04-25");
  const [eventLocation, setEventLocation] = useState("Fairmont SF");
  
  // Artist names
  const [artists, setArtists] = useState(["Violet HM", "Hair", "Makeup", "Hair"]);
  
  // Schedule slots
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([
    { time: "8:00 - 9:15", artist1: "", artist2: "", artist3: "", artist4: "" },
    { time: "9:15 - 10:30", artist1: "", artist2: "", artist3: "", artist4: "" },
    { time: "10:30 - 12:30", artist1: "Kelly", artist2: "", artist3: "", artist4: "" },
    { time: "10:45 - 11:30", artist1: "", artist2: "", artist3: "", artist4: "" },
    { time: "11:30 - 12:15", artist1: "", artist2: "", artist3: "", artist4: "" },
  ]);
  
  // Chat state
  const [isExpanded, setIsExpanded] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Photo upload state
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  
  // Fetch photos
  const { data: photos = [] } = useQuery<InspirationPhoto[]>({
    queryKey: ["/api/photos"],
    queryFn: async () => {
      const res = await fetch("/api/photos");
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  // Fetch messages
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  // Update slot
  const updateSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      newSchedule[index] = { ...newSchedule[index], [field]: value };
      return newSchedule;
    });
  };
  
  // Add row
  const addRow = () => {
    setSchedule(prev => [...prev, { time: "", artist1: "", artist2: "", artist3: "", artist4: "" }]);
  };
  
  // Delete row
  const deleteRow = (index: number) => {
    if (schedule.length <= 1) return;
    setSchedule(prev => prev.filter((_, i) => i !== index));
  };
  
  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;
    
    const formData = new FormData();
    formData.append("image", file);
    formData.append("personName", uploadingFor);
    
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
        toast({ title: "Photo uploaded!" });
      }
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploadingFor(null);
  };
  
  // Send message
  const sendMessage = async () => {
    if (!senderName.trim() || !messageText.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName: senderName.trim(), message: messageText.trim() }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        setMessageText("");
      }
    } catch (error) {
      toast({ title: "Failed to send", variant: "destructive" });
    }
    setIsSending(false);
  };
  
  // Get photos for a person
  const getPhotosForPerson = (name: string) => {
    return photos.filter(p => p.personName.toLowerCase() === name.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E2D9] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/artist/schedules")}
              className="p-2 hover:bg-[#F5F0E8] rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="text-lg font-medium text-[#1A1A1A] bg-transparent border-none focus:outline-none"
                style={{ fontFamily: "'Fraunces', serif" }}
              />
              <div className="flex gap-4 text-sm text-[#666]">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none"
                />
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Location"
                  className="bg-transparent border-none focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Schedule Table */}
        <div className="bg-white rounded-lg shadow-sm border border-[#E8E2D9] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F5F0E8]">
                <th className="border border-[#E8E2D9] px-3 py-2 text-left text-sm font-medium">Time</th>
                {artists.map((artist, i) => (
                  <th key={i} className="border border-[#E8E2D9] px-3 py-2 min-w-[150px]">
                    <input
                      type="text"
                      value={artist}
                      onChange={(e) => {
                        const newArtists = [...artists];
                        newArtists[i] = e.target.value;
                        setArtists(newArtists);
                      }}
                      className="w-full bg-transparent text-sm font-medium text-center focus:outline-none"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    />
                  </th>
                ))}
                <th className="border border-[#E8E2D9] w-8"></th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((slot, rowIdx) => (
                <tr key={rowIdx} className="group">
                  <td className="border border-[#E8E2D9] px-2 py-1">
                    <input
                      type="text"
                      value={slot.time}
                      onChange={(e) => updateSlot(rowIdx, "time", e.target.value)}
                      placeholder="8:00 - 9:00"
                      className="w-full text-sm font-mono bg-transparent focus:outline-none focus:bg-[#FAF8F5] px-1 rounded"
                    />
                  </td>
                  {["artist1", "artist2", "artist3", "artist4"].map((field, colIdx) => {
                    const value = slot[field as keyof ScheduleSlot];
                    const personPhotos = value ? getPhotosForPerson(value) : [];
                    
                    return (
                      <td key={colIdx} className="border border-[#E8E2D9] px-2 py-1 align-top">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateSlot(rowIdx, field as keyof ScheduleSlot, e.target.value)}
                            placeholder="Client name"
                            className="w-full text-sm bg-transparent focus:outline-none focus:bg-[#FAF8F5] px-1 rounded"
                          />
                          {value && (
                            <div className="flex items-center gap-1">
                              {personPhotos.length > 0 ? (
                                personPhotos.slice(0, 2).map(photo => (
                                  <img
                                    key={photo.id}
                                    src={photo.imageUrl}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover border border-[#E8E2D9]"
                                  />
                                ))
                              ) : null}
                              <button
                                onClick={() => {
                                  setUploadingFor(value);
                                  fileInputRef.current?.click();
                                }}
                                className="w-8 h-8 rounded border border-dashed border-[#CCC] flex items-center justify-center text-[#999] hover:text-[#666] hover:border-[#999] transition-colors"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border border-[#E8E2D9] px-1 align-middle">
                    <button
                      onClick={() => deleteRow(rowIdx)}
                      className="text-[#CCC] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button
            onClick={addRow}
            className="w-full py-2 text-sm text-[#666] hover:bg-[#F5F0E8] transition-colors border-t border-[#E8E2D9]"
          >
            + Add Row
          </button>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Chat Box - Fixed Position */}
      <div className="fixed top-20 right-4 z-50 w-72">
        <div className="bg-white rounded-lg shadow-lg border border-[#E8E2D9]">
          <div
            className="py-2 px-3 cursor-pointer flex items-center justify-between border-b border-[#E8E2D9]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#1A1A1A]" />
              <span className="text-sm font-medium">Chat</span>
              {messages.length > 0 && (
                <span className="text-xs bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          
          {isExpanded && (
            <div>
              <div className="h-48 overflow-y-auto px-3 py-2 space-y-2 bg-[#FAF8F5]">
                {messages.length === 0 ? (
                  <p className="text-xs text-[#999] text-center py-8">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#E8E2D9] flex items-center justify-center text-xs font-medium">
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-xs">{msg.senderName}</span>
                        <p className="text-xs text-[#666]">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-2 border-t border-[#E8E2D9] space-y-1">
                <input
                  type="text"
                  placeholder="Your name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#E8E2D9] rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 px-2 py-1 text-xs border border-[#E8E2D9] rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isSending || !senderName.trim() || !messageText.trim()}
                    className="px-2 py-1 bg-[#1A1A1A] text-white rounded text-xs disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
