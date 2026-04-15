import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, Plus, Trash2, Image, X, Check, Share2,
  Mic, MicOff, Sparkles, ClipboardPaste, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useVoice } from "@/hooks/useVoice";
import { generateTimeOptions } from "@/lib/dateUtils";
import type { ArtistColumn, GridCell } from "@shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SetupData = {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  startTime: string;
  numArtists: number;
};

// ─── Time helpers ──────────────────────────────────────────────────────────────

const TIME_OPTIONS = generateTimeOptions();

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Setup wizard
  const [step, setStep] = useState<"setup" | "grid">("setup");
  const [setup, setSetup] = useState<SetupData>({
    eventName: "",
    eventDate: "",
    eventLocation: "",
    startTime: "7:00 AM",
    numArtists: 2,
  });

  // Grid
  const [artists, setArtists] = useState<ArtistColumn[]>([]);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [saving, setSaving] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Photo
  const [photoCell, setPhotoCell] = useState<{ row: number; col: number } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart input panel
  const [showSmartPanel, setShowSmartPanel] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  // Voice command
  const { 
    isListening, 
    transcript: voiceCommand, 
    setTranscript: setVoiceCommand, 
    startListening, 
    stopListening 
  } = useVoice({ interimResults: true });
  
  const [commanding, setCommanding] = useState(false);

  // ── Initialise empty grid ──────────────────────────────────────────────────

  useEffect(() => {
    if (step === "grid" && artists.length === 0) {
      const initialArtists: ArtistColumn[] = Array.from({ length: setup.numArtists }, (_, i) => ({
        name: i === 0 ? "Violet" : `Artist ${i + 1}`,
        type: i === 0 ? "H30" : "H45",
        duration: i === 0 ? 30 : 45,
        slots: [],
        isLead: i === 0,
      }));
      setArtists(initialArtists);
      setGrid([[...initialArtists.map(() => ({ timeRange: "", clientName: "" }))]]);
    }
  }, [step]);

  // ── Grid helpers ──────────────────────────────────────────────────────────

  const updateCell = (row: number, col: number, field: keyof GridCell, value: string) => {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = { ...next[row][col], [field]: value };
      return next;
    });
  };

  const updateArtist = (colIdx: number, field: keyof ArtistColumn, value: string) => {
    setArtists(prev => {
      const next = [...prev];
      next[colIdx] = { ...next[colIdx], [field]: value };
      return next;
    });
  };

  const addRow = () => {
    setGrid(prev => [...prev, artists.map(() => ({ timeRange: "", clientName: "" }))]);
  };

  const addColumn = () => {
    const idx = artists.length;
    const newArtist: ArtistColumn = { name: `Artist ${idx + 1}`, type: "H45", duration: 45, slots: [], isLead: false };
    setArtists(prev => [...prev, newArtist]);
    setGrid(prev => prev.map(row => [...row, { timeRange: "", clientName: "" }]));
  };

  const deleteRow = (rowIdx: number) => {
    if (grid.length <= 1) return;
    setGrid(prev => prev.filter((_, i) => i !== rowIdx));
  };

  const deleteColumn = (colIdx: number) => {
    if (artists.length <= 1) return;
    setArtists(prev => prev.filter((_, i) => i !== colIdx));
    setGrid(prev => prev.map(row => row.filter((_, i) => i !== colIdx)));
  };

  // ── Parse client list ─────────────────────────────────────────────────────

  const handleParseClients = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    setAiMessage("");
    try {
      const res = await fetch("/api/schedule/parse-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rawText: pasteText,
          startTime: setup.startTime,
          numArtists: setup.numArtists,
          artistNames: artists.length > 0 ? artists.map(a => a.name) : [],
        }),
      });
      if (!res.ok) throw new Error("Parse failed");
      const data = await res.json();
      setArtists(data.artists);
      setGrid(data.grid);
      setAiMessage(data.message);
      if (step === "setup") setStep("grid");
      setPasteText("");
      toast({ title: "Schedule built from client list" });
    } catch {
      setAiMessage("Could not parse the list. Try pasting one name per line with H and M noted.");
    } finally {
      setParsing(false);
    }
  };

  const sendVoiceCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setCommanding(true);
    setAiMessage("");
    try {
      const res = await fetch("/api/schedule/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          command: cmd,
          artists,
          grid,
          startTime: setup.startTime,
        }),
      });
      if (!res.ok) throw new Error("Command failed");
      const data = await res.json();
      setArtists(data.artists);
      setGrid(data.grid);
      setAiMessage(data.message);
      setVoiceCommand("");
    } catch {
      setAiMessage("Couldn't process that command. Try again.");
    } finally {
      setCommanding(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveSchedule = async () => {
    if (!isAuthenticated) {
      toast({ title: "Please log in to save schedules", variant: "destructive" });
      navigate("/artist/login");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/event-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventName: setup.eventName,
          eventDate: setup.eventDate,
          eventLocation: setup.eventLocation,
          artistColumns: artists.map(a => a.name),
          timeSlots: grid.map((_, i) => `Slot ${i + 1}`),
          grid: grid.map(row => row.map(cell => ({
            clientName: cell.clientName,
            service: cell.service || cell.timeRange,
          }))),
        }),
      });
      if (res.status === 401) {
        toast({ title: "Session expired. Please log in again.", variant: "destructive" });
        navigate("/artist/login");
        return;
      }
      if (!res.ok) {
        let errorMsg = "Failed to save";
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse save error response:", e);
        }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      setShareToken(data.shareToken);
      queryClient.invalidateQueries({ queryKey: ["/api/event-schedules"] });
      toast({ title: "Schedule saved!" });
      navigate(`/schedule/${data.shareToken}`);
    } catch (e: any) {
      toast({ title: e.message || "Failed to save schedule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = () => {
    if (shareToken) {
      navigator.clipboard.writeText(`${window.location.origin}/schedule/${shareToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoCell) return;
    updateCell(photoCell.row, photoCell.col, "photoUrl", URL.createObjectURL(file));
    setShowPhotoModal(false);
    setPhotoCell(null);
  };

  // ── SETUP WIZARD ──────────────────────────────────────────────────────────

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 border border-[#E8E2D9]">
          <button onClick={() => navigate("/artist/schedules")} className="flex items-center gap-1 text-sm text-[#666] hover:text-[#1A1A1A] mb-5">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-medium text-[#1A1A1A] mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            New Day-of Schedule
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#666] mb-1">Event name</label>
              <input
                type="text"
                value={setup.eventName}
                onChange={e => setSetup(s => ({ ...s, eventName: e.target.value }))}
                placeholder="e.g., Yasmeen + James Wedding"
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                data-testid="input-event-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Date</label>
                <input
                  type="date"
                  value={setup.eventDate}
                  onChange={e => setSetup(s => ({ ...s, eventDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  data-testid="input-event-date"
                />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1">Start time</label>
                <select
                  value={setup.startTime}
                  onChange={e => setSetup(s => ({ ...s, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  data-testid="select-start-time"
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#666] mb-1">Location</label>
              <input
                type="text"
                value={setup.eventLocation}
                onChange={e => setSetup(s => ({ ...s, eventLocation: e.target.value }))}
                placeholder="Hotel, venue, address…"
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#666] mb-1">Number of artists</label>
              <input
                type="number"
                min={1}
                max={10}
                value={setup.numArtists}
                onChange={e => setSetup(s => ({ ...s, numArtists: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                data-testid="input-num-artists"
              />
              <p className="text-xs text-[#999] mt-1">Column 0 is always the lead artist (Violet, 30 min/service, bride = 2 hrs)</p>
            </div>

            {/* Smart paste on setup screen */}
            <div className="border border-dashed border-[#D8D2C8] rounded-lg p-4 bg-[#FDFCFA]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#B8963E]" />
                <span className="text-sm font-medium text-[#1A1A1A]">Paste your client list — I'll build the whole schedule</span>
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"Paste a list, table, or text from a client email:\n\nYasmeen (Bride)\tH\tM\nJami (MOB)\tH\tM\nStephanie (Bridesmaid)\tH\n…"}
                rows={5}
                className="w-full text-sm px-3 py-2 border border-[#E8E2D9] rounded bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono resize-none"
                data-testid="input-paste-clients"
              />
              {aiMessage && (
                <p className="text-xs text-[#5c7a3e] mt-2 leading-relaxed">{aiMessage}</p>
              )}
              <button
                onClick={async () => {
                  if (!setup.eventName || !setup.eventDate) {
                    toast({ title: "Fill in event name and date first", variant: "destructive" });
                    return;
                  }
                  await handleParseClients();
                }}
                disabled={!pasteText.trim() || parsing}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#1A1A1A] text-white rounded hover:bg-[#333] disabled:opacity-40 transition-colors text-sm"
                data-testid="button-parse-clients"
              >
                {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Building schedule…</> : <><ClipboardPaste className="w-4 h-4" /> Build schedule from this list</>}
              </button>
            </div>

            <button
              onClick={() => {
                if (!setup.eventName || !setup.eventDate) {
                  toast({ title: "Please fill in event name and date", variant: "destructive" });
                  return;
                }
                setStep("grid");
              }}
              className="w-full py-3 bg-white border border-[#E8E2D9] text-[#1A1A1A] rounded font-medium hover:bg-[#F5F0E8] transition-colors text-sm"
              data-testid="button-start-blank"
            >
              Or start with a blank grid
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GRID VIEW ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E2D9] px-4 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setStep("setup")} className="p-2 hover:bg-[#F5F0E8] rounded transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-medium text-[#1A1A1A] truncate" style={{ fontFamily: "'Fraunces', serif" }}>
                {setup.eventName || "Untitled Schedule"}
              </h1>
              <p className="text-xs text-[#666]">
                {setup.eventDate
                  ? format(new Date(setup.eventDate + "T12:00:00"), "MMMM d, yyyy")
                  : "No date set"} · starts {setup.startTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {shareToken && (
              <button onClick={copyShareLink} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F0E8] text-[#1A1A1A] rounded hover:bg-[#EAE4D9] transition-colors text-sm">
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>
            )}
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1A1A1A] text-white rounded hover:bg-[#333] transition-colors text-sm disabled:opacity-50"
              data-testid="button-save"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Schedule"}
            </button>
          </div>
        </div>
      </div>

      {/* Smart Command Panel */}
      <div className="bg-[#FDFCFA] border-b border-[#E8E2D9]">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => setShowSmartPanel(s => !s)}
            className="flex items-center gap-2 py-2.5 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors w-full"
          >
            <Sparkles className="w-4 h-4 text-[#B8963E]" />
            <span className="font-medium text-[#1A1A1A]">Smart Schedule Assistant</span>
            <span className="text-xs text-[#999] ml-1">— paste a list or speak a command</span>
            <span className="ml-auto">{showSmartPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          </button>

          {showSmartPanel && (
            <div className="pb-4 space-y-3">

              {/* AI message feedback */}
              {aiMessage && (
                <div className="flex items-start gap-2 bg-[#EDF5E8] border border-[#C4DBB4] rounded px-3 py-2">
                  <Sparkles className="w-4 h-4 text-[#5c7a3e] shrink-0 mt-0.5" />
                  <p className="text-sm text-[#3a5a2e] leading-relaxed">{aiMessage}</p>
                </div>
              )}

              {/* Voice command row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`shrink-0 p-2.5 rounded-full transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
                  title={isListening ? "Stop listening" : "Speak a command"}
                  data-testid="button-mic"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  value={voiceCommand}
                  onChange={e => setVoiceCommand(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendVoiceCommand(voiceCommand); }}
                  placeholder={isListening ? "Listening…" : "Speak or type: \"Move Stephanie to 10am\" · \"Add Aunt Lisa for hair under Artist 2\""}
                  className="flex-1 text-sm px-3 py-2 border border-[#E8E2D9] rounded bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  data-testid="input-voice-command"
                />
                <button
                  onClick={() => sendVoiceCommand(voiceCommand)}
                  disabled={!voiceCommand.trim() || commanding}
                  className="shrink-0 px-4 py-2 bg-[#1A1A1A] text-white rounded text-sm hover:bg-[#333] disabled:opacity-40 transition-colors"
                  data-testid="button-send-command"
                >
                  {commanding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </div>

              {/* Paste client list */}
              <div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={"Paste a client list from an email or spreadsheet:\n\nYasmeen (Bride)\tH\tM\nJami (MOB)\tH\tM\nBarbara (MOG)\tH\tM\nStephanie (Bridesmaid)\tH\tM\n…"}
                  rows={4}
                  className="w-full text-sm px-3 py-2 border border-[#E8E2D9] rounded bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono resize-none"
                  data-testid="input-paste-clients-grid"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleParseClients}
                    disabled={!pasteText.trim() || parsing}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1A1A1A] text-white rounded text-sm hover:bg-[#333] disabled:opacity-40 transition-colors"
                    data-testid="button-parse-grid"
                  >
                    {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing…</> : <><ClipboardPaste className="w-4 h-4" /> Rebuild schedule from this list</>}
                  </button>
                  <p className="text-xs text-[#999]">Bride → Violet (2 hrs) · Lead artist 30 min · Others 45 min</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-4 overflow-x-auto">
        <table className="border-collapse bg-white rounded-lg shadow-sm border border-[#E8E2D9]">
          <thead>
            <tr>
              {artists.map((artist, colIdx) => (
                <th key={colIdx} className="border border-[#E8E2D9] bg-[#F5F0E8] px-3 py-2 min-w-[190px] max-w-[220px]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {artist.isLead && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#1A1A1A] text-white rounded font-medium shrink-0">Lead</span>
                      )}
                      <input
                        type="text"
                        value={artist.name}
                        onChange={e => updateArtist(colIdx, "name", e.target.value)}
                        className="flex-1 bg-transparent text-sm font-medium text-[#1A1A1A] focus:outline-none focus:bg-white focus:px-1.5 rounded min-w-0"
                        style={{ fontFamily: "'Fraunces', serif" }}
                        placeholder="Artist name"
                      />
                      {artists.length > 1 && (
                        <button onClick={() => deleteColumn(colIdx)} className="p-1 text-[#999] hover:text-red-500 shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-[#888]">
                      {artist.isLead ? "30 min/service · Bride = 2 hrs" : "45 min/service"}
                    </div>
                  </div>
                </th>
              ))}
              <th className="border border-[#E8E2D9] bg-[#F5F0E8] w-10">
                <button onClick={addColumn} className="p-2 text-[#666] hover:text-[#1A1A1A]" title="Add artist">
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIdx) => (
              <tr key={rowIdx} className="group">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="border border-[#E8E2D9] px-2 py-1.5 align-top">
                    <div className="space-y-1">
                      {/* Time range */}
                      <input
                        type="text"
                        value={cell.timeRange}
                        onChange={e => updateCell(rowIdx, colIdx, "timeRange", e.target.value)}
                        placeholder="Time range"
                        className="w-full text-xs px-1.5 py-1 bg-[#FAF8F5] border border-[#E8E2D9] rounded text-[#555] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono"
                      />
                      {/* Service badge + name */}
                      <div className="flex items-center gap-1">
                        {cell.service && (
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            cell.service.includes("+") || cell.service === "H+M" || cell.service === "HM"
                              ? "bg-purple-100 text-purple-700"
                              : cell.service === "H"
                              ? "bg-pink-100 text-pink-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {cell.service}
                          </span>
                        )}
                        <input
                          type="text"
                          value={cell.clientName}
                          onChange={e => updateCell(rowIdx, colIdx, "clientName", e.target.value)}
                          placeholder="Client name"
                          className="flex-1 text-sm px-1.5 py-1 bg-white border border-[#E8E2D9] rounded text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] min-w-0"
                        />
                        {cell.clientName && (
                          cell.photoUrl ? (
                            <button onClick={() => setViewingPhoto(cell.photoUrl!)} className="w-6 h-6 rounded overflow-hidden border border-[#E8E2D9] shrink-0">
                              <img src={cell.photoUrl} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setPhotoCell({ row: rowIdx, col: colIdx }); setShowPhotoModal(true); }}
                              className="p-1 text-[#bbb] hover:text-[#888] shrink-0"
                              title="Add inspo photo"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </td>
                ))}
                <td className="border border-[#E8E2D9] px-1 align-middle">
                  {grid.length > 1 && (
                    <button onClick={() => deleteRow(rowIdx)} className="p-1 text-[#ccc] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  className="w-full py-2 text-sm text-[#888] hover:text-[#1A1A1A] hover:bg-[#E8E2D9] transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add row
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Photo modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl">
            <h3 className="font-medium text-[#1A1A1A] mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Add inspiration photo</h3>
            <p className="text-sm text-[#666] mb-4">Upload a reference image for this client.</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-[#1A1A1A] text-white rounded text-sm hover:bg-[#333]">
                Choose photo
              </button>
              <button onClick={() => { setShowPhotoModal(false); setPhotoCell(null); }} className="flex-1 py-2 border border-[#E8E2D9] rounded text-sm hover:bg-[#F5F0E8]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <img src={viewingPhoto} alt="Inspiration" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
