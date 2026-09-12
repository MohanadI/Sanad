import {
  CAPABILITIES,
  MESSAGE_KEYS,
  t,
  computeActionHash,
  TamperedParametersError,
  type ExecutionAuthToken,
} from '@sanad/common';
import type { BoundedToolExecutor, ToolResult } from '../types.js';

export interface ActionCancelInput {
  reason?: string;
}

export interface ActionCancelOutput {
  cancelled: boolean;
  cancelledAt: string;
}

export class ActionCancelTool implements BoundedToolExecutor<ActionCancelInput, ActionCancelOutput> {
  readonly toolName = 'TOOL_ACTION_CANCEL';
  readonly requiredCapability = CAPABILITIES.CAP_ACTION_CANCEL;
  readonly requiredPermission = ''; // No permission required (vital safety override)
  readonly isSensitive = false;

  async execute(
    input: ActionCancelInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<ActionCancelOutput>> {
    if (authGrant && authGrant.actionHash) {
      const computedHash = computeActionHash(this.toolName, input);
      if (authGrant.actionHash !== computedHash) {
        throw new TamperedParametersError(
          `Execution parameters do not match signed authorization grant: expected ${authGrant.actionHash}, got ${computedHash}`
        );
      }
    }

    // Immediate preempt logic
    const now = new Date();
    const feedbackArabic = t(MESSAGE_KEYS.TOOL_CANCEL_SUCCESS, 'ar-PS');

    return {
      success: true,
      data: {
        cancelled: true,
        cancelledAt: now.toISOString(),
      },
      feedbackArabic,
      audioCue: 'EARCON_ACTION_CANCELLED',
      messageKey: MESSAGE_KEYS.TOOL_CANCEL_SUCCESS,
      telemetry: {
        preempted: true,
        reason: input.reason ?? 'USER_ABORT',
      },
    };
  }
}
