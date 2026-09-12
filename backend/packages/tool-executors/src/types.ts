import type { CapabilityId, ExecutionAuthToken, MessageKey } from '@sanad/common';

export interface ToolResultError {
  readonly code: string;
  readonly messageKey: MessageKey;
  readonly messageArabic: string;
  readonly messageEnglish: string;
  readonly incidentId?: string;
}

export interface ToolResult<TOutput = unknown> {
  readonly success: boolean;
  readonly data?: TOutput;
  readonly feedbackArabic: string;
  readonly audioCue?: string;
  readonly messageKey?: MessageKey;
  readonly error?: ToolResultError;
  readonly telemetry?: Record<string, unknown>;
}

export interface BoundedToolExecutor<TInput = unknown, TOutput = unknown> {
  readonly toolName: string;
  readonly requiredCapability: CapabilityId;
  readonly requiredPermission: string;
  readonly isSensitive: boolean;

  execute(
    input: TInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<TOutput>>;
}
