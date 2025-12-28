import { GoogleGenAI, Type } from "@google/genai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { storage } from "./storage";
import type { IqsLeadScore, IqsInteractionEvent, IqsPattern, InsertIqsLeadScore, InsertIqsInteractionEvent } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

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

export interface RedFlagDetection {
  type: string;
  severity: number;
  description: string;
  aiConfidence: number;
}

export interface IQSAnalysisResult {
  overallScore: number;
  riskLevel: 'trustworthy' | 'low_risk' | 'medium_risk' | 'high_risk' | 'critical';
  redFlags: RedFlagDetection[];
  factors: {
    responseTimeScore: number;
    promiseFulfillmentScore: number;
    scopeUrgencyScore: number;
    communicationScore: number;
    verificationScore: number;
  };
  aiSummary: string;
  suggestedAction?: string;
}

export interface InteractionContext {
  clientName?: string;
  eventDate?: string;
  servicesRequested?: string[];
  partySize?: number;
  location?: string;
  budget?: string;
  previousMessages?: string[];
  daysUntilEvent?: number;
  responseDelayHours?: number;
  promisesMade?: Array<{ promise: string; fulfilled: boolean }>;
}

const IQS_SYSTEM_PROMPT = `You are the Interaction Quality Scoring (IQS) AI for a wedding beauty services marketplace.

Your role is to analyze client/lead interactions and detect "red flags" - warning signs that a lead may be problematic, a time-waster, or potentially fraudulent.

RED FLAG PATTERNS TO DETECT:
1. large_scope_short_notice - Many services requested (15+ people) with short timeline (< 3 months)
2. vague_details - Missing critical information like budget, venue, event date specifics
3. delayed_response - Long gaps (3+ days) between messages despite claiming urgency
4. broken_promise - Said they'd call/respond/book by a date but didn't
5. ghosting - Complete silence after active engagement
6. foreign_location_complexity - Foreign destination with complex logistics (multiple locations, customs concerns)
7. payment_hesitation - Avoids or deflects payment/deposit discussions
8. contact_mismatch - Third party (planner) contacting but unclear relationship with actual client
9. already_married - Evidence they already had their event (social media, dates don't match)
10. too_good_to_be_true - Budget seems unrealistic for scope requested
11. poor_communication_pattern - Inconsistent, confusing, or contradictory messages

SCORING GUIDELINES (0-100, higher = MORE red flags/risk):
- 0-20: Trustworthy - Clear communication, reasonable timeline, verified info
- 21-40: Low Risk - Minor concerns but likely legitimate
- 41-60: Medium Risk - Some red flags, proceed with caution
- 61-80: High Risk - Multiple red flags, require deposit before significant work
- 81-100: Critical - Strong indicators of scam/waste of time

FACTOR SCORING (each 0-100, higher = WORSE):
- responseTimeScore: Based on response delays (0 = instant, 100 = ghosting)
- promiseFulfillmentScore: Based on kept/broken promises (0 = all kept, 100 = all broken)
- scopeUrgencyScore: Based on scope vs timeline (0 = reasonable, 100 = impossible)
- communicationScore: Based on clarity (0 = clear, 100 = incomprehensible)
- verificationScore: Based on identity verification (0 = verified, 100 = suspicious)`;

export async function analyzeLeadInteraction(
  context: InteractionContext,
  patterns?: IqsPattern[]
): Promise<IQSAnalysisResult> {
  const patternDescriptions = patterns?.filter(p => p.isActive).map(p => 
    `- ${p.name}: ${p.description || 'No description'} (severity: ${p.baseSeverity}/10)`
  ).join('\n') || 'Using default patterns';

  const prompt = `${IQS_SYSTEM_PROMPT}

ACTIVE PATTERNS TO CHECK:
${patternDescriptions}

LEAD CONTEXT:
- Client Name: ${context.clientName || 'Unknown'}
- Event Date: ${context.eventDate || 'Not specified'}
- Days Until Event: ${context.daysUntilEvent ?? 'Unknown'}
- Services Requested: ${context.servicesRequested?.join(', ') || 'Not specified'}
- Party Size: ${context.partySize || 'Not specified'}
- Location: ${context.location || 'Not specified'}
- Budget: ${context.budget || 'Not disclosed'}
- Response Delay (hours): ${context.responseDelayHours ?? 'N/A'}
- Promises Made/Kept: ${context.promisesMade?.map(p => `"${p.promise}" - ${p.fulfilled ? 'KEPT' : 'BROKEN'}`).join('; ') || 'None tracked'}

RECENT MESSAGES:
${context.previousMessages?.slice(-5).map((m, i) => `${i + 1}. ${m}`).join('\n') || 'No messages available'}

Analyze this lead and provide a risk assessment.`;

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
                  overallScore: { type: Type.INTEGER },
                  riskLevel: { type: Type.STRING },
                  redFlags: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        severity: { type: Type.INTEGER },
                        description: { type: Type.STRING },
                        aiConfidence: { type: Type.INTEGER }
                      },
                      required: ["type", "severity", "description", "aiConfidence"]
                    }
                  },
                  factors: {
                    type: Type.OBJECT,
                    properties: {
                      responseTimeScore: { type: Type.INTEGER },
                      promiseFulfillmentScore: { type: Type.INTEGER },
                      scopeUrgencyScore: { type: Type.INTEGER },
                      communicationScore: { type: Type.INTEGER },
                      verificationScore: { type: Type.INTEGER }
                    },
                    required: ["responseTimeScore", "promiseFulfillmentScore", "scopeUrgencyScore", "communicationScore", "verificationScore"]
                  },
                  aiSummary: { type: Type.STRING },
                  suggestedAction: { type: Type.STRING }
                },
                required: ["overallScore", "riskLevel", "redFlags", "factors", "aiSummary"]
              }
            }
          });
          return result;
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error;
          }
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

    const parsed = JSON.parse(response.text || "{}") as IQSAnalysisResult;
    
    parsed.overallScore = Math.max(0, Math.min(100, parsed.overallScore));
    
    if (!['trustworthy', 'low_risk', 'medium_risk', 'high_risk', 'critical'].includes(parsed.riskLevel)) {
      parsed.riskLevel = calculateRiskLevel(parsed.overallScore);
    }

    return parsed;
  } catch (error) {
    console.error("IQS analysis error:", error);
    return getDefaultAnalysis();
  }
}

function calculateRiskLevel(score: number): IQSAnalysisResult['riskLevel'] {
  if (score <= 20) return 'trustworthy';
  if (score <= 40) return 'low_risk';
  if (score <= 60) return 'medium_risk';
  if (score <= 80) return 'high_risk';
  return 'critical';
}

function getDefaultAnalysis(): IQSAnalysisResult {
  return {
    overallScore: 50,
    riskLevel: 'medium_risk',
    redFlags: [],
    factors: {
      responseTimeScore: 50,
      promiseFulfillmentScore: 50,
      scopeUrgencyScore: 50,
      communicationScore: 50,
      verificationScore: 50
    },
    aiSummary: 'Unable to analyze - using default moderate risk assessment',
    suggestedAction: 'Proceed with standard verification steps'
  };
}

export async function analyzeAndScoreLead(
  vendorId: string,
  clientUserId?: string,
  clientContactId?: string,
  bookingId?: string,
  context?: InteractionContext
): Promise<IqsLeadScore> {
  let existingScore = await storage.getIqsLeadScoreByClient(vendorId, clientUserId, clientContactId);
  
  const patterns = await storage.getActiveIqsPatterns();
  
  const interactionEvents = existingScore 
    ? await storage.getIqsInteractionEvents(existingScore.id)
    : [];

  const enrichedContext: InteractionContext = {
    ...context,
    promisesMade: extractPromisesFromEvents(interactionEvents),
    responseDelayHours: calculateAverageResponseDelay(interactionEvents),
  };

  const analysis = await analyzeLeadInteraction(enrichedContext, patterns);

  const now = new Date();
  
  if (existingScore) {
    const updated = await storage.updateIqsLeadScore(existingScore.id, {
      score: analysis.overallScore,
      riskLevel: analysis.riskLevel,
      factors: analysis.factors,
      activeRedFlags: analysis.redFlags.map(rf => ({
        type: rf.type,
        severity: rf.severity,
        detectedAt: now.toISOString(),
        description: rf.description,
        aiConfidence: rf.aiConfidence,
      })),
      aiSummary: analysis.aiSummary,
      lastAnalyzedAt: now,
    });
    
    if (updated) {
      await updatePatternStats(analysis.redFlags, patterns);
      return updated;
    }
    return existingScore;
  } else {
    const newScore = await storage.createIqsLeadScore({
      vendorId,
      clientUserId: clientUserId || null,
      clientContactId: clientContactId || null,
      bookingId: bookingId || null,
      score: analysis.overallScore,
      riskLevel: analysis.riskLevel,
      factors: analysis.factors,
      activeRedFlags: analysis.redFlags.map(rf => ({
        type: rf.type,
        severity: rf.severity,
        detectedAt: now.toISOString(),
        description: rf.description,
        aiConfidence: rf.aiConfidence,
      })),
      aiSummary: analysis.aiSummary,
      lastAnalyzedAt: now,
    });
    
    await updatePatternStats(analysis.redFlags, patterns);
    return newScore;
  }
}

function extractPromisesFromEvents(events: IqsInteractionEvent[]): Array<{ promise: string; fulfilled: boolean }> {
  const promises: Array<{ promise: string; fulfilled: boolean }> = [];
  
  for (const event of events) {
    if (event.eventType === 'promise_made' && event.details) {
      const details = event.details as { promisedAction?: string; promisedDate?: string };
      const promiseText = details.promisedAction || 'Unspecified promise';
      const fulfilled = !events.some(e => 
        e.eventType === 'promise_broken' && 
        (e.details as { promisedAction?: string })?.promisedAction === promiseText
      );
      promises.push({ promise: promiseText, fulfilled });
    }
  }
  
  return promises;
}

function calculateAverageResponseDelay(events: IqsInteractionEvent[]): number {
  const delays = events
    .filter(e => e.eventType === 'response_delay' && e.details)
    .map(e => (e.details as { delayHours?: number })?.delayHours || 0)
    .filter(d => d > 0);
  
  if (delays.length === 0) return 0;
  return Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);
}

async function updatePatternStats(redFlags: RedFlagDetection[], patterns: IqsPattern[]): Promise<void> {
  for (const flag of redFlags) {
    const matchingPattern = patterns.find(p => p.patternType === flag.type);
    if (matchingPattern) {
      await storage.incrementIqsPatternTrigger(matchingPattern.id, true);
    }
  }
}

export async function logInteractionEvent(
  leadScoreId: string,
  vendorId: string,
  eventType: string,
  details: IqsInteractionEvent['details'],
  occurredAt?: Date,
  expectedAt?: Date
): Promise<IqsInteractionEvent> {
  const scoreImpact = calculateEventImpact(eventType, details);
  
  const event = await storage.createIqsInteractionEvent({
    leadScoreId,
    vendorId,
    eventType,
    details,
    occurredAt: occurredAt || new Date(),
    expectedAt: expectedAt || null,
    scoreImpact,
  });
  
  return event;
}

function calculateEventImpact(eventType: string, details: any): number {
  switch (eventType) {
    case 'promise_broken':
      return 15;
    case 'ghosting_detected':
      return 25;
    case 'response_delay':
      const delayHours = details?.delayHours || 0;
      if (delayHours > 168) return 20;
      if (delayHours > 72) return 10;
      if (delayHours > 24) return 5;
      return 0;
    case 'red_flag_triggered':
      return details?.severity ? details.severity * 2 : 10;
    case 'booking_confirmed':
      return -20;
    case 'message_received':
      return -2;
    case 'booking_cancelled':
      return 10;
    default:
      return 0;
  }
}

export async function submitVendorFeedback(
  vendorId: string,
  leadScoreId: string,
  feedbackType: 'lead_rating' | 'red_flag_confirm' | 'red_flag_reject' | 'outcome_report' | 'custom_pattern',
  data: {
    rating?: 'trustworthy' | 'weird' | 'scam' | 'normal';
    notes?: string;
    patternId?: string;
    eventId?: string;
    wasAccurate?: boolean;
    actualOutcome?: 'booked' | 'ghosted' | 'declined' | 'scam_confirmed' | 'legitimate';
  }
): Promise<void> {
  await storage.createIqsVendorFeedback({
    vendorId,
    leadScoreId,
    feedbackType,
    rating: data.rating || null,
    notes: data.notes || null,
    patternId: data.patternId || null,
    eventId: data.eventId || null,
    wasAccurate: data.wasAccurate ?? null,
    actualOutcome: data.actualOutcome || null,
  });

  if (feedbackType === 'lead_rating' && data.rating) {
    await storage.updateIqsLeadScore(leadScoreId, {
      vendorRating: data.rating,
      vendorNotes: data.notes || null,
    });
  }

  if (feedbackType === 'outcome_report' && data.actualOutcome) {
    await storage.updateIqsLeadScore(leadScoreId, {
      outcome: data.actualOutcome,
      outcomeNotes: data.notes || null,
    });
  }

  if ((feedbackType === 'red_flag_confirm' || feedbackType === 'red_flag_reject') && data.patternId) {
    await storage.incrementIqsPatternTrigger(data.patternId, data.wasAccurate ?? false);
  }
}

export async function runLearningCycle(): Promise<{
  feedbackProcessed: number;
  patternsUpdated: number;
  insights: string[];
}> {
  const run = await storage.createIqsLearningRun({
    status: 'running',
  });

  try {
    const unprocessedFeedback = await storage.getUnprocessedIqsFeedback();
    
    if (unprocessedFeedback.length === 0) {
      await storage.completeIqsLearningRun(run.id, {
        status: 'completed',
        completedAt: new Date(),
        feedbackProcessed: 0,
        patternsUpdated: 0,
        results: { patternAdjustments: [], insights: ['No new feedback to process'] },
      });
      return { feedbackProcessed: 0, patternsUpdated: 0, insights: ['No new feedback to process'] };
    }

    const patterns = await storage.getActiveIqsPatterns();
    const patternAdjustments: Array<{ patternId: string; oldWeight: number; newWeight: number; reason: string }> = [];
    const insights: string[] = [];

    for (const pattern of patterns) {
      const confirmed = pattern.timesConfirmedByVendor || 0;
      const rejected = pattern.timesRejectedByVendor || 0;
      const total = confirmed + rejected;
      
      if (total >= 5) {
        const accuracy = confirmed / total;
        const currentWeight = pattern.adjustedWeight || pattern.baseWeight;
        let newWeight = currentWeight;
        
        if (accuracy >= 0.8) {
          newWeight = Math.min(20, currentWeight + 2);
          insights.push(`Pattern "${pattern.name}" is highly accurate (${Math.round(accuracy * 100)}%) - increasing weight`);
        } else if (accuracy <= 0.3) {
          newWeight = Math.max(1, currentWeight - 3);
          insights.push(`Pattern "${pattern.name}" has low accuracy (${Math.round(accuracy * 100)}%) - decreasing weight`);
        }
        
        if (newWeight !== currentWeight) {
          await storage.updateIqsPattern(pattern.id, { adjustedWeight: newWeight });
          patternAdjustments.push({
            patternId: pattern.id,
            oldWeight: currentWeight,
            newWeight,
            reason: `Accuracy: ${Math.round(accuracy * 100)}%`,
          });
        }
      }
    }

    for (const feedback of unprocessedFeedback) {
      await storage.markIqsFeedbackProcessed(feedback.id);
    }

    await storage.completeIqsLearningRun(run.id, {
      status: 'completed',
      completedAt: new Date(),
      feedbackProcessed: unprocessedFeedback.length,
      patternsUpdated: patternAdjustments.length,
      results: { patternAdjustments, insights },
    });

    return {
      feedbackProcessed: unprocessedFeedback.length,
      patternsUpdated: patternAdjustments.length,
      insights,
    };
  } catch (error) {
    console.error('IQS learning cycle error:', error);
    await storage.completeIqsLearningRun(run.id, {
      status: 'failed',
      completedAt: new Date(),
    });
    throw error;
  }
}

export async function getLeadWarningsForVendor(
  vendorId: string
): Promise<Array<{
  leadScore: IqsLeadScore;
  topRedFlags: RedFlagDetection[];
  recentEvents: IqsInteractionEvent[];
}>> {
  const leadScores = await storage.getIqsLeadScoresByVendor(vendorId);
  
  const riskyLeads = leadScores.filter(ls => 
    ls.riskLevel === 'high_risk' || ls.riskLevel === 'critical' || ls.score >= 60
  );
  
  const warnings = await Promise.all(
    riskyLeads.map(async (leadScore) => {
      const recentEvents = await storage.getIqsInteractionEvents(leadScore.id);
      const topRedFlags = (leadScore.activeRedFlags || [])
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3);
      
      return {
        leadScore,
        topRedFlags: topRedFlags.map(rf => ({
          type: rf.type,
          severity: rf.severity,
          description: rf.description,
          aiConfidence: rf.aiConfidence,
        })),
        recentEvents: recentEvents.slice(-5),
      };
    })
  );
  
  return warnings.sort((a, b) => b.leadScore.score - a.leadScore.score);
}

export async function analyzeMessageForRedFlags(
  vendorId: string,
  clientIdentifier: { userId?: string; contactId?: string },
  messageContent: string,
  bookingId?: string
): Promise<{
  leadScore: IqsLeadScore;
  newRedFlags: RedFlagDetection[];
  suggestedAction?: string;
}> {
  let leadScore = await storage.getIqsLeadScoreByClient(
    vendorId, 
    clientIdentifier.userId, 
    clientIdentifier.contactId
  );

  if (!leadScore) {
    leadScore = await storage.createIqsLeadScore({
      vendorId,
      clientUserId: clientIdentifier.userId || null,
      clientContactId: clientIdentifier.contactId || null,
      bookingId: bookingId || null,
      score: 50,
      riskLevel: 'unknown',
    });
  }

  await storage.createIqsInteractionEvent({
    leadScoreId: leadScore.id,
    vendorId,
    eventType: 'message_received',
    details: { messageContent: messageContent.substring(0, 500) },
    occurredAt: new Date(),
  });

  const patterns = await storage.getActiveIqsPatterns();
  const analysis = await analyzeLeadInteraction({
    previousMessages: [messageContent],
  }, patterns);

  const now = new Date();
  const updatedScore = await storage.updateIqsLeadScore(leadScore.id, {
    score: analysis.overallScore,
    riskLevel: analysis.riskLevel,
    factors: analysis.factors,
    activeRedFlags: analysis.redFlags.map(rf => ({
      type: rf.type,
      severity: rf.severity,
      detectedAt: now.toISOString(),
      description: rf.description,
      aiConfidence: rf.aiConfidence,
    })),
    aiSummary: analysis.aiSummary,
    lastAnalyzedAt: now,
  });

  return {
    leadScore: updatedScore || leadScore,
    newRedFlags: analysis.redFlags,
    suggestedAction: analysis.suggestedAction,
  };
}

export async function initializeDefaultPatterns(): Promise<void> {
  const existingPatterns = await storage.getActiveIqsPatterns();
  
  if (existingPatterns.length > 0) {
    console.log('[IQS] Default patterns already exist, skipping initialization');
    return;
  }

  const defaultPatterns = [
    {
      patternType: 'large_scope_short_notice',
      name: 'Large Scope with Short Notice',
      description: 'Request for many services (15+ people) with less than 3 months until event',
      baseSeverity: 7,
      baseWeight: 15,
      detectionCriteria: {
        conditions: [
          { field: 'party_size', operator: 'gte', value: 15 },
          { field: 'days_until_event', operator: 'lte', value: 90 }
        ],
        minimumConditionsToMatch: 2
      },
      isSystemPattern: true,
    },
    {
      patternType: 'vague_details',
      name: 'Vague or Missing Details',
      description: 'Critical information like budget, venue, or specifics not provided',
      baseSeverity: 5,
      baseWeight: 10,
      detectionCriteria: {
        conditions: [
          { field: 'budget', operator: 'missing', value: true },
          { field: 'venue', operator: 'missing', value: true }
        ],
        minimumConditionsToMatch: 1
      },
      isSystemPattern: true,
    },
    {
      patternType: 'delayed_response',
      name: 'Delayed Response',
      description: 'Long gaps (3+ days) between messages despite claimed urgency',
      baseSeverity: 6,
      baseWeight: 12,
      detectionCriteria: {
        conditions: [
          { field: 'response_delay_hours', operator: 'gte', value: 72 }
        ],
        minimumConditionsToMatch: 1
      },
      isSystemPattern: true,
    },
    {
      patternType: 'broken_promise',
      name: 'Broken Promise',
      description: 'Said they would call/respond/book by a date but did not follow through',
      baseSeverity: 8,
      baseWeight: 18,
      detectionCriteria: {
        conditions: [
          { field: 'promises_broken', operator: 'gte', value: 1 }
        ],
        minimumConditionsToMatch: 1
      },
      isSystemPattern: true,
    },
    {
      patternType: 'ghosting',
      name: 'Ghosting',
      description: 'Complete silence after active engagement (10+ days no response)',
      baseSeverity: 9,
      baseWeight: 20,
      detectionCriteria: {
        conditions: [
          { field: 'days_since_last_contact', operator: 'gte', value: 10 },
          { field: 'had_active_conversation', operator: 'eq', value: true }
        ],
        minimumConditionsToMatch: 2
      },
      isSystemPattern: true,
    },
    {
      patternType: 'foreign_location_complexity',
      name: 'Foreign Location Complexity',
      description: 'Destination wedding in foreign country with complex logistics',
      baseSeverity: 5,
      baseWeight: 8,
      detectionCriteria: {
        conditions: [
          { field: 'is_destination', operator: 'eq', value: true },
          { field: 'is_international', operator: 'eq', value: true }
        ],
        minimumConditionsToMatch: 2
      },
      isSystemPattern: true,
    },
  ];

  for (const pattern of defaultPatterns) {
    await storage.createIqsPattern(pattern);
  }

  console.log(`[IQS] Initialized ${defaultPatterns.length} default patterns`);
}
