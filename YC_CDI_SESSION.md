# CDI (Choreography Depth Index) Algorithm - Coding Session Transcript

**Project:** Beauvette Secretary - Booking platform for beauty professionals  
**Date:** February 4, 2026  
**AI Tool:** Replit Agent (Claude)

---

## User Request

> Build the CDI (Choreography Depth Index) trust scoring API as a standalone service. This should be a backend metric that quantifies human-system coordination readiness.

---

## Agent Response

I'll build the CDI algorithm with a 4-component scoring system, API endpoints, and sample data for testing across complexity levels.

**Created task list:**
1. Create CDI data models and schema for scoring inputs/outputs
2. Build CDI scoring algorithm with 4 components (responsiveness, adaptability, attention, reliability)
3. Create POST /api/calculate-cdi endpoint with proper error handling
4. Add sample data for 3 complexity levels (simple, medium, complex)
5. Create test endpoint to run sample calculations and verify algorithm

---

## Implementation

### Step 1: CDI Service (`server/cdiService.ts`)

```typescript
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
  behavior: CoordinationBehavior;
  complexity: 'simple' | 'medium' | 'complex';
  customThresholds?: CDIThresholds;
}

export interface CDIResult {
  score: number;  // 0-100
  components: {
    responsiveness: CDIComponentScore;
    adaptability: CDIComponentScore;
    attention: CDIComponentScore;
    reliability: CDIComponentScore;
  };
  autonomyLevel: 'full' | 'conditional' | 'restricted';
  autonomyExplanation: string;
  appliedThreshold: { fullAutonomy: number; conditionalAutonomy: number; };
  trustSignals: string[];
  riskSignals: string[];
  calculatedAt: string;
  algorithmVersion: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM_VERSION = '1.0.0';

const BASE_THRESHOLDS = {
  fullAutonomy: 85,
  conditionalAutonomy: 70,
};

const COMPLEXITY_ADJUSTMENTS = {
  simple: { thresholdMultiplier: 0.95 },    // Lower thresholds for low stakes
  medium: { thresholdMultiplier: 1.0 },      // Standard
  complex: { thresholdMultiplier: 1.05 },    // Higher thresholds for high stakes
};

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

  const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  
  // Calculate consistency (standard deviation)
  const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponse, 2), 0) / responseTimes.length;
  const stdDev = Math.sqrt(variance);
  
  // Score based on average response time
  // < 5 min = excellent, < 15 min = good, < 60 min = acceptable
  let speedScore: number;
  if (avgResponse <= 5) speedScore = 100;
  else if (avgResponse <= 15) speedScore = 90 - ((avgResponse - 5) * 1);
  else if (avgResponse <= 60) speedScore = 80 - ((avgResponse - 15) * 0.5);
  else if (avgResponse <= 240) speedScore = 55 - ((avgResponse - 60) * 0.15);
  else speedScore = Math.max(20, 30 - ((avgResponse - 240) * 0.05));
  
  // Consistency bonus
  const consistencyBonus = stdDev <= 5 ? 10 : stdDev <= 15 ? 5 : stdDev <= 30 ? 0 : -10;
  
  const finalScore = Math.min(100, Math.max(0, speedScore + consistencyBonus));
  
  let explanation: string;
  if (finalScore >= 90) explanation = `Excellent responsiveness: ${avgResponse.toFixed(1)}min avg, highly consistent`;
  else if (finalScore >= 70) explanation = `Good responsiveness: ${avgResponse.toFixed(1)}min avg`;
  else if (finalScore >= 50) explanation = `Acceptable responsiveness: ${avgResponse.toFixed(1)}min avg`;
  else explanation = `Slow responsiveness: ${avgResponse.toFixed(1)}min avg, needs attention`;
  
  return { score: finalScore, explanation };
}

/**
 * Calculate adaptability score based on iterations to alignment
 */
function calculateAdaptabilityScore(iterations: number, complexity: 'simple' | 'medium' | 'complex'): { score: number; explanation: string } {
  const expectedIterations = { simple: 1, medium: 2, complex: 3 };
  const expected = expectedIterations[complexity];
  
  let score: number;
  if (iterations <= expected) score = 100;
  else if (iterations <= expected + 1) score = 85;
  else if (iterations <= expected + 2) score = 70;
  else if (iterations <= expected + 3) score = 55;
  else score = Math.max(20, 40 - (iterations - expected - 3) * 5);
  
  let explanation = iterations <= expected 
    ? `Excellent adaptability: aligned in ${iterations} iteration(s), at or below expected for ${complexity} complexity`
    : `Needs improvement: ${iterations} iterations to align (expected ${expected} for ${complexity})`;
  
  return { score, explanation };
}

/**
 * Calculate attention score based on proactive behavior
 */
function calculateAttentionScore(proactiveRatio: number, attentionSignals?: number, communicationFrequency?: number): { score: number; explanation: string } {
  let baseScore = proactiveRatio * 80;
  
  if (attentionSignals !== undefined) baseScore += attentionSignals * 15;
  else baseScore += 7.5;
  
  // Communication frequency bonus (optimal: 2-4 messages/hour)
  if (communicationFrequency !== undefined) {
    if (communicationFrequency >= 2 && communicationFrequency <= 4) baseScore += 5;
    else if (communicationFrequency >= 1 && communicationFrequency <= 6) baseScore += 2.5;
    else if (communicationFrequency > 6) baseScore -= 5; // Over-communicating = stress signal
  }
  
  const finalScore = Math.min(100, Math.max(0, baseScore));
  
  let explanation = proactiveRatio >= 0.7 
    ? `Highly proactive: ${(proactiveRatio * 100).toFixed(0)}% proactive updates`
    : proactiveRatio >= 0.4 
    ? `Moderately proactive: ${(proactiveRatio * 100).toFixed(0)}% proactive updates`
    : `Mostly reactive: only ${(proactiveRatio * 100).toFixed(0)}% proactive updates`;
  
  return { score: finalScore, explanation };
}

/**
 * Calculate reliability score based on historical completion
 */
function calculateReliabilityScore(historicalRate: number, stressIndicators?: number): { score: number; explanation: string } {
  let baseScore = historicalRate;
  
  // Stress penalty
  if (stressIndicators !== undefined && stressIndicators > 0.5) {
    baseScore -= (stressIndicators - 0.5) * 20;
  }
  
  const finalScore = Math.min(100, Math.max(0, baseScore));
  
  let explanation = finalScore >= 95 ? `Exceptional reliability: ${historicalRate.toFixed(0)}% historical completion`
    : finalScore >= 85 ? `High reliability: ${historicalRate.toFixed(0)}% historical completion`
    : finalScore >= 70 ? `Good reliability: ${historicalRate.toFixed(0)}% historical completion`
    : `Reliability concerns: ${historicalRate.toFixed(0)}% historical completion`;
  
  if (stressIndicators !== undefined && stressIndicators > 0.5) {
    explanation += ` (stress signals detected)`;
  }
  
  return { score: finalScore, explanation };
}

/**
 * Apply temporal weighting (recent behavior weighted more heavily)
 */
function applyTemporalWeighting(score: number, timestamps?: string[]): number {
  if (!timestamps || timestamps.length === 0) return score;
  
  const now = new Date();
  const recentBehaviors = timestamps.filter(ts => {
    const diff = now.getTime() - new Date(ts).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // Within last 7 days
  });
  
  const recencyRatio = recentBehaviors.length / timestamps.length;
  if (recencyRatio >= 0.7) return Math.min(100, score * 1.05); // 5% bonus
  else if (recencyRatio <= 0.3) return score * 0.95; // 5% penalty
  
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
  const attentionResult = calculateAttentionScore(behavior.proactiveRatio, behavior.attentionSignals, behavior.communicationFrequency);
  const reliabilityResult = calculateReliabilityScore(behavior.historicalCompletionRate, behavior.stressIndicators);
  
  // Build weighted components
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
  
  // Calculate raw score
  let rawScore = components.responsiveness.weightedScore +
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
  
  // Identify trust/risk signals
  const trustSignals: string[] = [];
  const riskSignals: string[] = [];
  
  if (components.responsiveness.score >= 85) trustSignals.push('Fast, consistent response times');
  if (components.adaptability.score >= 85) trustSignals.push('Quick alignment with minimal iterations');
  if (components.attention.score >= 85) trustSignals.push('Highly proactive communication');
  if (components.reliability.score >= 90) trustSignals.push('Strong historical track record');
  
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
```

---

### Step 2: API Endpoints (`server/routes.ts`)

```typescript
import { calculateCDI, runSampleCalculations, CDIInput, SAMPLE_TRANSACTIONS } from "./cdiService";

// ========== CDI (Choreography Depth Index) API ==========

// POST /api/calculate-cdi - Calculate trust score from behavioral data
app.post("/api/calculate-cdi", async (req, res) => {
  try {
    const { behavior, complexity, customThresholds } = req.body;
    
    // Validate required fields
    if (!behavior) {
      return res.status(400).json({ 
        error: "Missing required field: behavior",
        required: {
          behavior: {
            responseTimesMinutes: "number[] - Response times in minutes",
            communicationFrequency: "number - Messages per hour",
            iterationsToAlignment: "number - Iterations to reach alignment",
            proactiveRatio: "number (0-1) - Proactive vs reactive ratio",
            historicalCompletionRate: "number (0-100) - Historical completion quality",
          },
          complexity: "string - 'simple' | 'medium' | 'complex'"
        }
      });
    }
    
    if (!complexity || !['simple', 'medium', 'complex'].includes(complexity)) {
      return res.status(400).json({ 
        error: "Invalid or missing complexity field",
        validValues: ['simple', 'medium', 'complex'],
        description: {
          simple: "1-artist, 2hr engagement",
          medium: "3-artists, 4hr engagement",
          complex: "Wedding, 6+ artists, 8hr"
        }
      });
    }
    
    const input: CDIInput = { behavior, complexity, customThresholds };
    const result = calculateCDI(input);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "CDI calculation failed" });
  }
});

// GET /api/cdi/samples - Sample calculations across complexity levels
app.get("/api/cdi/samples", async (req, res) => {
  const samples = runSampleCalculations();
  res.json({
    description: "Sample CDI calculations demonstrating trust scoring",
    samples,
    sampleInputs: SAMPLE_TRANSACTIONS,
  });
});

// GET /api/cdi/docs - Algorithm documentation
app.get("/api/cdi/docs", async (req, res) => {
  res.json({
    name: "Choreography Depth Index (CDI)",
    version: "1.0.0",
    description: "Trust scoring API for autonomous agent permission systems.",
    components: { /* ... */ },
    autonomyLevels: {
      full: { threshold: ">= 85", description: "Agent operates independently" },
      conditional: { threshold: "70-84", description: "Check in at key decisions" },
      restricted: { threshold: "< 70", description: "Human approval required" },
    },
  });
});
```

---

## Testing

### Test 1: Documentation Endpoint
```bash
$ curl -s http://localhost:5000/api/cdi/docs

{"name":"Choreography Depth Index (CDI)","version":"1.0.0","description":"Trust scoring API that quantifies coordination quality for autonomous agent permission systems..."}
```

### Test 2: Sample Calculations
```bash
$ curl -s http://localhost:5000/api/cdi/samples

{
  "samples": [
    {
      "name": "Simple Engagement (1 artist, 2hr)",
      "result": {
        "score": 93.8,
        "autonomyLevel": "full",
        "trustSignals": ["Fast, consistent response times", "Quick alignment", "Strong track record"]
      }
    },
    {
      "name": "Low Trust Scenario",
      "result": {
        "score": 39,
        "autonomyLevel": "restricted",
        "riskSignals": ["Slow response times", "High iteration count", "Mostly reactive", "High stress indicators"]
      }
    }
  ]
}
```

### Test 3: Calculate CDI for Custom Input
```bash
$ curl -s -X POST http://localhost:5000/api/calculate-cdi \
  -H "Content-Type: application/json" \
  -d '{
    "behavior": {
      "responseTimesMinutes": [3, 5, 4, 2, 6],
      "communicationFrequency": 3,
      "iterationsToAlignment": 1,
      "proactiveRatio": 0.75,
      "historicalCompletionRate": 98
    },
    "complexity": "simple"
  }'

{
  "score": 92.6,
  "components": {
    "responsiveness": { "score": 100, "explanation": "Excellent responsiveness: 4.0min avg, highly consistent" },
    "adaptability": { "score": 100, "explanation": "Excellent adaptability: aligned in 1 iteration" },
    "attention": { "score": 72.5, "explanation": "Highly proactive: 75% proactive updates" },
    "reliability": { "score": 98, "explanation": "Exceptional reliability: 98% historical completion" }
  },
  "autonomyLevel": "full",
  "autonomyExplanation": "CDI 92.6 >= 81: Full autonomy granted. Agent can operate independently.",
  "trustSignals": ["Fast, consistent response times", "Quick alignment with minimal iterations", "Strong historical track record"],
  "riskSignals": []
}
```

### Test 4: Error Handling
```bash
$ curl -s -X POST http://localhost:5000/api/calculate-cdi \
  -H "Content-Type: application/json" \
  -d '{}'

{
  "error": "Missing required field: behavior",
  "required": {
    "behavior": {
      "responseTimesMinutes": "number[] - Response times in minutes",
      "communicationFrequency": "number - Messages per hour",
      ...
    }
  }
}
```

---

## Results Summary

| Scenario | CDI Score | Autonomy Level | Key Signals |
|----------|-----------|----------------|-------------|
| Simple (1 artist, 2hr) | 93.8 | Full | Fast responses, quick alignment |
| Medium (3 artists, 4hr) | 87.6 | Full | Consistent, proactive |
| Complex (Wedding, 6+ artists) | 88.9 | Conditional | High stakes = higher threshold |
| Low Trust | 39.0 | Restricted | Slow, reactive, stressed |

---

## Why This Matters

This algorithm provides infrastructure for the next generation of AI agents:

1. **Earned Autonomy** - Agents gain trust through demonstrated coordination quality, not hardcoded permissions
2. **Observable Signals** - Converts intuitive human signals (hesitation, attention, stress) into verifiable metrics
3. **Context-Aware** - Complexity adjustments mean high-stakes situations require higher trust thresholds
4. **Transparent** - Every score comes with component breakdowns and explanations

The CDI represents a shift from "what can this agent do?" to "what has this agent earned the right to do?"

---

*Session completed. All endpoints tested and operational.*
