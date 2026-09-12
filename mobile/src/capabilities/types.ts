import { CapabilityId } from '../permissions/types';

export class CapabilityDisabledError extends Error {
  public capabilityId: CapabilityId;
  public arabicExplanation: string;

  constructor(capabilityId: CapabilityId, arabicExplanation: string) {
    super(`Capability '${capabilityId}' is strictly gated/disabled.`);
    this.name = 'CapabilityDisabledError';
    this.capabilityId = capabilityId;
    this.arabicExplanation = arabicExplanation;
  }
}

export class SecurityAuthorizationError extends Error {
  public reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = 'SecurityAuthorizationError';
    this.reasonCode = reasonCode;
  }
}

export interface ToolExecutionRequest<TParams = Record<string, unknown>> {
  toolName: string;
  targetCapability: CapabilityId;
  executionGrantToken: string;
  parameters: TParams;
}

export interface ToolExecutionResponse<TResult = unknown> {
  success: boolean;
  resultData?: TResult;
  arabicFeedback: string;
  feedbackArabic?: string;
  audioCue: 'EARCON_SUCCESS' | 'EARCON_ERROR' | 'EARCON_CANCELLED';
  safeAuditMetadata?: Record<string, string | number | boolean>;
}
