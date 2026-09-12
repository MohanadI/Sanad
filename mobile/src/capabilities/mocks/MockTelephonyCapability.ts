import { CallInitiateParams, CallInitiateResult, ITelephonyCapability } from '../interfaces/ITelephonyCapability';
import { CapabilityDisabledError } from '../types';
import { CAPABILITY_CONFIG } from '../capabilityRegistry';
import { t } from '../../localization/i18n';

export class MockTelephonyCapability implements ITelephonyCapability {
  public async initiateCall(_params: CallInitiateParams): Promise<CallInitiateResult> {
    if (!CAPABILITY_CONFIG.CAP_CONTACT_CALL.enabled) {
      throw new CapabilityDisabledError('CAP_CONTACT_CALL', t('gate_call_disabled'));
    }

    return {
      callPlaced: true,
      timestamp: new Date().toISOString(),
    };
  }
}

export const mockTelephonyCapability = new MockTelephonyCapability();
