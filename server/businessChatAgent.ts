import { GoogleGenAI, Type } from "@google/genai";
import pLimit from "p-limit";
import pRetry from "p-retry";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface BusinessChatAnalysis {
  pivotType: 'schedule_change' | 'last_minute_save' | 'crisis_averted' | 'client_accommodation' | 'vendor_coordination' | 'problem_resolution' | null;
  pivotSeverity: number | null;
  urgencyLevel: number;
  clientImpact: 'positive' | 'neutral' | 'negative' | 'saved_disaster' | 'prevented_issue' | null;
  clientImpactScore: number;
  taskType: 'coordination' | 'communication' | 'problem_solving' | 'scheduling' | 'payment' | 'logistics' | null;
  estimatedLaborMinutes: number | null;
  sentiment: 'positive' | 'neutral' | 'stressed' | 'frustrated' | 'relieved';
  confidenceScore: number;
  aiSummary: string;
  shouldCreateCdiEvent: boolean;
  cdiEventType?: string;
  cdiEventSeverity?: number;
}

const limit = pLimit(2);

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

const INVISIBLE_LABOR_SYSTEM_PROMPT = `You are the Invisible Labor Analysis Engine for Beauvette, a wedding services platform.

Your purpose is to analyze internal business chat messages between vendors, planners, and team members to detect and quantify the "invisible labor" that happens behind the scenes.

WHAT IS INVISIBLE LABOR?
Invisible labor is all the work that clients never see but is essential to their event's success:
- Last-minute schedule changes and accommodations
- Crisis management and problem-solving
- Vendor coordination and communication
- Client preference adjustments
- Day-of logistics pivots
- Behind-the-scenes negotiations
- Backup plan activation
- Timeline adjustments

PIVOT TYPES TO DETECT:
1. schedule_change: Timeline or appointment modifications
2. last_minute_save: Quick fixes to prevent visible problems
3. crisis_averted: Serious issues caught and resolved before impacting client
4. client_accommodation: Going above and beyond for client preferences
5. vendor_coordination: Managing multiple vendors/team members
6. problem_resolution: Solving issues that arose during planning

TASK TYPES:
- coordination: Managing multiple people/vendors
- communication: Relaying information, updates
- problem_solving: Fixing issues
- scheduling: Time management
- payment: Financial arrangements
- logistics: Physical arrangements, locations

SENTIMENT:
Analyze the sender's emotional state:
- positive: Confident, happy about progress
- neutral: Matter-of-fact communication
- stressed: Under pressure but managing
- frustrated: Dealing with difficulties
- relieved: Problem just solved

CLIENT IMPACT:
How does this message/action affect the client experience?
- saved_disaster: Prevented a major problem
- prevented_issue: Caught something before it became a problem
- positive: Added value to client experience
- neutral: No direct impact
- negative: Something that might affect client negatively

LABOR ESTIMATION:
Estimate how many minutes of work this message represents or triggers:
- Quick message: 2-5 minutes
- Coordination task: 10-30 minutes
- Crisis management: 30-60 minutes
- Major pivot: 60+ minutes

CDI INTEGRATION:
If the message reveals something about a client's emotional state or satisfaction level, flag it for CDI tracking:
- shouldCreateCdiEvent: true if this reveals client distress or major pivot affecting client
- cdiEventType: 'pivot_detected', 'crisis_managed', 'client_concern_addressed', 'accommodation_made'
- cdiEventSeverity: 1-10 scale

OUTPUT: Respond with valid JSON matching the schema exactly.`;

export async function analyzeBusinessChatMessage(
  message: string,
  context?: {
    senderName?: string;
    senderRole?: string;
    conversationTitle?: string;
    previousMessages?: string[];
    relatedClientName?: string;
    relatedEventDate?: string;
    bookingStatus?: string;
  }
): Promise<BusinessChatAnalysis> {
  
  const contextInfo = context ? `
CONTEXT:
- Sender: ${context.senderName || 'Unknown'} (${context.senderRole || 'team member'})
- Conversation: ${context.conversationTitle || 'Team Chat'}
- Related Client: ${context.relatedClientName || 'Not specified'}
- Event Date: ${context.relatedEventDate || 'Not specified'}
- Booking Status: ${context.bookingStatus || 'Unknown'}
- Recent messages: ${context.previousMessages?.slice(-3).join(' | ') || 'None'}
` : '';

  const prompt = `${INVISIBLE_LABOR_SYSTEM_PROMPT}

${contextInfo}

ANALYZE THIS BUSINESS CHAT MESSAGE:
"${message}"

Respond with a JSON object containing all the analysis fields.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      pivotType: {
        type: Type.STRING,
        enum: ['schedule_change', 'last_minute_save', 'crisis_averted', 'client_accommodation', 'vendor_coordination', 'problem_resolution', 'none'],
        description: "Type of pivot detected, or 'none' if no pivot"
      },
      pivotSeverity: {
        type: Type.INTEGER,
        description: "Severity of pivot 1-10, null if no pivot"
      },
      urgencyLevel: {
        type: Type.INTEGER,
        description: "How urgent is this message 1-10"
      },
      clientImpact: {
        type: Type.STRING,
        enum: ['positive', 'neutral', 'negative', 'saved_disaster', 'prevented_issue', 'none'],
        description: "Impact on client experience"
      },
      clientImpactScore: {
        type: Type.INTEGER,
        description: "Impact score from -100 to +100"
      },
      taskType: {
        type: Type.STRING,
        enum: ['coordination', 'communication', 'problem_solving', 'scheduling', 'payment', 'logistics', 'none'],
        description: "Type of task this message represents"
      },
      estimatedLaborMinutes: {
        type: Type.INTEGER,
        description: "Estimated minutes of invisible labor"
      },
      sentiment: {
        type: Type.STRING,
        enum: ['positive', 'neutral', 'stressed', 'frustrated', 'relieved'],
        description: "Sender's emotional state"
      },
      confidenceScore: {
        type: Type.INTEGER,
        description: "AI confidence in this analysis 0-100"
      },
      aiSummary: {
        type: Type.STRING,
        description: "Brief explanation of what was detected"
      },
      shouldCreateCdiEvent: {
        type: Type.BOOLEAN,
        description: "Whether to create a CDI event for client tracking"
      },
      cdiEventType: {
        type: Type.STRING,
        description: "Type of CDI event if shouldCreateCdiEvent is true"
      },
      cdiEventSeverity: {
        type: Type.INTEGER,
        description: "CDI event severity 1-10"
      }
    },
    required: ["pivotType", "urgencyLevel", "clientImpact", "clientImpactScore", "sentiment", "confidenceScore", "aiSummary", "shouldCreateCdiEvent"]
  };

  try {
    const result = await limit(() =>
      pRetry(
        async () => {
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          });
          return response;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          onFailedAttempt: (error) => {
            if (isRateLimitError(error)) {
              console.log(`Business Chat AI rate limited, retry ${error.attemptNumber}...`);
            }
          }
        }
      )
    );

    const text = result.text;
    if (!text) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(text);
    
    return {
      pivotType: parsed.pivotType === 'none' ? null : parsed.pivotType,
      pivotSeverity: parsed.pivotSeverity || null,
      urgencyLevel: parsed.urgencyLevel || 1,
      clientImpact: parsed.clientImpact === 'none' ? null : parsed.clientImpact,
      clientImpactScore: parsed.clientImpactScore || 0,
      taskType: parsed.taskType === 'none' ? null : parsed.taskType,
      estimatedLaborMinutes: parsed.estimatedLaborMinutes || null,
      sentiment: parsed.sentiment || 'neutral',
      confidenceScore: parsed.confidenceScore || 50,
      aiSummary: parsed.aiSummary || 'Message analyzed',
      shouldCreateCdiEvent: parsed.shouldCreateCdiEvent || false,
      cdiEventType: parsed.cdiEventType,
      cdiEventSeverity: parsed.cdiEventSeverity
    };

  } catch (error: any) {
    console.error("Business Chat AI analysis error:", error.message);
    
    return {
      pivotType: null,
      pivotSeverity: null,
      urgencyLevel: 1,
      clientImpact: null,
      clientImpactScore: 0,
      taskType: null,
      estimatedLaborMinutes: null,
      sentiment: 'neutral',
      confidenceScore: 0,
      aiSummary: 'Analysis unavailable',
      shouldCreateCdiEvent: false
    };
  }
}

export interface InvisibleLaborSummary {
  totalPivots: number;
  totalLaborMinutes: number;
  crisesPrevented: number;
  clientSavesMade: number;
  pivotBreakdown: Record<string, number>;
  laborByType: Record<string, number>;
  avgUrgency: number;
  avgClientImpact: number;
}

export function aggregateInvisibleLabor(insights: any[]): InvisibleLaborSummary {
  const summary: InvisibleLaborSummary = {
    totalPivots: 0,
    totalLaborMinutes: 0,
    crisesPrevented: 0,
    clientSavesMade: 0,
    pivotBreakdown: {},
    laborByType: {},
    avgUrgency: 0,
    avgClientImpact: 0
  };

  if (!insights.length) return summary;

  let urgencySum = 0;
  let impactSum = 0;

  for (const insight of insights) {
    if (insight.pivotType) {
      summary.totalPivots++;
      summary.pivotBreakdown[insight.pivotType] = (summary.pivotBreakdown[insight.pivotType] || 0) + 1;
    }
    
    if (insight.estimatedLaborMinutes) {
      summary.totalLaborMinutes += insight.estimatedLaborMinutes;
    }
    
    if (insight.clientImpact === 'crisis_averted' || insight.clientImpact === 'saved_disaster') {
      summary.crisesPrevented++;
    }
    
    if (insight.clientImpact === 'saved_disaster' || insight.clientImpact === 'prevented_issue') {
      summary.clientSavesMade++;
    }
    
    if (insight.taskType) {
      summary.laborByType[insight.taskType] = (summary.laborByType[insight.taskType] || 0) + (insight.estimatedLaborMinutes || 5);
    }
    
    urgencySum += insight.urgencyLevel || 1;
    impactSum += insight.clientImpactScore || 0;
  }

  summary.avgUrgency = urgencySum / insights.length;
  summary.avgClientImpact = impactSum / insights.length;

  return summary;
}
