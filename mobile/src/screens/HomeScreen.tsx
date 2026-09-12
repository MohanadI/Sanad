import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { LiveRegion } from '../accessibility/LiveRegion';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../localization/i18n';

export const HomeScreen: React.FC = () => {
  const { navigate } = useNavigation();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_home')}
    >
      <View style={styles.header}>
        <Text
          accessible={true}
          accessibilityRole="header"
          style={styles.title}
        >
          {t('app_name')}
        </Text>
        <Text style={styles.subtitle}>{t('app_tagline')}</Text>
      </View>

      <LiveRegion mode="polite" style={styles.statusBox}>
        {t('status_ready')}
      </LiveRegion>

      {/* Primary Voice Trigger: prominent touch target */}
      <AccessibleButton
        label={t('action_listen')}
        accessibilityHint={t('a11y_hint_double_tap_listen')}
        variant="primary"
        minHeight={64}
        onPress={() => navigate('voice')}
        style={styles.primaryVoiceButton}
        textStyle={styles.primaryVoiceText}
        testID="home-listen-button"
      />

      <View style={styles.navGrid}>
        <AccessibleButton
          label={t('title_aliases')}
          variant="secondary"
          onPress={() => navigate('aliases')}
          style={styles.gridButton}
        />
        <AccessibleButton
          label={t('title_permissions')}
          variant="secondary"
          onPress={() => navigate('permissions')}
          style={styles.gridButton}
        />
        <AccessibleButton
          label={t('title_audit')}
          variant="secondary"
          onPress={() => navigate('audit')}
          style={styles.gridButton}
        />
        <AccessibleButton
          label={t('title_settings')}
          variant="secondary"
          onPress={() => navigate('settings')}
          style={styles.gridButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginVertical: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  primaryVoiceButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginVertical: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  primaryVoiceText: {
    fontSize: 22,
  },
  navGrid: {
    marginTop: spacing.md,
  },
  gridButton: {
    marginVertical: spacing.xs,
  },
});
