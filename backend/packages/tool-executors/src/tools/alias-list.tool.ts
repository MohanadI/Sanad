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

export interface AliasItem {
  readonly id: string;
  readonly alias: string;
  readonly contactName: string;
}

export interface AliasListInput {
  filter?: string;
}

export interface AliasListOutput {
  readonly count: number;
  readonly aliases: readonly AliasItem[];
}

export class AliasListTool implements BoundedToolExecutor<AliasListInput, AliasListOutput> {
  readonly toolName = 'TOOL_ALIAS_LIST';
  readonly requiredCapability = CAPABILITIES.CAP_ALIAS_MANAGE;
  readonly requiredPermission = PERMISSIONS.ALIAS_READ;
  readonly isSensitive = false;

  private mockStore: AliasItem[] = [
    { id: 'als_1', alias: 'مرتي', contactName: 'هدى' },
    { id: 'als_2', alias: 'اخوي', contactName: 'احمد' },
  ];

  constructor(initialAliases?: AliasItem[]) {
    if (initialAliases) {
      this.mockStore = [...initialAliases];
    }
  }

  async execute(
    input: AliasListInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<AliasListOutput>> {
    this.verifyGrant(authGrant, input);

    let items = this.mockStore;
    if (input.filter) {
      items = items.filter((a) => a.alias.includes(input.filter!));
    }

    const count = items.length;
    let feedbackArabic: string;
    let messageKey: typeof MESSAGE_KEYS[keyof typeof MESSAGE_KEYS];

    if (count === 0) {
      messageKey = MESSAGE_KEYS.TOOL_ALIAS_LIST_EMPTY;
      feedbackArabic = t(messageKey, 'ar-PS');
    } else {
      messageKey = MESSAGE_KEYS.TOOL_ALIAS_LIST_RESULT;
      feedbackArabic = t(messageKey, 'ar-PS', { count });
    }

    return {
      success: true,
      data: {
        count,
        aliases: items,
      },
      feedbackArabic,
      audioCue: 'EARCON_QUERY_SUCCESS',
      messageKey,
      telemetry: {
        resultCount: count,
      },
    };
  }

  private verifyGrant(grant: ExecutionAuthToken, input: AliasListInput): void {
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
