import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { EmergencyPurgeService } from '../storage/EmergencyPurgeService';
import { i18n } from '../localization/i18n';
import { SUPPORTED_DIALECTS } from '../localization/dialects';
import { DialectLocale } from '../localization/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../localization/i18n';

export const SettingsScreen: React.FC = () => {
  const { state: a11yState, toggleScreenCurtain, setSpeechRate, announce } = useAccessibility();
  const { navigate, goBack } = useNavigation();
  const [currentDialect, setCurrentDialect] = useState<DialectLocale>(i18n.getDialect());

  const handleDialectChange = (dialect: DialectLocale) => {
    i18n.setDialect(dialect);
    setCurrentDialect(dialect);
    const dialectName = SUPPORTED_DIALECTS[dialect]?.nameArabic || dialect;
    announce(`تم اختيار ${dialectName}`, true);
  };

  const handleEmergencyPurge = () => {
    navigate('confirm', {
      promptArabic: t('confirm_purge_prompt'),
      confirmationToken: `ct_${Date.now()}_emergency_purge`,
      onConfirmed: async () => {
        await EmergencyPurgeService.executeEmergencyPurge();
        navigate('home');
      },
      onCancelled: () => {
        announce(t('action_cancel'), true);
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={true}
      accessibilityLabel={t('title_settings')}
    >
      <View style={styles.header}>
        <Text accessible={true} accessibilityRole="header" style={styles.title}>
          {t('title_settings')}
        </Text>
      </View>

      {/* Dialect Selector Section */}
      <View style={styles.section} accessible={true}>
        <Text style={styles.sectionTitle}>اللهجة الفلسطينية المفضلة</Text>
        {Object.values(SUPPORTED_DIALECTS).map((item) => (
          <AccessibleButton
            key={item.code}
            label={`${item.nameArabic} ${currentDialect === item.code ? '(مفعلة)' : ''}`}
            variant={currentDialect === item.code ? 'primary' : 'secondary'}
            onPress={() => handleDialectChange(item.code)}
            style={styles.optionButton}
          />
        ))}
      </View>

      {/* Screen Curtain Section */}
      <View style={styles.section} accessible={true}>
        <Text style={styles.sectionTitle}>حماية الخصوصية وستارة الشاشة</Text>
        <Text style={styles.sectionDesc}>
          تقوم ستارة الشاشة بإطفاء الإضاءة تماماً لمنع المتطفلين من قراءة الشاشة في الأماكن العامة.
        </Text>
        <AccessibleButton
          label={
            a11yState.isScreenCurtainActive
              ? 'إلغاء تفعيل ستارة الشاشة'
              : 'تفعيل ستارة الشاشة الآن'
          }
          variant={a11yState.isScreenCurtainActive ? 'danger' : 'outline'}
          onPress={() => toggleScreenCurtain()}
          style={styles.optionButton}
        />
      </View>

      {/* Speech Rate Section */}
      <View style={styles.section} accessible={true}>
        <Text style={styles.sectionTitle}>سرعة القراءة الصوتية (TalkBack)</Text>
        <View style={styles.rateRow}>
          <AccessibleButton
            label="أبطأ (0.8x)"
            variant={a11yState.speechRate === 0.8 ? 'primary' : 'secondary'}
            onPress={() => {
              setSpeechRate(0.8);
              announce('تم ضبط سرعة الصوت على ثمانية أعشار', true);
            }}
            style={styles.rateButton}
          />
          <AccessibleButton
            label="عادي (1.0x)"
            variant={a11yState.speechRate === 1.0 ? 'primary' : 'secondary'}
            onPress={() => {
              setSpeechRate(1.0);
              announce('تم ضبط سرعة الصوت الطبيعية', true);
            }}
            style={styles.rateButton}
          />
          <AccessibleButton
            label="أسرع (1.2x)"
            variant={a11yState.speechRate === 1.2 ? 'primary' : 'secondary'}
            onPress={() => {
              setSpeechRate(1.2);
              announce('تم ضبط سرعة الصوت أسرع', true);
            }}
            style={styles.rateButton}
          />
        </View>
      </View>

      {/* Emergency Purge Section */}
      <View style={styles.section} accessible={true}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>
          مسح الطوارئ الفوري للبيانات
        </Text>
        <Text style={styles.sectionDesc}>
          في حال التفتيش المفاجئ أو الخطر، يمكنك مسح كافة مفاتيح التشفير والجلسات والألقاب فوراً.
        </Text>
        <AccessibleButton
          label={t('action_purge_emergency')}
          accessibilityHint={t('a11y_hint_purge_emergency')}
          variant="danger"
          onPress={handleEmergencyPurge}
          style={styles.optionButton}
          testID="settings-emergency-purge"
        />
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
  section: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  optionButton: {
    marginVertical: spacing.xs,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  backButton: {
    marginTop: spacing.sm,
  },
});
