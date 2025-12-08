/**
 * CDI Realtime Coordination Engine
 * 
 * Implements Violet Herod's Choreography Depth Index framework:
 * CDI(t) = Φ( Xₕ(t), Xᵣ(t), Xₙₑₜ(t) )
 * 
 * Where:
 * - Xₕ(t) = Human Attention Capacity (40% weight)
 * - Xᵣ(t) = Vendor Operational Reliability (40% weight)  
 * - Xₙₑₜ(t) = Network Coordination State (20% weight)
 * 
 * Outputs: CDI(t) ∈ [0, 1] = Real-time coordination readiness
 */

import { storage } from "./storage";

// ============= TYPES =============

export interface HumanAttentionCapacity {
  responseTimeConsistency: number;      // How consistent their response times are (0-100)
  engagementLevel: number;               // How engaged they are in coordination (0-100)
  reactionLatency: number;               // How quickly they respond to urgent messages (0-100)
  communicationFrequency: number;        // How often they communicate relative to event timeline (0-100)
  stressIndicators: number;              // Inverse: higher = more stress signals (0-100)
  score: number;                         // Xₕ(t) composite (0-1)
}

export interface VendorOperationalReliability {
  trajectoryStability: number;           // Consistency in delivery (0-100)
  planRobustness: number;                // How well they handle changes (0-100)
  historicalSuccessRate: number;         // Past performance on similar events (0-100)
  safetyMargins: number;                 // How early they complete tasks before deadlines (0-100)
  anomalyFrequency: number;              // Inverse: lower = fewer anomalies (0-100)
  score: number;                         // Xᵣ(t) composite (0-1)
}

export interface NetworkCoordinationState {
  activeConflicts: number;               // Count of simultaneous coordination issues (0-100)
  handoffSuccessRate: number;            // Recent handoff success rate (0-100)
  trustGradientDiversity: number;        // Variance in trust scores across network (0-100)
  multiPartyAlignment: number;           // How aligned client-vendor-planner are (0-100)
  taskOwnershipClarity: number;          // How clear who owns what (0-100)
  score: number;                         // Xₙₑₜ(t) composite (0-1)
}

// Phase states from QRCE (Quantum-Robotic Coordination Engine)
export type PhaseState = 
  | 'SUPERCRITICAL'    // CDI >= 0.85: Full autonomy, optimal coordination
  | 'CRITICAL'         // CDI 0.70-0.84: High confidence, minor supervision
  | 'SUBCRITICAL'      // CDI 0.50-0.69: Moderate coordination, increased oversight
  | 'DEGRADED'         // CDI 0.25-0.49: Low coordination, human backup required
  | 'EMERGENCY';       // CDI < 0.25: System pause, human takeover

// Control law output per white paper
export interface ControlLaw {
  speedLimitFactor: number;              // 0-1: throttle on coordination velocity
  handoffGate: 'OPEN' | 'SUPERVISED' | 'CLOSED';
  humanInterventionRequired: boolean;
}

export interface CDIRealtime {
  timestamp: Date;
  humanAttention: HumanAttentionCapacity;
  vendorReliability: VendorOperationalReliability;
  networkCoordination: NetworkCoordinationState;
  cdiScore: number;                      // Final CDI(t) ∈ [0, 1]
  phaseState: PhaseState;                // QRCE phase classification
  controlLaw: ControlLaw;                // Governor outputs
  trustLevel: 'exceptional' | 'high' | 'moderate' | 'low' | 'critical';
  autonomyLevel: 'full' | 'supervised' | 'paused';
  interventionRequired: boolean;
  interventionReason?: string;
  vectors: {                             // Raw component vectors
    humanCapacity: number;
    robotEntropy: number;                // Inverse of vendor reliability
    networkCoherence: number;
  };
}

// ============= COMPONENT 1: HUMAN ATTENTION CAPACITY =============

/**
 * Xₕ(t) = Human Coordination Capacity
 * Measures client's/planner's real-time attention readiness
 */
export async function computeHumanAttentionCapacity(
  userId: string,
  bookingId?: string
): Promise<HumanAttentionCapacity> {
  try {
    // Get recent message patterns
    const recentMessages = bookingId 
      ? await storage.getMessagesByBooking(bookingId)
      : [];

    const now = new Date();
    const last7Days = recentMessages.filter((m: any) => 
      m.createdAt && (now.getTime() - m.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    // 1. Response Time Consistency (0-100)
    let responseTimeConsistency = 100;
    if (last7Days.length > 2) {
      const responseTimes = computeResponseTimeDurations(last7Days);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const variance = responseTimes.reduce((sum, rt) => sum + Math.pow(rt - avgResponseTime, 2), 0) / responseTimes.length;
      const stdev = Math.sqrt(variance);
      // Lower variance = higher consistency
      responseTimeConsistency = Math.max(0, 100 - (stdev / 1000)); // Penalize high variance
    }

    // 2. Engagement Level (0-100) - based on message frequency and content length
    const engagementLevel = Math.min(100, (last7Days.length / 14) * 100); // 14 messages = max

    // 3. Reaction Latency (0-100) - how quickly they respond to time-sensitive messages
    let reactionLatency = 50; // Default to moderate
    const urgentMessages = last7Days.filter(m => 
      m.content?.toLowerCase().includes('urgent') ||
      m.content?.toLowerCase().includes('asap') ||
      m.content?.toLowerCase().includes('today')
    );
    if (urgentMessages.length > 0) {
      const urgentResponseTimes = computeResponseTimeDurations(urgentMessages);
      const avgUrgentResponse = urgentResponseTimes.reduce((a, b) => a + b, 0) / urgentResponseTimes.length;
      // Faster response to urgent = higher score
      reactionLatency = Math.max(0, Math.min(100, 100 - (avgUrgentResponse / 3600000))); // 1 hour = 0 points
    }

    // 4. Communication Frequency (0-100) - based on event timeline
    let communicationFrequency = 50;
    // Get booking event date if available
    if (bookingId) {
      const booking = await storage.getBooking(bookingId);
      if (booking?.eventDate) {
        const daysUntilEvent = Math.ceil((booking.eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const expectedFrequency = Math.max(2, 20 - daysUntilEvent); // More frequent as event approaches
        const actualFrequency = last7Days.length / 7;
        communicationFrequency = Math.min(100, (actualFrequency / expectedFrequency) * 100);
      }
    }

    // 5. Stress Indicators (0-100) - inverse: high = many distress signals
    let stressIndicators = 0;
    const stressKeywords = ['stressed', 'worried', 'anxious', 'confused', 'frustrated', 'upset', 'can\u0027t handle', 'too much'];
    const stressMessages = last7Days.filter(m =>
      stressKeywords.some(keyword => m.content?.toLowerCase().includes(keyword))
    );
    stressIndicators = Math.min(100, stressMessages.length * 20);

    const capacityScore = (
      responseTimeConsistency * 0.2 +
      engagementLevel * 0.25 +
      reactionLatency * 0.25 +
      communicationFrequency * 0.15 +
      (100 - stressIndicators) * 0.15
    ) / 100;

    return {
      responseTimeConsistency: Math.round(responseTimeConsistency),
      engagementLevel: Math.round(engagementLevel),
      reactionLatency: Math.round(reactionLatency),
      communicationFrequency: Math.round(communicationFrequency),
      stressIndicators: Math.round(stressIndicators),
      score: Math.max(0, Math.min(1, capacityScore))
    };
  } catch (error) {
    console.error('[CDI] Error computing human attention:', error);
    return {
      responseTimeConsistency: 50,
      engagementLevel: 50,
      reactionLatency: 50,
      communicationFrequency: 50,
      stressIndicators: 50,
      score: 0.5
    };
  }
}

// ============= COMPONENT 2: VENDOR OPERATIONAL RELIABILITY =============

/**
 * Xᵣ(t) = Robot/Vendor Operational Reliability
 * Measures vendor's consistency, responsiveness, and track record
 */
export async function computeVendorOperationalReliability(
  vendorId: string,
  bookingId?: string
): Promise<VendorOperationalReliability> {
  try {
    // Get vendor's recent bookings
    const vendorBookings = await storage.getBookingsByArtist(vendorId);
    const recentBookings = vendorBookings.slice(-20); // Last 20 bookings

    // 1. Trajectory Stability (0-100) - how consistent their delivery is
    let trajectoryStability = 100;
    if (recentBookings.length > 0) {
      const statusCounts = { completed: 0, declined: 0, pending: 0 };
      recentBookings.forEach(b => {
        statusCounts[b.status as keyof typeof statusCounts]++;
      });
      trajectoryStability = Math.round((statusCounts.completed / recentBookings.length) * 100);
    }

    // 2. Plan Robustness (0-100) - how well they handle last-minute changes
    let planRobustness = 75;
    const scheduleChanges = recentBookings.filter(b => {
      // Check if there were schedule changes (would be in booking history)
      return b.updatedAt && (b.updatedAt.getTime() - b.createdAt.getTime()) > 0;
    });
    if (scheduleChanges.length > 0) {
      // Vendor who handles changes well maintains stability
      planRobustness = Math.max(50, 100 - (scheduleChanges.length * 5));
    }

    // 3. Historical Success Rate (0-100)
    const completedBookings = recentBookings.filter(b => b.status === 'completed');
    const successRate = recentBookings.length > 0 
      ? (completedBookings.length / recentBookings.length) * 100 
      : 75;

    // 4. Safety Margins (0-100) - how early they commit/complete
    let safetyMargins = 75;
    const completedWithTime = completedBookings.filter(b => {
      const now = new Date();
      return b.eventDate && (b.eventDate.getTime() - now.getTime()) > 7 * 24 * 60 * 60 * 1000; // Committed > 1 week ahead
    });
    if (completedBookings.length > 0) {
      safetyMargins = Math.round((completedWithTime.length / completedBookings.length) * 100);
    }

    // 5. Anomaly Frequency (0-100) - lower = better
    // Anomalies = declined, cancelled, or pending bookings
    const anomalies = recentBookings.filter(b => b.status !== 'completed').length;
    const anomalyFrequency = Math.max(0, 100 - (anomalies * 5));

    const reliabilityScore = (
      trajectoryStability * 0.3 +
      planRobustness * 0.2 +
      successRate * 0.25 +
      safetyMargins * 0.15 +
      anomalyFrequency * 0.1
    ) / 100;

    return {
      trajectoryStability: Math.round(trajectoryStability),
      planRobustness: Math.round(planRobustness),
      historicalSuccessRate: Math.round(successRate),
      safetyMargins: Math.round(safetyMargins),
      anomalyFrequency: Math.round(anomalyFrequency),
      score: Math.max(0, Math.min(1, reliabilityScore))
    };
  } catch (error) {
    console.error('[CDI] Error computing vendor reliability:', error);
    return {
      trajectoryStability: 75,
      planRobustness: 75,
      historicalSuccessRate: 75,
      safetyMargins: 75,
      anomalyFrequency: 75,
      score: 0.75
    };
  }
}

// ============= COMPONENT 3: NETWORK COORDINATION STATE =============

/**
 * Xₙₑₜ(t) = Network Coordination State
 * Measures multi-party alignment across client-vendor-planner ecosystem
 */
export async function computeNetworkCoordinationState(
  bookingId: string
): Promise<NetworkCoordinationState> {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return getDefaultNetworkState();
    }

    // Get all messages for this booking (coordination events)
    const messages = await storage.getMessagesByBooking(bookingId);
    const now = new Date();

    // 1. Active Conflicts (0-100) - lower is better
    // Conflicts = escalated messages, support cases, status changes within 24h
    const recentMessages = messages.filter((m: any) => 
      m.createdAt && (now.getTime() - m.createdAt.getTime()) < 24 * 60 * 60 * 1000
    );
    const escalatedMessages = recentMessages.filter((m: any) => m.isEscalated);
    const activeConflicts = Math.min(100, escalatedMessages.length * 25);

    // 2. Handoff Success Rate (0-100)
    // Success = booking status transitioned smoothly without escalation
    let handoffSuccessRate = 90; // Default optimistic
    if (escalatedMessages.length > 0) {
      handoffSuccessRate = Math.max(50, 100 - (escalatedMessages.length * 10));
    }

    // 3. Trust Gradient Diversity (0-100) - lower is better
    // This measures how different the trust levels are across parties
    // For now, simplified: check if all parties are engaged
    const parties = [booking.clientId, booking.artistId, booking.plannerId].filter(Boolean);
    const partyEngagement = await Promise.all(
      parties.map(async (partyId) => {
        const partyMessages = messages.filter((m: any) => m.senderId === partyId);
        return Math.min(100, partyMessages.length * 10);
      })
    );
    
    const avgEngagement = partyEngagement.reduce((a, b) => a + b, 0) / partyEngagement.length;
    const engagementVariance = partyEngagement.reduce((sum, e) => sum + Math.pow(e - avgEngagement, 2), 0) / partyEngagement.length;
    const trustGradientDiversity = Math.min(100, Math.sqrt(engagementVariance));

    // 4. Multi-Party Alignment (0-100)
    // How aligned are the parties? Check for agreement in messages
    const alignmentMessages = messages.filter((m: any) => 
      m.content?.toLowerCase().includes('agree') ||
      m.content?.toLowerCase().includes('confirm') ||
      m.content?.toLowerCase().includes('perfect') ||
      m.content?.toLowerCase().includes('thanks')
    );
    const multiPartyAlignment = Math.min(100, (alignmentMessages.length / Math.max(1, messages.length)) * 100);

    // 5. Task Ownership Clarity (0-100)
    // How clear is it who owns what? Check for role clarity in messages
    const roleClarity = messages.filter((m: any) =>
      m.content?.toLowerCase().includes('i will') ||
      m.content?.toLowerCase().includes('you will') ||
      m.content?.toLowerCase().includes('responsible') ||
      m.content?.toLowerCase().includes('my job')
    ).length;
    const taskOwnershipClarity = Math.min(100, (roleClarity / Math.max(1, messages.length / 2)) * 100);

    const networkScore = (
      (100 - activeConflicts) * 0.25 +
      handoffSuccessRate * 0.25 +
      (100 - trustGradientDiversity) * 0.2 +
      multiPartyAlignment * 0.15 +
      taskOwnershipClarity * 0.15
    ) / 100;

    return {
      activeConflicts: Math.round(activeConflicts),
      handoffSuccessRate: Math.round(handoffSuccessRate),
      trustGradientDiversity: Math.round(trustGradientDiversity),
      multiPartyAlignment: Math.round(multiPartyAlignment),
      taskOwnershipClarity: Math.round(taskOwnershipClarity),
      score: Math.max(0, Math.min(1, networkScore))
    };
  } catch (error) {
    console.error('[CDI] Error computing network state:', error);
    return getDefaultNetworkState();
  }
}

// ============= CDI FUSION FUNCTION =============

/**
 * Φ = Main CDI Fusion Function
 * Combines three components into unified coordination readiness score
 */
export async function computeCDIRealtime(
  bookingId: string,
  clientId: string,
  vendorId?: string,
  plannerId?: string
): Promise<CDIRealtime> {
  try {
    // Compute all three components in parallel
    const [humanAttention, vendorReliability, networkCoord] = await Promise.all([
      computeHumanAttentionCapacity(clientId, bookingId),
      vendorId ? computeVendorOperationalReliability(vendorId, bookingId) : Promise.resolve(getDefaultVendorReliability()),
      computeNetworkCoordinationState(bookingId)
    ]);

    // Fuse components with weights from white paper
    const cdiScore = (
      humanAttention.score * 0.4 +      // Xₕ(t) = 40%
      vendorReliability.score * 0.4 +   // Xᵣ(t) = 40%
      networkCoord.score * 0.2           // Xₙₑₜ(t) = 20%
    );

    // Determine phase state per QRCE white paper
    let phaseState: PhaseState;
    if (cdiScore >= 0.85) phaseState = 'SUPERCRITICAL';
    else if (cdiScore >= 0.70) phaseState = 'CRITICAL';
    else if (cdiScore >= 0.50) phaseState = 'SUBCRITICAL';
    else if (cdiScore >= 0.25) phaseState = 'DEGRADED';
    else phaseState = 'EMERGENCY';

    // Determine trust level and autonomy
    let trustLevel: 'exceptional' | 'high' | 'moderate' | 'low' | 'critical';
    if (cdiScore >= 0.85) trustLevel = 'exceptional';
    else if (cdiScore >= 0.70) trustLevel = 'high';
    else if (cdiScore >= 0.50) trustLevel = 'moderate';
    else if (cdiScore >= 0.25) trustLevel = 'low';
    else trustLevel = 'critical';

    // Determine autonomy level based on CDI
    let autonomyLevel: 'full' | 'supervised' | 'paused';
    if (cdiScore >= 0.75) autonomyLevel = 'full';
    else if (cdiScore >= 0.40) autonomyLevel = 'supervised';
    else autonomyLevel = 'paused';

    // Calculate control law per white paper
    // Speed limit factor: throttle coordination velocity based on CDI
    const speedLimitFactor = Math.min(1.0, cdiScore / 0.7); // Full speed only at 70%+ CDI
    
    // Handoff gate: controls whether autonomous transitions are allowed
    let handoffGate: 'OPEN' | 'SUPERVISED' | 'CLOSED';
    if (cdiScore >= 0.75) handoffGate = 'OPEN';
    else if (cdiScore >= 0.40) handoffGate = 'SUPERVISED';
    else handoffGate = 'CLOSED';

    const controlLaw: ControlLaw = {
      speedLimitFactor: Math.round(speedLimitFactor * 100) / 100,
      handoffGate,
      humanInterventionRequired: cdiScore < 0.50
    };

    // Determine if intervention needed
    const interventionRequired = cdiScore < 0.50;
    let interventionReason: string | undefined;

    if (interventionRequired) {
      if (humanAttention.score < 0.4) {
        interventionReason = 'Client showing signs of distress or reduced engagement';
      } else if (vendorReliability.score < 0.4) {
        interventionReason = 'Vendor showing reliability concerns';
      } else if (networkCoord.score < 0.4) {
        interventionReason = 'Multi-party coordination breakdown detected';
      }
    }

    // Build raw vectors for debugging/monitoring
    const vectors = {
      humanCapacity: humanAttention.score,
      robotEntropy: 1 - vendorReliability.score, // Inverse: higher = more entropy/uncertainty
      networkCoherence: networkCoord.score
    };

    return {
      timestamp: new Date(),
      humanAttention,
      vendorReliability,
      networkCoordination: networkCoord,
      cdiScore: Math.round(cdiScore * 100) / 100,
      phaseState,
      controlLaw,
      trustLevel,
      autonomyLevel,
      interventionRequired,
      interventionReason,
      vectors
    };
  } catch (error) {
    console.error('[CDI] Error computing CDI realtime:', error);
    return getDefaultCDIRealtime();
  }
}

// ============= HELPER FUNCTIONS =============

function computeResponseTimeDurations(messages: any[]): number[] {
  const durations: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const prevTime = messages[i - 1].createdAt?.getTime() || 0;
    const currTime = messages[i].createdAt?.getTime() || 0;
    if (currTime > prevTime && messages[i].senderId !== messages[i - 1].senderId) {
      durations.push(currTime - prevTime);
    }
  }
  return durations;
}

function getDefaultVendorReliability(): VendorOperationalReliability {
  return {
    trajectoryStability: 75,
    planRobustness: 75,
    historicalSuccessRate: 75,
    safetyMargins: 75,
    anomalyFrequency: 75,
    score: 0.75
  };
}

function getDefaultNetworkState(): NetworkCoordinationState {
  return {
    activeConflicts: 25,
    handoffSuccessRate: 80,
    trustGradientDiversity: 30,
    multiPartyAlignment: 70,
    taskOwnershipClarity: 75,
    score: 0.70
  };
}

function getDefaultCDIRealtime(): CDIRealtime {
  return {
    timestamp: new Date(),
    humanAttention: { responseTimeConsistency: 50, engagementLevel: 50, reactionLatency: 50, communicationFrequency: 50, stressIndicators: 50, score: 0.5 },
    vendorReliability: getDefaultVendorReliability(),
    networkCoordination: getDefaultNetworkState(),
    cdiScore: 0.60,
    phaseState: 'SUBCRITICAL',
    controlLaw: {
      speedLimitFactor: 0.86,
      handoffGate: 'SUPERVISED',
      humanInterventionRequired: false
    },
    trustLevel: 'moderate',
    autonomyLevel: 'supervised',
    interventionRequired: false,
    vectors: {
      humanCapacity: 0.5,
      robotEntropy: 0.25,
      networkCoherence: 0.70
    }
  };
}

export default {
  computeHumanAttentionCapacity,
  computeVendorOperationalReliability,
  computeNetworkCoordinationState,
  computeCDIRealtime
};
