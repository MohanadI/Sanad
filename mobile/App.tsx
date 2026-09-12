import React from 'react';
import { AccessibilityProvider } from './src/accessibility/AccessibilityProvider';
import { PermissionProvider } from './src/permissions/PermissionContext';
import { NavigationProvider } from './src/navigation/NavigationContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export const App: React.FC = () => {
  return (
    <AccessibilityProvider>
      <PermissionProvider>
        <NavigationProvider>
          <AppNavigator />
        </NavigationProvider>
      </PermissionProvider>
    </AccessibilityProvider>
  );
};

export default App;
