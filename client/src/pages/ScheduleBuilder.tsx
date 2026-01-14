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
  numArtists: number;
  numServices: number;
  startTime: string;
  slotDuration: number;
};

type GridCell = {
  id?: string;
  clientName: string;
  serviceType: string;
  notes?: string;
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
    numArtists: 2,
    numServices: 6,
    startTime: "07:00",
    slotDuration: 60,
  });
  
  // Grid state - rows are time slots, columns are artists
  const [artistNames, setArtistNames] = useState<string[]>([]);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  
  // Photo upload state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCell, setPhotoCell] = useState<{row: number, col: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Schedule ID after creation
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize grid when setup changes
  useEffect(() => {
    if (step === "grid" && artistNames.length === 0) {
      // Initialize artist names
      const names = Array.from({ length: setup.numArtists }, (_, i) => `Artist ${i + 1}`);
      setArtistNames(names);
      
      // Initialize grid with empty cells
      const rows = Array.from({ length: setup.numServices }, (_, rowIdx) => {
        const startMinutes = timeToMinutes(setup.startTime) + (rowIdx * setup.slotDuration);
        return Array.from({ length: setup.numArtists }, () => ({
          clientName: "",
          serviceType: "HM",
        }));
      });
      setGrid(rows);
    }
  }, [step, setup, artistNames.length]);

  // Get time slots based on setup
  const getTimeSlots = () => {
    return Array.from({ length: setup.numServices }, (_, i) => {
      const startMinutes = timeToMinutes(setup.startTime) + (i * setup.slotDuration);
      const endMinutes = startMinutes + setup.slotDuration;
      return {
        start: minutesToTime(startMinutes),
        end: minutesToTime(endMinutes),
        display: `${formatTimeDisplay(minutesToTime(startMinutes))} - ${formatTimeDisplay(minutesToTime(endMinutes))}`,
      };
    });
  };

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/event-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventName: setup.eventName,
          eventDate: setup.eventDate,
          notes: `${setup.numArtists} artists, ${setup.numServices} services starting at ${setup.startTime}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      return res.json();
    },
    onSuccess: (data) => {
      setScheduleId(data.id);
      setShareToken(data.shareToken);
      toast({ title: "Schedule created!" });
    },
  });

  // Handle wizard completion
  const handleStartBuilding = async () => {
    if (!setup.eventName || !setup.eventDate) {
      toast({ title: "Please fill in event name and date", variant: "destructive" });
      return;
    }
    
    // Create the schedule first
    await createScheduleMutation.mutateAsync();
    setStep("grid");
  };

  // Update cell
  const updateCell = (row: number, col: number, field: keyof GridCell, value: string) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = { ...newGrid[row][col], [field]: value };
      return newGrid;
    });
  };

  // Update artist name
  const updateArtistName = (col: number, name: string) => {
    setArtistNames(prev => {
      const newNames = [...prev];
      newNames[col] = name;
      return newNames;
    });
  };

  // Add row
  const addRow = () => {
    setGrid(prev => [
      ...prev,
      Array.from({ length: setup.numArtists }, () => ({ clientName: "", serviceType: "HM" })),
    ]);
    setSetup(prev => ({ ...prev, numServices: prev.numServices + 1 }));
  };

  // Add column (artist)
  const addColumn = () => {
    setArtistNames(prev => [...prev, `Artist ${prev.length + 1}`]);
    setGrid(prev => prev.map(row => [...row, { clientName: "", serviceType: "HM" }]));
    setSetup(prev => ({ ...prev, numArtists: prev.numArtists + 1 }));
  };

  // Delete row
  const deleteRow = (rowIdx: number) => {
    if (grid.length <= 1) return;
    setGrid(prev => prev.filter((_, i) => i !== rowIdx));
    setSetup(prev => ({ ...prev, numServices: prev.numServices - 1 }));
  };

  // Delete column (artist)
  const deleteColumn = (colIdx: number) => {
    if (artistNames.length <= 1) return;
    setArtistNames(prev => prev.filter((_, i) => i !== colIdx));
    setGrid(prev => prev.map(row => row.filter((_, i) => i !== colIdx)));
    setSetup(prev => ({ ...prev, numArtists: prev.numArtists - 1 }));
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
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoCell) return;
    
    // For now, just create a local URL preview
    const url = URL.createObjectURL(file);
    updateCell(photoCell.row, photoCell.col, "photoUrl", url);
    setShowPhotoModal(false);
    setPhotoCell(null);
    toast({ title: "Photo added!" });
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
            
            <div>
              <label className="block text-sm text-[#666] mb-1">Event Date</label>
              <input
                type="date"
                value={setup.eventDate}
                onChange={(e) => setSetup({ ...setup, eventDate: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1 flex items-center gap-1">
                  <Users className="w-4 h-4" /> How many artists?
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={setup.numArtists}
                  onChange={(e) => setSetup({ ...setup, numArtists: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1 flex items-center gap-1">
                  <Scissors className="w-4 h-4" /> How many services?
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={setup.numServices}
                  onChange={(e) => setSetup({ ...setup, numServices: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Start Time
                </label>
                <input
                  type="time"
                  value={setup.startTime}
                  onChange={(e) => setSetup({ ...setup, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Slot Duration (min)</label>
                <select
                  value={setup.slotDuration}
                  onChange={(e) => setSetup({ ...setup, slotDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleStartBuilding}
              disabled={createScheduleMutation.isPending}
              className="w-full py-3 bg-[#1A1A1A] text-[#F5F0E8] rounded font-medium hover:bg-[#333] disabled:opacity-50 transition-colors mt-4"
            >
              {createScheduleMutation.isPending ? "Creating..." : "Start Building"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  const timeSlots = getTimeSlots();

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
                showChat ? 'bg-[#1A1A1A] text-[#F5F0E8]' : 'bg-[#F5F0E8] text-[#1A1A1A] hover:bg-[#E8E2D9]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            
            {shareToken && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] text-[#F5F0E8] rounded hover:bg-[#333] transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>
            )}
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
                  <th className="border border-[#E8E2D9] bg-[#F5F0E8] px-3 py-2 text-left text-sm font-medium text-[#666] w-32">
                    Time
                  </th>
                  {artistNames.map((name, colIdx) => (
                    <th key={colIdx} className="border border-[#E8E2D9] bg-[#F5F0E8] px-3 py-2 min-w-[180px]">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateArtistName(colIdx, e.target.value)}
                          className="flex-1 bg-transparent text-sm font-medium text-[#1A1A1A] focus:outline-none focus:bg-white focus:px-2 rounded"
                          style={{ fontFamily: "'Fraunces', serif" }}
                        />
                        {artistNames.length > 1 && (
                          <button
                            onClick={() => deleteColumn(colIdx)}
                            className="p-1 text-[#999] hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border border-[#E8E2D9] bg-[#F5F0E8] w-10">
                    <button
                      onClick={addColumn}
                      className="p-1 text-[#666] hover:text-[#1A1A1A] transition-colors"
                      title="Add artist"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border border-[#E8E2D9] bg-[#FAF8F5] px-3 py-2 text-sm text-[#666] font-mono">
                      <div className="flex items-center justify-between">
                        <span>{timeSlots[rowIdx]?.display || `Slot ${rowIdx + 1}`}</span>
                        {grid.length > 1 && (
                          <button
                            onClick={() => deleteRow(rowIdx)}
                            className="p-1 text-[#999] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    {row.map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        className={`border border-[#E8E2D9] px-2 py-1 cursor-pointer hover:bg-[#FAF8F5] transition-colors ${
                          selectedCell?.row === rowIdx && selectedCell?.col === colIdx ? 'bg-[#F5F0E8] ring-2 ring-[#1A1A1A]' : ''
                        }`}
                        onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                      >
                        {editingCell?.row === rowIdx && editingCell?.col === colIdx ? (
                          <input
                            type="text"
                            value={cell.clientName}
                            onChange={(e) => updateCell(rowIdx, colIdx, "clientName", e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingCell(null);
                              if (e.key === "Tab") {
                                e.preventDefault();
                                const nextCol = colIdx + 1 < row.length ? colIdx + 1 : 0;
                                const nextRow = nextCol === 0 ? rowIdx + 1 : rowIdx;
                                if (nextRow < grid.length) {
                                  setEditingCell({ row: nextRow, col: nextCol });
                                } else {
                                  setEditingCell(null);
                                }
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1 text-sm bg-white border border-[#1A1A1A] rounded focus:outline-none"
                          />
                        ) : (
                          <div
                            className="min-h-[40px] flex items-center justify-between group"
                            onDoubleClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                          >
                            <span className={`text-sm ${cell.clientName ? 'text-[#1A1A1A]' : 'text-[#999] italic'}`}>
                              {cell.clientName || "Click to add name"}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {cell.photoUrl ? (
                                <img src={cell.photoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoCell({ row: rowIdx, col: colIdx });
                                    setShowPhotoModal(true);
                                  }}
                                  className="p-1 text-[#999] hover:text-[#1A1A1A] transition-colors"
                                  title="Add inspiration photo"
                                >
                                  <Image className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="border border-[#E8E2D9] w-10"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={artistNames.length + 2} className="border border-[#E8E2D9] bg-[#FAF8F5]">
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
                  className="px-3 py-2 bg-[#1A1A1A] text-[#F5F0E8] rounded hover:bg-[#333] transition-colors"
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
    </div>
  );
}
