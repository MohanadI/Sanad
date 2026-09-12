import type {
  StructuredAction,
  PermissionId,
  PolicyEvaluateResponse,
  PolicyConfirmRequest,
  PolicyConfirmResponse,
  ExecutionGrantTokenPayload,
} from '@sanad/common';

export interface PolicyContext {
  userId: string;
  deviceId: string;
  action: StructuredAction;
  userGrants: ReadonlySet<PermissionId> | readonly PermissionId[];
  osPermissions: Record<string, boolean>;
  requestedAt?: string;
  candidateToken?: string;
}

export interface PolicyEngineClient {
  /**
   * Deterministically evaluates whether a StructuredAction is ALLOWED,
   * requires CONFIRMATION, or is DENIED.
   * Zero probabilistic models, zero network I/O during evaluation.
   */
  evaluate(context: PolicyContext): Promise<PolicyEvaluateResponse>;

  /**
   * Resolves an active confirmation challenge using user feedback.
   */
  resolveConfirmation(request: PolicyConfirmRequest): Promise<PolicyConfirmResponse>;

  /**
   * Verifies an execution grant token for tool execution.
   * Enforces single-use nonce and time-to-live validity.
   */
  verifyExecutionGrant(
    grantToken: string,
    expectedToolName?: string
  ): Promise<ExecutionGrantTokenPayload>;
}
