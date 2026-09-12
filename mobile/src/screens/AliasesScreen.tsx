import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { LiveRegion } from '../accessibility/LiveRegion';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { aliasStore } from '../storage/AliasStore';
import { ContactAlias } from '../storage/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../localization/i18n';

export const AliasesScreen: React.FC = () => {
  const { announce, earcons } = useAccessibility();
  const { goBack } = useNavigation();
  const [aliases, setAliases] = useState<ContactAlias[]>([]);
  const [feedback, setFeedback] = useState<string>('');

  const loadAliases = async () => {
    const list = await aliasStore.getAliases();
    setAliases(list);
  };

  useEffect(() => {
    loadAliases();
  }, []);

  const handleAddSampleAlias = async () => {
    const saved = await aliasStore.setAlias('مرتي', 'cnt_001_huda', 'هدى');
    await earcons.play('EARCON_SUCCESS');
    setFeedback(`تم حفظ اللقب "${saved.alias}" لجهة الاتصال ${saved.contactName}`);
    await loadAliases();
  };

  const handleDeleteAlias = async (aliasId: string, aliasName: string) => {
    await aliasStore.removeAlias(aliasId);
    await earcons.play('EARCON_SUCCESS');
    const msg = `تم حذف اللقب "${aliasName}" بنجاح`;
    setFeedback(msg);
    announce(msg, true);
    await loadAliases();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_aliases')}
    >
      <View style={styles.header}>
        <Text accessible={true} accessibilityRole="header" style={styles.title}>
          {t('title_aliases')}
        </Text>
      </View>

      {feedback !== '' && (
        <LiveRegion mode="polite" style={styles.feedbackBox}>
          {feedback}
        </LiveRegion>
      )}

      {aliases.length === 0 ? (
        <View style={styles.emptyBox} accessible={true}>
          <Text style={styles.emptyText}>{t('alias_empty')}</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {aliases.map((item) => (
            <View
              key={item.id}
              style={styles.aliasCard}
              accessible={true}
              accessibilityLabel={`اللقب: ${item.alias}، جهة الاتصال: ${item.contactName}`}
            >
              <View>
                <Text style={styles.aliasTitle}>{item.alias}</Text>
                <Text style={styles.aliasContact}>{item.contactName}</Text>
              </View>
              <AccessibleButton
                label={t('action_delete')}
                variant="danger"
                onPress={() => handleDeleteAlias(item.id, item.alias)}
                style={styles.deleteButton}
              />
            </View>
          ))}
        </View>
      )}

      <AccessibleButton
        label="إضافة لقب تجريبي (مرتي -> هدى)"
        variant="primary"
        onPress={handleAddSampleAlias}
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
  feedbackBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
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
    textAlign: 'center',
  },
  listContainer: {
    marginVertical: spacing.md,
  },
  aliasCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aliasTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  aliasContact: {
    ...typography.bodyMedium,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 0,
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
});
