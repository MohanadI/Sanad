import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LiveRegionMode } from './types';
import { accessibilityManager } from './AccessibilityManager';

export interface LiveRegionProps {
  children: React.ReactNode;
  mode?: LiveRegionMode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  announceOnChange?: boolean;
}

/**
 * LiveRegion component.
 * Exposes dynamic system changes to Android TalkBack via accessibilityLiveRegion.
 * When announceOnChange is true, it also queues an explicit accessibility announcement.
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  mode = 'polite',
  style,
  textStyle,
  announceOnChange = true,
}) => {
  const previousContent = useRef<string>('');

  useEffect(() => {
    if (announceOnChange && typeof children === 'string' && children.trim() !== '') {
      if (children !== previousContent.current) {
        previousContent.current = children;
        accessibilityManager.announce(children, mode === 'assertive');
      }
    }
  }, [children, announceOnChange, mode]);

  return (
    <View
      accessible={true}
      accessibilityLiveRegion={mode}
      style={[styles.container, style]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  text: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
