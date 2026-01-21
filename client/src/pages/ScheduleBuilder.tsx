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
  numLeadArtists: number;
  numHairArtists: number;
  numMakeupArtists: number;
  numPeople: number;
};

type GridCell = {
  id?: string;
  clientName: string;
  serviceType: string;
  notes?: string;
  photoUrl?: string;
};

type PersonRow = {
  name: string;
  time: string;
  cells: GridCell[];
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
    numLeadArtists: 1,
    numHairArtists: 0,
    numMakeupArtists: 0,
    numPeople: 6,
  });
  
  // Grid state - rows are people with their own times, columns are artists
  const [artistNames, setArtistNames] = useState<string[]>([]);
  const [rows, setRows] = useState<PersonRow[]>([]);
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

  // Track artist types (L = Lead, H = Hair, M = Makeup)
  const [artistTypes, setArtistTypes] = useState<string[]>([]);

  // Default person names for wedding party
  const defaultNames = ["Bride", "MOH", "Bridesmaid 1", "Bridesmaid 2", "Bridesmaid 3", "Mother of Bride", "Mother of Groom", "Flower Girl"];

  // Initialize grid when setup changes
  useEffect(() => {
    if (step === "grid" && artistNames.length === 0) {
      // Initialize artist names - Lead first, then Hair, then Makeup
      const leadNames = Array.from({ length: setup.numLeadArtists }, (_, i) => 
        setup.numLeadArtists === 1 ? "Lead Artist" : `Lead ${i + 1}`
      );
      const hairNames = Array.from({ length: setup.numHairArtists }, (_, i) => `Hair ${i + 1}`);
      const makeupNames = Array.from({ length: setup.numMakeupArtists }, (_, i) => `Makeup ${i + 1}`);
      setArtistNames([...leadNames, ...hairNames, ...makeupNames]);
      
      // Track artist types
      const types = [
        ...Array(setup.numLeadArtists).fill("L"),
        ...Array(setup.numHairArtists).fill("H"),
        ...Array(setup.numMakeupArtists).fill("M")
      ];
      setArtistTypes(types);
      
      const totalArtists = setup.numLeadArtists + setup.numHairArtists + setup.numMakeupArtists;
      
      // Initialize rows with default names and times
      const initialRows: PersonRow[] = Array.from({ length: setup.numPeople }, (_, rowIdx) => ({
        name: defaultNames[rowIdx] || `Person ${rowIdx + 1}`,
        time: "",
        cells: Array.from({ length: totalArtists }, (_, colIdx) => ({
          clientName: "",
          serviceType: colIdx < setup.numLeadArtists ? "L" : 
                       colIdx < setup.numLeadArtists + setup.numHairArtists ? "H" : "M",
        })),
      }));
      setRows(initialRows);
    }
  }, [step, setup, artistNames.length]);

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
          notes: `${setup.numLeadArtists} lead, ${setup.numHairArtists} hair, ${setup.numMakeupArtists} makeup for ${setup.numPeople} people`,
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
    
    if (setup.numLeadArtists === 0 && setup.numHairArtists === 0 && setup.numMakeupArtists === 0) {
      toast({ title: "Please add at least one artist", variant: "destructive" });
      return;
    }
    
    // Create the schedule first
    await createScheduleMutation.mutateAsync();
    setStep("grid");
  };

  // Update cell
  const updateCell = (rowIdx: number, col: number, field: keyof GridCell, value: string) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[rowIdx] = {
        ...newRows[rowIdx],
        cells: [...newRows[rowIdx].cells]
      };
      newRows[rowIdx].cells[col] = { ...newRows[rowIdx].cells[col], [field]: value };
      return newRows;
    });
  };

  // Update person name
  const updatePersonName = (rowIdx: number, name: string) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[rowIdx] = { ...newRows[rowIdx], name };
      return newRows;
    });
  };

  // Update person time
  const updatePersonTime = (rowIdx: number, time: string) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[rowIdx] = { ...newRows[rowIdx], time };
      return newRows;
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

  // Add row (person)
  const addRow = () => {
    const totalArtists = setup.numLeadArtists + setup.numHairArtists + setup.numMakeupArtists;
    const newPerson: PersonRow = {
      name: `Person ${rows.length + 1}`,
      time: "",
      cells: Array.from({ length: totalArtists }, (_, i) => ({ 
        clientName: "", 
        serviceType: artistTypes[i] || "L"
      })),
    };
    setRows(prev => [...prev, newPerson]);
    setSetup(prev => ({ ...prev, numPeople: prev.numPeople + 1 }));
  };

  // Add column (artist)
  const addColumn = (type: "L" | "H" | "M" = "M") => {
    let newName = "";
    let insertIndex = 0;
    
    if (type === "L") {
      newName = setup.numLeadArtists === 0 ? "Lead Artist" : `Lead ${setup.numLeadArtists + 1}`;
      insertIndex = setup.numLeadArtists;
    } else if (type === "H") {
      newName = `Hair ${setup.numHairArtists + 1}`;
      insertIndex = setup.numLeadArtists + setup.numHairArtists;
    } else {
      newName = `Makeup ${setup.numMakeupArtists + 1}`;
      insertIndex = artistNames.length;
    }
    
    setArtistNames(prev => [...prev.slice(0, insertIndex), newName, ...prev.slice(insertIndex)]);
    setArtistTypes(prev => [...prev.slice(0, insertIndex), type, ...prev.slice(insertIndex)]);
    setRows(prev => prev.map(row => ({
      ...row,
      cells: [
        ...row.cells.slice(0, insertIndex),
        { clientName: "", serviceType: type },
        ...row.cells.slice(insertIndex)
      ]
    })));
    
    if (type === "L") {
      setSetup(prev => ({ ...prev, numLeadArtists: prev.numLeadArtists + 1 }));
    } else if (type === "H") {
      setSetup(prev => ({ ...prev, numHairArtists: prev.numHairArtists + 1 }));
    } else {
      setSetup(prev => ({ ...prev, numMakeupArtists: prev.numMakeupArtists + 1 }));
    }
  };

  // Delete row (person)
  const deleteRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, i) => i !== rowIdx));
    setSetup(prev => ({ ...prev, numPeople: prev.numPeople - 1 }));
  };

  // Delete column (artist)
  const deleteColumn = (colIdx: number) => {
    if (artistNames.length <= 1) return;
    const artistType = artistTypes[colIdx];
    setArtistNames(prev => prev.filter((_, i) => i !== colIdx));
    setArtistTypes(prev => prev.filter((_, i) => i !== colIdx));
    setRows(prev => prev.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== colIdx)
    })));
    
    if (artistType === "L") {
      setSetup(prev => ({ ...prev, numLeadArtists: Math.max(0, prev.numLeadArtists - 1) }));
    } else if (artistType === "H") {
      setSetup(prev => ({ ...prev, numHairArtists: Math.max(0, prev.numHairArtists - 1) }));
    } else {
      setSetup(prev => ({ ...prev, numMakeupArtists: Math.max(0, prev.numMakeupArtists - 1) }));
    }
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
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-[#666] mb-1">Lead Artists</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={setup.numLeadArtists}
                  onChange={(e) => setSetup({ ...setup, numLeadArtists: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Hair Artists</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={setup.numHairArtists}
                  onChange={(e) => setSetup({ ...setup, numHairArtists: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Makeup Artists</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={setup.numMakeupArtists}
                  onChange={(e) => setSetup({ ...setup, numMakeupArtists: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-[#666] mb-1">How many people in the party?</label>
              <input
                type="number"
                min={1}
                max={20}
                value={setup.numPeople}
                onChange={(e) => setSetup({ ...setup, numPeople: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
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
              className="w-full py-3 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-4"
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
                showChat ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            
            {shareToken && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
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
                  <th className="border border-[#E8E2D9] bg-[#F5F0E8] w-20">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => addColumn("H")}
                        className="p-1 text-[#666] hover:text-[#1A1A1A] transition-colors text-xs"
                        title="Add hair artist"
                      >
                        +H
                      </button>
                      <button
                        onClick={() => addColumn("M")}
                        className="p-1 text-[#666] hover:text-[#1A1A1A] transition-colors text-xs"
                        title="Add makeup artist"
                      >
                        +M
                      </button>
                    </div>
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
    </div>
  );
}
