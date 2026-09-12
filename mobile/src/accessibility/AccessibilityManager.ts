import { AccessibilityStateInfo } from './types';

interface AccessibilityInfoType {
  isScreenReaderEnabled: () => Promise<boolean>;
  addEventListener: (event: string, handler: (isEnabled: boolean) => void) => { remove: () => void };
  announceForAccessibility: (announcement: string) => void;
}

let accessibilityInfo: AccessibilityInfoType | undefined;

try {
  const rn = require('react-native');
  accessibilityInfo = rn.AccessibilityInfo;
} catch {
  // Fallback for non-React Native / Node environments
}

export class AccessibilityManager {
  private isScreenReaderEnabled: boolean = false;
  private isScreenCurtainActive: boolean = false;
  private isHighContrastActive: boolean = true;
  private speechRate: number = 1.0;
  private subscription: { remove: () => void } | null = null;
  private listeners: Set<(state: AccessibilityStateInfo) => void> = new Set();
  private announcementQueue: string[] = [];
  private isAnnouncing: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      if (accessibilityInfo?.isScreenReaderEnabled) {
        this.isScreenReaderEnabled = await accessibilityInfo.isScreenReaderEnabled();
      }
      if (accessibilityInfo?.addEventListener) {
        this.subscription = accessibilityInfo.addEventListener(
          'screenReaderChanged',
          (isEnabled: boolean) => {
            this.isScreenReaderEnabled = isEnabled;
            this.notifyListeners();
          }
        );
      }
    } catch {
      this.isScreenReaderEnabled = false;
    }
  }

  public getState(): AccessibilityStateInfo {
    return {
      isScreenReaderEnabled: this.isScreenReaderEnabled,
      isScreenCurtainActive: this.isScreenCurtainActive,
      isHighContrastActive: this.isHighContrastActive,
      speechRate: this.speechRate,
    };
  }

  public setScreenCurtain(active: boolean): void {
    this.isScreenCurtainActive = active;
    this.notifyListeners();
  }

  public toggleScreenCurtain(): boolean {
    this.isScreenCurtainActive = !this.isScreenCurtainActive;
    this.notifyListeners();
    return this.isScreenCurtainActive;
  }

  public setSpeechRate(rate: number): void {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
    this.notifyListeners();
  }

  public subscribe(listener: (state: AccessibilityStateInfo) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private queueTimer: NodeJS.Timeout | null = null;

  /**
   * Accessible announcement with queued fallback to prevent overlapping TalkBack speech.
   */
  public announce(message: string, isAssertive: boolean = false): void {
    if (!message) return;

    if (isAssertive) {
      this.clearQueue();
      try {
        accessibilityInfo?.announceForAccessibility?.(message);
      } catch {
        // ignore in test teardown
      }
      return;
    }

    this.announcementQueue.push(message);
    if (!this.isAnnouncing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.announcementQueue.length === 0) {
      this.isAnnouncing = false;
      return;
    }

    this.isAnnouncing = true;
    const nextMessage = this.announcementQueue.shift();
    if (nextMessage) {
      try {
        accessibilityInfo?.announceForAccessibility?.(nextMessage);
      } catch {
        // ignore in test teardown
      }
    }

    if (this.queueTimer) clearTimeout(this.queueTimer);
    this.queueTimer = setTimeout(() => {
      this.processQueue();
    }, 500);
  }

  public clearQueue(): void {
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
    this.announcementQueue = [];
    this.isAnnouncing = false;
  }

  public destroy(): void {
    this.clearQueue();
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.listeners.clear();
  }
}

export const accessibilityManager = new AccessibilityManager();
