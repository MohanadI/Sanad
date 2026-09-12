import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { LiveRegion } from '../accessibility/LiveRegion';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ConfirmationRouteParams } from '../navigation/types';
import { TokenVerifier } from '../security/tokenVerifier';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t, i18n } from '../localization/i18n';

export const ConfirmationScreen: React.FC = () => {
  const { earcons, announce } = useAccessibility();
  const { state: navState, goBack } = useNavigation();

  const params = (navState.params || {}) as Partial<ConfirmationRouteParams>;
  const promptArabic = params.promptArabic || t('confirm_prompt_general');
  const confirmationToken = params.confirmationToken || '';
  const initialSeconds = params.timeoutSeconds || 30;

  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Challenge earcon
    earcons.play('EARCON_CONFIRM_CHALLENGE');
    announce(promptArabic, true);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [earcons, announce, promptArabic]);

  const handleTimeout = async () => {
    if (confirmationToken) {
      TokenVerifier.markConsumed(confirmationToken);
    }
    await earcons.play('EARCON_CANCELLED');
    announce(t('confirm_timeout_warning'), true);
    if (params.onCancelled) params.onCancelled();
    goBack();
  };

  const handleConfirm = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (confirmationToken) {
      TokenVerifier.markConsumed(confirmationToken);
    }
    await earcons.play('EARCON_SUCCESS');
    if (params.onConfirmed) {
      await params.onConfirmed();
    }
    goBack();
  };

  const handleDeny = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (confirmationToken) {
      TokenVerifier.markConsumed(confirmationToken);
    }
    await earcons.play('EARCON_CANCELLED');
    if (params.onCancelled) {
      params.onCancelled();
    }
    goBack();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_confirm')}
    >
      <View style={styles.header}>
        <Text accessible={true} accessibilityRole="header" style={styles.title}>
          {t('title_confirm')}
        </Text>
      </View>

      <LiveRegion mode="assertive" style={styles.promptBox}>
        <Text style={styles.promptText}>{promptArabic}</Text>
      </LiveRegion>

      <View style={styles.timerBox} accessible={true} accessibilityLabel={`الوقت المتبقي ${timeLeft} ثانية`}>
        <Text style={styles.timerText}>
          الوقت المتبقي: {i18n.formatNumber(timeLeft)} ثانية
        </Text>
      </View>

      <AccessibleButton
        label={t('confirm_affirmative')}
        variant="primary"
        minHeight={56}
        onPress={handleConfirm}
        style={styles.actionButton}
        testID="confirm-yes-button"
      />

      <AccessibleButton
        label={t('confirm_negative')}
        variant="danger"
        minHeight={56}
        onPress={handleDeny}
        style={styles.actionButton}
        testID="confirm-no-button"
      />

      <AccessibleButton
        label={t('action_cancel')}
        variant="secondary"
        onPress={handleDeny}
        style={styles.actionButton}
      />
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
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  promptBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.warning,
    marginVertical: spacing.md,
  },
  promptText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  timerBox: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerText: {
    ...typography.bodyMedium,
    color: colors.warning,
    fontWeight: '700',
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
});
