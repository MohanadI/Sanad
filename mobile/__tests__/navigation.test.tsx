import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationProvider, useNavigation } from '../src/navigation/NavigationContext';
import { accessibilityManager } from '../src/accessibility/AccessibilityManager';

const TestNavigationConsumer: React.FC = () => {
  const { state, navigate, goBack } = useNavigation();

  return (
    <>
      <Text testID="current-route">{state.currentRoute}</Text>
      <Text testID="prev-route">{state.previousRoute || 'none'}</Text>
      <Text testID="btn-to-voice" onPress={() => navigate('voice')}>Go to Voice</Text>
      <Text testID="btn-to-settings" onPress={() => navigate('settings')}>Go to Settings</Text>
      <Text testID="btn-back" onPress={() => goBack()}>Back</Text>
    </>
  );
};

describe('Navigation Structure & Accessible Transitions', () => {
  afterEach(() => {
    accessibilityManager.clearQueue();
  });
  it('initializes with home route by default', () => {
    const { getByTestId } = render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    expect(getByTestId('current-route').props.children).toBe('home');
    expect(getByTestId('prev-route').props.children).toBe('none');
  });

  it('updates current and previous routes on navigate and goBack', () => {
    const { getByTestId } = render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    fireEvent.press(getByTestId('btn-to-voice'));
    expect(getByTestId('current-route').props.children).toBe('voice');
    expect(getByTestId('prev-route').props.children).toBe('home');

    fireEvent.press(getByTestId('btn-to-settings'));
    expect(getByTestId('current-route').props.children).toBe('settings');
    expect(getByTestId('prev-route').props.children).toBe('voice');

    fireEvent.press(getByTestId('btn-back'));
    expect(getByTestId('current-route').props.children).toBe('voice');
  });
});
