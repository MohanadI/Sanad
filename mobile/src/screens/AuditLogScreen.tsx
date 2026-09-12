import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { useNavigation } from '../navigation/NavigationContext';
import { auditLogger, AuditEvent } from '../security/auditLogger';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../localization/i18n';

export const AuditLogScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const [logs, setLogs] = useState<AuditEvent[]>([]);

  useEffect(() => {
    setLogs(auditLogger.getRecentLogs());
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_audit')}
    >
      <View style={styles.header}>
        <Text accessible={true} accessibilityRole="header" style={styles.title}>
          {t('title_audit')}
        </Text>
        <Text style={styles.subtitle}>
          سجل الأمان الشفاف: نضمن عدم تخزين أي أرقام هواتف أو إحداثيات موقع أو نصوص شخصية.
        </Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyBox} accessible={true}>
          <Text style={styles.emptyText}>لا توجد سجلات أمنية حديثة.</Text>
        </View>
      ) : (
        <View style={styles.logList}>
          {logs.map((log) => (
            <View
              key={log.eventId}
              style={styles.logCard}
              accessible={true}
              accessibilityLabel={`الحدث: ${log.requestedCapability}، القرار: ${log.policyDecision}، كود السياسة: ${log.reasonCode}`}
            >
              <View style={styles.cardRow}>
                <Text style={styles.capText}>{log.requestedCapability}</Text>
                <Text
                  style={[
                    styles.decisionText,
                    log.policyDecision === 'ALLOWED'
                      ? styles.allowedText
                      : log.policyDecision === 'CONFIRMATION_REQUIRED'
                      ? styles.confirmText
                      : styles.deniedText,
                  ]}
                >
                  {log.policyDecision}
                </Text>
              </View>

              <Text style={styles.reasonText}>كود السياسة: {log.reasonCode}</Text>
              <Text style={styles.timeText}>{log.timestamp}</Text>
            </View>
          ))}
        </View>
      )}

      <AccessibleButton
        label={t('action_back')}
        variant="secondary"
        onPress={goBack}
        style={styles.backButton}
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
  emptyBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  logList: {
    marginVertical: spacing.sm,
  },
  logCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  capText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  decisionText: {
    fontWeight: '700',
    fontSize: 14,
  },
  allowedText: {
    color: colors.primary,
  },
  confirmText: {
    color: colors.warning,
  },
  deniedText: {
    color: colors.danger,
  },
  reasonText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  timeText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
