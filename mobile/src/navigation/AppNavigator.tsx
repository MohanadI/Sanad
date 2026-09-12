import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from './NavigationContext';
import { HomeScreen } from '../screens/HomeScreen';
import { VoiceInteractionScreen } from '../screens/VoiceInteractionScreen';
import { ConfirmationScreen } from '../screens/ConfirmationScreen';
import { AliasesScreen } from '../screens/AliasesScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AuditLogScreen } from '../screens/AuditLogScreen';
import { colors } from '../theme/colors';

export const AppNavigator: React.FC = () => {
  const { state } = useNavigation();

  const renderCurrentScreen = () => {
    switch (state.currentRoute) {
      case 'voice':
        return <VoiceInteractionScreen />;
      case 'confirm':
        return <ConfirmationScreen />;
      case 'aliases':
        return <AliasesScreen />;
      case 'permissions':
        return <PermissionsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'audit':
        return <AuditLogScreen />;
      case 'home':
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.container}>{renderCurrentScreen()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
