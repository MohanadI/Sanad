import { HapticType } from './types';

interface VibrationType {
  vibrate: (pattern: number | number[], repeat?: boolean) => void;
  cancel: () => void;
}

let vibration: VibrationType | undefined;
let currentPlatform: { OS: string } | undefined;

try {
  const rn = require('react-native');
  vibration = rn.Vibration;
  currentPlatform = rn.Platform;
} catch {
  // Fallback for non-React Native / Node environments
}

export interface IHapticService {
  trigger(type: HapticType): void;
  cancel(): void;
  getLastTriggered(): HapticType | null;
}

export class HapticService implements IHapticService {
  private lastTriggered: HapticType | null = null;
  private isEnabled: boolean = true;

  public trigger(type: HapticType): void {
    if (!this.isEnabled) return;
    this.lastTriggered = type;

    if (!vibration) return;

    if (currentPlatform?.OS === 'android') {
      switch (type) {
        case 'IMPACT_LIGHT':
          vibration.vibrate(20);
          break;
        case 'IMPACT_MEDIUM':
          vibration.vibrate(40);
          break;
        case 'IMPACT_HEAVY':
          vibration.vibrate(80);
          break;
        case 'NOTIFICATION_SUCCESS':
          // Two short pulses
          vibration.vibrate([0, 30, 60, 40]);
          break;
        case 'NOTIFICATION_WARNING':
          // Three pulses
          vibration.vibrate([0, 50, 50, 50, 50, 50]);
          break;
        case 'NOTIFICATION_ERROR':
          // Long buzz
          vibration.vibrate(200);
          break;
        case 'PULSE':
          vibration.vibrate(30);
          break;
      }
    } else {
      vibration.vibrate(40);
    }
  }

  public cancel(): void {
    vibration?.cancel();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getLastTriggered(): HapticType | null {
    return this.lastTriggered;
  }
}

export const hapticService = new HapticService();
