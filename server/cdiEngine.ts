import { GoogleGenAI, Type } from "@google/genai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { storage } from "./storage";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const limit = pLimit(2);

// CDI Three-Dimension Types per Violet Herod's Patent Specification
export interface CDIDimensions {
  emotionalFidelity: DimensionScore;      // 40% weight
  choreographyAwareness: DimensionScore;  // 30% weight
  roleSpecificRecall: DimensionScore;     // 30% weight
}

export interface DimensionScore {
  score: number;           // 0-100
  confidence: number;      // 0-100
  hacoDecision: 'intuition_aligned' | 'complementarity_activated' | 'observation_only';
  components: DimensionComponents;
  evidence: EvidencePayload[];
}

export interface DimensionComponents {
  // Emotional Fidelity components
  responseTimeConsistency?: number;
  toneAlignment?: number;
  emotionalPreservation?: number;
  timingSensitivity?: number;
  // Choreography Awareness components
  roleTransitionQuality?: number;
  sequenceIntegrity?: number;
  multiPartySynchronization?: number;
  escalationRecognition?: number;
  // Role-Specific Recall components
  historicalReliability?: number;
  commitmentStrength?: number;
  communicationConsistency?: number;
  deliveryTrackRecord?: number;
}

export interface EvidencePayload {
  eventId?: string;
  eventType: string;
  contribution: number;
  evidence: string;
  timestamp?: Date;
}

export interface CDICompositeResult {
  compositeScore: number;
  trustLevel: 'exceptional' | 'high' | 'moderate' | 'low' | 'at_risk';
  dimensions: CDIDimensions;
  weightsUsed: {
    emotionalFidelity: number;
    choreographyAwareness: number;
    roleSpecificRecall: number;
  };
  predictedSuccess: number;
  interventionRecommended: boolean;
  interventionReason?: string;
  hacoOverallDecision: 'intuition_aligned' | 'complementarity_activated' | 'observation_only';
}

// HACO Thresholds per dimension
export interface HACoThresholdsPerDimension {
  epsilon: number;
  delta: number;
}

const DEFAULT_THRESHOLDS: HACoThresholdsPerDimension = {
  epsilon: 0.1,
  delta: 0.8
};

// Internal function to fetch dynamic weights from storage
async function getDynamicWeightsInternal(): Promise<{
  emotionalFidelity: number;
  choreographyAwareness: number;
  roleSpecificRecall: number;
}> {
  try {
    const activeThreshold = await storage.getActiveCdiThreshold();
    
    if (activeThreshold) {
      return {
        emotionalFidelity: activeThreshold.emotionalFidelityWeight || 40,
        choreographyAwareness: activeThreshold.choreographyAwarenessWeight || 30,
        roleSpecificRecall: activeThreshold.roleSpecificRecallWeight || 30,
      };
    }
  } catch (error) {
    console.log('[CDI Engine] Using default weights, storage not available');
  }
  
  return {
    emotionalFidelity: 40,
    choreographyAwareness: 30,
    roleSpecificRecall: 30,
  };
}

// Wedding-specific event types for CDI tracking
export const CDI_EVENT_TYPES = {
  // Communication events
  message_negative: { category: 'communication', dimension: 'emotional_fidelity', weight: 0.2 },
  message_positive: { category: 'communication', dimension: 'emotional_fidelity', weight: -0.1 },
  response_delay: { category: 'communication', dimension: 'emotional_fidelity', weight: 0.15 },
  response_fast: { category: 'communication', dimension: 'emotional_fidelity', weight: -0.05 },
  
  // Payment events
  payment_late: { category: 'payment', dimension: 'role_specific_recall', weight: 0.25 },
  payment_failed: { category: 'payment', dimension: 'role_specific_recall', weight: 0.3 },
  payment_on_time: { category: 'payment', dimension: 'role_specific_recall', weight: -0.1 },
  deposit_missed: { category: 'payment', dimension: 'role_specific_recall', weight: 0.35 },
  
  // Booking/scheduling events
  schedule_change: { category: 'booking', dimension: 'choreography_awareness', weight: 0.15 },
  schedule_change_last_minute: { category: 'booking', dimension: 'choreography_awareness', weight: 0.4 },
  cancellation_request: { category: 'booking', dimension: 'choreography_awareness', weight: 0.35 },
  
  // Day-of events (high urgency)
  day_of_emergency: { category: 'coordination', dimension: 'choreography_awareness', weight: 0.5 },
  day_of_delay: { category: 'coordination', dimension: 'choreography_awareness', weight: 0.3 },
  day_of_no_show: { category: 'coordination', dimension: 'choreography_awareness', weight: 0.8 },
  day_of_success: { category: 'coordination', dimension: 'choreography_awareness', weight: -0.2 },
  
  // Trial/preview events
  trial_feedback_negative: { category: 'delivery', dimension: 'emotional_fidelity', weight: 0.2 },
  trial_feedback_positive: { category: 'delivery', dimension: 'emotional_fidelity', weight: -0.15 },
  trial_changes_requested: { category: 'delivery', dimension: 'choreography_awareness', weight: 0.1 },
  trial_changes_major: { category: 'delivery', dimension: 'choreography_awareness', weight: 0.25 },
  
  // Escalation events
  escalation: { category: 'coordination', dimension: 'emotional_fidelity', weight: 0.4 },
  support_case: { category: 'coordination', dimension: 'emotional_fidelity', weight: 0.35 },
  planner_intervention: { category: 'coordination', dimension: 'choreography_awareness', weight: 0.25 },
} as const;

// CDI Three-Dimension Analysis System Prompt
const CDI_DIMENSION_SYSTEM_PROMPT = `You are the Choreography Depth Index (CDI) Engine for a wedding services platform.

CDI quantifies the "invisible labor" of coordination—the untracked work of trust-building, timing, and emotional choreography that makes complex multi-party services succeed or fail.

You analyze interactions across THREE DIMENSIONS:

## 1. EMOTIONAL FIDELITY (40% weight)
Preservation of tone, timing, and emotional logic throughout coordination.
Measure:
- Response time patterns (consistency, urgency matching)
- Communication tone alignment (professional vs casual, anxious vs confident)
- Emotional signal preservation across role transitions
- Timing sensitivity (recognizing when urgency matters)
Scoring: Cosine similarity on embedding vectors for tone/nuance preservation

## 2. CHOREOGRAPHY AWARENESS (30% weight)
Recognition of role-specific transitions and multi-party coordination patterns.
Measure:
- Role transition quality (when client needs planner intervention)
- Coordination sequence integrity (right information at right time)
- Multi-party synchronization (keeping all actors aligned)
- Escalation pattern recognition (catching issues before they cascade)
- Schedule change detection (last-minute changes are high-weight signals)
- Day-of coordination (emergencies, delays, no-shows are critical events)
Scoring: Pattern matching against validated coordination sequences

WEDDING-SPECIFIC SIGNALS TO DETECT:
- Schedule changes: "need to reschedule", "change the time", "different date", "move the appointment"
- Last-minute changes: Within 48 hours of event, any change is HIGH priority
- Day-of emergencies: "running late", "can't make it", "emergency", "disaster", "help"
- Trial feedback: "loved it", "needs tweaks", "not quite right", "want changes", "perfect"
- Response delays: Time between messages matters - slow responses increase distress

## 3. ROLE-SPECIFIC RECALL (30% weight)
Accurate behavioral tracking tied to specific actors over time.
Measure:
- Historical reliability patterns by provider
- Commitment signal strength by client type
- Communication style consistency
- Delivery quality track record
Scoring: Longitudinal behavioral analysis

CDI Formula: (Fidelity × 0.4) + (Awareness × 0.3) + (Recall × 0.3)

HACO FRAMEWORK DECISIONS:
- intuition_aligned: AI confirms human judgment
- complementarity_activated: AI adds insight humans missed
- observation_only: Low confidence, just observing

TRUST LEVELS:
- exceptional (90-100): Outstanding coordination
- high (70-89): Strong trust signals
- moderate (50-69): Normal coordination
- low (30-49): Concerning patterns
- at_risk (0-29): Intervention needed

You must respond with valid JSON matching the exact schema provided.`;

// Analyze a message for three-dimension CDI scoring
export async function analyzeForCDI(
  userId: string,
  message: string,
  context?: {
    actorRole: 'client' | 'artist' | 'planner';
    targetRole?: 'client' | 'artist' | 'planner';
    bookingId?: string;
    previousMessages?: Array<{ content: string; senderId: string; timestamp: Date }>;
    responseLatencyMs?: number;
    eventDate?: string;
    bookingStatus?: string;
    paymentStatus?: string;
  },
  dynamicWeights?: {
    emotionalFidelity: number;
    choreographyAwareness: number;
    roleSpecificRecall: number;
  }
): Promise<CDICompositeResult> {
  // Always fetch dynamic weights from storage if not provided
  let weights = dynamicWeights;
  if (!weights) {
    weights = await getDynamicWeightsInternal();
  }
  
  const contextInfo = context ? `
CONTEXT:
- Actor Role: ${context.actorRole}
- Target Role: ${context.targetRole || 'Unknown'}
- Booking Status: ${context.bookingStatus || 'Unknown'}
- Payment Status: ${context.paymentStatus || 'Unknown'}
- Response Latency: ${context.responseLatencyMs ? `${context.responseLatencyMs}ms` : 'Unknown'}
- Event Date: ${context.eventDate || 'Not specified'}
- Recent conversation: ${context.previousMessages?.slice(-3).map(m => m.content).join(' | ') || 'None'}
` : '';

  const prompt = `${CDI_DIMENSION_SYSTEM_PROMPT}

${contextInfo}

ANALYZE THIS MESSAGE FROM A ${context?.actorRole?.toUpperCase() || 'USER'}:
"${message}"

Respond with a JSON object containing scores for all three dimensions and their components.`;

  try {
    const response = await pRetry(
      async () => {
        const result = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                emotionalFidelity: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    confidence: { type: Type.NUMBER },
                    responseTimeConsistency: { type: Type.NUMBER },
                    toneAlignment: { type: Type.NUMBER },
                    emotionalPreservation: { type: Type.NUMBER },
                    timingSensitivity: { type: Type.NUMBER },
                    evidence: { type: Type.STRING }
                  },
                  required: ["score", "confidence"]
                },
                choreographyAwareness: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    confidence: { type: Type.NUMBER },
                    roleTransitionQuality: { type: Type.NUMBER },
                    sequenceIntegrity: { type: Type.NUMBER },
                    multiPartySynchronization: { type: Type.NUMBER },
                    escalationRecognition: { type: Type.NUMBER },
                    evidence: { type: Type.STRING }
                  },
                  required: ["score", "confidence"]
                },
                roleSpecificRecall: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    confidence: { type: Type.NUMBER },
                    historicalReliability: { type: Type.NUMBER },
                    commitmentStrength: { type: Type.NUMBER },
                    communicationConsistency: { type: Type.NUMBER },
                    deliveryTrackRecord: { type: Type.NUMBER },
                    evidence: { type: Type.STRING }
                  },
                  required: ["score", "confidence"]
                },
                predictedSuccess: { type: Type.NUMBER },
                interventionRecommended: { type: Type.BOOLEAN },
                interventionReason: { type: Type.STRING },
                overallRationale: { type: Type.STRING }
              },
              required: ["emotionalFidelity", "choreographyAwareness", "roleSpecificRecall"]
            }
          }
        });
        return result;
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          console.log(`CDI analysis attempt ${error.attemptNumber} failed. Retrying...`);
        }
      }
    );

    const analysisText = response.text || '{}';
    const analysis = JSON.parse(analysisText);

    // Calculate HACO decisions for each dimension
    const efHaco = calculateHacoDecision(analysis.emotionalFidelity?.confidence || 50, DEFAULT_THRESHOLDS);
    const caHaco = calculateHacoDecision(analysis.choreographyAwareness?.confidence || 50, DEFAULT_THRESHOLDS);
    const rsrHaco = calculateHacoDecision(analysis.roleSpecificRecall?.confidence || 50, DEFAULT_THRESHOLDS);

    // Build dimension scores
    const dimensions: CDIDimensions = {
      emotionalFidelity: {
        score: Math.round(analysis.emotionalFidelity?.score || 50),
        confidence: Math.round(analysis.emotionalFidelity?.confidence || 50),
        hacoDecision: efHaco,
        components: {
          responseTimeConsistency: analysis.emotionalFidelity?.responseTimeConsistency,
          toneAlignment: analysis.emotionalFidelity?.toneAlignment,
          emotionalPreservation: analysis.emotionalFidelity?.emotionalPreservation,
          timingSensitivity: analysis.emotionalFidelity?.timingSensitivity
        },
        evidence: [{ eventType: 'message_analysis', contribution: 1, evidence: analysis.emotionalFidelity?.evidence || 'AI analysis' }]
      },
      choreographyAwareness: {
        score: Math.round(analysis.choreographyAwareness?.score || 50),
        confidence: Math.round(analysis.choreographyAwareness?.confidence || 50),
        hacoDecision: caHaco,
        components: {
          roleTransitionQuality: analysis.choreographyAwareness?.roleTransitionQuality,
          sequenceIntegrity: analysis.choreographyAwareness?.sequenceIntegrity,
          multiPartySynchronization: analysis.choreographyAwareness?.multiPartySynchronization,
          escalationRecognition: analysis.choreographyAwareness?.escalationRecognition
        },
        evidence: [{ eventType: 'coordination_analysis', contribution: 1, evidence: analysis.choreographyAwareness?.evidence || 'AI analysis' }]
      },
      roleSpecificRecall: {
        score: Math.round(analysis.roleSpecificRecall?.score || 50),
        confidence: Math.round(analysis.roleSpecificRecall?.confidence || 50),
        hacoDecision: rsrHaco,
        components: {
          historicalReliability: analysis.roleSpecificRecall?.historicalReliability,
          commitmentStrength: analysis.roleSpecificRecall?.commitmentStrength,
          communicationConsistency: analysis.roleSpecificRecall?.communicationConsistency,
          deliveryTrackRecord: analysis.roleSpecificRecall?.deliveryTrackRecord
        },
        evidence: [{ eventType: 'behavioral_analysis', contribution: 1, evidence: analysis.roleSpecificRecall?.evidence || 'AI analysis' }]
      }
    };

    // Calculate composite score using dynamic weighting (default 40/30/30)
    const compositeScore = Math.round(
      (dimensions.emotionalFidelity.score * (weights.emotionalFidelity / 100)) +
      (dimensions.choreographyAwareness.score * (weights.choreographyAwareness / 100)) +
      (dimensions.roleSpecificRecall.score * (weights.roleSpecificRecall / 100))
    );

    // Determine trust level
    const trustLevel = getTrustLevel(compositeScore);

    // Determine overall HACO decision
    const hacoOverallDecision = determineOverallHaco(efHaco, caHaco, rsrHaco);

    return {
      compositeScore,
      trustLevel,
      dimensions,
      weightsUsed: weights,
      predictedSuccess: analysis.predictedSuccess || compositeScore,
      interventionRecommended: analysis.interventionRecommended || compositeScore < 40,
      interventionReason: analysis.interventionReason,
      hacoOverallDecision
    };

  } catch (error) {
    console.error('[CDI Engine] Analysis error:', error);
    
    // Return neutral scores on error
    const neutralDimension: DimensionScore = {
      score: 50,
      confidence: 20,
      hacoDecision: 'observation_only',
      components: {},
      evidence: [{ eventType: 'error_fallback', contribution: 0, evidence: 'Analysis failed, using neutral scores' }]
    };

    return {
      compositeScore: 50,
      trustLevel: 'moderate',
      dimensions: {
        emotionalFidelity: neutralDimension,
        choreographyAwareness: neutralDimension,
        roleSpecificRecall: neutralDimension
      },
      weightsUsed: weights,
      predictedSuccess: 50,
      interventionRecommended: false,
      hacoOverallDecision: 'observation_only'
    };
  }
}

// Calculate HACO decision based on confidence
function calculateHacoDecision(
  confidence: number,
  thresholds: HACoThresholdsPerDimension
): 'intuition_aligned' | 'complementarity_activated' | 'observation_only' {
  const normalizedConfidence = confidence / 100;
  
  if (normalizedConfidence >= thresholds.delta) {
    return 'intuition_aligned';
  } else if (normalizedConfidence >= thresholds.delta - thresholds.epsilon) {
    return 'complementarity_activated';
  } else {
    return 'observation_only';
  }
}

// Get trust level from composite score
function getTrustLevel(score: number): 'exceptional' | 'high' | 'moderate' | 'low' | 'at_risk' {
  if (score >= 90) return 'exceptional';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'at_risk';
}

// Determine overall HACO decision from dimension decisions
function determineOverallHaco(
  ef: 'intuition_aligned' | 'complementarity_activated' | 'observation_only',
  ca: 'intuition_aligned' | 'complementarity_activated' | 'observation_only',
  rsr: 'intuition_aligned' | 'complementarity_activated' | 'observation_only'
): 'intuition_aligned' | 'complementarity_activated' | 'observation_only' {
  const decisions = [ef, ca, rsr];
  
  // If all aligned, overall is aligned
  if (decisions.every(d => d === 'intuition_aligned')) {
    return 'intuition_aligned';
  }
  
  // If any is observation_only, overall is observation_only
  if (decisions.some(d => d === 'observation_only')) {
    return 'observation_only';
  }
  
  // Mixed case = complementarity activated
  return 'complementarity_activated';
}

// Record a behavioral event for CDI tracking
export async function recordBehavioralEvent(
  userId: string,
  actorRole: 'client' | 'artist' | 'planner',
  eventCategory: 'communication' | 'payment' | 'booking' | 'coordination' | 'delivery',
  eventType: string,
  dimension: 'emotional_fidelity' | 'choreography_awareness' | 'role_specific_recall',
  signalStrength: number,
  metadata?: {
    targetUserId?: string;
    targetRole?: string;
    bookingId?: string;
    responseLatencyMs?: number;
    evidenceText?: string;
    contextualFactors?: string[];
    roleTransition?: { from: string; to: string };
    sequencePosition?: number;
    expectedPattern?: string;
    actualPattern?: string;
  }
): Promise<void> {
  try {
    // This would store the behavioral event for CDI scoring
    console.log(`[CDI Engine] Recording behavioral event: ${eventCategory}/${eventType} for user ${userId}`);
    console.log(`[CDI Engine] Dimension: ${dimension}, Signal Strength: ${signalStrength}`);
    
    // Future: storage.createCdiBehavioralEvent(...)
  } catch (error) {
    console.error('[CDI Engine] Error recording behavioral event:', error);
  }
}

// Store composite CDI score
export async function storeCdiCompositeScore(
  userId: string,
  result: CDICompositeResult
): Promise<void> {
  try {
    console.log(`[CDI Engine] Storing composite score for user ${userId}: ${result.compositeScore} (${result.trustLevel})`);
    console.log(`[CDI Engine] Dimensions: EF=${result.dimensions.emotionalFidelity.score}, CA=${result.dimensions.choreographyAwareness.score}, RSR=${result.dimensions.roleSpecificRecall.score}`);
    console.log(`[CDI Engine] Weights Used: EF=${result.weightsUsed.emotionalFidelity}%, CA=${result.weightsUsed.choreographyAwareness}%, RSR=${result.weightsUsed.roleSpecificRecall}%`);
    
    // Future: Full storage.createCdiCompositeScore(...) with all fields
  } catch (error) {
    console.error('[CDI Engine] Error storing composite score:', error);
  }
}

// Process feedback for evolutionary learning
export async function processFeedback(
  compositeScoreId: string,
  feedbackType: 'outcome' | 'admin_override' | 'planner_note' | 'client_satisfaction',
  feedbackData: {
    outcomeSuccess?: boolean;
    satisfactionScore?: number;
    dimension?: string;
    notes?: string;
    failureReasons?: string[];
  }
): Promise<void> {
  try {
    console.log(`[CDI Engine] Processing feedback for score ${compositeScoreId}: ${feedbackType}`);
    console.log(`[CDI Engine] Feedback data:`, feedbackData);
    
    // Future: storage.createCdiFeedbackEvent(...)
    // This feeds the evolutionary loop for adaptive learning
  } catch (error) {
    console.error('[CDI Engine] Error processing feedback:', error);
  }
}

// Get current dynamic weights from storage (exported version for external callers)
export async function getDynamicWeights(): Promise<{
  emotionalFidelity: number;
  choreographyAwareness: number;
  roleSpecificRecall: number;
}> {
  return getDynamicWeightsInternal();
}

// Quick helper to record a wedding-specific CDI event
export async function recordWeddingEvent(
  userId: string,
  actorRole: 'client' | 'artist' | 'planner',
  eventType: keyof typeof CDI_EVENT_TYPES,
  metadata?: {
    bookingId?: string;
    eventDate?: Date;
    notes?: string;
    daysUntilEvent?: number;
  }
): Promise<void> {
  const eventConfig = CDI_EVENT_TYPES[eventType];
  if (!eventConfig) {
    console.warn(`[CDI Engine] Unknown event type: ${eventType}`);
    return;
  }

  // Amplify weight for last-minute events (within 48 hours)
  let adjustedWeight = eventConfig.weight;
  if (metadata?.daysUntilEvent !== undefined && metadata.daysUntilEvent <= 2) {
    adjustedWeight = eventConfig.weight * 1.5; // 50% more impactful when close to event
    console.log(`[CDI Engine] Last-minute event detected! Amplifying weight from ${eventConfig.weight} to ${adjustedWeight}`);
  }

  // Record the behavioral event
  await recordBehavioralEvent(
    userId,
    actorRole,
    eventConfig.category as any,
    eventType,
    eventConfig.dimension as any,
    Math.abs(adjustedWeight) * 100, // Convert to 0-100 scale
    {
      bookingId: metadata?.bookingId,
      evidenceText: metadata?.notes,
      contextualFactors: metadata?.daysUntilEvent !== undefined 
        ? [`days_until_event:${metadata.daysUntilEvent}`] 
        : undefined
    }
  );
}

// Calculate days until event for urgency scoring
export function calculateDaysUntilEvent(eventDate: Date): number {
  const now = new Date();
  const diffTime = eventDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
