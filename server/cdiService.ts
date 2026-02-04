/**
 * CDI (Choreography Depth Index) Trust Scoring Service
 * 
 * Quantifies coordination quality for autonomous agent permission systems.
 * Based on 16 years of high-stakes coordination patterns from The Makeup Dolls.
 * 
 * The algorithm captures intuitive signals (hesitation, attention, stress) and
 * converts them into verifiable scores that autonomous systems can use for
 * dynamic permission adjustments.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CoordinationBehavior {
  // Response time patterns (in minutes)
  responseTimesMinutes: number[];
  
  // Communication frequency (messages per hour during active coordination)
  communicationFrequency: number;
  
  // Number of iterations needed to reach alignment
  iterationsToAlignment: number;
  
  // Proactive updates vs reactive responses (0-1 ratio, higher = more proactive)
  proactiveRatio: number;
  
  // Historical completion quality (0-100)
  historicalCompletionRate: number;
  
  // Optional: stress indicators (0-1, higher = more stress signals detected)
  stressIndicators?: number;
  
  // Optional: attention signals (0-1, higher = more attention demonstrated)
  attentionSignals?: number;
  
  // Timestamps for temporal weighting (ISO strings)
  behaviorTimestamps?: string[];
}

export interface CDIInput {
  // The coordination behavior data to score
  behavior: CoordinationBehavior;
  
  // Transaction complexity level
  complexity: 'simple' | 'medium' | 'complex';
  
  // Optional: custom thresholds for this calculation
  customThresholds?: CDIThresholds;
}

export interface CDIThresholds {
  // Thresholds for each autonomy level
  fullAutonomy: number;      // Default: 85
  conditionalAutonomy: number; // Default: 70
}

export interface CDIComponentScore {
  score: number;
  weight: number;
  weightedScore: number;
  explanation: string;
}

export interface CDIResult {
  // Overall CDI score (0-100)
  score: number;
  
  // Component breakdown
  components: {
    responsiveness: CDIComponentScore;
    adaptability: CDIComponentScore;
    attention: CDIComponentScore;
    reliability: CDIComponentScore;
  };
  
  // Autonomy level recommendation
  autonomyLevel: 'full' | 'conditional' | 'restricted';
  autonomyExplanation: string;
  
  // Complexity-adjusted threshold that was applied
  appliedThreshold: {
    fullAutonomy: number;
    conditionalAutonomy: number;
  };
  
  // Trust signals detected
  trustSignals: string[];
  
  // Risk signals detected
  riskSignals: string[];
  
  // Metadata
  calculatedAt: string;
  algorithmVersion: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM_VERSION = '1.0.0';

// Base thresholds (adjusted by complexity)
const BASE_THRESHOLDS: CDIThresholds = {
  fullAutonomy: 85,
  conditionalAutonomy: 70,
};

// Complexity multipliers for thresholds
const COMPLEXITY_ADJUSTMENTS = {
  simple: { thresholdMultiplier: 0.95 },    // Slightly lower thresholds
  medium: { thresholdMultiplier: 1.0 },      // Standard thresholds
  complex: { thresholdMultiplier: 1.05 },    // Higher thresholds for high-stakes
};

// Component weights
const COMPONENT_WEIGHTS = {
  responsiveness: 0.25,
  adaptability: 0.25,
  attention: 0.25,
  reliability: 0.25,
};

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate responsiveness score based on response time patterns
 * Fast and consistent responses = high trust
 */
function calculateResponsivenessScore(responseTimes: number[]): { score: number; explanation: string } {
  if (responseTimes.length === 0) {
    return { score: 50, explanation: 'No response time data available' };
  }

  // Calculate average response time
  const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  
  // Calculate consistency (standard deviation)
  const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponse, 2), 0) / responseTimes.length;
  const stdDev = Math.sqrt(variance);
  
  // Score based on average response time (in minutes)
  // < 5 min = excellent, < 15 min = good, < 60 min = acceptable, > 60 min = needs improvement
  let speedScore: number;
  if (avgResponse <= 5) {
    speedScore = 100;
  } else if (avgResponse <= 15) {
    speedScore = 90 - ((avgResponse - 5) * 1);
  } else if (avgResponse <= 60) {
    speedScore = 80 - ((avgResponse - 15) * 0.5);
  } else if (avgResponse <= 240) {
    speedScore = 55 - ((avgResponse - 60) * 0.15);
  } else {
    speedScore = Math.max(20, 30 - ((avgResponse - 240) * 0.05));
  }
  
  // Consistency bonus (low std dev = consistent)
  const consistencyBonus = stdDev <= 5 ? 10 : stdDev <= 15 ? 5 : stdDev <= 30 ? 0 : -10;
  
  const finalScore = Math.min(100, Math.max(0, speedScore + consistencyBonus));
  
  let explanation: string;
  if (finalScore >= 90) {
    explanation = `Excellent responsiveness: ${avgResponse.toFixed(1)}min avg, highly consistent`;
  } else if (finalScore >= 70) {
    explanation = `Good responsiveness: ${avgResponse.toFixed(1)}min avg`;
  } else if (finalScore >= 50) {
    explanation = `Acceptable responsiveness: ${avgResponse.toFixed(1)}min avg, room for improvement`;
  } else {
    explanation = `Slow responsiveness: ${avgResponse.toFixed(1)}min avg, needs attention`;
  }
  
  return { score: finalScore, explanation };
}

/**
 * Calculate adaptability score based on iterations to alignment
 * Fewer iterations = better understanding and adaptability
 */
function calculateAdaptabilityScore(iterations: number, complexity: 'simple' | 'medium' | 'complex'): { score: number; explanation: string } {
  // Expected iterations by complexity
  const expectedIterations = {
    simple: 1,
    medium: 2,
    complex: 3,
  };
  
  const expected = expectedIterations[complexity];
  
  // Score based on how close to expected
  let score: number;
  if (iterations <= expected) {
    score = 100;
  } else if (iterations <= expected + 1) {
    score = 85;
  } else if (iterations <= expected + 2) {
    score = 70;
  } else if (iterations <= expected + 3) {
    score = 55;
  } else {
    score = Math.max(20, 40 - (iterations - expected - 3) * 5);
  }
  
  let explanation: string;
  if (iterations <= expected) {
    explanation = `Excellent adaptability: aligned in ${iterations} iteration(s), at or below expected for ${complexity} complexity`;
  } else if (score >= 70) {
    explanation = `Good adaptability: aligned in ${iterations} iterations`;
  } else {
    explanation = `Needs improvement: ${iterations} iterations to align (expected ${expected} for ${complexity})`;
  }
  
  return { score, explanation };
}

/**
 * Calculate attention score based on proactive behavior
 * Proactive updates and attention signals = higher trust
 */
function calculateAttentionScore(
  proactiveRatio: number, 
  attentionSignals?: number,
  communicationFrequency?: number
): { score: number; explanation: string } {
  // Base score from proactive ratio (0-1 scale)
  let baseScore = proactiveRatio * 80;
  
  // Attention signals bonus (if provided)
  if (attentionSignals !== undefined) {
    baseScore += attentionSignals * 15;
  } else {
    // If not provided, assume moderate attention
    baseScore += 7.5;
  }
  
  // Communication frequency bonus (optimal is 2-4 messages per hour during active coordination)
  if (communicationFrequency !== undefined) {
    if (communicationFrequency >= 2 && communicationFrequency <= 4) {
      baseScore += 5; // Optimal
    } else if (communicationFrequency >= 1 && communicationFrequency <= 6) {
      baseScore += 2.5; // Acceptable
    } else if (communicationFrequency > 6) {
      baseScore -= 5; // Over-communicating may indicate stress
    }
  }
  
  const finalScore = Math.min(100, Math.max(0, baseScore));
  
  let explanation: string;
  if (proactiveRatio >= 0.7) {
    explanation = `Highly proactive: ${(proactiveRatio * 100).toFixed(0)}% proactive updates`;
  } else if (proactiveRatio >= 0.4) {
    explanation = `Moderately proactive: ${(proactiveRatio * 100).toFixed(0)}% proactive updates`;
  } else {
    explanation = `Mostly reactive: only ${(proactiveRatio * 100).toFixed(0)}% proactive updates`;
  }
  
  return { score: finalScore, explanation };
}

/**
 * Calculate reliability score based on historical completion quality
 */
function calculateReliabilityScore(
  historicalRate: number, 
  stressIndicators?: number
): { score: number; explanation: string } {
  // Base score from historical completion rate
  let baseScore = historicalRate;
  
  // Stress penalty (high stress may predict issues)
  if (stressIndicators !== undefined && stressIndicators > 0.5) {
    const stressPenalty = (stressIndicators - 0.5) * 20;
    baseScore -= stressPenalty;
  }
  
  const finalScore = Math.min(100, Math.max(0, baseScore));
  
  let explanation: string;
  if (finalScore >= 95) {
    explanation = `Exceptional reliability: ${historicalRate.toFixed(0)}% historical completion`;
  } else if (finalScore >= 85) {
    explanation = `High reliability: ${historicalRate.toFixed(0)}% historical completion`;
  } else if (finalScore >= 70) {
    explanation = `Good reliability: ${historicalRate.toFixed(0)}% historical completion`;
  } else {
    explanation = `Reliability concerns: ${historicalRate.toFixed(0)}% historical completion`;
  }
  
  if (stressIndicators !== undefined && stressIndicators > 0.5) {
    explanation += ` (stress signals detected)`;
  }
  
  return { score: finalScore, explanation };
}

/**
 * Apply temporal weighting to scores (recent behavior weighted more heavily)
 */
function applyTemporalWeighting(score: number, timestamps?: string[]): number {
  if (!timestamps || timestamps.length === 0) {
    return score;
  }
  
  const now = new Date();
  const recentBehaviors = timestamps.filter(ts => {
    const diff = now.getTime() - new Date(ts).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // Within last 7 days
  });
  
  // If most behavior is recent, slight bonus; if old, slight penalty
  const recencyRatio = recentBehaviors.length / timestamps.length;
  if (recencyRatio >= 0.7) {
    return Math.min(100, score * 1.05); // 5% bonus for recent good behavior
  } else if (recencyRatio <= 0.3) {
    return score * 0.95; // 5% penalty for stale data
  }
  
  return score;
}

// ============================================================================
// Main CDI Calculation
// ============================================================================

export function calculateCDI(input: CDIInput): CDIResult {
  const { behavior, complexity, customThresholds } = input;
  
  // Calculate component scores
  const responsivenessResult = calculateResponsivenessScore(behavior.responseTimesMinutes);
  const adaptabilityResult = calculateAdaptabilityScore(behavior.iterationsToAlignment, complexity);
  const attentionResult = calculateAttentionScore(
    behavior.proactiveRatio, 
    behavior.attentionSignals,
    behavior.communicationFrequency
  );
  const reliabilityResult = calculateReliabilityScore(
    behavior.historicalCompletionRate,
    behavior.stressIndicators
  );
  
  // Build component scores with weights
  const components = {
    responsiveness: {
      score: responsivenessResult.score,
      weight: COMPONENT_WEIGHTS.responsiveness,
      weightedScore: responsivenessResult.score * COMPONENT_WEIGHTS.responsiveness,
      explanation: responsivenessResult.explanation,
    },
    adaptability: {
      score: adaptabilityResult.score,
      weight: COMPONENT_WEIGHTS.adaptability,
      weightedScore: adaptabilityResult.score * COMPONENT_WEIGHTS.adaptability,
      explanation: adaptabilityResult.explanation,
    },
    attention: {
      score: attentionResult.score,
      weight: COMPONENT_WEIGHTS.attention,
      weightedScore: attentionResult.score * COMPONENT_WEIGHTS.attention,
      explanation: attentionResult.explanation,
    },
    reliability: {
      score: reliabilityResult.score,
      weight: COMPONENT_WEIGHTS.reliability,
      weightedScore: reliabilityResult.score * COMPONENT_WEIGHTS.reliability,
      explanation: reliabilityResult.explanation,
    },
  };
  
  // Calculate raw CDI score
  let rawScore = 
    components.responsiveness.weightedScore +
    components.adaptability.weightedScore +
    components.attention.weightedScore +
    components.reliability.weightedScore;
  
  // Apply temporal weighting
  rawScore = applyTemporalWeighting(rawScore, behavior.behaviorTimestamps);
  
  const finalScore = Math.round(rawScore * 10) / 10;
  
  // Calculate complexity-adjusted thresholds
  const multiplier = COMPLEXITY_ADJUSTMENTS[complexity].thresholdMultiplier;
  const thresholds = customThresholds || BASE_THRESHOLDS;
  const appliedThreshold = {
    fullAutonomy: Math.round(thresholds.fullAutonomy * multiplier),
    conditionalAutonomy: Math.round(thresholds.conditionalAutonomy * multiplier),
  };
  
  // Determine autonomy level
  let autonomyLevel: 'full' | 'conditional' | 'restricted';
  let autonomyExplanation: string;
  
  if (finalScore >= appliedThreshold.fullAutonomy) {
    autonomyLevel = 'full';
    autonomyExplanation = `CDI ${finalScore} >= ${appliedThreshold.fullAutonomy}: Full autonomy granted. Agent can operate independently.`;
  } else if (finalScore >= appliedThreshold.conditionalAutonomy) {
    autonomyLevel = 'conditional';
    autonomyExplanation = `CDI ${finalScore} in range [${appliedThreshold.conditionalAutonomy}, ${appliedThreshold.fullAutonomy}): Conditional autonomy. Agent should check in at key decision points.`;
  } else {
    autonomyLevel = 'restricted';
    autonomyExplanation = `CDI ${finalScore} < ${appliedThreshold.conditionalAutonomy}: Restricted parameters. Human approval required for significant actions.`;
  }
  
  // Identify trust signals
  const trustSignals: string[] = [];
  if (components.responsiveness.score >= 85) trustSignals.push('Fast, consistent response times');
  if (components.adaptability.score >= 85) trustSignals.push('Quick alignment with minimal iterations');
  if (components.attention.score >= 85) trustSignals.push('Highly proactive communication');
  if (components.reliability.score >= 90) trustSignals.push('Strong historical track record');
  if (behavior.stressIndicators !== undefined && behavior.stressIndicators < 0.3) {
    trustSignals.push('Low stress indicators');
  }
  
  // Identify risk signals
  const riskSignals: string[] = [];
  if (components.responsiveness.score < 50) riskSignals.push('Slow response times');
  if (components.adaptability.score < 50) riskSignals.push('High iteration count to alignment');
  if (components.attention.score < 50) riskSignals.push('Mostly reactive, not proactive');
  if (components.reliability.score < 70) riskSignals.push('Historical completion concerns');
  if (behavior.stressIndicators !== undefined && behavior.stressIndicators > 0.7) {
    riskSignals.push('High stress indicators detected');
  }
  
  return {
    score: finalScore,
    components,
    autonomyLevel,
    autonomyExplanation,
    appliedThreshold,
    trustSignals,
    riskSignals,
    calculatedAt: new Date().toISOString(),
    algorithmVersion: ALGORITHM_VERSION,
  };
}

// ============================================================================
// Sample Data for Testing
// ============================================================================

export const SAMPLE_TRANSACTIONS = {
  // Simple: 1-artist, 2hr engagement
  simple: {
    name: 'Simple Engagement (1 artist, 2hr)',
    input: {
      behavior: {
        responseTimesMinutes: [3, 5, 4, 2, 6],
        communicationFrequency: 3,
        iterationsToAlignment: 1,
        proactiveRatio: 0.75,
        historicalCompletionRate: 98,
        stressIndicators: 0.1,
        attentionSignals: 0.8,
      },
      complexity: 'simple' as const,
    },
  },
  
  // Medium: 3-artists, 4hr engagement
  medium: {
    name: 'Medium Engagement (3 artists, 4hr)',
    input: {
      behavior: {
        responseTimesMinutes: [8, 12, 6, 15, 10, 7, 14],
        communicationFrequency: 4,
        iterationsToAlignment: 2,
        proactiveRatio: 0.6,
        historicalCompletionRate: 92,
        stressIndicators: 0.25,
        attentionSignals: 0.7,
      },
      complexity: 'medium' as const,
    },
  },
  
  // Complex: Wedding, 6+ artists, 8hr
  complex: {
    name: 'Complex Engagement (Wedding, 6+ artists, 8hr)',
    input: {
      behavior: {
        responseTimesMinutes: [5, 8, 12, 6, 10, 15, 8, 7, 20, 11],
        communicationFrequency: 5,
        iterationsToAlignment: 3,
        proactiveRatio: 0.65,
        historicalCompletionRate: 95,
        stressIndicators: 0.4,
        attentionSignals: 0.75,
      },
      complexity: 'complex' as const,
    },
  },
  
  // Edge case: Low trust scenario
  lowTrust: {
    name: 'Low Trust Scenario',
    input: {
      behavior: {
        responseTimesMinutes: [45, 120, 60, 90, 180],
        communicationFrequency: 1,
        iterationsToAlignment: 6,
        proactiveRatio: 0.2,
        historicalCompletionRate: 65,
        stressIndicators: 0.8,
        attentionSignals: 0.3,
      },
      complexity: 'medium' as const,
    },
  },
};

/**
 * Run sample calculations for demonstration
 */
export function runSampleCalculations(): { name: string; result: CDIResult }[] {
  return Object.values(SAMPLE_TRANSACTIONS).map(sample => ({
    name: sample.name,
    result: calculateCDI(sample.input),
  }));
}
