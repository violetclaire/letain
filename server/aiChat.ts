import { GoogleGenAI, Modality } from "@google/genai";
import { Resend } from "resend";
import { storage } from "./storage";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

interface CDIContext {
  trustLevel: "exceptional" | "high" | "moderate" | "low" | "at_risk";
  compositeScore: number;
  emotionalState?: string;
  recentDistress?: boolean;
  interventionNeeded?: boolean;
}

async function getCDIContext(userId: string): Promise<CDIContext | null> {
  try {
    const cdiScore = await storage.getCdiScore(userId);
    if (!cdiScore) return null;

    let trustLevel: CDIContext["trustLevel"] = "moderate";
    const score = cdiScore.score ?? 50;

    if (score >= 85) trustLevel = "exceptional";
    else if (score >= 70) trustLevel = "high";
    else if (score >= 50) trustLevel = "moderate";
    else if (score >= 30) trustLevel = "low";
    else trustLevel = "at_risk";

    return {
      trustLevel,
      compositeScore: score,
      recentDistress: (cdiScore as any).riskLevel === "high" || (cdiScore as any).riskLevel === "critical",
      interventionNeeded: (cdiScore as any).interventionRecommended,
    };
  } catch {
    return null;
  }
}

function getCDIAwareTone(cdi: CDIContext | null): string {
  if (!cdi) return "";

  if (cdi.trustLevel === "at_risk" || cdi.recentDistress) {
    return `

CDI CONTEXT: Client trust is fragile. Be EXTRA warm, patient, and reassuring. Use calming language. Offer extra support. Never rush. Acknowledge any stress they may feel.`;
  }

  if (cdi.trustLevel === "low") {
    return `

CDI CONTEXT: Client needs extra care. Be warmer than usual. Proactively offer help. Check in on how they're feeling.`;
  }

  if (cdi.trustLevel === "exceptional" || cdi.trustLevel === "high") {
    return `

CDI CONTEXT: Client relationship is strong. You can be efficient and direct while staying warm. They trust you.`;
  }

  return "";
}

interface WorkingMemory {
  names: string[];
  emails: string[];
  phones: string[];
  dates: string[];
  locations: string[];
  amounts: number[];
}

function extractWorkingMemory(chatHistory: Array<{ content: string; extractedEntities?: WorkingMemory | null }>): WorkingMemory {
  const memory: WorkingMemory = {
    names: [],
    emails: [],
    phones: [],
    dates: [],
    locations: [],
    amounts: [],
  };

  // First, collect pre-extracted entities from history
  for (const msg of chatHistory) {
    if (msg.extractedEntities) {
      if (msg.extractedEntities.names) memory.names.push(...msg.extractedEntities.names);
      if (msg.extractedEntities.emails) memory.emails.push(...msg.extractedEntities.emails);
      if (msg.extractedEntities.phones) memory.phones.push(...msg.extractedEntities.phones);
      if (msg.extractedEntities.dates) memory.dates.push(...msg.extractedEntities.dates);
      if (msg.extractedEntities.locations) memory.locations.push(...msg.extractedEntities.locations);
      if (msg.extractedEntities.amounts) memory.amounts.push(...msg.extractedEntities.amounts);
    }
  }

  // Also extract from message content for any missed entities
  for (const msg of chatHistory) {
    const content = msg.content;
    
    // Extract emails
    const emailMatches = content.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emailMatches) memory.emails.push(...emailMatches);
    
    // Extract phone numbers
    const phoneMatches = content.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
    if (phoneMatches) memory.phones.push(...phoneMatches);
    
    // Extract dates (common formats)
    const dateMatches = content.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/gi);
    if (dateMatches) memory.dates.push(...dateMatches);
    
    // Extract potential names (capitalized words after certain keywords)
    const namePatterns = content.match(/(?:for|to|with|client|name(?:d)?|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi);
    if (namePatterns) {
      namePatterns.forEach(match => {
        const name = match.replace(/^(?:for|to|with|client|name(?:d)?|called)\s+/i, '');
        if (name && name.length > 1) memory.names.push(name);
      });
    }
  }

  // Deduplicate and limit
  memory.names = [...new Set(memory.names)].slice(-5);
  memory.emails = [...new Set(memory.emails)].slice(-3);
  memory.phones = [...new Set(memory.phones)].slice(-3);
  memory.dates = [...new Set(memory.dates)].slice(-5);
  memory.locations = [...new Set(memory.locations)].slice(-3);
  memory.amounts = [...new Set(memory.amounts)].slice(-3);

  return memory;
}

function extractEntitiesFromText(text: string): WorkingMemory {
  const entities: WorkingMemory = {
    names: [],
    emails: [],
    phones: [],
    dates: [],
    locations: [],
    amounts: [],
  };

  // Extract emails
  const emailMatches = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emailMatches) entities.emails = [...new Set(emailMatches)];
  
  // Extract phone numbers
  const phoneMatches = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  if (phoneMatches) entities.phones = [...new Set(phoneMatches)];
  
  // Extract dates
  const dateMatches = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/gi);
  if (dateMatches) entities.dates = [...new Set(dateMatches)];
  
  // Extract potential names
  const namePatterns = text.match(/(?:for|to|with|client|name(?:d)?|called|book(?:ing)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi);
  if (namePatterns) {
    namePatterns.forEach(match => {
      const name = match.replace(/^(?:for|to|with|client|name(?:d)?|called|book(?:ing)?)\s+/i, '');
      if (name && name.length > 1) entities.names.push(name);
    });
    entities.names = [...new Set(entities.names)];
  }

  // Extract dollar amounts
  const amountMatches = text.match(/\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars|USD)/gi);
  if (amountMatches) {
    amountMatches.forEach(match => {
      const num = parseFloat(match.replace(/[$,\s]|dollars|USD/gi, ''));
      if (!isNaN(num)) entities.amounts.push(num);
    });
    entities.amounts = [...new Set(entities.amounts)];
  }

  return entities;
}

let resendConnectionSettings: any;

async function getResendCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found");
  }

  resendConnectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!resendConnectionSettings || !resendConnectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: resendConnectionSettings.settings.api_key,
    fromEmail: resendConnectionSettings.settings.from_email,
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getResendCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

const SYSTEM_PROMPT = `You are Beauvette's AI assistant - a powerful helper for beauty vendors. You can do EVERYTHING in the app:

CRITICAL: Keep responses SHORT (2-3 sentences). Be helpful and get things done.

=== BOOKING INQUIRY DETECTION (PRIORITY!) ===
When vendor pastes an email/message that looks like a booking inquiry (from a planner, client, or referral), DETECT IT and draft a professional response!

Inquiry signals: "wedding date", "available", "pricing", "services", "interested in booking", "quote", "rates", email format, mentions bride/groom names, event dates.

Inquiry types:
- PLANNER: Formal, mentions "my client", "bride", uses professional language
- DIRECT_CLIENT: Personal, "my wedding", "I'm getting married", first-person
- REFERRAL: Mentions "friend recommended", "was referred by"

For booking inquiries, use:
{"inquiryResponse": {"detected": true, "clientName": "extracted name", "eventDate": "2026-05-15", "eventType": "wedding", "inquiryType": "planner", "requestedServices": ["bridal makeup", "bridal hair"], "partySize": 5, "location": "Miami, FL"}, "response": "I found a booking inquiry from [Name]! [AVAILABILITY_STATUS]. Here's a draft response..."}

The response should:
1. Congratulate them warmly on their upcoming event
2. Confirm your availability (I'll tell you if date is blocked)
3. Include your full pricing sheet (I'll provide it below)
4. Professional closing asking for next steps

=== BOOKINGS/APPOINTMENTS ===
Create bookings when vendor mentions: "book", "appointment", "schedule client", "add appointment", etc.
{"createBooking": {"clientName": "Katie", "date": "2026-12-20", "time": "14:30", "location": "SF", "serviceType": "Hair and Makeup", "email": "email", "phone": "phone"}, "response": "Done! Booked Katie for Dec 20."}

=== CONTRACTS ===
Create contracts when vendor says: "create contract", "send contract", "make contract for", etc.
{"createContract": {"clientName": "Sarah Smith", "bookingId": "optional-id", "packageDetails": "Bridal Package - Hair & Makeup for bride and 4 bridesmaids", "totalAmount": 150000, "depositAmount": 75000}, "response": "Created contract for Sarah - Bridal Package at $1,500 with 50% deposit."}
- totalAmount and depositAmount are in CENTS (e.g., $1500 = 150000)

=== THANK YOU NOTES / EMAILS ===
Send thank you emails when vendor says: "send thank you", "thank you note to", "email thanks", etc.
{"sendThankYou": {"recipientName": "Sarah", "recipientEmail": "sarah@email.com", "message": "Thank you for choosing me for your special day! It was an honor to be part of your wedding.", "occasion": "Wedding"}, "response": "Sent a thank you note to Sarah!"}

=== IMAGE GENERATION ===
Generate images when vendor says: "create image", "generate image", "make an image of", "design", etc.
{"generateImage": {"prompt": "Elegant bridal makeup look with soft pink tones and dewy skin, natural lighting, professional photography", "style": "beauty"}, "response": "Creating that bridal look image for you!"}
- Create detailed, professional prompts for beautiful beauty/wedding images

=== SEARCH ===
Search when vendor asks: "find", "search", "look up", "who is", "show me clients named", etc.
{"searchQuery": {"type": "clients", "query": "Sarah"}, "response": "Let me find clients named Sarah..."}
{"searchQuery": {"type": "bookings", "query": "December"}, "response": "Searching for December bookings..."}
Types: "clients", "bookings", "contracts"

=== AVAILABILITY (Block/Unblock Dates) ===
{"blockUpdates": {"dates": ["2025-12-25"], "isBlocked": true}, "response": "Done! Dec 25 is blocked."}
{"blockUpdates": {"dates": ["2025-12-25"], "isBlocked": false}, "response": "Dec 25 is available again!"}

=== PORTFOLIO ===
When vendor shares a photo AND says "add to portfolio":
{"addToPortfolio": true, "response": "Added to your portfolio!"}

=== CHAT/GENERAL ===
For general questions: {"response": "your helpful answer"}

REMEMBER:
- DETECT booking inquiries (pasted emails/messages) and draft professional responses with pricing!
- You CAN do everything - bookings, contracts, emails, images, search!
- Parse dates like "Dec 20" to "2025-12-20" or "2026-12-20" based on context
- Convert times like "2pm" to "14:00"
- Convert dollar amounts to cents for contracts
- Be proactive and helpful - complete the task!
- ALWAYS respond with valid JSON`;

interface ParsedResponse {
  response: string;
  blockUpdates?: {
    dates: string[];
    isBlocked: boolean;
  };
  availabilityUpdates?: {
    dates: string[];
    isAvailable: boolean;
  };
  addToPortfolio?: boolean;
  createBooking?: {
    clientName: string;
    date: string;
    time?: string;
    location?: string;
    serviceType?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  createContract?: {
    clientName: string;
    bookingId?: string;
    packageDetails: string;
    totalAmount: number;
    depositAmount?: number;
  };
  sendThankYou?: {
    recipientName: string;
    recipientEmail: string;
    message: string;
    occasion?: string;
  };
  generateImage?: {
    prompt: string;
    style?: string;
  };
  searchQuery?: {
    type: "clients" | "bookings" | "contracts";
    query: string;
  };
  inquiryResponse?: {
    detected: boolean;
    clientName?: string;
    eventDate?: string;
    eventType?: string;
    inquiryType?: "planner" | "direct_client" | "referral";
    requestedServices?: string[];
    partySize?: number;
    location?: string;
  };
}

export async function processAIChatMessage(
  userId: string,
  message: string,
  attachments: { mimeType: string; data: string }[]
): Promise<ParsedResponse> {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const cdiContext = await getCDIContext(userId);
    const cdiToneModifier = getCDIAwareTone(cdiContext);

    // Fetch artist profile for pricing sheet context
    const artistProfile = await storage.getArtistProfile(userId);
    const pricingSheetContext = artistProfile?.infoSheetContent && artistProfile?.infoSheetEnabled
      ? `\n\n=== YOUR PRICING SHEET (include this in inquiry responses) ===\n${artistProfile.infoSheetContent}\n=== END PRICING SHEET ===`
      : '';

    // Check for potential dates in the message to check availability
    const potentialDates = message.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/gi) || [];
    let availabilityContext = '';
    
    if (potentialDates.length > 0) {
      const blockedDates = await storage.getAvailability(userId);
      const blockedDateStrings = blockedDates
        .filter(a => !a.isAvailable)
        .map(a => a.date.toISOString().split('T')[0]);
      
      if (blockedDateStrings.length > 0) {
        availabilityContext = `\n\nBLOCKED DATES (you are NOT available on these): ${blockedDateStrings.join(', ')}`;
      } else {
        availabilityContext = '\n\nAVAILABILITY: You have no blocked dates - you are available!';
      }
    }

    // Load conversation history for context
    const chatHistory = await storage.getAiChatMessages(userId, 20);
    
    // Extract working memory from recent messages (names, emails, etc.)
    const workingMemory = extractWorkingMemory(chatHistory);
    
    // Note: User message is saved in routes.ts before calling this function
    // to avoid duplicate entries

    // Build conversation context from history
    const historyContext = chatHistory.length > 0 
      ? `\n\nRECENT CONVERSATION HISTORY (remember this context):\n${chatHistory.slice(-10).map(m => 
          `${m.role === 'user' ? 'User' : 'You'}: ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}`
        ).join('\n')}`
      : '';

    // Build working memory context
    const memoryContext = workingMemory.names.length > 0 || workingMemory.emails.length > 0
      ? `\n\nWORKING MEMORY (entities mentioned in this conversation):
${workingMemory.names.length > 0 ? `- Names: ${workingMemory.names.join(', ')}` : ''}
${workingMemory.emails.length > 0 ? `- Emails: ${workingMemory.emails.join(', ')}` : ''}
${workingMemory.phones.length > 0 ? `- Phones: ${workingMemory.phones.join(', ')}` : ''}
${workingMemory.dates.length > 0 ? `- Dates: ${workingMemory.dates.join(', ')}` : ''}
${workingMemory.locations.length > 0 ? `- Locations: ${workingMemory.locations.join(', ')}` : ''}
Use these entities when the user refers to "them", "her", "that email", etc. without repeating!`
      : '';

    const contextMessage = `Current date: ${currentDate.toISOString().split("T")[0]}. Year: ${currentYear}. User ID: ${userId}.${historyContext}${memoryContext}${pricingSheetContext}${availabilityContext}
    
User message: ${message}`;

    const contentParts: any[] = [{ text: contextMessage }];

    for (const att of attachments) {
      contentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data,
        },
      });
      contentParts.push({
        text: "\n(User attached an image - comment on it or add to portfolio if asked)",
      });
    }

    const enhancedSystemPrompt = SYSTEM_PROMPT + cdiToneModifier;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: enhancedSystemPrompt }] },
        {
          role: "model",
          parts: [
            {
              text: 'I understand. I\'m Beauvette\'s full-featured AI assistant. I can create bookings, contracts, send thank you emails, generate images, search your data, manage availability, and update your portfolio. Just tell me what you need!',
            },
          ],
        },
        { role: "user", parts: contentParts },
      ],
      config: {
        maxOutputTokens: 2048,
      },
    });

    const responseText = response.text || "";
    console.log("[AI] Raw response:", responseText);

    // Extract entities from the user message for storage
    const userEntities = extractEntitiesFromText(message);

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ParsedResponse;

        if (parsed.blockUpdates?.dates) {
          const today = new Date();
          const validDates = parsed.blockUpdates.dates.filter((d) => {
            const date = new Date(d);
            return !isNaN(date.getTime()) && date >= today;
          });
          if (validDates.length > 0) {
            parsed.blockUpdates.dates = validDates;
            parsed.availabilityUpdates = {
              dates: validDates,
              isAvailable: !parsed.blockUpdates.isBlocked,
            };
          } else {
            delete parsed.blockUpdates;
          }
        }

        if (parsed.availabilityUpdates?.dates && !parsed.blockUpdates) {
          const today = new Date();
          const validDates = parsed.availabilityUpdates.dates.filter((d) => {
            const date = new Date(d);
            return !isNaN(date.getTime()) && date >= today;
          });
          if (validDates.length > 0) {
            parsed.availabilityUpdates.dates = validDates;
          } else {
            delete parsed.availabilityUpdates;
          }
        }

        // Determine action taken for tracking
        let actionTaken: string | undefined;
        if (parsed.inquiryResponse?.detected) actionTaken = 'inquiry_response';
        else if (parsed.createBooking) actionTaken = 'create_booking';
        else if (parsed.createContract) actionTaken = 'create_contract';
        else if (parsed.sendThankYou) actionTaken = 'send_thank_you';
        else if (parsed.generateImage) actionTaken = 'generate_image';
        else if (parsed.searchQuery) actionTaken = 'search';
        else if (parsed.blockUpdates || parsed.availabilityUpdates) actionTaken = 'update_availability';
        else if (parsed.addToPortfolio) actionTaken = 'add_to_portfolio';

        // Save assistant response to history AFTER processing
        await storage.createAiChatMessage({
          userId,
          role: "assistant",
          content: parsed.response || responseText,
          extractedEntities: userEntities,
          actionTaken,
        });

        return parsed;
      }
    } catch (parseErr) {
      console.log("[AI] Response not in JSON format, using as plain text");
    }

    // Save plain text response
    await storage.createAiChatMessage({
      userId,
      role: "assistant",
      content: responseText,
      extractedEntities: userEntities,
    });

    return { response: responseText };
  } catch (error) {
    console.error("AI Chat error:", error);
    return {
      response: "I'm having trouble processing that right now. Please try again in a moment.",
    };
  }
}

// Helper to parse date strings as local time to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // Add noon time to avoid timezone day-shift issues
  return new Date(dateStr + 'T12:00:00');
}

export async function updateAvailabilityFromAI(
  userId: string,
  dates: string[],
  isAvailable: boolean
): Promise<void> {
  for (const dateStr of dates) {
    try {
      // Use start-of-day for availability to match storage delete/set logic
      const date = new Date(dateStr + 'T00:00:00');
      if (isAvailable) {
        await storage.deleteAvailability(userId, date);
      } else {
        await storage.setAvailability({
          userId,
          date,
          isAvailable: false,
          notes: "Blocked via AI assistant",
        });
      }
    } catch (err) {
      console.error(`Failed to update availability for ${dateStr}:`, err);
    }
  }
}

export async function createBookingFromAI(
  artistId: string,
  booking: {
    clientName: string;
    date: string;
    time?: string;
    location?: string;
    serviceType?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    let eventDate = parseLocalDate(booking.date);

    if (booking.time) {
      const [hours, minutes] = booking.time.split(":").map(Number);
      eventDate.setHours(hours || 0, minutes || 0, 0, 0);
    }

    const formatTime = (t: string) => {
      const match = t.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return t;
      const hour = parseInt(match[1]);
      const min = match[2];
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${hour12}:${min} ${ampm}`;
    };

    const notesText = [
      booking.clientName,
      booking.email ? `Email: ${booking.email}` : "",
      booking.phone ? `Phone: ${booking.phone}` : "",
      booking.time ? `Time: ${formatTime(booking.time)}` : "",
      booking.notes || "",
    ]
      .filter(Boolean)
      .join(" | ");

    const newBooking = await storage.createBooking({
      artistId,
      clientId: null,
      status: "confirmed",
      eventDate,
      location: booking.location || "",
      serviceType: booking.serviceType || "Hair and Makeup",
      notes: notesText,
    });

    console.log(`[AI] Created booking for ${booking.clientName} on ${booking.date}`, newBooking.id);

    return { success: true, bookingId: newBooking.id };
  } catch (err: any) {
    console.error("[AI] Failed to create booking:", err);
    return { success: false, error: err.message };
  }
}

export async function createContractFromAI(
  artistId: string,
  contract: {
    clientName: string;
    clientEmail?: string;
    bookingId?: string;
    packageDetails: string;
    totalAmount: number;
    depositAmount?: number;
    eventDate?: string;
    location?: string;
  }
): Promise<{ success: boolean; contractId?: string; error?: string }> {
  try {
    let bookingId = contract.bookingId;
    let clientId: string | undefined;

    if (!bookingId) {
      const bookings = await storage.getBookingsByArtist(artistId);
      const matchingBooking = bookings.find(
        (b) =>
          b.notes?.toLowerCase().includes(contract.clientName.toLowerCase()) ||
          b.status === "confirmed"
      );
      if (matchingBooking) {
        bookingId = matchingBooking.id;
        clientId = matchingBooking.clientId || undefined;
      }
    }

    if (!bookingId) {
      // Use provided eventDate or default to 1 month from now
      let eventDate = new Date();
      if (contract.eventDate) {
        const parsedDate = new Date(contract.eventDate);
        if (!isNaN(parsedDate.getTime())) {
          eventDate = parsedDate;
        }
      } else {
        eventDate.setMonth(eventDate.getMonth() + 1);
      }
      
      const newBooking = await storage.createBooking({
        artistId,
        clientId: null,
        status: "confirmed",
        eventDate,
        location: contract.location || "TBD",
        serviceType: "Custom Package",
        notes: `Contract for ${contract.clientName}${contract.clientEmail ? ` | Email: ${contract.clientEmail}` : ''}`,
      });
      bookingId = newBooking.id;
    }

    const newContract = await storage.createContract({
      bookingId,
      artistId,
      clientId: clientId || artistId,
      packageDetails: contract.packageDetails,
      totalAmount: contract.totalAmount,
      depositAmount: contract.depositAmount || Math.round(contract.totalAmount * 0.5),
      status: "draft",
    });

    console.log(`[AI] Created contract for ${contract.clientName}`, newContract.id);

    // Log the communication (amounts stored as cents in DB)
    const depositAmountCents = contract.depositAmount || Math.round(contract.totalAmount * 0.5);
    await storage.createCommunicationLog({
      artistId,
      recipientName: contract.clientName,
      recipientEmail: contract.clientEmail || undefined,
      communicationType: "contract",
      subject: `Contract - ${contract.packageDetails.substring(0, 50)}`,
      content: `Package: ${contract.packageDetails}\nTotal: $${(contract.totalAmount / 100).toFixed(2)}\nDeposit: $${(depositAmountCents / 100).toFixed(2)}`,
      metadata: { 
        contractId: newContract.id, 
        bookingId, 
        totalAmountCents: contract.totalAmount, 
        depositAmountCents,
        eventDate: contract.eventDate,
        location: contract.location
      },
      status: "draft",
      sentVia: "ai_chat",
    });

    return { success: true, contractId: newContract.id };
  } catch (err: any) {
    console.error("[AI] Failed to create contract:", err);
    return { success: false, error: err.message };
  }
}

export async function sendThankYouEmailFromAI(
  artistId: string,
  email: {
    recipientName: string;
    recipientEmail: string;
    message: string;
    occasion?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client: resend, fromEmail } = await getResendClient();

    const artist = await storage.getUser(artistId);
    const artistProfile = await storage.getArtistProfile(artistId);
    const senderName = artistProfile?.businessName || artist?.firstName || "Beauvette Artist";

    const htmlContent = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #FAF7F2 0%, #F5F1E8 100%);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6B4A55; font-size: 28px; margin: 0; font-weight: normal;">Beauvette</h1>
          <p style="color: #8B7355; font-size: 12px; letter-spacing: 2px; margin-top: 5px;">FOR LIFE'S MOST IMPORTANT DAYS</p>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(107, 74, 85, 0.1);">
          <h2 style="color: #6B4A55; font-size: 22px; margin-bottom: 20px;">Dear ${email.recipientName},</h2>
          
          <p style="color: #333; line-height: 1.8; font-size: 16px; white-space: pre-wrap;">${email.message}</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E8E4DE;">
            <p style="color: #6B4A55; margin: 0;">With gratitude,</p>
            <p style="color: #333; font-weight: 600; margin: 5px 0;">${senderName}</p>
          </div>
        </div>
        
        <p style="text-align: center; color: #8B7355; font-size: 12px; margin-top: 30px;">
          Sent with love via Beauvette
        </p>
      </div>
    `;

    const emailSubject = `Thank You${email.occasion ? ` - ${email.occasion}` : ""} from ${senderName}`;
    
    await resend.emails.send({
      from: fromEmail || "Beauvette <no-reply@beauvette.com>",
      to: email.recipientEmail,
      subject: emailSubject,
      html: htmlContent,
    });

    console.log(`[AI] Sent thank you email to ${email.recipientEmail}`);

    // Log the communication
    await storage.createCommunicationLog({
      artistId,
      recipientName: email.recipientName,
      recipientEmail: email.recipientEmail,
      communicationType: "thank_you_email",
      subject: emailSubject,
      content: email.message,
      metadata: { occasion: email.occasion, senderName },
      status: "sent",
      sentVia: "ai_chat",
    });

    return { success: true };
  } catch (err: any) {
    console.error("[AI] Failed to send thank you email:", err);
    return { success: false, error: err.message };
  }
}

export async function generateImageFromAI(
  prompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const enhancedPrompt = `Professional beauty/wedding photography style: ${prompt}. High quality, elegant, soft natural lighting, luxurious aesthetic.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((part: any) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data in response");
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;

    console.log("[AI] Generated image successfully");

    return { success: true, imageUrl };
  } catch (err: any) {
    console.error("[AI] Failed to generate image:", err);
    return { success: false, error: err.message };
  }
}

export async function searchFromAI(
  artistId: string,
  searchType: "clients" | "bookings" | "contracts",
  query: string
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const queryLower = query.toLowerCase();
    let results: any[] = [];

    switch (searchType) {
      case "clients": {
        const contacts = await storage.getClientContactsByArtist(artistId);
        results = contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(queryLower) ||
            c.email.toLowerCase().includes(queryLower) ||
            c.phone?.toLowerCase().includes(queryLower)
        );
        break;
      }
      case "bookings": {
        const bookings = await storage.getBookingsByArtist(artistId);
        results = bookings.filter(
          (b) =>
            b.notes?.toLowerCase().includes(queryLower) ||
            b.location?.toLowerCase().includes(queryLower) ||
            b.serviceType?.toLowerCase().includes(queryLower)
        );
        break;
      }
      case "contracts": {
        const contracts = await storage.getContractsByArtist(artistId);
        results = contracts.filter((c) => c.packageDetails?.toLowerCase().includes(queryLower));
        break;
      }
    }

    console.log(`[AI] Search for "${query}" in ${searchType}: found ${results.length} results`);

    return { success: true, results };
  } catch (err: any) {
    console.error("[AI] Search failed:", err);
    return { success: false, error: err.message };
  }
}

export async function forwardCommunicationToArtist(
  artistId: string,
  logId: string,
  artistEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const log = await storage.getCommunicationLog(logId);
    if (!log) {
      return { success: false, error: "Communication log not found" };
    }

    if (log.artistId !== artistId) {
      return { success: false, error: "Not authorized" };
    }

    const { client: resend, fromEmail } = await getResendClient();
    const artistProfile = await storage.getArtistProfile(artistId);
    const artist = await storage.getUser(artistId);
    const senderName = artistProfile?.businessName || artist?.firstName || "Beauvette";

    const formattedDate = log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }) : 'Unknown date';

    const htmlContent = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #FAF7F2 0%, #F5F1E8 100%);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6B4A55; font-size: 28px; margin: 0; font-weight: normal;">Beauvette</h1>
          <p style="color: #8B7355; font-size: 12px; letter-spacing: 2px; margin-top: 5px;">COMMUNICATION RECORD</p>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(107, 74, 85, 0.1);">
          <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #E8E4DE;">
            <p style="color: #8B7355; margin: 0; font-size: 12px; text-transform: uppercase;">Type</p>
            <p style="color: #333; margin: 5px 0 0; font-size: 16px;">${log.communicationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
          
          <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #E8E4DE;">
            <p style="color: #8B7355; margin: 0; font-size: 12px; text-transform: uppercase;">Sent To</p>
            <p style="color: #333; margin: 5px 0 0; font-size: 16px;">${log.recipientName}${log.recipientEmail ? ` (${log.recipientEmail})` : ''}</p>
          </div>
          
          <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #E8E4DE;">
            <p style="color: #8B7355; margin: 0; font-size: 12px; text-transform: uppercase;">Date Sent</p>
            <p style="color: #333; margin: 5px 0 0; font-size: 16px;">${formattedDate}</p>
          </div>
          
          <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #E8E4DE;">
            <p style="color: #8B7355; margin: 0; font-size: 12px; text-transform: uppercase;">Subject</p>
            <p style="color: #333; margin: 5px 0 0; font-size: 16px;">${log.subject || 'N/A'}</p>
          </div>
          
          <div>
            <p style="color: #8B7355; margin: 0; font-size: 12px; text-transform: uppercase;">Content</p>
            <div style="color: #333; margin-top: 10px; padding: 15px; background: #F8F6F3; border-radius: 4px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${log.content}</div>
          </div>
        </div>
        
        <p style="text-align: center; color: #8B7355; font-size: 12px; margin-top: 30px;">
          This is your copy of a communication sent via Beauvette
        </p>
      </div>
    `;

    await resend.emails.send({
      from: fromEmail || "Beauvette <no-reply@beauvette.com>",
      to: artistEmail,
      subject: `[Copy] ${log.subject || log.communicationType} - Sent to ${log.recipientName}`,
      html: htmlContent,
    });

    console.log(`[AI] Forwarded communication log ${logId} to ${artistEmail}`);

    // Log the forward action as a new communication record
    await storage.createCommunicationLog({
      artistId,
      recipientName: "Self",
      recipientEmail: artistEmail,
      communicationType: "forward_copy",
      subject: `[Forwarded Copy] ${log.subject || log.communicationType}`,
      content: `Forwarded copy of communication originally sent to ${log.recipientName}`,
      metadata: { originalLogId: logId, originalRecipient: log.recipientName, originalType: log.communicationType },
      status: "sent",
      sentVia: "forward_request",
    });

    return { success: true };
  } catch (err: any) {
    console.error("[AI] Failed to forward communication:", err);
    return { success: false, error: err.message };
  }
}

// AI Secretary - responds to client messages on behalf of vendor
const CLIENT_RESPONSE_PROMPT = `You are the AI secretary for a professional beauty artist. A client has sent a message, and you need to respond professionally on behalf of the artist.

CONTEXT:
- Vendor Name: {vendorName}
- Client Name: {clientName}
- Event Date: {eventDate}
- Service: {serviceType}
- Pricing Sheet: {pricingSheet}

CLIENT'S MESSAGE:
{clientMessage}

RESPONSE GUIDELINES:
1. Be warm, professional, and helpful
2. If client confirms a booking/pricing, respond with enthusiasm and mention you'll send contract and deposit link
3. If client asks a question, answer based on the pricing sheet or provide helpful info
4. Keep responses conversational but professional (2-4 sentences)
5. Sign off with the vendor's name

BOOKING CONFIRMATION SIGNALS:
- Client confirms number of people and pricing
- Client mentions "book" or "deposit"
- Client asks about next steps
- Client agrees to pricing

For booking confirmations, respond like:
"That's perfect! I'll send over the contract and deposit link right now. Please let me know your ready time for the wedding day so I can prepare the schedule!"

RESPOND WITH JSON:
{
  "response": "your response text here",
  "isBookingConfirmation": true/false,
  "shouldSendContract": true/false,
  "extractedDetails": {
    "partySize": number or null,
    "totalAmount": number in cents or null,
    "depositAmount": number in cents or null,
    "readyTime": string or null
  }
}`;

export interface ClientResponseResult {
  response: string;
  isBookingConfirmation: boolean;
  shouldSendContract: boolean;
  extractedDetails?: {
    partySize?: number;
    totalAmount?: number;
    depositAmount?: number;
    readyTime?: string;
  };
}

export async function generateClientResponse(
  vendorId: string,
  clientMessage: string,
  context: {
    clientName: string;
    clientEmail: string;
    eventDate?: string;
    serviceType?: string;
  }
): Promise<ClientResponseResult> {
  try {
    const vendor = await storage.getUser(vendorId);
    const artistProfile = await storage.getArtistProfile(vendorId);
    
    const vendorName = artistProfile?.businessName || vendor?.firstName || 'Your Beauty Artist';
    const pricingSheet = artistProfile?.infoSheetContent || 'Standard wedding pricing applies.';
    
    const prompt = CLIENT_RESPONSE_PROMPT
      .replace('{vendorName}', vendorName)
      .replace('{clientName}', context.clientName)
      .replace('{eventDate}', context.eventDate || 'TBD')
      .replace('{serviceType}', context.serviceType || 'Beauty Services')
      .replace('{pricingSheet}', pricingSheet)
      .replace('{clientMessage}', clientMessage);
    
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });
    
    const responseText = result.text || '';
    
    // Try to parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          response: parsed.response || "Thank you for your message! I'll get back to you shortly.",
          isBookingConfirmation: parsed.isBookingConfirmation || false,
          shouldSendContract: parsed.shouldSendContract || false,
          extractedDetails: parsed.extractedDetails || {},
        };
      } catch {
        // If JSON parse fails, use the text directly
        return {
          response: responseText.replace(/```json|```/g, '').trim() || "Thank you for your message!",
          isBookingConfirmation: false,
          shouldSendContract: false,
        };
      }
    }
    
    return {
      response: "Thank you for your message! I've received it and will follow up shortly.",
      isBookingConfirmation: false,
      shouldSendContract: false,
    };
  } catch (err: any) {
    console.error("[AI Secretary] Error generating response:", err);
    return {
      response: "Thank you for your message! I'll review it and get back to you soon.",
      isBookingConfirmation: false,
      shouldSendContract: false,
    };
  }
}
