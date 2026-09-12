import React, { createContext, useContext, useState } from 'react';
import { AppRoute, NavigationContextValue, NavigationState } from './types';
import { APP_ROUTES } from './routes';
import { accessibilityManager } from '../accessibility/AccessibilityManager';
import { hapticService } from '../accessibility/HapticService';
import { t } from '../localization/i18n';

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider: React.FC<{
  initialRoute?: AppRoute;
  children: React.ReactNode;
}> = ({ initialRoute = 'home', children }) => {
  const [state, setState] = useState<NavigationState>({
    currentRoute: initialRoute,
    previousRoute: null,
    params: undefined,
  });

  const navigate = (route: AppRoute, params?: Record<string, unknown>) => {
    setState((prev) => ({
      currentRoute: route,
      previousRoute: prev.currentRoute,
      params,
    }));

    // TalkBack screen transition announcement
    const meta = APP_ROUTES[route];
    if (meta) {
      const title = t(meta.titleKey);
      accessibilityManager.announce(`${t('a11y_live_screen_changed')} ${title}`, false);
    }
    hapticService.trigger('IMPACT_LIGHT');
  };

  const goBack = () => {
    if (state.previousRoute) {
      navigate(state.previousRoute);
    } else {
      navigate('home');
    }
  };

  return (
    <NavigationContext.Provider value={{ state, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
