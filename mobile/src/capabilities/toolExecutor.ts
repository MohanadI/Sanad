import { ToolExecutionRequest, ToolExecutionResponse, SecurityAuthorizationError } from './types';
import { CAPABILITY_CONFIG } from './capabilityRegistry';
import { TokenVerifier } from '../security/tokenVerifier';
import { auditLogger } from '../security/auditLogger';
import { aliasStore } from '../storage/AliasStore';
import { t } from '../localization/i18n';

export class BoundedToolExecutor {
  /**
   * Executes an authorized bounded tool request.
   * Conforms to COMPONENT_BOUNDARIES.md Section 5 invariants:
   * 1. Token Verification is first instruction.
   * 2. Capability feature gate check.
   * 3. Zero direct inter-tool chaining.
   * 4. Zero-PII audit logging.
   */
  public static async executeTool<TParams extends Record<string, unknown>, TResult = unknown>(
    request: ToolExecutionRequest<TParams>
  ): Promise<ToolExecutionResponse<TResult>> {
    const { toolName, targetCapability, executionGrantToken, parameters } = request;

    // 1. First instruction: Verify single-use execution grant token & ADR-004 actionHash
    const tokenResult = TokenVerifier.verifyExecutionGrantToken(
      executionGrantToken,
      targetCapability,
      parameters
    );
    if (!tokenResult.isValid) {
      auditLogger.logEvent({
        userId: 'local_user',
        requestedCapability: targetCapability,
        policyDecision: 'DENIED',
        reasonCode: `POL_ERR_${tokenResult.errorCode || 'TOKEN_INVALID'}`,
        executionStatus: 'ABORTED',
      });

      throw new SecurityAuthorizationError(
        tokenResult.errorCode || 'TOKEN_INVALID',
        t('error_unauthorized')
      );
    }

    // 2. Feature Gate Check
    const config = CAPABILITY_CONFIG[targetCapability];
    if (!config || !config.enabled) {
      auditLogger.logEvent({
        userId: 'local_user',
        requestedCapability: targetCapability,
        policyDecision: 'DENIED',
        reasonCode: 'POL_ERR_CAPABILITY_DISABLED',
        executionStatus: 'ABORTED',
      });

      throw new SecurityAuthorizationError(
        'CAPABILITY_DISABLED',
        t('error_unauthorized')
      );
    }

    // 3. Execute bounded tool logic
    try {
      let resultData: unknown = null;
      let arabicFeedback = '';

      switch (toolName) {
        case 'TOOL_ALIAS_REGISTER': {
          const aliasName = String(parameters.aliasName || '');
          const contactId = String(parameters.contactId || '');
          const contactName = String(parameters.contactName || '');

          const saved = await aliasStore.setAlias(aliasName, contactId, contactName);
          resultData = saved;
          arabicFeedback = t('alias_added_success');
          break;
        }

        case 'TOOL_ALIAS_REMOVE': {
          const aliasId = String(parameters.aliasId || '');
          const success = await aliasStore.removeAlias(aliasId);
          resultData = { removed: success };
          arabicFeedback = t('alias_deleted_success');
          break;
        }

        case 'TOOL_ASSISTANT_QUERY': {
          resultData = { status: 'ONLINE', time: new Date().toLocaleTimeString('ar-PS') };
          arabicFeedback = t('status_ready');
          break;
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      // 4. Audit Log
      auditLogger.logEvent({
        userId: 'local_user',
        requestedCapability: targetCapability,
        policyDecision: 'ALLOWED',
        reasonCode: 'POL_TOOL_EXECUTION_SUCCESS',
        executionStatus: 'SUCCESS',
        safeMetadata: {
          toolName,
        },
      });

      return {
        success: true,
        resultData: resultData as TResult,
        arabicFeedback,
        feedbackArabic: arabicFeedback,
        audioCue: 'EARCON_SUCCESS',
        safeAuditMetadata: { toolName },
      };
    } catch {
      auditLogger.logEvent({
        userId: 'local_user',
        requestedCapability: targetCapability,
        policyDecision: 'ALLOWED',
        reasonCode: 'POL_TOOL_EXECUTION_FAILED',
        executionStatus: 'FAILED',
        safeMetadata: { toolName },
      });

      return {
        success: false,
        arabicFeedback: t('error_general'),
        feedbackArabic: t('error_general'),
        audioCue: 'EARCON_ERROR',
      };
    }
  }
}
