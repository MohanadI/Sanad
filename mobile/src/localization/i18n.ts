import { arTranslations } from './ar';
import { SUPPORTED_DIALECTS } from './dialects';
import { DialectLocale, TranslationKey } from './types';

interface I18nManagerType {
  isRTL?: boolean;
  allowRTL?: (allow: boolean) => void;
  forceRTL?: (force: boolean) => void;
}

let i18nManager: I18nManagerType | undefined;

try {
  const rn = require('react-native');
  i18nManager = rn.I18nManager;
} catch {
  // Fallback for non-React Native / Node environments
}

class I18nService {
  private currentDialect: DialectLocale = 'ar-PS-WestBank';

  constructor() {
    this.enforceRTL();
  }

  /**
   * Enforces Right-to-Left (RTL) layout for Arabic accessibility.
   */
  public enforceRTL(): void {
    if (i18nManager && !i18nManager.isRTL) {
      i18nManager.allowRTL?.(true);
      i18nManager.forceRTL?.(true);
    }
  }

  public setDialect(dialect: DialectLocale): void {
    if (SUPPORTED_DIALECTS[dialect]) {
      this.currentDialect = dialect;
    }
  }

  public getDialect(): DialectLocale {
    return this.currentDialect;
  }

  /**
   * Retrieve localized string by key.
   */
  public t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = arTranslations[key] || key;
    if (params) {
      for (const [paramKey, val] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(val));
      }
    }
    return text;
  }

  /**
   * Localizes Arabic numbers (converts Latin digits 0-9 to Eastern Arabic numerals).
   */
  public formatNumber(num: number): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (w) => arabicDigits[+w]);
  }
}

export const i18n = new I18nService();
export const t = (key: TranslationKey, params?: Record<string, string | number>) => i18n.t(key, params);
