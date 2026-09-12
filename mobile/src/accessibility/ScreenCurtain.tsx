import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { accessibilityManager } from './AccessibilityManager';
import { t } from '../localization/i18n';
import { hapticService } from './HapticService';

export interface ScreenCurtainProps {
  isActive: boolean;
  onDismiss?: () => void;
}

/**
 * ScreenCurtain Component.
 * Full screen blackout overlay protecting privacy at checkpoints or in public.
 * Audio and TalkBack continue unobstructed.
 * Double-tapping anywhere on the curtain dismisses it with accessible spoken feedback.
 */
export const ScreenCurtain: React.FC<ScreenCurtainProps> = ({ isActive, onDismiss }) => {
  if (!isActive) return null;

  const handleDoubleTap = () => {
    hapticService.trigger('NOTIFICATION_SUCCESS');
    accessibilityManager.announce(t('a11y_screen_curtain_inactive'), true);
    if (onDismiss) {
      onDismiss();
    } else {
      accessibilityManager.setScreenCurtain(false);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={handleDoubleTap}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={t('a11y_screen_curtain_active')}
      accessibilityHint={t('a11y_hint_screen_curtain')}
    >
      <View style={styles.curtain} pointerEvents="auto" />
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  curtain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
});
