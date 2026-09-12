import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { usePermissions } from '../permissions/PermissionContext';
import { PERMISSION_DEFINITIONS } from '../permissions/permissionRegistry';
import { PermissionId, RiskTier } from '../permissions/types';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../localization/i18n';

export const PermissionsScreen: React.FC = () => {
  const { userGrants, requestConsent, revokeConsent } = usePermissions();
  const { goBack } = useNavigation();

  const getRiskBadgeColor = (risk: RiskTier): string => {
    switch (risk) {
      case 'CRITICAL':
        return colors.danger;
      case 'HIGH':
        return colors.warning;
      case 'MEDIUM':
        return colors.info;
      case 'LOW':
      default:
        return colors.primary;
    }
  };

  const renderPermissionItem = (permId: PermissionId) => {
    const def = PERMISSION_DEFINITIONS[permId];
    if (!def) return null;

    const hasConsent = userGrants.has(permId);

    return (
      <View
        key={permId}
        style={styles.card}
        accessible={true}
        accessibilityLabel={`${def.nameArabic}، مستوى الخطورة: ${def.riskTier}، الحالة: ${
          hasConsent ? 'مفعل' : 'معطل'
        }`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{def.nameArabic}</Text>
          <View style={[styles.badge, { backgroundColor: getRiskBadgeColor(def.riskTier) }]}>
            <Text style={styles.badgeText}>{def.riskTier}</Text>
          </View>
        </View>

        <Text style={styles.cardDesc}>{def.descriptionArabic}</Text>

        {def.isGated && (
          <Text style={styles.gatedWarning}>
            ملاحظة: هذه الخاصية محظورة ومجمدة أمنياً في النسخة التجريبية الحالية.
          </Text>
        )}

        <View style={styles.actionRow}>
          <AccessibleButton
            label={hasConsent ? t('perm_btn_revoke') : t('perm_btn_grant')}
            variant={hasConsent ? 'danger' : 'primary'}
            onPress={() => {
              if (hasConsent) {
                revokeConsent(permId);
              } else {
                requestConsent(permId);
              }
            }}
            style={styles.toggleButton}
          />
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_permissions')}
    >
      <View style={styles.header}>
        <Text accessible={true} accessibilityRole="header" style={styles.title}>
          {t('title_permissions')}
        </Text>
        <Text style={styles.subtitle}>
          تحكم في صلاحيات الوصول ومستويات الأمان بحرية وشفافية تامة.
        </Text>
      </View>

      <View style={styles.list}>
        {Object.keys(PERMISSION_DEFINITIONS).map((key) =>
          renderPermissionItem(key as PermissionId)
        )}
      </View>

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
  list: {
    marginVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 18,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  cardDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  gatedWarning: {
    ...typography.caption,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  actionRow: {
    alignItems: 'flex-start',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
