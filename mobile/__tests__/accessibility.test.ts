import { earconService } from '../src/accessibility/EarconService';
import { hapticService } from '../src/accessibility/HapticService';
import { accessibilityManager } from '../src/accessibility/AccessibilityManager';
import { spacing } from '../src/theme/spacing';

describe('Accessibility Foundation', () => {
  beforeEach(() => {
    earconService.clearHistory();
    hapticService.cancel();
  });

  describe('EarconService', () => {
    it('plays earcons and logs history', async () => {
      await earconService.play('EARCON_LISTENING_START');
      await earconService.play('EARCON_THINKING');
      await earconService.play('EARCON_SUCCESS');

      expect(earconService.getLastPlayed()).toBe('EARCON_SUCCESS');
      expect(earconService.getHistory()).toEqual([
        'EARCON_LISTENING_START',
        'EARCON_THINKING',
        'EARCON_SUCCESS',
      ]);
    });

    it('respects mute setting', async () => {
      earconService.setMuted(true);
      await earconService.play('EARCON_ERROR');
      expect(earconService.getLastPlayed()).toBeNull();
      earconService.setMuted(false);
    });
  });

  describe('HapticService', () => {
    it('triggers haptic patterns without error', () => {
      hapticService.trigger('NOTIFICATION_SUCCESS');
      expect(hapticService.getLastTriggered()).toBe('NOTIFICATION_SUCCESS');

      hapticService.trigger('IMPACT_HEAVY');
      expect(hapticService.getLastTriggered()).toBe('IMPACT_HEAVY');

      hapticService.trigger('NOTIFICATION_WARNING');
      expect(hapticService.getLastTriggered()).toBe('NOTIFICATION_WARNING');
    });

    it('cancels haptics', () => {
      expect(() => hapticService.cancel()).not.toThrow();
    });
  });

  describe('AccessibilityManager', () => {
    it('toggles screen curtain correctly', () => {
      const initial = accessibilityManager.getState().isScreenCurtainActive;
      const toggled = accessibilityManager.toggleScreenCurtain();
      expect(toggled).toBe(!initial);

      accessibilityManager.setScreenCurtain(false);
      expect(accessibilityManager.getState().isScreenCurtainActive).toBe(false);
    });

    it('bounds speech rate between 0.5 and 2.0', () => {
      accessibilityManager.setSpeechRate(0.2);
      expect(accessibilityManager.getState().speechRate).toBe(0.5);

      accessibilityManager.setSpeechRate(2.5);
      expect(accessibilityManager.getState().speechRate).toBe(2.0);

      accessibilityManager.setSpeechRate(1.2);
      expect(accessibilityManager.getState().speechRate).toBe(1.2);
    });

    it('subscribes to state updates', () => {
      let latestState = accessibilityManager.getState();
      const unsubscribe = accessibilityManager.subscribe((state) => {
        latestState = state;
      });

      accessibilityManager.setScreenCurtain(true);
      expect(latestState.isScreenCurtainActive).toBe(true);

      accessibilityManager.setScreenCurtain(false);
      unsubscribe();
    });
  });

  describe('Design System Touch Target Safety', () => {
    it('enforces minimum touch target of at least 48dp for TalkBack', () => {
      expect(spacing.minTouchTarget).toBeGreaterThanOrEqual(48);
    });
  });
});
