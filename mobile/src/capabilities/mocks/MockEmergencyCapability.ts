import { EmergencyTriggerParams, EmergencyTriggerResult, IEmergencyCapability } from '../interfaces/IEmergencyCapability';
import { CapabilityDisabledError } from '../types';
import { CAPABILITY_CONFIG } from '../capabilityRegistry';
import { t } from '../../localization/i18n';
import { autonomousEmergencyService } from '../emergency/AutonomousEmergencyService';

export class MockEmergencyCapability implements IEmergencyCapability {
  public async triggerEmergency(_params: EmergencyTriggerParams): Promise<EmergencyTriggerResult> {
    if (!CAPABILITY_CONFIG.CAP_EMERGENCY_TRIGGER.enabled) {
      throw new CapabilityDisabledError('CAP_EMERGENCY_TRIGGER', t('gate_emergency_disabled'));
    }

    return {
      triggered: true,
      channel: 'LOCAL_NATIVE_DIALER',
      offlineResilient: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async cancelEmergency(reason?: string): Promise<boolean> {
    return autonomousEmergencyService.cancelEmergency(reason);
  }
}

export const mockEmergencyCapability = new MockEmergencyCapability();
