import { secureStorage } from './SecureStorage';
import { tokenStore } from './TokenStore';
import { consentVault } from './ConsentVault';
import { aliasStore } from './AliasStore';
import { accessibilityManager } from '../accessibility/AccessibilityManager';
import { earconService } from '../accessibility/EarconService';
import { hapticService } from '../accessibility/HapticService';
import { t } from '../localization/i18n';

export class EmergencyPurgeService {
  /**
   * Executes immediate cryptographic zero-trace wipe of all sensitive local data.
   * Adheres to Sanad Data Classification Policy Section 5.
   */
  public static async executeEmergencyPurge(): Promise<void> {
    try {
      // 1. Clear all token vaults
      await tokenStore.clearAllTokens();

      // 2. Clear all user consent records
      await consentVault.clearAllConsents();

      // 3. Clear all contact aliases
      await aliasStore.clearAllAliases();

      // 4. Wipe physical secure storage vault
      await secureStorage.clear();

      // 5. Accessible auditory & haptic notification
      hapticService.trigger('NOTIFICATION_WARNING');
      await earconService.play('EARCON_CANCELLED');
      accessibilityManager.announce(t('confirm_purge_success'), true);
    } catch (error) {
      accessibilityManager.announce(t('error_general'), true);
      throw error;
    }
  }
}
