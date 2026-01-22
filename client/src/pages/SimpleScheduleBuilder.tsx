import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Camera, ArrowLeft, Plus, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleRow {
  time1: string;
  leadArtist: string;
  time2: string;
  artists: string[];
}

interface InspirationPhoto {
  id: string;
  personName: string;
  imageUrl: string;
  uploadedAt: string;
}

export default function SimpleScheduleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Event info
  const [eventName, setEventName] = useState("Nicole Coble Wedding");
  const [eventDate, setEventDate] = useState("2026-05-23");
  const [eventLocation, setEventLocation] = useState("Cavallo Point");
  
  // Column headers - lead artist + additional artists
  const [leadArtistName, setLeadArtistName] = useState("Violet HM");
  const [artistColumns, setArtistColumns] = useState(["Hair", "Makeup", "Hair"]);
  
  // Schedule rows
  const [schedule, setSchedule] = useState<ScheduleRow[]>([
    { time1: "8:00 AM", leadArtist: "", time2: "", artists: ["", "", ""] },
    { time1: "9:00 AM", leadArtist: "", time2: "", artists: ["", "", ""] },
    { time1: "10:00 AM", leadArtist: "Kelly", time2: "", artists: ["", "", ""] },
    { time1: "11:00 AM", leadArtist: "", time2: "", artists: ["", "", ""] },
    { time1: "12:00 PM", leadArtist: "", time2: "", artists: ["", "", ""] },
  ]);
  
  // Save state
  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
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
  
  // Get photos for a person
  const getPhotosForPerson = (name: string) => {
    return photos.filter(p => p.personName.toLowerCase() === name.toLowerCase());
  };
  
  // Update row field
  const updateRow = (rowIdx: number, field: keyof ScheduleRow, value: string) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      newSchedule[rowIdx] = { ...newSchedule[rowIdx], [field]: value };
      return newSchedule;
    });
  };
  
  // Update artist in row
  const updateArtist = (rowIdx: number, artistIdx: number, value: string) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      const newArtists = [...newSchedule[rowIdx].artists];
      newArtists[artistIdx] = value;
      newSchedule[rowIdx] = { ...newSchedule[rowIdx], artists: newArtists };
      return newSchedule;
    });
  };
  
  // Add row
  const addRow = () => {
    setSchedule(prev => [...prev, { 
      time1: "", 
      leadArtist: "", 
      time2: "", 
      artists: artistColumns.map(() => "") 
    }]);
  };
  
  // Delete row
  const deleteRow = (idx: number) => {
    if (schedule.length <= 1) return;
    setSchedule(prev => prev.filter((_, i) => i !== idx));
  };
  
  // Add artist column
  const addArtistColumn = () => {
    setArtistColumns(prev => [...prev, "Artist"]);
    setSchedule(prev => prev.map(row => ({
      ...row,
      artists: [...row.artists, ""]
    })));
  };
  
  // Remove artist column
  const removeArtistColumn = (idx: number) => {
    if (artistColumns.length <= 1) return;
    setArtistColumns(prev => prev.filter((_, i) => i !== idx));
    setSchedule(prev => prev.map(row => ({
      ...row,
      artists: row.artists.filter((_, i) => i !== idx)
    })));
  };
  
  // Save schedule
  const saveSchedule = async () => {
    if (!eventName.trim()) {
      toast({ title: "Please enter an event name", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      // Build the data structure for the API
      const allArtistColumns = [leadArtistName, ...artistColumns];
      const timeSlots = schedule.map(s => s.time1);
      const grid = schedule.map(row => [
        { clientName: row.leadArtist, service: "HM" },
        ...row.artists.map((name, i) => ({ 
          clientName: name, 
          service: artistColumns[i]?.toLowerCase().includes("makeup") ? "M" : "H" 
        }))
      ]);
      
      const res = await fetch("/api/event-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventName,
          eventDate,
          eventLocation,
          artistColumns: allArtistColumns,
          timeSlots,
          grid,
        }),
      });
      
      if (res.status === 401) {
        toast({ title: "Please log in first", variant: "destructive" });
        navigate("/artist/login");
        return;
      }
      
      if (!res.ok) throw new Error("Failed to save");
      
      const data = await res.json();
      const link = `${window.location.origin}/schedule/${data.shareToken}`;
      setShareLink(link);
      toast({ title: "Schedule saved!" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
          
          <div className="flex items-center gap-2">
            {shareLink && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast({ title: "Link copied!" });
                }}
                className="px-3 py-2 text-sm border border-[#E8E2D9] rounded hover:bg-[#F5F0E8] transition-colors"
              >
                Copy Link
              </button>
            )}
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Schedule Table */}
        <div className="bg-white rounded-lg shadow-sm border border-[#E8E2D9] overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#F5F0E8]">
                {/* Time 1 */}
                <th className="border border-[#E8E2D9] px-2 py-2 text-left font-medium w-24">Time</th>
                
                {/* Lead Artist */}
                <th className="border border-[#E8E2D9] px-2 py-2 min-w-[120px]">
                  <input
                    type="text"
                    value={leadArtistName}
                    onChange={(e) => setLeadArtistName(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-center focus:outline-none"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  />
                </th>
                
                {/* Time 2 */}
                <th className="border border-[#E8E2D9] px-2 py-2 text-left font-medium w-24">Time</th>
                
                {/* Additional Artists */}
                {artistColumns.map((artist, i) => (
                  <th key={i} className="border border-[#E8E2D9] px-2 py-2 min-w-[100px] relative group">
                    <input
                      type="text"
                      value={artist}
                      onChange={(e) => {
                        const newCols = [...artistColumns];
                        newCols[i] = e.target.value;
                        setArtistColumns(newCols);
                      }}
                      className="w-full bg-transparent text-sm font-medium text-center focus:outline-none pr-4"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    />
                    {artistColumns.length > 1 && (
                      <button
                        onClick={() => removeArtistColumn(i)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </th>
                ))}
                
                {/* Add column button */}
                <th className="border border-[#E8E2D9] w-10">
                  <button
                    onClick={addArtistColumn}
                    className="w-full h-full flex items-center justify-center text-[#999] hover:text-[#666] hover:bg-[#F5F0E8] py-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
                
                {/* Delete row column */}
                <th className="border border-[#E8E2D9] w-8"></th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, rowIdx) => (
                <tr key={rowIdx} className="group hover:bg-[#FAFAF8]">
                  {/* Time 1 */}
                  <td className="border border-[#E8E2D9] px-2 py-1">
                    <input
                      type="text"
                      value={row.time1}
                      onChange={(e) => updateRow(rowIdx, "time1", e.target.value)}
                      placeholder="8:00 AM"
                      className="w-full text-sm font-mono bg-transparent focus:outline-none focus:bg-[#FAF8F5] px-1 rounded"
                    />
                  </td>
                  
                  {/* Lead Artist */}
                  <td className="border border-[#E8E2D9] px-2 py-1 align-top">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={row.leadArtist}
                        onChange={(e) => updateRow(rowIdx, "leadArtist", e.target.value)}
                        placeholder="Client name"
                        className="w-full text-sm bg-transparent focus:outline-none focus:bg-[#FAF8F5] px-1 rounded"
                      />
                      {row.leadArtist && (
                        <div className="flex items-center gap-1">
                          {getPhotosForPerson(row.leadArtist).slice(0, 2).map(photo => (
                            <img
                              key={photo.id}
                              src={photo.imageUrl}
                              alt=""
                              className="w-6 h-6 rounded object-cover"
                            />
                          ))}
                          <button
                            onClick={() => {
                              setUploadingFor(row.leadArtist);
                              fileInputRef.current?.click();
                            }}
                            className="w-6 h-6 rounded bg-[#F5F0E8] flex items-center justify-center text-[#999] hover:text-[#666]"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Time 2 */}
                  <td className="border border-[#E8E2D9] px-2 py-1">
                    <input
                      type="text"
                      value={row.time2}
                      onChange={(e) => updateRow(rowIdx, "time2", e.target.value)}
                      placeholder=""
                      className="w-full text-sm font-mono bg-transparent focus:outline-none focus:bg-[#FAF8F5] px-1 rounded text-[#666]"
                    />
                  </td>
                  
                  {/* Additional Artists */}
                  {row.artists.map((artist, artistIdx) => (
                    <td key={artistIdx} className="border border-[#E8E2D9] px-2 py-1 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={artist}
                          onChange={(e) => updateArtist(rowIdx, artistIdx, e.target.value)}
                          placeholder="Client name"
                          className="w-full text-sm bg-transparent focus:outline-none focus:bg-[#FAF8F5] px-1 rounded"
                        />
                        {artist && (
                          <div className="flex items-center gap-1">
                            {getPhotosForPerson(artist).slice(0, 2).map(photo => (
                              <img
                                key={photo.id}
                                src={photo.imageUrl}
                                alt=""
                                className="w-6 h-6 rounded object-cover"
                              />
                            ))}
                            <button
                              onClick={() => {
                                setUploadingFor(artist);
                                fileInputRef.current?.click();
                              }}
                              className="w-6 h-6 rounded bg-[#F5F0E8] flex items-center justify-center text-[#999] hover:text-[#666]"
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                  
                  {/* Empty cell for add column */}
                  <td className="border border-[#E8E2D9]"></td>
                  
                  {/* Delete row */}
                  <td className="border border-[#E8E2D9] px-1">
                    <button
                      onClick={() => deleteRow(rowIdx)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Add Row */}
          <button
            onClick={addRow}
            className="w-full py-2 text-sm text-[#666] hover:text-[#1A1A1A] hover:bg-[#F5F0E8] border-t border-[#E8E2D9] transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !uploadingFor) return;
          
          const formData = new FormData();
          formData.append("image", file);
          formData.append("personName", uploadingFor);
          
          try {
            await fetch("/api/photos", { method: "POST", body: formData });
            toast({ title: "Photo uploaded!" });
          } catch {
            toast({ title: "Upload failed", variant: "destructive" });
          }
          setUploadingFor(null);
        }}
      />
    </div>
  );
}
