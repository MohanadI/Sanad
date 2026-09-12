import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { hapticService } from './HapticService';
import { HapticType } from './types';

export interface AccessibleButtonProps {
  label: string;
  accessibilityHint?: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'danger' | 'secondary' | 'outline';
  disabled?: boolean;
  hapticType?: HapticType;
  style?: ViewStyle;
  textStyle?: TextStyle;
  minHeight?: number;
  testID?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  accessibilityHint,
  onPress,
  variant = 'primary',
  disabled = false,
  hapticType = 'IMPACT_LIGHT',
  style,
  textStyle,
  minHeight = spacing.minTouchTarget,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    hapticService.trigger(hapticType);
    onPress(e);
  };

  const getVariantStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'danger':
        return {
          button: { backgroundColor: colors.danger, borderColor: colors.danger },
          text: { color: colors.dangerText },
        };
      case 'secondary':
        return {
          button: { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
          text: { color: colors.textPrimary },
        };
      case 'outline':
        return {
          button: { backgroundColor: 'transparent', borderColor: colors.accent, borderWidth: 2 },
          text: { color: colors.accent },
        };
      case 'primary':
      default:
        return {
          button: { backgroundColor: colors.primary, borderColor: colors.primary },
          text: { color: colors.primaryText },
        };
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handlePress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        styles.baseButton,
        { minHeight, minWidth: spacing.minTouchTarget },
        variantStyle.button,
        disabled && styles.disabledButton,
        isFocused && styles.focusedOutline,
        style,
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.baseText,
          variantStyle.text,
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1,
  },
  baseText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.4,
    backgroundColor: '#333333',
    borderColor: '#444444',
  },
  disabledText: {
    color: '#888888',
  },
  focusedOutline: {
    borderWidth: 3,
    borderColor: colors.focusOutline,
  },
});
