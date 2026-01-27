import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleRow {
  times: string[];
  names: string[];
}

export default function SimpleScheduleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Step state
  const [step, setStep] = useState(1);
  
  // Step 1: Event info
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  
  // Step 2: Number of artists
  const [numArtists, setNumArtists] = useState(2);
  
  // Step 3: Artist names and grid
  const [artistNames, setArtistNames] = useState<string[]>(["Lead Artist", "Artist 2"]);
  const [rows, setRows] = useState<ScheduleRow[]>([
    { times: ["9:00 AM", "9:00 AM"], names: ["", ""] },
    { times: ["9:45 AM", "9:45 AM"], names: ["", ""] },
    { times: ["10:30 AM", "10:30 AM"], names: ["", ""] },
    { times: ["11:15 AM", "11:15 AM"], names: ["", ""] },
    { times: ["12:00 PM", "12:00 PM"], names: ["", ""] },
  ]);
  
  const [saving, setSaving] = useState(false);

  // When number of artists changes, update the grid
  const handleArtistCountChange = (count: number) => {
    setNumArtists(count);
    
    // Update artist names array
    const newNames = Array.from({ length: count }, (_, i) => 
      artistNames[i] || (i === 0 ? "Lead Artist" : `Artist ${i + 1}`)
    );
    setArtistNames(newNames);
    
    // Update rows to match artist count
    setRows(prev => prev.map(row => ({
      times: Array.from({ length: count }, (_, i) => row.times[i] || "9:00 AM"),
      names: Array.from({ length: count }, (_, i) => row.names[i] || ""),
    })));
  };

  // Update artist name in header
  const updateArtistName = (idx: number, name: string) => {
    setArtistNames(prev => {
      const newNames = [...prev];
      newNames[idx] = name;
      return newNames;
    });
  };

  // Update time in cell
  const updateTime = (rowIdx: number, artistIdx: number, time: string) => {
    setRows(prev => {
      const newRows = [...prev];
      const newTimes = [...newRows[rowIdx].times];
      newTimes[artistIdx] = time;
      newRows[rowIdx] = { ...newRows[rowIdx], times: newTimes };
      return newRows;
    });
  };

  // Update name in cell
  const updateName = (rowIdx: number, artistIdx: number, name: string) => {
    setRows(prev => {
      const newRows = [...prev];
      const newNames = [...newRows[rowIdx].names];
      newNames[artistIdx] = name;
      newRows[rowIdx] = { ...newRows[rowIdx], names: newNames };
      return newRows;
    });
  };

  // Add row
  const addRow = () => {
    setRows(prev => [...prev, {
      times: Array.from({ length: numArtists }, () => ""),
      names: Array.from({ length: numArtists }, () => ""),
    }]);
  };

  // Delete row
  const deleteRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  // Save schedule
  const saveSchedule = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/event-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventName,
          eventDate,
          eventLocation,
          artistColumns: artistNames,
          timeSlots: rows.map(r => r.times[0]),
          grid: rows.map(row => 
            row.names.map((name, i) => ({ 
              clientName: name, 
              service: "HM",
              time: row.times[i]
            }))
          ),
        }),
      });
      
      if (res.status === 401) {
        toast({ title: "Please log in first", variant: "destructive" });
        navigate("/artist/login");
        return;
      }

      if (!res.ok) throw new Error("Failed to save");
      
      const data = await res.json();
      toast({ title: "Schedule saved!" });
      navigate(`/artist/schedule/${data.id}`);
    } catch (err) {
      toast({ title: "Error saving schedule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E2D9] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/artist/schedules")} className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A]">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-medium text-[#1A1A1A]">Create Schedule</h1>
          <div className="text-sm text-[#666]">Step {step} of 3</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Step 1: Event Info */}
        {step === 1 && (
          <div className="bg-white rounded-lg border border-[#E8E2D9] p-6">
            <h2 className="text-xl font-medium mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              Event Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Smith Wedding"
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-lg text-lg focus:outline-none focus:border-[#1A1A1A]"
                  data-testid="input-event-name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-lg text-lg focus:outline-none focus:border-[#1A1A1A]"
                  data-testid="input-event-date"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#666] mb-1">Location</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g., Grand Hotel"
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-lg text-lg focus:outline-none focus:border-[#1A1A1A]"
                  data-testid="input-event-location"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!eventName || !eventDate}
                className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-next-step1"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Number of Artists */}
        {step === 2 && (
          <div className="bg-white rounded-lg border border-[#E8E2D9] p-6">
            <h2 className="text-xl font-medium mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              How many artists?
            </h2>
            
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <button
                  key={num}
                  onClick={() => handleArtistCountChange(num)}
                  className={`py-4 text-2xl font-medium rounded-lg border-2 transition-colors ${
                    numArtists === num 
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                      : "bg-white text-[#1A1A1A] border-[#E8E2D9] hover:border-[#1A1A1A]"
                  }`}
                  data-testid={`button-artists-${num}`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F3F0]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333]"
                data-testid="button-next-step2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Editable Grid */}
        {step === 3 && (
          <div className="bg-white rounded-lg border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h2 className="font-medium text-[#1A1A1A]">{eventName}</h2>
                <p className="text-sm text-[#666]">{eventLocation} • {eventDate}</p>
              </div>
              <button
                onClick={saveSchedule}
                disabled={saving}
                className="px-6 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] disabled:opacity-50"
                data-testid="button-save-schedule"
              >
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F3F0]">
                    {artistNames.map((name, i) => (
                      <th key={i} colSpan={2} className="border-r border-[#E8E2D9] last:border-r-0">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateArtistName(i, e.target.value)}
                          className="w-full px-3 py-2 bg-transparent text-center font-medium focus:outline-none focus:bg-white"
                          placeholder={`Artist ${i + 1}`}
                          data-testid={`input-artist-name-${i}`}
                        />
                      </th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                  <tr className="bg-[#F5F3F0] text-xs text-[#666]">
                    {artistNames.map((_, i) => (
                      <>
                        <th key={`time-${i}`} className="px-2 py-1 text-left border-r border-[#F0EDE8]">Time</th>
                        <th key={`name-${i}`} className="px-2 py-1 text-left border-r border-[#E8E2D9] last:border-r-0">Client</th>
                      </>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-[#F0EDE8] hover:bg-[#FAFAF8]">
                      {artistNames.map((_, artistIdx) => (
                        <>
                          <td key={`time-${artistIdx}`} className="border-r border-[#F0EDE8] p-0">
                            <input
                              type="text"
                              value={row.times[artistIdx]}
                              onChange={(e) => updateTime(rowIdx, artistIdx, e.target.value)}
                              placeholder="9:00 AM"
                              className="w-full px-2 py-2 text-sm bg-transparent focus:outline-none focus:bg-[#FAF8F5]"
                              data-testid={`input-time-${rowIdx}-${artistIdx}`}
                            />
                          </td>
                          <td key={`name-${artistIdx}`} className="border-r border-[#E8E2D9] last:border-r-0 p-0">
                            <input
                              type="text"
                              value={row.names[artistIdx]}
                              onChange={(e) => updateName(rowIdx, artistIdx, e.target.value)}
                              placeholder="Client name"
                              className="w-full px-2 py-2 text-sm bg-transparent focus:outline-none focus:bg-[#FAF8F5]"
                              data-testid={`input-name-${rowIdx}-${artistIdx}`}
                            />
                          </td>
                        </>
                      ))}
                      <td className="px-1">
                        <button
                          onClick={() => deleteRow(rowIdx)}
                          className="p-1 text-[#999] hover:text-red-500 opacity-0 group-hover:opacity-100"
                          data-testid={`button-delete-row-${rowIdx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button */}
            <div className="p-3 border-t border-[#E8E2D9]">
              <button
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[#666] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] rounded-lg"
                data-testid="button-add-row"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>

            {/* Back Button */}
            <div className="p-4 border-t border-[#E8E2D9]">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to artist count
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
