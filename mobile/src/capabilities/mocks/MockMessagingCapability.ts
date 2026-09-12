import { IMessagingCapability, SendMessageParams, SendMessageResult } from '../interfaces/IMessagingCapability';
import { CapabilityDisabledError } from '../types';
import { CAPABILITY_CONFIG } from '../capabilityRegistry';
import { t } from '../../localization/i18n';

export class MockMessagingCapability implements IMessagingCapability {
  public async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    if (!CAPABILITY_CONFIG.CAP_MESSAGE_SEND.enabled) {
      throw new CapabilityDisabledError('CAP_MESSAGE_SEND', t('gate_sms_disabled'));
    }

    return {
      messageDispatched: true,
      timestamp: new Date().toISOString(),
    };
  }
}

export const mockMessagingCapability = new MockMessagingCapability();
