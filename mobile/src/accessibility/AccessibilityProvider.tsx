import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityStateInfo } from './types';
import { accessibilityManager } from './AccessibilityManager';
import { earconService, IEarconService } from './EarconService';
import { hapticService, IHapticService } from './HapticService';
import { ScreenCurtain } from './ScreenCurtain';

export interface AccessibilityContextValue {
  state: AccessibilityStateInfo;
  earcons: IEarconService;
  haptics: IHapticService;
  announce: (message: string, isAssertive?: boolean) => void;
  toggleScreenCurtain: () => boolean;
  setScreenCurtain: (active: boolean) => void;
  setSpeechRate: (rate: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AccessibilityStateInfo>(accessibilityManager.getState());

  useEffect(() => {
    const unsubscribe = accessibilityManager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const announce = (message: string, isAssertive: boolean = false) => {
    accessibilityManager.announce(message, isAssertive);
  };

  const toggleScreenCurtain = () => {
    return accessibilityManager.toggleScreenCurtain();
  };

  const setScreenCurtain = (active: boolean) => {
    accessibilityManager.setScreenCurtain(active);
  };

  const setSpeechRate = (rate: number) => {
    accessibilityManager.setSpeechRate(rate);
  };

  const value: AccessibilityContextValue = {
    state,
    earcons: earconService,
    haptics: hapticService,
    announce,
    toggleScreenCurtain,
    setScreenCurtain,
    setSpeechRate,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <ScreenCurtain
        isActive={state.isScreenCurtainActive}
        onDismiss={() => setScreenCurtain(false)}
      />
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextValue => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
