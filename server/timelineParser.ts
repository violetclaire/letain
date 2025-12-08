import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

const PARSER_PROMPT = `You are a wedding Hair & Makeup (HMU) schedule parser. Your job is to extract ONLY hair and makeup related entries from a wedding planner's timeline.

Look for entries that mention:
- "Hair", "Makeup", "HMU", "H&M", "Hair and Makeup", "Makeup Dolls", "glam", "styling"
- "Touch up", "Touch-up", "touchup"
- Names of people getting hair/makeup done (Bride, Mother of Bride/MOB, Bridesmaids, Maid of Honor/MOH, etc.)
- Setup/arrival times for HMU team

IMPORTANT RULES:
1. Extract the main event date for the wedding day schedule
2. For each HMU-related entry, capture:
   - Start time (required)
   - End time (if specified, otherwise estimate based on service type)
   - Client name(s) - list each person separately
   - Service type: "HM" (hair and makeup), "H" (hair only), "M" (makeup only)
   - Location name if mentioned
   - Whether it's VIP (Bride is ALWAYS VIP, MOH and Mother of Bride are also VIP)
   - Block type: "setup" for arrival/setup, "service" for main services, "touchup" for touch-ups

3. For time blocks with multiple people listed (e.g., "HMU for Sami, Vicki, Jess 11:30-3:45"), split into individual appointments with estimated times
4. If "Hair and Makeup Complete" time is mentioned, use that as the deadline (readyByTime)
5. Convert all times to 24-hour format (e.g., "8:00" for 8 AM, "14:00" for 2 PM)

Respond with a JSON object:
{
  "eventName": "Client Names Wedding" (extract from document),
  "eventDate": "YYYY-MM-DD",
  "eventLocation": "main venue/getting ready location",
  "readyByTime": "HH:MM" (when HMU must be complete),
  "teamMembers": [
    {"name": "stylist name if mentioned", "serviceType": "HM|H|M"}
  ],
  "appointments": [
    {
      "clientName": "Person name",
      "serviceType": "HM|H|M",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "isVip": true/false,
      "blockType": "service|touchup|setup",
      "locationName": "location if different from main",
      "notes": "any relevant notes"
    }
  ],
  "uncertainties": ["list any items you're unsure about"]
}

If you cannot find enough HMU-related information, return:
{
  "error": "No hair and makeup entries found in this timeline",
  "suggestions": ["what to look for"]
}`;

export interface ParsedAppointment {
  clientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  isVip: boolean;
  blockType: string;
  locationName?: string;
  notes?: string;
}

export interface ParsedTeamMember {
  name: string;
  serviceType: string;
}

export interface ParsedTimeline {
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  readyByTime?: string;
  teamMembers: ParsedTeamMember[];
  appointments: ParsedAppointment[];
  uncertainties: string[];
  error?: string;
  suggestions?: string[];
}

export async function parseTimelineDocument(timelineText: string): Promise<ParsedTimeline> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: PARSER_PROMPT }] },
        { role: "model", parts: [{ text: "I understand. I'll parse the wedding timeline and extract only hair & makeup related entries, returning structured JSON with appointments, team members, and event details." }] },
        { role: "user", parts: [{ text: `Please parse this wedding timeline:\n\n${timelineText}` }] }
      ],
      config: {
        maxOutputTokens: 4096,
      }
    });

    const responseText = response.text || "";
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedTimeline;
      
      if (!parsed.appointments) {
        parsed.appointments = [];
      }
      if (!parsed.teamMembers) {
        parsed.teamMembers = [];
      }
      if (!parsed.uncertainties) {
        parsed.uncertainties = [];
      }
      
      parsed.appointments = parsed.appointments.map(apt => ({
        ...apt,
        startTime: normalizeTime(apt.startTime),
        endTime: normalizeTime(apt.endTime),
        serviceType: apt.serviceType?.toUpperCase() || "HM",
        blockType: apt.blockType || "service",
        isVip: apt.isVip || false,
      }));
      
      return parsed;
    }
    
    return {
      eventName: "",
      eventDate: "",
      teamMembers: [],
      appointments: [],
      uncertainties: [],
      error: "Could not parse response from AI",
    };
  } catch (error: any) {
    console.error("Timeline parsing error:", error);
    return {
      eventName: "",
      eventDate: "",
      teamMembers: [],
      appointments: [],
      uncertainties: [],
      error: error.message || "Failed to parse timeline",
    };
  }
}

function normalizeTime(time: string): string {
  if (!time) return "08:00";
  
  time = time.replace(/\s+/g, "").toLowerCase();
  
  const match = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return time;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2] || "00";
  const meridiem = match[3]?.toLowerCase();
  
  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  } else if (meridiem === "am" && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}
