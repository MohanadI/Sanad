import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PERMISSION_DEFINITIONS } from '../../mobile/src/permissions/permissionRegistry.js';
import { CAPABILITY_CONFIG } from '../../mobile/src/capabilities/capabilityRegistry.js';
import { arTranslations } from '../../mobile/src/localization/ar.js';
import { spacing } from '../../mobile/src/theme/spacing.js';

describe('Sanad Mobile Accessibility Compliance Suite', () => {
  it('enforces minimum touch target size of at least 48dp on all interactive elements', () => {
    assert.ok(spacing.minTouchTarget >= 48, 'Touch target must be >= 48dp');
  });

  it('guarantees every permission definition has an Arabic name and description', () => {
    Object.values(PERMISSION_DEFINITIONS).forEach((def) => {
      assert.ok(def.nameArabic && def.nameArabic.trim().length > 0, `Missing Arabic name for ${def.id}`);
      assert.ok(
        def.descriptionArabic && def.descriptionArabic.trim().length > 0,
        `Missing Arabic description for ${def.id}`
      );
    });
  });

  it('ensures all 6 standard earcons have Arabic screen reader descriptions', () => {
    const earcons = [
      'earcon_desc_listening_start',
      'earcon_desc_thinking',
      'earcon_desc_confirm',
      'earcon_desc_success',
      'earcon_desc_cancelled',
      'earcon_desc_error',
    ] as const;

    earcons.forEach((key) => {
      assert.ok(arTranslations[key] && arTranslations[key].trim().length > 0, `Missing description for ${key}`);
    });
  });

  it('verifies that sensitive/deferred capabilities are strictly gated by default', () => {
    assert.strictEqual(CAPABILITY_CONFIG.CAP_CONTACT_CALL.enabled, false);
    assert.strictEqual(CAPABILITY_CONFIG.CAP_MESSAGE_SEND.enabled, false);
    assert.strictEqual(CAPABILITY_CONFIG.CAP_LOCATION_READ.enabled, false);
    assert.strictEqual(CAPABILITY_CONFIG.CAP_LOCATION_SHARE.enabled, false);
    assert.strictEqual(CAPABILITY_CONFIG.CAP_CALENDAR_READ.enabled, false);
    assert.strictEqual(CAPABILITY_CONFIG.CAP_CALENDAR_WRITE.enabled, false);
    assert.strictEqual(CAPABILITY_CONFIG.CAP_EMERGENCY_TRIGGER.enabled, false);
  });
});
