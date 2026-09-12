import { earconService } from '../../accessibility/EarconService';
import { hapticService } from '../../accessibility/HapticService';
import { accessibilityManager } from '../../accessibility/AccessibilityManager';
import { t } from '../../localization/i18n';
import { EarconType, HapticType } from '../../accessibility/types';

export type AudioOutputRoute = 'HEADSET' | 'BLUETOOTH' | 'LOUDSPEAKER';

export interface LocationGateEvaluationOptions {
  audioRoute?: AudioOutputRoute;
  isScreenCurtainActive?: boolean;
  userConfirmedLoudspeaker?: boolean;
  approximateAreaArabic?: string;
  rawCoordinates?: { latitude: number; longitude: number };
}

export interface LocationGateDecision {
  allowed: boolean;
  requiresConfirmation: boolean;
  promptArabic?: string;
  earconCue?: EarconType;
  hapticCue?: HapticType;
  spokenOutput: string;
}

export class LocationAudioGuard {
  private currentAudioRoute: AudioOutputRoute = 'LOUDSPEAKER';

  public setAudioRoute(route: AudioOutputRoute): void {
    this.currentAudioRoute = route;
  }

  public getAudioRoute(): AudioOutputRoute {
    return this.currentAudioRoute;
  }

  /**
   * Evaluates acoustic privacy gate before vocalizing location per SEC-P2-02.
   * If on loudspeaker or Screen Curtain is active, requires spoken confirmation challenge.
   */
  public evaluateVocalizationGate(options: LocationGateEvaluationOptions = {}): LocationGateDecision {
    const route = options.audioRoute ?? this.currentAudioRoute;
    const curtainActive = options.isScreenCurtainActive ?? accessibilityManager.getState().isScreenCurtainActive;
    const confirmed = !!options.userConfirmedLoudspeaker;
    const coarseLocation = this.formatCoarseLandmark(options.approximateAreaArabic || 'رام الله - وسط البلد');

    // Private acoustic channel: Headset or Bluetooth, and Screen Curtain not active
    const isPrivateAudio = (route === 'HEADSET' || route === 'BLUETOOTH') && !curtainActive;

    if (isPrivateAudio || confirmed) {
      return {
        allowed: true,
        requiresConfirmation: false,
        spokenOutput: `موقعك الحالي التقريبي هو: ${coarseLocation}`,
      };
    }

    // Public / Sensitive situation: Loudspeaker or Screen Curtain active
    return {
      allowed: false,
      requiresConfirmation: true,
      promptArabic: t('location_privacy_warning'),
      earconCue: 'EARCON_CONFIRM_CHALLENGE',
      hapticCue: 'NOTIFICATION_WARNING',
      spokenOutput: t('location_privacy_warning'),
    };
  }

  /**
   * Executes audio & haptic challenge when public loudspeaker vocalization is attempted.
   */
  public async triggerPrivacyChallenge(): Promise<void> {
    await earconService.play('EARCON_CONFIRM_CHALLENGE');
    hapticService.trigger('NOTIFICATION_WARNING');
    accessibilityManager.announce(t('location_privacy_warning'), true);
  }

  /**
   * Invariant per SEC-P2-02 remediation #2:
   * Location output must default to coarse descriptive landmarks rather than GPS coordinates.
   * Redacts any raw decimal coordinates from speech output.
   */
  public formatCoarseLandmark(inputLocation: string): string {
    // Strip raw GPS coordinates like "31.9038, 35.2034" or "31.9038° N"
    const coordinateRegex = /\b\d{1,3}\.\d{3,}\s*(°\s*[NSEW])?/gi;
    const cleaned = inputLocation.replace(coordinateRegex, '[موقع عام]').trim();
    return cleaned.length > 0 ? cleaned : 'منطقة عامة غير محددة';
  }
}

export const locationAudioGuard = new LocationAudioGuard();
