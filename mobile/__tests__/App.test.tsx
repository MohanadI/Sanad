import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { App } from '../App';
import { accessibilityManager } from '../src/accessibility/AccessibilityManager';

describe('App Shell Foundation', () => {
  afterEach(() => {
    accessibilityManager.clearQueue();
  });

  it('renders application shell and home screen successfully', async () => {
    const { getByTestId, getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('سند')).toBeTruthy();
      expect(getByTestId('home-listen-button')).toBeTruthy();
    });
  });
});
