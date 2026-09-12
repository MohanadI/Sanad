import { EarconType } from './types';
import { t } from '../localization/i18n';

interface AccessibilityInfoType {
  announceForAccessibility: (announcement: string) => void;
}

let accessibilityInfo: AccessibilityInfoType | undefined;

try {
  const rn = require('react-native');
  accessibilityInfo = rn.AccessibilityInfo;
} catch {
  // Fallback for non-React Native / Node environments
}

export interface IEarconService {
  play(type: EarconType): Promise<void>;
  stopAll(): void;
  getLastPlayed(): EarconType | null;
  getHistory(): EarconType[];
  clearHistory(): void;
}

export class EarconService implements IEarconService {
  private lastPlayed: EarconType | null = null;
  private history: EarconType[] = [];
  private isMuted: boolean = false;

  private earconDescriptions: Record<EarconType, () => string> = {
    EARCON_LISTENING_START: () => t('earcon_desc_listening_start'),
    EARCON_THINKING: () => t('earcon_desc_thinking'),
    EARCON_CONFIRM_CHALLENGE: () => t('earcon_desc_confirm'),
    EARCON_SUCCESS: () => t('earcon_desc_success'),
    EARCON_CANCELLED: () => t('earcon_desc_cancelled'),
    EARCON_ERROR: () => t('earcon_desc_error'),
    EARCON_EMERGENCY_COUNTDOWN: () => t('earcon_desc_emergency_countdown'),
  };

  public async play(type: EarconType): Promise<void> {
    if (this.isMuted) return;

    this.lastPlayed = type;
    this.history.push(type);

    // Announce to TalkBack for accessibility feedback if audio hardware is absent or in test mode
    const description = this.earconDescriptions[type]?.();
    if (description && accessibilityInfo?.announceForAccessibility) {
      accessibilityInfo.announceForAccessibility(description);
    }
  }

  public stopAll(): void {
    this.lastPlayed = null;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getLastPlayed(): EarconType | null {
    return this.lastPlayed;
  }

  public getHistory(): EarconType[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.lastPlayed = null;
  }
}

export const earconService = new EarconService();
