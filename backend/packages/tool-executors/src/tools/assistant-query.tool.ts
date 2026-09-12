import {
  CAPABILITIES,
  PERMISSIONS,
  MESSAGE_KEYS,
  t,
  computeActionHash,
  TamperedParametersError,
  type ExecutionAuthToken,
} from '@sanad/common';
import type { BoundedToolExecutor, ToolResult } from '../types.js';

export interface AssistantQueryInput {
  queryType: 'HELP' | 'SYSTEM_STATUS' | 'TIME_DATE' | 'BATTERY_STATUS' | 'CALL_LOG_STATUS' | 'GENERAL_GUIDANCE';
  topic?: string;
}

export interface AssistantQueryOutput {
  queryType: string;
  responseArabic: string;
  timestamp: string;
}

export class AssistantQueryTool implements BoundedToolExecutor<AssistantQueryInput, AssistantQueryOutput> {
  readonly toolName = 'TOOL_ASSISTANT_QUERY';
  readonly requiredCapability = CAPABILITIES.CAP_ASSISTANT_QUERY;
  readonly requiredPermission = PERMISSIONS.SYSTEM_QUERY;
  readonly isSensitive = false;

  async execute(
    input: AssistantQueryInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<AssistantQueryOutput>> {
    // 1. Sandbox Invariant: Token Verification & Parameter Hash Binding
    this.verifyGrant(authGrant, input);

    const now = new Date();
    let feedbackArabic: string;
    let messageKey: typeof MESSAGE_KEYS[keyof typeof MESSAGE_KEYS];

    switch (input.queryType) {
      case 'TIME_DATE': {
        const timeStr = now.toLocaleTimeString('ar-PS', { hour: '2-digit', minute: '2-digit' });
        messageKey = MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_TIME;
        feedbackArabic = t(messageKey, 'ar-PS', { currentTime: timeStr });
        break;
      }
      case 'BATTERY_STATUS': {
        // Battery status simulation for backend/device query bridge
        messageKey = MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_BATTERY;
        feedbackArabic = t(messageKey, 'ar-PS', { batteryLevel: 85 });
        break;
      }
      case 'SYSTEM_STATUS': {
        messageKey = MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_STATUS;
        feedbackArabic = t(messageKey, 'ar-PS');
        break;
      }
      case 'HELP':
      default: {
        messageKey = MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_HELP;
        feedbackArabic = t(messageKey, 'ar-PS');
        break;
      }
    }

    return {
      success: true,
      data: {
        queryType: input.queryType,
        responseArabic: feedbackArabic,
        timestamp: now.toISOString(),
      },
      feedbackArabic,
      audioCue: 'EARCON_QUERY_SUCCESS',
      messageKey,
      telemetry: {
        queryType: input.queryType,
      },
    };
  }

  private verifyGrant(grant: ExecutionAuthToken, input: AssistantQueryInput): void {
    if (!grant || !grant.token) {
      throw new Error('Missing execution authorization token.');
    }
    if (grant.targetCapability !== this.requiredCapability) {
      throw new Error(
        `Token capability mismatch: expected ${this.requiredCapability}, got ${grant.targetCapability}`
      );
    }
    if (new Date(grant.expiresAt).getTime() < Date.now()) {
      throw new Error('Execution authorization token has expired.');
    }

    const computedHash = computeActionHash(this.toolName, input);
    if (grant.actionHash !== computedHash) {
      throw new TamperedParametersError(
        `Execution parameters do not match signed authorization grant: expected ${grant.actionHash}, got ${computedHash}`
      );
    }
  }
}
