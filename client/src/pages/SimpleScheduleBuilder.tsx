import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GridCell {
  time: string;
  name: string;
}

export default function SimpleScheduleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Event info
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  
  // Artists (columns)
  const [artists, setArtists] = useState(["Artist 1", "Artist 2", "Artist 3"]);
  
  // Grid data - each row has cells for each artist
  const [rows, setRows] = useState<GridCell[][]>([
    [{ time: "9:00 AM", name: "" }, { time: "9:00 AM", name: "" }, { time: "9:00 AM", name: "" }],
    [{ time: "9:45 AM", name: "" }, { time: "9:45 AM", name: "" }, { time: "9:45 AM", name: "" }],
    [{ time: "10:30 AM", name: "" }, { time: "10:30 AM", name: "" }, { time: "10:30 AM", name: "" }],
    [{ time: "11:15 AM", name: "" }, { time: "11:15 AM", name: "" }, { time: "11:15 AM", name: "" }],
    [{ time: "12:00 PM", name: "" }, { time: "12:00 PM", name: "" }, { time: "12:00 PM", name: "" }],
  ]);
  
  const [saving, setSaving] = useState(false);
  const [showEventForm, setShowEventForm] = useState(true);

  // Add artist column
  const addArtist = () => {
    const newArtistName = `Artist ${artists.length + 1}`;
    setArtists([...artists, newArtistName]);
    setRows(rows.map(row => [...row, { time: row[0]?.time || "9:00 AM", name: "" }]));
  };

  // Remove artist column
  const removeArtist = (idx: number) => {
    if (artists.length <= 1) return;
    setArtists(artists.filter((_, i) => i !== idx));
    setRows(rows.map(row => row.filter((_, i) => i !== idx)));
  };

  // Update artist name
  const updateArtistName = (idx: number, name: string) => {
    const newArtists = [...artists];
    newArtists[idx] = name;
    setArtists(newArtists);
  };

  // Add row
  const addRow = () => {
    setRows([...rows, artists.map(() => ({ time: "", name: "" }))]);
  };

  // Remove row
  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Update cell
  const updateCell = (rowIdx: number, colIdx: number, field: 'time' | 'name', value: string) => {
    const newRows = [...rows];
    newRows[rowIdx] = [...newRows[rowIdx]];
    newRows[rowIdx][colIdx] = { ...newRows[rowIdx][colIdx], [field]: value };
    setRows(newRows);
  };

  // Save schedule
  const saveSchedule = async () => {
    if (!eventName || !eventDate) {
      toast({ title: "Please enter event name and date", variant: "destructive" });
      setShowEventForm(true);
      return;
    }
    
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
          artistColumns: artists,
          timeSlots: rows.map(r => r[0]?.time || ""),
          grid: rows.map(row => 
            row.map(cell => ({ 
              clientName: cell.name, 
              service: "HM",
              time: cell.time
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/artist/schedules")} className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A]">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-medium text-[#1A1A1A]">Schedule Builder</h1>
          <button
            onClick={saveSchedule}
            disabled={saving}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] disabled:opacity-50 text-sm"
            data-testid="button-save-schedule"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Event Info Bar */}
        {showEventForm ? (
          <div className="bg-white rounded-lg border border-[#E8E2D9] p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event name"
                className="px-3 py-2 border border-[#E8E2D9] rounded-lg focus:outline-none focus:border-[#1A1A1A]"
                data-testid="input-event-name"
              />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="px-3 py-2 border border-[#E8E2D9] rounded-lg focus:outline-none focus:border-[#1A1A1A]"
                data-testid="input-event-date"
              />
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Location"
                className="px-3 py-2 border border-[#E8E2D9] rounded-lg focus:outline-none focus:border-[#1A1A1A]"
                data-testid="input-event-location"
              />
            </div>
            <button 
              onClick={() => setShowEventForm(false)}
              className="mt-3 text-sm text-[#666] hover:text-[#1A1A1A]"
            >
              Hide event details
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowEventForm(true)}
            className="mb-4 text-sm text-[#666] hover:text-[#1A1A1A] underline"
          >
            {eventName || "Click to add event details"}
          </button>
        )}

        {/* Schedule Grid */}
        <div className="bg-white rounded-lg border border-[#E8E2D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                {/* Artist names row */}
                <tr className="bg-[#1A1A1A]">
                  {artists.map((artist, i) => (
                    <th key={i} colSpan={2} className="relative group" style={{ width: `${100 / (artists.length + 1)}%` }}>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => updateArtistName(i, e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-white text-center font-medium focus:outline-none focus:bg-[#333]"
                        data-testid={`input-artist-${i}`}
                      />
                      {artists.length > 1 && (
                        <button
                          onClick={() => removeArtist(i)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white opacity-0 group-hover:opacity-100"
                          data-testid={`button-remove-artist-${i}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </th>
                  ))}
                  <th className="w-10 bg-[#1A1A1A]">
                    <button
                      onClick={addArtist}
                      className="w-full py-2 text-white/50 hover:text-white"
                      data-testid="button-add-artist"
                    >
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                  </th>
                  <th className="w-8 bg-[#1A1A1A]"></th>
                </tr>
                {/* Time/Client header */}
                <tr className="bg-[#F5F3F0] text-xs text-[#666]">
                  {artists.map((_, i) => (
                    <>
                      <th key={`time-${i}`} className="px-2 py-1 text-left w-20 border-r border-[#E8E2D9]">Time</th>
                      <th key={`client-${i}`} className="px-2 py-1 text-left border-r border-[#E8E2D9]">Client</th>
                    </>
                  ))}
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-[#F0EDE8] group hover:bg-[#FAFAF8]">
                    {row.map((cell, colIdx) => (
                      <>
                        <td key={`time-${colIdx}`} className="p-0 border-r border-[#F0EDE8]">
                          <input
                            type="text"
                            value={cell.time}
                            onChange={(e) => updateCell(rowIdx, colIdx, 'time', e.target.value)}
                            placeholder="9:00 AM"
                            className="w-full px-2 py-2 text-sm text-[#666] bg-transparent focus:outline-none focus:bg-[#FAF8F5]"
                            data-testid={`input-time-${rowIdx}-${colIdx}`}
                          />
                        </td>
                        <td key={`name-${colIdx}`} className="p-0 border-r border-[#E8E2D9]">
                          <input
                            type="text"
                            value={cell.name}
                            onChange={(e) => updateCell(rowIdx, colIdx, 'name', e.target.value)}
                            placeholder="Client name"
                            className="w-full px-2 py-2 text-sm bg-transparent focus:outline-none focus:bg-[#FAF8F5]"
                            data-testid={`input-name-${rowIdx}-${colIdx}`}
                          />
                        </td>
                      </>
                    ))}
                    <td></td>
                    <td className="px-1">
                      {rows.length > 1 && (
                        <button
                          onClick={() => removeRow(rowIdx)}
                          className="p-1 text-[#ccc] hover:text-red-500 opacity-0 group-hover:opacity-100"
                          data-testid={`button-remove-row-${rowIdx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row */}
          <div className="p-2 border-t border-[#E8E2D9]">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#666] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] rounded"
              data-testid="button-add-row"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
