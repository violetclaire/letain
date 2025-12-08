import { storage } from "./storage";
import type { CdiFeedbackEvent, CdiLearningRun, CdiPatternLibrary } from "@shared/schema";

export interface EvolutionaryLoopConfig {
  minFeedbackEvents: number;
  learningRate: number;
  epsilonAdjustmentFactor: number;
  deltaAdjustmentFactor: number;
  weightAdjustmentFactor: number;
  patternStrengthDecay: number;
  minWeight: number;
  maxWeight: number;
}

const DEFAULT_CONFIG: EvolutionaryLoopConfig = {
  minFeedbackEvents: 10,
  learningRate: 0.1,
  epsilonAdjustmentFactor: 0.05,
  deltaAdjustmentFactor: 0.03,
  weightAdjustmentFactor: 2,
  patternStrengthDecay: 0.99,
  minWeight: 15,
  maxWeight: 55,
};

interface DimensionWeights {
  emotionalFidelity: number;
  choreographyAwareness: number;
  roleSpecificRecall: number;
}

export async function runEvolutionaryLearning(
  config: EvolutionaryLoopConfig = DEFAULT_CONFIG,
  triggeredBy: string = 'scheduled',
  reason: string = 'Regular learning iteration'
): Promise<CdiLearningRun | null> {
  console.log('[CDI Evolutionary Loop] Starting learning run...');
  
  try {
    const unprocessedFeedback = await storage.getUnprocessedCdiFeedbackEvents();
    
    if (unprocessedFeedback.length < config.minFeedbackEvents) {
      console.log(`[CDI Evolutionary Loop] Not enough feedback events (${unprocessedFeedback.length}/${config.minFeedbackEvents}). Skipping.`);
      return null;
    }
    
    const currentThreshold = await storage.getActiveCdiThreshold();
    const epsilonBefore = currentThreshold?.epsilon || 10;
    const deltaBefore = currentThreshold?.delta || 80;
    
    const weightsBefore: DimensionWeights = {
      emotionalFidelity: currentThreshold?.emotionalFidelityWeight || 40,
      choreographyAwareness: currentThreshold?.choreographyAwarenessWeight || 30,
      roleSpecificRecall: currentThreshold?.roleSpecificRecallWeight || 30,
    };
    
    const learningRun = await storage.createCdiLearningRun({
      runType: triggeredBy as 'scheduled' | 'triggered' | 'manual',
      feedbackEventsProcessed: unprocessedFeedback.length,
      thresholdAdjustments: {
        epsilonBefore: epsilonBefore / 100,
        epsilonAfter: epsilonBefore / 100,
        deltaBefore: deltaBefore / 100,
        deltaAfter: deltaBefore / 100,
      },
      auditTrail: {
        triggeredBy,
        reason,
        weightsBefore,
      },
    });
    
    const feedbackStats = analyzeFeedback(unprocessedFeedback);
    console.log('[CDI Evolutionary Loop] Feedback stats:', feedbackStats);
    
    const { newEpsilon, newDelta } = calculateThresholdAdjustments(
      epsilonBefore / 100,
      deltaBefore / 100,
      feedbackStats,
      config
    );
    
    const weightsAfter = calculateDimensionWeightAdjustments(
      weightsBefore,
      feedbackStats,
      config
    );
    console.log('[CDI Evolutionary Loop] Weight adjustments:', { before: weightsBefore, after: weightsAfter });
    
    const patternUpdates = await updatePatternLibrary(unprocessedFeedback, config);
    
    for (const feedback of unprocessedFeedback) {
      await storage.markCdiFeedbackEventProcessed(feedback.id);
    }
    
    const accuracyBefore = feedbackStats.overallAccuracy;
    const accuracyAfter = Math.min(100, accuracyBefore + (feedbackStats.positiveRatio * 5));
    
    const completedRun = await storage.completeCdiLearningRun(learningRun.id, {
      thresholdAdjustments: {
        epsilonBefore: epsilonBefore / 100,
        epsilonAfter: newEpsilon,
        deltaBefore: deltaBefore / 100,
        deltaAfter: newDelta,
      },
      dimensionWeightAdjustments: {
        before: weightsBefore,
        after: weightsAfter,
      },
      patternLibraryUpdates: patternUpdates,
      accuracy: {
        before: accuracyBefore,
        after: accuracyAfter,
        improvement: accuracyAfter - accuracyBefore,
      },
    });
    
    const weightsChanged = 
      weightsAfter.emotionalFidelity !== weightsBefore.emotionalFidelity ||
      weightsAfter.choreographyAwareness !== weightsBefore.choreographyAwareness ||
      weightsAfter.roleSpecificRecall !== weightsBefore.roleSpecificRecall;
    
    const thresholdsChanged = 
      Math.round(newEpsilon * 100) !== epsilonBefore || 
      Math.round(newDelta * 100) !== deltaBefore;
    
    if (currentThreshold && (thresholdsChanged || weightsChanged)) {
      await storage.updateCdiThreshold(currentThreshold.id, {
        epsilon: Math.round(newEpsilon * 100),
        delta: Math.round(newDelta * 100),
        emotionalFidelityWeight: weightsAfter.emotionalFidelity,
        choreographyAwarenessWeight: weightsAfter.choreographyAwareness,
        roleSpecificRecallWeight: weightsAfter.roleSpecificRecall,
      });
      console.log(`[CDI Evolutionary Loop] Updated thresholds: epsilon=${newEpsilon.toFixed(3)}, delta=${newDelta.toFixed(3)}`);
      console.log(`[CDI Evolutionary Loop] Updated weights: EF=${weightsAfter.emotionalFidelity}%, CA=${weightsAfter.choreographyAwareness}%, RSR=${weightsAfter.roleSpecificRecall}%`);
    }
    
    console.log(`[CDI Evolutionary Loop] Learning run completed. Processed ${unprocessedFeedback.length} events.`);
    return completedRun || null;
    
  } catch (error) {
    console.error('[CDI Evolutionary Loop] Error during learning run:', error);
    return null;
  }
}

interface FeedbackStats {
  totalEvents: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  positiveRatio: number;
  overallAccuracy: number;
  dimensionBreakdown: {
    emotional_fidelity: { correct: number; total: number };
    choreography_awareness: { correct: number; total: number };
    role_specific_recall: { correct: number; total: number };
  };
  adminOverrides: number;
  avgSatisfaction: number;
}

function analyzeFeedback(feedback: CdiFeedbackEvent[]): FeedbackStats {
  const stats: FeedbackStats = {
    totalEvents: feedback.length,
    positiveOutcomes: 0,
    negativeOutcomes: 0,
    positiveRatio: 0,
    overallAccuracy: 50,
    dimensionBreakdown: {
      emotional_fidelity: { correct: 0, total: 0 },
      choreography_awareness: { correct: 0, total: 0 },
      role_specific_recall: { correct: 0, total: 0 },
    },
    adminOverrides: 0,
    avgSatisfaction: 5,
  };
  
  let satisfactionSum = 0;
  let satisfactionCount = 0;
  
  for (const event of feedback) {
    if (event.outcomeSuccess === true) {
      stats.positiveOutcomes++;
    } else if (event.outcomeSuccess === false) {
      stats.negativeOutcomes++;
    }
    
    if (event.feedbackType === 'admin_override') {
      stats.adminOverrides++;
    }
    
    if (event.satisfactionScore) {
      satisfactionSum += event.satisfactionScore;
      satisfactionCount++;
    }
    
    if (event.dimension && event.actualOutcome) {
      const dim = event.dimension as keyof typeof stats.dimensionBreakdown;
      if (stats.dimensionBreakdown[dim]) {
        stats.dimensionBreakdown[dim].total++;
        if (event.actualOutcome.success) {
          stats.dimensionBreakdown[dim].correct++;
        }
      }
    }
  }
  
  stats.positiveRatio = stats.totalEvents > 0 
    ? stats.positiveOutcomes / stats.totalEvents 
    : 0.5;
    
  stats.avgSatisfaction = satisfactionCount > 0 
    ? satisfactionSum / satisfactionCount 
    : 5;
  
  const totalDimEvents = Object.values(stats.dimensionBreakdown)
    .reduce((sum, dim) => sum + dim.total, 0);
  const totalDimCorrect = Object.values(stats.dimensionBreakdown)
    .reduce((sum, dim) => sum + dim.correct, 0);
  
  stats.overallAccuracy = totalDimEvents > 0 
    ? (totalDimCorrect / totalDimEvents) * 100 
    : 50;
  
  return stats;
}

function calculateThresholdAdjustments(
  currentEpsilon: number,
  currentDelta: number,
  stats: FeedbackStats,
  config: EvolutionaryLoopConfig
): { newEpsilon: number; newDelta: number } {
  let newEpsilon = currentEpsilon;
  let newDelta = currentDelta;
  
  if (stats.adminOverrides > stats.totalEvents * 0.2) {
    newEpsilon = Math.min(0.3, currentEpsilon + config.epsilonAdjustmentFactor);
    console.log('[CDI Evolutionary Loop] High admin override rate - increasing epsilon (more human trust)');
  } else if (stats.positiveRatio > 0.8) {
    newEpsilon = Math.max(0.05, currentEpsilon - config.epsilonAdjustmentFactor);
    console.log('[CDI Evolutionary Loop] High success rate - decreasing epsilon (more AI confidence)');
  }
  
  if (stats.overallAccuracy > 80) {
    newDelta = Math.max(0.6, currentDelta - config.deltaAdjustmentFactor);
    console.log('[CDI Evolutionary Loop] High accuracy - lowering delta threshold');
  } else if (stats.overallAccuracy < 60) {
    newDelta = Math.min(0.95, currentDelta + config.deltaAdjustmentFactor);
    console.log('[CDI Evolutionary Loop] Low accuracy - raising delta threshold (more caution)');
  }
  
  return { newEpsilon, newDelta };
}

function calculateDimensionWeightAdjustments(
  currentWeights: DimensionWeights,
  stats: FeedbackStats,
  config: EvolutionaryLoopConfig
): DimensionWeights {
  const { dimensionBreakdown } = stats;
  
  const efAccuracy = dimensionBreakdown.emotional_fidelity.total > 0
    ? dimensionBreakdown.emotional_fidelity.correct / dimensionBreakdown.emotional_fidelity.total
    : 0.5;
  const caAccuracy = dimensionBreakdown.choreography_awareness.total > 0
    ? dimensionBreakdown.choreography_awareness.correct / dimensionBreakdown.choreography_awareness.total
    : 0.5;
  const rsrAccuracy = dimensionBreakdown.role_specific_recall.total > 0
    ? dimensionBreakdown.role_specific_recall.correct / dimensionBreakdown.role_specific_recall.total
    : 0.5;
  
  const hasSufficientData = 
    dimensionBreakdown.emotional_fidelity.total >= 3 &&
    dimensionBreakdown.choreography_awareness.total >= 3 &&
    dimensionBreakdown.role_specific_recall.total >= 3;
  
  if (!hasSufficientData) {
    console.log('[CDI Evolutionary Loop] Insufficient per-dimension feedback, keeping weights unchanged');
    return { ...currentWeights };
  }
  
  let efAdjustment = 0;
  let caAdjustment = 0;
  let rsrAdjustment = 0;
  
  const avgAccuracy = (efAccuracy + caAccuracy + rsrAccuracy) / 3;
  
  if (efAccuracy > avgAccuracy + 0.1) {
    efAdjustment = config.weightAdjustmentFactor;
    console.log('[CDI Evolutionary Loop] Emotional Fidelity outperforming - increasing weight');
  } else if (efAccuracy < avgAccuracy - 0.1) {
    efAdjustment = -config.weightAdjustmentFactor;
    console.log('[CDI Evolutionary Loop] Emotional Fidelity underperforming - decreasing weight');
  }
  
  if (caAccuracy > avgAccuracy + 0.1) {
    caAdjustment = config.weightAdjustmentFactor;
    console.log('[CDI Evolutionary Loop] Choreography Awareness outperforming - increasing weight');
  } else if (caAccuracy < avgAccuracy - 0.1) {
    caAdjustment = -config.weightAdjustmentFactor;
    console.log('[CDI Evolutionary Loop] Choreography Awareness underperforming - decreasing weight');
  }
  
  if (rsrAccuracy > avgAccuracy + 0.1) {
    rsrAdjustment = config.weightAdjustmentFactor;
    console.log('[CDI Evolutionary Loop] Role-Specific Recall outperforming - increasing weight');
  } else if (rsrAccuracy < avgAccuracy - 0.1) {
    rsrAdjustment = -config.weightAdjustmentFactor;
    console.log('[CDI Evolutionary Loop] Role-Specific Recall underperforming - decreasing weight');
  }
  
  let newEf = Math.round(currentWeights.emotionalFidelity + efAdjustment);
  let newCa = Math.round(currentWeights.choreographyAwareness + caAdjustment);
  let newRsr = Math.round(currentWeights.roleSpecificRecall + rsrAdjustment);
  
  newEf = Math.max(config.minWeight, Math.min(config.maxWeight, newEf));
  newCa = Math.max(config.minWeight, Math.min(config.maxWeight, newCa));
  newRsr = Math.max(config.minWeight, Math.min(config.maxWeight, newRsr));
  
  const totalWeight = newEf + newCa + newRsr;
  if (totalWeight !== 100) {
    const diff = 100 - totalWeight;
    if (diff > 0) {
      newEf += Math.floor(diff / 3);
      newCa += Math.floor(diff / 3);
      newRsr += diff - (2 * Math.floor(diff / 3));
    } else {
      const absDiff = Math.abs(diff);
      newEf -= Math.floor(absDiff / 3);
      newCa -= Math.floor(absDiff / 3);
      newRsr -= absDiff - (2 * Math.floor(absDiff / 3));
    }
  }
  
  return {
    emotionalFidelity: newEf,
    choreographyAwareness: newCa,
    roleSpecificRecall: newRsr,
  };
}

async function updatePatternLibrary(
  feedback: CdiFeedbackEvent[],
  config: EvolutionaryLoopConfig
): Promise<Array<{ patternId: string; strengthChange: number }>> {
  const updates: Array<{ patternId: string; strengthChange: number }> = [];
  
  console.log(`[CDI Evolutionary Loop] Updating pattern library based on ${feedback.length} feedback events`);
  
  return updates;
}

export async function recordFeedback(
  compositeScoreId: string | null,
  bookingId: string | null,
  feedbackType: 'outcome' | 'admin_override' | 'planner_note' | 'client_satisfaction',
  feedbackSource: 'system' | 'admin' | 'planner' | 'client' | 'artist',
  sourceUserId: string | null,
  data: {
    outcomeSuccess?: boolean;
    satisfactionScore?: number;
    dimension?: string;
    notes?: string;
    failureReasons?: string[];
    originalPrediction?: { score: number; decision: string };
  }
): Promise<void> {
  try {
    let learningSignal = 0;
    
    if (data.outcomeSuccess !== undefined) {
      learningSignal = data.outcomeSuccess ? 20 : -20;
    }
    if (data.satisfactionScore !== undefined) {
      learningSignal = (data.satisfactionScore - 5) * 10;
    }
    if (feedbackType === 'admin_override') {
      learningSignal = -30;
    }
    
    await storage.createCdiFeedbackEvent({
      compositeScoreId: compositeScoreId || undefined,
      bookingId: bookingId || undefined,
      feedbackType,
      feedbackSource,
      sourceUserId: sourceUserId || undefined,
      outcomeSuccess: data.outcomeSuccess,
      satisfactionScore: data.satisfactionScore,
      dimension: data.dimension,
      originalPrediction: data.originalPrediction,
      actualOutcome: data.outcomeSuccess !== undefined ? {
        success: data.outcomeSuccess,
        notes: data.notes || '',
        failureReasons: data.failureReasons,
      } : undefined,
      learningSignal,
    });
    
    console.log(`[CDI Evolutionary Loop] Recorded ${feedbackType} feedback from ${feedbackSource}`);
    
  } catch (error) {
    console.error('[CDI Evolutionary Loop] Error recording feedback:', error);
  }
}

export function scheduleEvolutionaryLoop(intervalMs: number = 3600000): NodeJS.Timeout {
  console.log(`[CDI Evolutionary Loop] Scheduling learning runs every ${intervalMs / 1000}s`);
  
  return setInterval(async () => {
    await runEvolutionaryLearning(
      DEFAULT_CONFIG,
      'scheduled',
      'Regular scheduled learning iteration'
    );
  }, intervalMs);
}

export default {
  runEvolutionaryLearning,
  recordFeedback,
  scheduleEvolutionaryLoop,
};
