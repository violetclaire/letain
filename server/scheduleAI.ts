import { GoogleGenAI } from "@google/genai";
import type { EventDaySchedule, ScheduleAppointment, ScheduleTeamMember } from "@shared/schema";
import type { ArtistColumn, GridCell } from "@shared/types";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleChatInput {
  message: string;
  senderName: string;
  schedule: EventDaySchedule;
  appointments: ScheduleAppointment[];
  teamMembers: ScheduleTeamMember[];
}

interface ScheduleChatResponse {
  response: string;
}

export interface ParsedClient {
  name: string;
  role: string;       // bride, mob, mog, bridesmaid, groomsman, flower-girl, etc.
  hair: boolean;
  makeup: boolean;
  isVip: boolean;
}

export interface ScheduleCommandResult {
  message: string;
  artists: ArtistColumn[];
  grid: GridCell[][];
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function parseStartTime(startTime: string): number {
  // Accepts "6:00 AM", "07:30", "7:30 AM", etc. Returns minutes from midnight.
  const cleaned = startTime.trim().toUpperCase();
  const isPM = cleaned.includes("PM");
  const isAM = cleaned.includes("AM");
  const stripped = cleaned.replace(/[APM\s]/g, "");
  const [hStr, mStr] = stripped.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function minutesToDisplay(totalMinutes: number): string {
  const normalized = totalMinutes % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function makeTimeRange(startMinutes: number, durationMinutes: number): string {
  return `${minutesToDisplay(startMinutes)} - ${minutesToDisplay(startMinutes + durationMinutes)}`;
}

// ─── Preference rules ────────────────────────────────────────────────────────
// Lead artist (Violet / col 0 / name includes "violet"):
//   - Bride: 120 min (2 hours)
//   - All other services: 30 min each
// Every other artist: 45 min per service

function isLeadArtist(artist: ArtistColumn, colIdx: number): boolean {
  return colIdx === 0 || artist.isLead === true || artist.name.toLowerCase().includes("violet");
}

function serviceDuration(artist: ArtistColumn, colIdx: number, client: ParsedClient): number {
  if (client.role === "bride") return 120;
  return isLeadArtist(artist, colIdx) ? 30 : 45;
}

// ─── Build grid from parsed clients ──────────────────────────────────────────

export function buildGridFromClients(
  clients: ParsedClient[],
  artists: ArtistColumn[],
  startTimeStr: string
): GridCell[][] {
  // Track current time pointer (in minutes) for each artist column
  const cursors: number[] = artists.map(() => parseStartTime(startTimeStr));

  // Collect (colIdx, cell) pairs in order
  const colRows: GridCell[][] = artists.map(() => []);

  // Bride always goes to col 0 (lead artist) first
  const bride = clients.find(c => c.role === "bride");
  const others = clients.filter(c => c.role !== "bride");

  const assignClient = (client: ParsedClient, colIdx: number) => {
    const artist = artists[colIdx];
    const dur = serviceDuration(artist, colIdx, client);
    const services: string[] = [];
    if (client.hair) services.push("H");
    if (client.makeup) services.push("M");
    const serviceLabel = services.join("+") || "HM";

    if (client.role === "bride") {
      // Bride is one 2-hour block
      colRows[colIdx].push({
        timeRange: makeTimeRange(cursors[colIdx], 120),
        clientName: `${client.name} (Bride)`,
        service: "H+M",
      });
      cursors[colIdx] += 120;
    } else {
      // Each service is its own row
      for (const svc of services.length > 0 ? services : ["HM"]) {
        colRows[colIdx].push({
          timeRange: makeTimeRange(cursors[colIdx], dur),
          clientName: client.name + (client.isVip ? " ★" : ""),
          service: svc,
        });
        cursors[colIdx] += dur;
      }
    }
  };

  if (bride) {
    assignClient(bride, 0);
  }

  // Assign remaining clients to columns, balancing load
  for (const client of others) {
    // Find the column with the earliest end time (least loaded)
    let bestCol = 0;
    let earliestCursor = cursors[0];
    for (let i = 1; i < artists.length; i++) {
      if (cursors[i] < earliestCursor) {
        earliestCursor = cursors[i];
        bestCol = i;
      }
    }
    assignClient(client, bestCol);
  }

  // Normalize to rectangular grid
  const maxRows = Math.max(...colRows.map(col => col.length));
  const grid: GridCell[][] = Array.from({ length: maxRows }, (_, rowIdx) =>
    artists.map((_, colIdx) => colRows[colIdx][rowIdx] || { timeRange: "", clientName: "" })
  );

  return grid;
}

// ─── AI: Parse a raw client list ────────────────────────────────────────────

export async function parseClientList(input: {
  rawText: string;
  startTime: string;
  numArtists: number;
  artistNames?: string[];
}): Promise<ScheduleCommandResult> {
  const { rawText, startTime, numArtists, artistNames = [] } = input;

  const leadName = artistNames[0] || "Violet";

  const systemPrompt = `You are a smart wedding beauty schedule assistant. Parse the following client list and return structured JSON.

RULES:
- The lead artist is "${leadName}". The lead artist handles the BRIDE for 2 hours (hair + makeup together).
- Lead artist does 30 minutes per service for non-bride clients.
- All other artists do 45 minutes per service.
- Identify each person's role from their name: "Bride", "MOB" = Mother of Bride, "MOG" = Mother of Groom, "MOH" = Maid of Honor, "Bridesmaid", "Groomsman", etc.
- Detect hair (H) and makeup (M) services from checkboxes (X), columns, or text.
- If someone has both hair and makeup, create separate service entries.
- Bride is always isVip: true. MOB and MOG are also isVip: true.

Return ONLY a JSON object with this exact shape:
{
  "clients": [
    {
      "name": "First name or full name without role",
      "role": "bride|mob|mog|moh|bridesmaid|aunt|cousin|other",
      "hair": true|false,
      "makeup": true|false,
      "isVip": true|false
    }
  ],
  "summary": "Plain English summary of what you parsed"
}

CLIENT LIST:
${rawText}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: { temperature: 0.1, maxOutputTokens: 2048 },
    });

    const raw = result.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    const clients: ParsedClient[] = parsed.clients || [];

    // Build artist columns
    const artists: ArtistColumn[] = Array.from({ length: numArtists }, (_, i) => ({
      name: artistNames[i] || (i === 0 ? "Violet" : `Artist ${i + 1}`),
      type: i === 0 ? "H30" : "H45",
      duration: i === 0 ? 30 : 45,
      slots: [],
      isLead: i === 0,
    }));

    const grid = buildGridFromClients(clients, artists, startTime);

    return {
      message: parsed.summary || `Parsed ${clients.length} clients. Bride with ${artists[0].name} (2 hrs). Ready to review.`,
      artists,
      grid,
    };
  } catch (err) {
    console.error("[Schedule AI] parseClientList error:", err);
    return {
      message: "Could not parse the client list. Try formatting as one name per line with H and M noted.",
      artists: Array.from({ length: numArtists }, (_, i) => ({
        name: artistNames[i] || (i === 0 ? "Violet" : `Artist ${i + 1}`),
        type: i === 0 ? "H30" : "H45",
        duration: i === 0 ? 30 : 45,
        slots: [],
        isLead: i === 0,
      })),
      grid: [[{ timeRange: "", clientName: "" }]],
    };
  }
}

// ─── AI: Process a voice/text command ────────────────────────────────────────

export async function processVoiceCommand(input: {
  command: string;
  artists: ArtistColumn[];
  grid: GridCell[][];
  startTime: string;
}): Promise<ScheduleCommandResult> {
  const { command, artists, grid, startTime } = input;

  const leadName = artists.find((_, i) => i === 0)?.name || "Violet";

  const currentState = JSON.stringify({ artists, grid }, null, 2);

  const systemPrompt = `You are an AI assistant controlling a live beauty schedule grid.

MEMORY — PERMANENT RULES (never override):
- "${leadName}" is the lead artist (column 0). She does 30 min per service. Bride = 2 hours.
- All other artists: 45 min per service.
- Bride always goes to the lead artist column.
- Times stack sequentially within each column — no gaps, no overlaps.
- Service codes: H = Hair, M = Makeup, H+M = both.

CURRENT SCHEDULE STATE:
${currentState}

EVENT START TIME: ${startTime}

COMMAND FROM ARTIST: "${command}"

Interpret the command and return the updated schedule. Re-calculate all times in each column from scratch based on startTime and sequential durations.

Return ONLY a JSON object:
{
  "message": "Plain English confirmation of what changed",
  "artists": [ { "name": "...", "type": "...", "duration": 30, "slots": [], "isLead": true } ],
  "grid": [
    [ { "timeRange": "8:00 AM - 8:30 AM", "clientName": "Sarah", "service": "H" }, ... ],
    ...
  ]
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: { temperature: 0.1, maxOutputTokens: 4096 },
    });

    const raw = result.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      message: parsed.message || "Schedule updated.",
      artists: parsed.artists || artists,
      grid: parsed.grid || grid,
    };
  } catch (err) {
    console.error("[Schedule AI] processVoiceCommand error:", err);
    return {
      message: "I didn't catch that. Try: 'Move Sarah to 10am' or 'Add Aunt Lisa for hair under Artist 2'.",
      artists,
      grid,
    };
  }
}

// ─── Guest chat (read-only) ───────────────────────────────────────────────────

function formatScheduleContext(input: ScheduleChatInput): string {
  const { schedule, appointments, teamMembers } = input;
  return `EVENT SCHEDULE INFORMATION:
Event: ${schedule.eventName}
Date: ${new Date(schedule.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
Location: ${schedule.eventLocation || "Not specified"}
Ready By Time: ${schedule.readyByTime || "Not specified"}
Notes: ${schedule.notes || "None"}

TEAM MEMBERS:
${teamMembers.map(m => `- ${m.name} (${m.role}, does ${m.serviceType || "general"})`).join("\n") || "No team members assigned"}

APPOINTMENTS:
${appointments.map(apt => {
  const assignedTo = teamMembers.find(m => m.id === apt.teamMemberId);
  return `- Client: ${apt.clientName}${apt.isVip ? " (VIP)" : ""}
  Service: ${apt.serviceType === "H" ? "Hair" : apt.serviceType === "M" ? "Makeup" : "Hair & Makeup"}
  Time: ${apt.startTime} - ${apt.endTime}
  Assigned to: ${assignedTo?.name || "Unassigned"}`;
}).join("\n\n") || "No appointments scheduled"}`;
}

export async function processScheduleChat(input: ScheduleChatInput): Promise<ScheduleChatResponse> {
  const { message, senderName } = input;
  const scheduleContext = formatScheduleContext(input);

  const systemPrompt = `You are an AI assistant helping guests with their wedding day beauty schedule.

${scheduleContext}

RULES:
1. Be warm, friendly, and concise
2. Answer questions about the schedule accurately
3. If someone wants changes, tell them to contact their beauty artist directly
4. Never claim you can modify the schedule — you are read-only
5. Keep responses brief (1-3 sentences)
6. Be reassuring for nervous wedding party members

Current guest: ${senderName}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n\nGuest message: " + message,
      config: { temperature: 0.7, maxOutputTokens: 1024 },
    });

    const responseText = result.text || "Thanks for your message! Feel free to ask me anything about the schedule.";
    return { response: responseText };
  } catch (error) {
    console.error("[Schedule AI] Chat error:", error);
    return {
      response: `Thanks for your message, ${senderName}! Contact your beauty artist directly for any changes.`,
    };
  }
}
