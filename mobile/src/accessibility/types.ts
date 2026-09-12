export type EarconType =
  | 'EARCON_LISTENING_START'
  | 'EARCON_THINKING'
  | 'EARCON_CONFIRM_CHALLENGE'
  | 'EARCON_SUCCESS'
  | 'EARCON_CANCELLED'
  | 'EARCON_ERROR'
  | 'EARCON_EMERGENCY_COUNTDOWN';

export type HapticType =
  | 'IMPACT_LIGHT'
  | 'IMPACT_MEDIUM'
  | 'IMPACT_HEAVY'
  | 'NOTIFICATION_SUCCESS'
  | 'NOTIFICATION_WARNING'
  | 'NOTIFICATION_ERROR'
  | 'PULSE';

export type LiveRegionMode = 'none' | 'polite' | 'assertive';

export interface AccessibilityStateInfo {
  isScreenReaderEnabled: boolean;
  isScreenCurtainActive: boolean;
  isHighContrastActive: boolean;
  speechRate: number; // 0.5 to 2.0
}
