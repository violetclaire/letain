import { validateScopedPermit } from "./scoped-permit";
import type { ActionRequest, FakeToolResult, ScopedPermit } from "./types";

export class FakeProtectedTool {
  private readonly uses = new Map<string, number>();
  private readonly revokedPermitIds = new Set<string>();

  revoke(permitId: string): void {
    this.revokedPermitIds.add(permitId);
  }

  simulate(request: ActionRequest, permit: ScopedPermit, now: string): FakeToolResult {
    const validation = validateScopedPermit({
      permit,
      request,
      now,
      usage: {
        uses: this.uses.get(permit.permitId) ?? 0,
        revokedPermitIds: this.revokedPermitIds,
      },
    });
    if (!validation.accepted) {
      return {
        executed: false,
        reasonCode: validation.reasonCode,
        simulatedRecord: null,
      };
    }

    this.uses.set(permit.permitId, (this.uses.get(permit.permitId) ?? 0) + 1);
    return {
      executed: true,
      reasonCode: "SIMULATED_EXECUTION_ONLY",
      simulatedRecord: {
        requestId: request.requestId,
        tool: request.tool,
        action: request.action,
        target: request.target,
      },
    };
  }
}
