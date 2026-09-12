import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { LiveRegion } from '../accessibility/LiveRegion';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { mockVoiceInputService } from '../capabilities/mocks/MockVoiceInputService';
import { mockTextToSpeechService } from '../capabilities/mocks/MockTextToSpeechService';
import { normalizePalestinianDialect } from '../localization/dialects';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../localization/i18n';

export const VoiceInteractionScreen: React.FC = () => {
  const { earcons, announce, toggleScreenCurtain, state: a11yState } = useAccessibility();
  const { navigate, goBack } = useNavigation();

  const [statusText, setStatusText] = useState<string>(t('status_listening'));
  const [transcript, setTranscript] = useState<string>('');
  const [responseMessage, setResponseMessage] = useState<string>('');

  const handleCancel = useCallback(async () => {
    mockVoiceInputService.cancelListening();
    await mockTextToSpeechService.stop();
    await earcons.play('EARCON_CANCELLED');
    announce(t('action_cancel'), true);
    goBack();
  }, [earcons, announce, goBack]);

  const processUtterance = useCallback(
    async (spoken: string) => {
      setStatusText(t('status_thinking'));
      await earcons.play('EARCON_THINKING');

      const normalized = normalizePalestinianDialect(spoken);

      // Check for immediate verbal cancellation keywords: إلغاء / وقف
      if (normalized.includes('الغاء')) {
        await handleCancel();
        return;
      }

      // Check for status or greeting query
      if (normalized.includes('ساعه') || normalized.includes('وقت') || normalized.includes('حاله')) {
        const reply = `${t('status_ready')}. الساعة الآن ${new Date().toLocaleTimeString('ar-PS')}.`;
        setResponseMessage(reply);
        setStatusText(t('status_speaking'));
        await earcons.play('EARCON_SUCCESS');
        await mockTextToSpeechService.speak(reply);
        setStatusText(t('status_ready'));
        return;
      }

      // If spoken mentions an action requiring confirmation
      if (normalized.includes('حذف') || normalized.includes('مسح')) {
        await earcons.play('EARCON_CONFIRM_CHALLENGE');
        navigate('confirm', {
          promptArabic: t('confirm_prompt_general'),
          confirmationToken: `ct_${Date.now()}_simulated`,
          onConfirmed: async () => {
            await earcons.play('EARCON_SUCCESS');
            announce(t('confirm_purge_success'), true);
            navigate('home');
          },
          onCancelled: () => {
            handleCancel();
          },
        });
        return;
      }

      // Default fallback
      const reply = `${t('app_name')} استلم طلبك: "${spoken}". النظام جاهز للاستخدام.`;
      setResponseMessage(reply);
      setStatusText(t('status_speaking'));
      await earcons.play('EARCON_SUCCESS');
      await mockTextToSpeechService.speak(reply);
      setStatusText(t('status_ready'));
    },
    [earcons, handleCancel, navigate, announce]
  );

  useEffect(() => {
    // On open: play listening chime
    earcons.play('EARCON_LISTENING_START');
    announce(t('status_listening'));

    mockVoiceInputService.startListening((result) => {
      setTranscript(result.transcript);
      if (result.isFinal) {
        processUtterance(result.transcript);
      }
    });

    return () => {
      mockVoiceInputService.stopListening();
      mockTextToSpeechService.stop();
    };
  }, [earcons, announce, processUtterance]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_voice')}
    >
      <View style={styles.header}>
        <Text accessible={true} accessibilityRole="header" style={styles.title}>
          {t('title_voice')}
        </Text>
      </View>

      <LiveRegion mode="assertive" style={styles.statusBox}>
        {statusText}
      </LiveRegion>

      {transcript !== '' && (
        <View style={styles.transcriptBox} accessible={true}>
          <Text style={styles.transcriptLabel}>الكلام المسجل:</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      {responseMessage !== '' && (
        <LiveRegion mode="polite" style={styles.responseBox}>
          <Text style={styles.responseText}>{responseMessage}</Text>
        </LiveRegion>
      )}

      {/* Immediate cancellation button: Accessible interruptibility */}
      <AccessibleButton
        label={t('action_cancel')}
        accessibilityHint={t('a11y_hint_cancel_current')}
        variant="danger"
        minHeight={56}
        onPress={handleCancel}
        style={styles.actionButton}
        testID="voice-cancel-button"
      />

      {/* Screen Curtain privacy toggle */}
      <AccessibleButton
        label={
          a11yState.isScreenCurtainActive
            ? 'إلغاء تفعيل ستارة الشاشة'
            : 'تفعيل ستارة الشاشة (حماية الخصوصية)'
        }
        accessibilityHint={t('a11y_hint_screen_curtain')}
        variant="outline"
        onPress={() => toggleScreenCurtain()}
        style={styles.actionButton}
      />

      <AccessibleButton
        label={t('action_back')}
        variant="secondary"
        onPress={goBack}
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
  statusBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  transcriptBox: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.sm,
  },
  transcriptLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  transcriptText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  responseBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginVertical: spacing.md,
  },
  responseText: {
    ...typography.bodyLarge,
    color: colors.accent,
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
});
