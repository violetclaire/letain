import { GoogleGenAI } from "@google/genai";
import type { EventDaySchedule, ScheduleAppointment, ScheduleTeamMember } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

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

function formatScheduleContext(input: ScheduleChatInput): string {
  const { schedule, appointments, teamMembers } = input;
  
  let context = `EVENT SCHEDULE INFORMATION:
Event: ${schedule.eventName}
Date: ${new Date(schedule.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Location: ${schedule.eventLocation || 'Not specified'}
Ready By Time: ${schedule.readyByTime || 'Not specified'}
Notes: ${schedule.notes || 'None'}

TEAM MEMBERS:
${teamMembers.map(m => `- ${m.name} (${m.role}, does ${m.serviceType || 'general'})`).join('\n') || 'No team members assigned'}

APPOINTMENTS:
${appointments.map(apt => {
  const assignedTo = teamMembers.find(m => m.id === apt.teamMemberId);
  return `- Client: ${apt.clientName}${apt.isVip ? ' (VIP)' : ''}
  Service: ${apt.serviceType === 'H' ? 'Hair' : apt.serviceType === 'M' ? 'Makeup' : 'Hair & Makeup'}
  Time: ${apt.startTime} - ${apt.endTime}
  Assigned to: ${assignedTo?.name || 'Unassigned'}`;
}).join('\n\n') || 'No appointments scheduled'}`;

  return context;
}

export async function processScheduleChat(input: ScheduleChatInput): Promise<ScheduleChatResponse> {
  const { message, senderName } = input;
  
  const scheduleContext = formatScheduleContext(input);
  
  // AI is READ-ONLY: Can answer questions about the schedule but cannot modify anything
  const systemPrompt = `You are an AI assistant helping guests with their wedding day beauty schedule. You can answer questions about appointment times, locations, and team members.

${scheduleContext}

RULES:
1. Be warm, friendly, and concise
2. Answer questions about the schedule accurately using the information above
3. If someone wants to add a note or make a change, tell them to use the "Add Note" feature on the schedule page or contact their beauty artist directly
4. Never claim you can save notes or modify the schedule - you are read-only
5. Keep responses brief (1-3 sentences when possible)
6. If asked about appointment times, give the exact times from the schedule
7. Be reassuring and helpful for nervous wedding party members

Current guest: ${senderName}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n\nGuest message: " + message,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    // Extract text from response
    let responseText = "";
    if (result.text) {
      responseText = result.text;
    } else if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = result.candidates[0].content.parts[0].text;
    } else {
      responseText = "Thanks for your message! Feel free to ask me anything about the schedule.";
    }

    return { response: responseText };
  } catch (error) {
    console.error("[Schedule AI] Generation error:", error);
    return {
      response: `Thanks for your message, ${senderName}! If you need to add a note or have questions about the schedule, feel free to use the note feature on this page or contact your beauty artist directly.`
    };
  }
}
