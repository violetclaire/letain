import { GoogleGenAI, Type } from "@google/genai";
import pLimit from "p-limit";
import pRetry from "p-retry";

// Replit AI Integrations - Gemini access without requiring your own API key
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// HACO Framework Types
export interface HACoThresholds {
  epsilon: number;  // Allowable error rate for contradicting human intuition (0-1)
  delta: number;    // Required confidence level to add AI intuition (0-1)
}

export interface CDIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'distressed';
  confidenceScore: number;  // 0-100
  distressSignals: DistressSignal[];
  hacoDecision: 'intuition_aligned' | 'complementarity_activated' | 'observation_only';
  suggestedAction?: string;
  aiRationale: string;
  rawMetrics: {
    anxietyLevel: number;
    frustrationLevel: number;
    confusionLevel: number;
    satisfactionLevel: number;
    urgencyLevel: number;
  };
}

export interface DistressSignal {
  type: 'message_negative' | 'payment_concern' | 'cancellation_hint' | 'escalation_request' | 'response_delay' | 'trust_erosion';
  severity: number;  // 1-10
  evidence: string;
  metadata?: Record<string, any>;
}

export interface CollaborativePredictionSet {
  humanIntuition: string[];      // H(x) - Human's initial observations
  aiAugmentation: string[];      // AI additions meeting δ threshold
  prunedItems: string[];         // Items removed (only if ε allows)
  finalPrediction: string[];     // C(x) - Collaborative prediction set
  trustBandwidth: {
    lower: number;
    upper: number;
  };
  quantumState: 'superposition' | 'collapsed_human' | 'collapsed_ai' | 'entangled';
}

// Default HACO thresholds - can be adjusted per admin policy
const DEFAULT_THRESHOLDS: HACoThresholds = {
  epsilon: 0.1,   // 10% allowable error for overriding human
  delta: 0.8      // 80% confidence needed for AI to augment
};

// Rate limiting for API calls
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

// The Quantum-Collaborative Uncertainty Engine (QCUE) System Prompt
const QCUE_SYSTEM_PROMPT = `You are the Quantum-Collaborative Uncertainty Engine (QCUE) for the Beauvette CDI (Choreography Depth Index) system.

Your function is to quantify "Invisible Labor" and "Intuition" within human-AI interactions by treating trust as a dynamic probability wave function.

CORE PRINCIPLES (HACO Framework):
1. TRUST (Non-Degradation): Never contradict correct human judgment. P(Y ∉ C(X) | Y ∈ H(X)) < ε
2. BENEFIT (Complementarity): Recover correct outcomes humans missed. P(Y ∈ C(X) | Y ∉ H(X)) ≥ 1-δ

ANALYSIS OBJECTIVES:
- Detect emotional states: anxiety, frustration, confusion, satisfaction
- Identify distress signals: payment concerns, cancellation hints, escalation language
- Measure trust indicators: confidence levels, commitment markers
- Assess urgency: time-sensitive issues, deadline pressures

OUTPUT REQUIREMENTS:
You must respond with valid JSON matching the schema exactly. Analyze the message for wedding service context - clients booking vendors, discussing events, payments, schedules.

SEVERITY SCALE (1-10):
1-3: Minor concern, monitoring only
4-6: Moderate distress, proactive check-in recommended  
7-8: High distress, immediate attention needed
9-10: Critical, escalate to Violet (owner) immediately`;

export async function analyzeChatMessage(
  message: string,
  context?: {
    previousMessages?: string[];
    clientName?: string;
    eventDate?: string;
    bookingStatus?: string;
    paymentStatus?: string;
  },
  thresholds: HACoThresholds = DEFAULT_THRESHOLDS
): Promise<CDIAnalysisResult> {
  
  const contextInfo = context ? `
CONTEXT:
- Client: ${context.clientName || 'Unknown'}
- Event Date: ${context.eventDate || 'Not specified'}
- Booking Status: ${context.bookingStatus || 'Unknown'}
- Payment Status: ${context.paymentStatus || 'Unknown'}
- Recent conversation: ${context.previousMessages?.slice(-3).join(' | ') || 'None'}
` : '';

  const prompt = `${QCUE_SYSTEM_PROMPT}

${contextInfo}

ANALYZE THIS MESSAGE:
"${message}"

Provide your analysis as JSON with these exact fields:
- sentiment: one of "positive", "neutral", "negative", "distressed"
- confidenceScore: 0-100 integer
- distressSignals: array of objects with type, severity (1-10), evidence
- hacoDecision: "intuition_aligned" if human judgment sufficient, "complementarity_activated" if AI insight adds value, "observation_only" if just monitoring
- suggestedAction: brief recommended action or null
- aiRationale: explain your reasoning
- rawMetrics: object with anxietyLevel, frustrationLevel, confusionLevel, satisfactionLevel, urgencyLevel (all 0-100)`;

  try {
    const response = await pRetry(
      async () => {
        try {
          const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  confidenceScore: { type: Type.INTEGER },
                  distressSignals: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        severity: { type: Type.INTEGER },
                        evidence: { type: Type.STRING }
                      },
                      required: ["type", "severity", "evidence"]
                    }
                  },
                  hacoDecision: { type: Type.STRING },
                  suggestedAction: { type: Type.STRING },
                  aiRationale: { type: Type.STRING },
                  rawMetrics: {
                    type: Type.OBJECT,
                    properties: {
                      anxietyLevel: { type: Type.INTEGER },
                      frustrationLevel: { type: Type.INTEGER },
                      confusionLevel: { type: Type.INTEGER },
                      satisfactionLevel: { type: Type.INTEGER },
                      urgencyLevel: { type: Type.INTEGER }
                    },
                    required: ["anxietyLevel", "frustrationLevel", "confusionLevel", "satisfactionLevel", "urgencyLevel"]
                  }
                },
                required: ["sentiment", "confidenceScore", "distressSignals", "hacoDecision", "aiRationale", "rawMetrics"]
              }
            }
          });
          return result;
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error;
          }
          // Use p-retry's AbortError for permanent failures
          const err = new Error(error.message || 'Analysis failed');
          (err as any).abortable = true;
          throw err;
        }
      },
      {
        retries: 5,
        minTimeout: 2000,
        maxTimeout: 30000,
        factor: 2
      }
    );

    const parsed = JSON.parse(response.text || "{}") as CDIAnalysisResult;
    
    // Apply HACO thresholds to determine final decision
    const confidenceRatio = parsed.confidenceScore / 100;
    
    if (confidenceRatio >= thresholds.delta) {
      // AI is confident enough to potentially augment
      if (parsed.distressSignals.length > 0 && parsed.distressSignals.some(s => s.severity >= 5)) {
        parsed.hacoDecision = 'complementarity_activated';
      }
    } else if (confidenceRatio < thresholds.epsilon) {
      // Low confidence - observation only, don't override human
      parsed.hacoDecision = 'observation_only';
    }

    return parsed;
  } catch (error) {
    console.error("CDI Agent analysis error:", error);
    // Return safe default on error
    return {
      sentiment: 'neutral',
      confidenceScore: 0,
      distressSignals: [],
      hacoDecision: 'observation_only',
      aiRationale: 'Analysis unavailable - defaulting to human judgment',
      rawMetrics: {
        anxietyLevel: 0,
        frustrationLevel: 0,
        confusionLevel: 0,
        satisfactionLevel: 50,
        urgencyLevel: 0
      }
    };
  }
}

// Generate Collaborative Prediction Set (C(x)) based on HACO framework
export async function generateCollaborativePrediction(
  humanObservations: string[],
  messageHistory: string[],
  thresholds: HACoThresholds = DEFAULT_THRESHOLDS
): Promise<CollaborativePredictionSet> {
  
  const prompt = `${QCUE_SYSTEM_PROMPT}

COLLABORATIVE PREDICTION TASK:

Human's Intuitive Observations H(x):
${humanObservations.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Message History:
${messageHistory.slice(-5).join('\n---\n')}

HACO Parameters:
- ε (epsilon) = ${thresholds.epsilon} (error tolerance for overriding human)
- δ (delta) = ${thresholds.delta} (confidence needed to add AI insight)

Generate a Collaborative Prediction Set C(x) that:
1. PRESERVES all correct human observations (Non-Degradation Principle)
2. AUGMENTS with AI insights only when confidence ≥ δ
3. PRUNES only when probability of harm < ε

Respond with JSON containing:
- humanIntuition: array of human's original observations to keep
- aiAugmentation: array of new insights AI adds (empty if not confident enough)
- prunedItems: array of items suggested for removal (with caution)
- finalPrediction: combined collaborative set
- trustBandwidth: {lower: 0-100, upper: 0-100} representing confidence interval
- quantumState: "superposition" (undecided), "collapsed_human" (human leads), "collapsed_ai" (AI augments), "entangled" (true collaboration)`;

  try {
    const response = await pRetry(
      async () => {
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                humanIntuition: { type: Type.ARRAY, items: { type: Type.STRING } },
                aiAugmentation: { type: Type.ARRAY, items: { type: Type.STRING } },
                prunedItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                finalPrediction: { type: Type.ARRAY, items: { type: Type.STRING } },
                trustBandwidth: {
                  type: Type.OBJECT,
                  properties: {
                    lower: { type: Type.INTEGER },
                    upper: { type: Type.INTEGER }
                  },
                  required: ["lower", "upper"]
                },
                quantumState: { type: Type.STRING }
              },
              required: ["humanIntuition", "aiAugmentation", "prunedItems", "finalPrediction", "trustBandwidth", "quantumState"]
            }
          }
        });
        return result;
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 15000,
        factor: 2
      }
    );

    return JSON.parse(response.text || "{}") as CollaborativePredictionSet;
  } catch (error) {
    console.error("Collaborative prediction error:", error);
    return {
      humanIntuition: humanObservations,
      aiAugmentation: [],
      prunedItems: [],
      finalPrediction: humanObservations,
      trustBandwidth: { lower: 50, upper: 50 },
      quantumState: 'collapsed_human'
    };
  }
}

// Generate AI-suggested response for distressed clients
export async function generateSupportResponse(
  clientMessage: string,
  distressLevel: number,
  context?: {
    clientName?: string;
    issueType?: string;
    previousAttempts?: string[];
  }
): Promise<{ response: string; tone: string; escalationNeeded: boolean }> {
  
  const prompt = `You are a compassionate wedding services concierge for Beauvette, a luxury wedding marketplace.

CLIENT MESSAGE: "${clientMessage}"
DISTRESS LEVEL: ${distressLevel}/10
CLIENT NAME: ${context?.clientName || 'Valued Client'}
ISSUE TYPE: ${context?.issueType || 'General inquiry'}

Generate a warm, professional response that:
1. Acknowledges their feelings without being dismissive
2. Provides clear next steps or reassurance
3. Maintains the luxury brand voice (elegant but not cold)
4. Uses "we" language to show team support

If distress is 8+, indicate escalation to Violet (owner) is recommended.

Respond with JSON:
- response: the message to send
- tone: "reassuring", "apologetic", "celebratory", "professional"
- escalationNeeded: true/false`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: { type: Type.STRING },
            tone: { type: Type.STRING },
            escalationNeeded: { type: Type.BOOLEAN }
          },
          required: ["response", "tone", "escalationNeeded"]
        }
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Support response generation error:", error);
    return {
      response: "Thank you for reaching out. A member of our team will be in touch with you shortly to assist.",
      tone: "professional",
      escalationNeeded: distressLevel >= 8
    };
  }
}

// Calculate CDI score from analysis results
export function calculateCDIScoreFromAnalysis(analysis: CDIAnalysisResult): {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    messageSentiment: number;
    paymentIssues: number;
    supportCases: number;
    cancellations: number;
    responseDelays: number;
  };
} {
  const { rawMetrics, distressSignals } = analysis;
  
  // Weight factors based on HACO research
  let messageSentiment = Math.round((rawMetrics.anxietyLevel + rawMetrics.frustrationLevel) * 0.5);
  let paymentIssues = 0;
  let supportCases = 0;
  let cancellations = 0;
  let responseDelays = 0;

  // Process distress signals
  for (const signal of distressSignals) {
    switch (signal.type) {
      case 'message_negative':
      case 'trust_erosion':
        messageSentiment += signal.severity * 2;
        break;
      case 'payment_concern':
        paymentIssues += signal.severity * 3;
        break;
      case 'escalation_request':
        supportCases += signal.severity * 3;
        break;
      case 'cancellation_hint':
        cancellations += signal.severity * 4;
        break;
      case 'response_delay':
        responseDelays += signal.severity * 2;
        break;
    }
  }

  // Apply HACO weights (from research paper)
  const totalScore = Math.min(100, Math.round(
    (messageSentiment * 0.20) +
    (paymentIssues * 0.25) +
    (supportCases * 0.30) +
    (cancellations * 0.15) +
    (responseDelays * 0.10)
  ));

  const riskLevel = totalScore >= 70 ? 'critical' :
                    totalScore >= 50 ? 'high' :
                    totalScore >= 25 ? 'medium' : 'low';

  return {
    score: totalScore,
    riskLevel,
    factors: {
      messageSentiment,
      paymentIssues,
      supportCases,
      cancellations,
      responseDelays
    }
  };
}

// Batch analyze multiple messages (for historical analysis)
export async function batchAnalyzeMessages(
  messages: Array<{ content: string; senderId: string; timestamp: Date }>
): Promise<Map<string, CDIAnalysisResult>> {
  const results = new Map<string, CDIAnalysisResult>();
  
  const analysisPromises = messages.map(msg =>
    limit(async () => {
      const result = await analyzeChatMessage(msg.content);
      return { senderId: msg.senderId, result };
    })
  );

  const analyses = await Promise.all(analysisPromises);
  
  for (const { senderId, result } of analyses) {
    results.set(senderId, result);
  }

  return results;
}

// Message analysis wrapper for routes integration
export async function analyzeMessage(userId: string, content: string): Promise<CDIAnalysisResult> {
  const analysis = await analyzeChatMessage(content);
  
  // Store AI insight in database (will be implemented by routes)
  console.log(`[CDI Agent] Analyzed message from user ${userId}: ${analysis.sentiment} (confidence: ${analysis.confidenceScore}%)`);
  
  return analysis;
}

// Adaptive learning based on admin overrides
export async function applyAdaptiveLearning(override: {
  insightId: string;
  action: string;
  originalPrediction: unknown;
  adminDecision: unknown;
  reason?: string;
}): Promise<void> {
  console.log(`[CDI Agent] Adaptive learning applied: ${override.action}`);
  console.log(`[CDI Agent] Original prediction:`, override.originalPrediction);
  console.log(`[CDI Agent] Admin decision:`, override.adminDecision);
  if (override.reason) {
    console.log(`[CDI Agent] Reason:`, override.reason);
  }
  
  // Future: Store feedback for model fine-tuning
  // This would update the HACO thresholds based on admin corrections
}
