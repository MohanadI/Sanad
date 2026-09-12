import { ILocationCapability, LocationReadResult, LocationShareParams, LocationShareResult } from '../interfaces/ILocationCapability';
import { CapabilityDisabledError } from '../types';
import { CAPABILITY_CONFIG } from '../capabilityRegistry';
import { t } from '../../localization/i18n';

export class MockLocationCapability implements ILocationCapability {
  public async readCurrentLocation(): Promise<LocationReadResult> {
    if (!CAPABILITY_CONFIG.CAP_LOCATION_READ.enabled) {
      throw new CapabilityDisabledError('CAP_LOCATION_READ', t('gate_location_disabled'));
    }

    return {
      approximateAreaArabic: 'رام الله - وسط البلد',
      timestamp: new Date().toISOString(),
    };
  }

  public async shareLocation(_params: LocationShareParams): Promise<LocationShareResult> {
    if (!CAPABILITY_CONFIG.CAP_LOCATION_SHARE.enabled) {
      throw new CapabilityDisabledError('CAP_LOCATION_SHARE', t('gate_location_disabled'));
    }

    return {
      shared: true,
      timestamp: new Date().toISOString(),
    };
  }
}

export const mockLocationCapability = new MockLocationCapability();
