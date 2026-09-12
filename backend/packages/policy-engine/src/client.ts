import {
  type PolicyEvaluateResponse,
  type PolicyConfirmRequest,
  type PolicyConfirmResponse,
  type ExecutionGrantTokenPayload,
  MESSAGE_KEYS,
  t,
  SecurityTokenError,
  verifyCandidateActionBinding,
} from '@sanad/common';
import type { PolicyContext, PolicyEngineClient } from './types.js';
import { TokenService, type TokenServiceOptions } from './tokens.js';
import { evaluatePolicyDeterministic } from './evaluator.js';

export class DeterministicPolicyEngineClient implements PolicyEngineClient {
  private readonly tokenService: TokenService;
  private readonly secretKey: string;

  constructor(options: TokenServiceOptions = {}) {
    this.secretKey =
      options.secretKey || process.env.SANAD_POLICY_SECRET || 'sanad-dev-ephemeral-secret-key-32b';
    this.tokenService = new TokenService(options);
  }

  async evaluate(context: PolicyContext): Promise<PolicyEvaluateResponse> {
    if (context.candidateToken) {
      // Sovereign Privacy & Confused Deputy Mitigation (ADR-006)
      verifyCandidateActionBinding(this.secretKey, context.candidateToken, {
        intentId: context.action.intentId,
        targetCapability: context.action.targetCapability,
        slots: context.action.slots as Record<string, unknown>,
      });
    }

    return evaluatePolicyDeterministic(context, this.tokenService);
  }

  async resolveConfirmation(request: PolicyConfirmRequest): Promise<PolicyConfirmResponse> {
    // 1. Verify confirmation token (verifies signature, TTL, and anti-replay nonce)
    const payload = this.tokenService.verifyConfirmationToken(request.confirmationToken);

    // 2. Handle non-affirmative or cancellation responses
    if (request.userResponse !== 'AFFIRMATIVE') {
      const messageKey =
        request.userResponse === 'TIMEOUT'
          ? MESSAGE_KEYS.ACTION_TIMED_OUT
          : MESSAGE_KEYS.ACTION_CANCELLED;

      return {
        status: 'CANCELLED',
        arabicMessage: t(messageKey, 'ar-PS'),
        audioCue: 'EARCON_ACTION_CANCELLED',
        messageKey,
      };
    }

    // 3. User confirmed -> issue execution grant token (10-second TTL)
    const toolName = resolveToolForCapability(payload.targetCapability);
    const { token, expiresAt } = this.tokenService.generateExecutionGrantToken(
      payload.actionId,
      payload.userId,
      payload.targetCapability,
      toolName,
      payload.actionHash
    );

    return {
      status: 'CONFIRMED',
      executionGrantToken: token,
      expiresAt,
      messageKey: MESSAGE_KEYS.ACTION_CONFIRMED,
    };
  }

  async verifyExecutionGrant(
    grantToken: string,
    expectedToolName?: string
  ): Promise<ExecutionGrantTokenPayload> {
    const payload = this.tokenService.verifyExecutionGrantToken(grantToken);

    if (expectedToolName && payload.toolName !== expectedToolName) {
      throw new SecurityTokenError(
        'INVALID',
        `Grant token bound to tool '${payload.toolName}', but requested '${expectedToolName}'`
      );
    }

    return payload;
  }
}

function resolveToolForCapability(capability: string): string {
  switch (capability) {
    case 'CAP_ASSISTANT_QUERY':
      return 'TOOL_ASSISTANT_QUERY';
    case 'CAP_ACTION_CANCEL':
      return 'TOOL_ACTION_CANCEL';
    case 'CAP_ALIAS_MANAGE':
      return 'TOOL_ALIAS_LIST';
    default:
      return `TOOL_${capability}`;
  }
}
