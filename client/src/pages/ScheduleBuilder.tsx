import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, Send, MessageCircle, Image, X, Check, Share2, ChevronDown, ChevronUp, Calendar, Clock, Users, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type SetupData = {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  startTime: string;
  numHair: number;
  numMakeup: number;
  numArtists: number;
};

// Generate time options from 4am to 11pm in 15 min increments
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 4; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h % 12 || 12;
      const ampm = h >= 12 ? "PM" : "AM";
      const mins = m.toString().padStart(2, "0");
      times.push(`${hour}:${mins} ${ampm}`);
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

type ArtistColumn = {
  name: string;
  type: "HM" | "H" | "M" | "H45" | "M45" | "H30" | "M30" | "BRIDE";
  duration: number;
  slots: string[];
};

type GridCell = {
  timeRange: string;
  clientName: string;
  photoUrl?: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
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

export default function ScheduleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Wizard state
  const [step, setStep] = useState<"setup" | "grid">("setup");
  const [setup, setSetup] = useState<SetupData>({
    eventName: "",
    eventDate: "",
    eventLocation: "",
    startTime: "6:00 AM",
    numHair: 6,
    numMakeup: 6,
    numArtists: 2,
  });
  const [saving, setSaving] = useState(false);
  
  // Grid state - columns are artists, rows are time slots
  const [artists, setArtists] = useState<ArtistColumn[]>([]);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  
  // Photo state
  const [photoCell, setPhotoCell] = useState<{row: number, col: number} | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
    
  // Schedule ID after creation
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize grid when entering grid mode - auto-distribute services among artists
  useEffect(() => {
    if (step === "grid" && artists.length === 0) {
      const totalServices = setup.numHair + setup.numMakeup;
      const servicesPerArtist = Math.ceil(totalServices / setup.numArtists);
      
      // Create artist columns
      const initialArtists: ArtistColumn[] = Array.from(
        { length: setup.numArtists },
        (_, i) => ({ 
          name: i === 0 ? "Lead Artist" : `Artist ${i + 1}`, 
          type: "HM" as const,
          duration: 45,
          slots: []
        })
      );
      setArtists(initialArtists);
      
      // Build service assignments - distribute hair and makeup across artists
      const services: Array<{type: "H" | "M", assigned: number}> = [];
      for (let i = 0; i < setup.numHair; i++) {
        services.push({ type: "H", assigned: i % setup.numArtists });
      }
      for (let i = 0; i < setup.numMakeup; i++) {
        services.push({ type: "M", assigned: (i + setup.numHair) % setup.numArtists });
      }
      
      // Create grid with distributed services
      const initialGrid: GridCell[][] = Array.from({ length: servicesPerArtist }, () => 
        Array.from({ length: setup.numArtists }, () => ({
          timeRange: "",
          clientName: "",
        }))
      );
      
      // Fill in service types per artist column
      const artistServiceCounts = Array(setup.numArtists).fill(0);
      services.forEach(service => {
        const artistIdx = service.assigned;
        const rowIdx = artistServiceCounts[artistIdx];
        if (rowIdx < servicesPerArtist) {
          initialGrid[rowIdx][artistIdx] = {
            timeRange: service.type === "H" ? "Hair" : "Makeup",
            clientName: "",
          };
          artistServiceCounts[artistIdx]++;
        }
      });
      
      setGrid(initialGrid);
    }
  }, [step, artists.length, setup.numArtists, setup.numHair, setup.numMakeup]);

  // Save schedule to database
  const saveSchedule = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/event-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventName: setup.eventName,
          eventDate: setup.eventDate,
          eventLocation: setup.eventLocation,
          artistColumns: artists.map(a => a.name),
          grid: grid,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save");
      }
      
      const data = await response.json();
      setScheduleId(data.id);
      setShareToken(data.shareToken);
      queryClient.invalidateQueries({ queryKey: ["/api/event-schedules"] });
      toast({ title: "Schedule saved!" });
      navigate("/artist/schedules");
    } catch (error) {
      toast({ title: "Failed to save schedule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Handle wizard completion - just go straight to grid, no database needed
  const handleStartBuilding = () => {
    if (!setup.eventName || !setup.eventDate) {
      toast({ title: "Please fill in event name and date", variant: "destructive" });
      return;
    }
    setStep("grid");
    toast({ title: "Schedule created!" });
  };

  // Update cell
  // Update cell content
  const updateCell = (rowIdx: number, colIdx: number, field: keyof GridCell, value: string) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[rowIdx] = [...newGrid[rowIdx]];
      newGrid[rowIdx][colIdx] = { ...newGrid[rowIdx][colIdx], [field]: value };
      return newGrid;
    });
  };

  // Update artist info
  const updateArtist = (colIdx: number, field: keyof ArtistColumn, value: string) => {
    setArtists(prev => {
      const newArtists = [...prev];
      newArtists[colIdx] = { ...newArtists[colIdx], [field]: value };
      return newArtists;
    });
  };

  // Update artist type
  const updateArtistType = (colIdx: number, newType: ArtistColumn["type"]) => {
    setArtists(prev => {
      const newArtists = [...prev];
      newArtists[colIdx] = { ...newArtists[colIdx], type: newType };
      return newArtists;
    });
  };

  // Add row
  const addRow = () => {
    setGrid(prev => [
      ...prev,
      Array.from({ length: artists.length }, () => ({ timeRange: "", clientName: "" }))
    ]);
  };

  // Add column (artist)
  const addColumn = () => {
    const count = artists.length + 1;
    const newName = `Artist ${count}`;
    
    setArtists(prev => [...prev, { name: newName, type: "HM" as const, duration: 45, slots: [] }]);
    setGrid(prev => prev.map(row => [...row, { timeRange: "", clientName: "" }]));
  };

  // Delete row
  const deleteRow = (rowIdx: number) => {
    if (grid.length <= 1) return;
    setGrid(prev => prev.filter((_, i) => i !== rowIdx));
  };

  // Delete column (artist)
  const deleteColumn = (colIdx: number) => {
    if (artists.length <= 1) return;
    setArtists(prev => prev.filter((_, i) => i !== colIdx));
    setGrid(prev => prev.map(row => row.filter((_, i) => i !== colIdx)));
  };

  // Send chat message with email notification
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      content: chatInput,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, newMessage]);
    
    // Send email notification if recipient provided
    if (recipientEmail && scheduleId) {
      try {
        await fetch("/api/schedule-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            scheduleId,
            recipientEmail,
            message: chatInput,
            shareToken,
          }),
        });
        toast({ title: "Message sent and email notification delivered!" });
      } catch (error) {
        toast({ title: "Message saved (email notification failed)", variant: "destructive" });
      }
    }
    
    setChatInput("");
  };

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoCell) return;
    
    const url = URL.createObjectURL(file);
    updateCell(photoCell.row, photoCell.col, "photoUrl", url);
    setShowPhotoModal(false);
    setPhotoCell(null);
    toast({ title: "Inspiration photo added!" });
  };

  // Copy share link
  const copyShareLink = () => {
    if (shareToken) {
      const url = `${window.location.origin}/schedule/${shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!" });
    }
  };

  // Setup Wizard
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 border border-[#E8E2D9]">
          <h1 className="text-2xl font-medium text-[#1A1A1A] mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Create Day-of Schedule
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#666] mb-1">Event Name</label>
              <input
                type="text"
                value={setup.eventName}
                onChange={(e) => setSetup({ ...setup, eventName: e.target.value })}
                placeholder="e.g., Smith Wedding"
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Event Date</label>
                <input
                  type="date"
                  value={setup.eventDate}
                  onChange={(e) => setSetup({ ...setup, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Start Time</label>
                <select
                  value={setup.startTime}
                  onChange={(e) => setSetup({ ...setup, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-[#666] mb-1">Location</label>
              <input
                type="text"
                value={setup.eventLocation}
                onChange={(e) => setSetup({ ...setup, eventLocation: e.target.value })}
                placeholder="Hotel name, venue address..."
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Hair services</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={setup.numHair}
                  onChange={(e) => setSetup({ ...setup, numHair: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Makeup services</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={setup.numMakeup}
                  onChange={(e) => setSetup({ ...setup, numMakeup: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Artists</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={setup.numArtists}
                  onChange={(e) => setSetup({ ...setup, numArtists: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>
            
            <p className="text-xs text-[#888] text-center">
              {setup.numHair + setup.numMakeup} total services ÷ {setup.numArtists} artists = ~{Math.ceil((setup.numHair + setup.numMakeup) / setup.numArtists)} each
            </p>
            
            <button
              onClick={handleStartBuilding}
              className="w-full py-3 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-4"
            >
              Start Building
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid View

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E2D9] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/artist/schedules")}
              className="p-2 hover:bg-[#F5F0E8] rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-medium text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                {setup.eventName}
              </h1>
              <p className="text-sm text-[#666]">
                {setup.eventDate && format(new Date(setup.eventDate + "T12:00:00"), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                showChat ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            
            {shareToken && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>
            )}
            
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Grid Area */}
        <div className={`flex-1 p-4 transition-all ${showChat ? 'pr-80' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm border border-[#E8E2D9]">
              <thead>
                <tr>
                  {artists.map((artist, colIdx) => (
                    <th key={colIdx} className="border border-[#E8E2D9] bg-[#F5F0E8] px-3 py-2 min-w-[160px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={artist.name}
                            onChange={(e) => updateArtist(colIdx, "name", e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium text-[#1A1A1A] focus:outline-none focus:bg-white focus:px-2 rounded"
                            style={{ fontFamily: "'Fraunces', serif" }}
                            placeholder="Artist name"
                          />
                          {artists.length > 1 && (
                            <button
                              onClick={() => deleteColumn(colIdx)}
                              className="p-1 text-[#999] hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <select
                          value={artist.type}
                          onChange={(e) => updateArtist(colIdx, "type", e.target.value)}
                          className="w-full text-xs px-1 py-0.5 bg-white border border-[#E8E2D9] rounded text-[#666]"
                        >
                          <option value="H30">Hair 30 min</option>
                          <option value="H45">Hair 45 min</option>
                          <option value="M30">Makeup 30 min</option>
                          <option value="M45">Makeup 45 min</option>
                          <option value="HM">Hair and Makeup</option>
                          <option value="BRIDE">Bride 2 hours</option>
                        </select>
                      </div>
                    </th>
                  ))}
                  <th className="border border-[#E8E2D9] bg-[#F5F0E8] w-12">
                    <button
                      onClick={() => addColumn()}
                      className="p-2 text-[#666] hover:text-[#1A1A1A] transition-colors"
                      title="Add artist column"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row, rowIdx) => (
                  <tr key={rowIdx} className="group">
                    {row.map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        className="border border-[#E8E2D9] px-2 py-1 align-top"
                      >
                        <div className="space-y-1">
                          <select
                            value={cell.timeRange}
                            onChange={(e) => updateCell(rowIdx, colIdx, "timeRange", e.target.value)}
                            className="w-full text-xs px-1 py-0.5 bg-[#FAF8F5] border border-[#E8E2D9] rounded text-[#666] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                          >
                            <option value="">Select time</option>
                            <option value="Hair">Hair</option>
                            <option value="Makeup">Makeup</option>
                            {TIME_OPTIONS.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={cell.clientName}
                              onChange={(e) => updateCell(rowIdx, colIdx, "clientName", e.target.value)}
                              placeholder="Client name"
                              className="flex-1 text-sm px-1 py-0.5 bg-white border border-[#E8E2D9] rounded text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                            />
                            {cell.clientName && (
                              cell.photoUrl ? (
                                <button
                                  onClick={() => setViewingPhoto(cell.photoUrl!)}
                                  className="w-6 h-6 rounded overflow-hidden border border-[#E8E2D9] hover:ring-2 hover:ring-[#1A1A1A]"
                                  title="View inspiration photo"
                                >
                                  <img src={cell.photoUrl} alt="" className="w-full h-full object-cover" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPhotoCell({ row: rowIdx, col: colIdx });
                                    setShowPhotoModal(true);
                                  }}
                                  className="p-1 text-[#999] hover:text-[#1A1A1A] transition-colors"
                                  title="Add inspiration photo"
                                >
                                  <Image className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="border border-[#E8E2D9] px-2 py-1 align-middle">
                      {grid.length > 1 && (
                        <button
                          onClick={() => deleteRow(rowIdx)}
                          className="p-1 text-[#999] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={artists.length + 1} className="border border-[#E8E2D9] bg-[#FAF8F5]">
                    <button
                      onClick={addRow}
                      className="w-full py-2 text-sm text-[#666] hover:text-[#1A1A1A] hover:bg-[#E8E2D9] transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add time slot
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="fixed right-0 top-[57px] bottom-0 w-80 bg-white border-l border-[#E8E2D9] flex flex-col">
            <div className="p-3 border-b border-[#E8E2D9]">
              <h3 className="font-medium text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                Schedule Chat
              </h3>
              <p className="text-xs text-[#666] mt-1">Send updates and get notified by email</p>
            </div>
            
            <div className="p-3 border-b border-[#E8E2D9]">
              <label className="block text-xs text-[#666] mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="planner@email.com"
                className="w-full px-3 py-2 text-sm border border-[#E8E2D9] rounded bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-[#999] text-center py-4">No messages yet</p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-[#F5F0E8] rounded-lg p-3">
                    <p className="text-sm text-[#1A1A1A]">{msg.content}</p>
                    <p className="text-xs text-[#999] mt-1">
                      {format(msg.timestamp, "h:mm a")}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-[#E8E2D9]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm border border-[#E8E2D9] rounded bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
                <button
                  onClick={sendChatMessage}
                  className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPhotoModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
              Add Inspiration Photo
            </h3>
            <p className="text-sm text-[#666] mb-4">
              Upload a photo for {grid[photoCell?.row || 0]?.[photoCell?.col || 0]?.clientName || "this client"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-[#E8E2D9] rounded-lg text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
            >
              <Image className="w-5 h-5" />
              Choose Photo
            </button>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="w-full mt-3 py-2 text-sm text-[#666] hover:text-[#1A1A1A]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setViewingPhoto(null)}>
          <div className="max-w-2xl max-h-[80vh] mx-4">
            <img src={viewingPhoto} alt="Inspiration" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
          </div>
          <button
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
