import { AliasStore } from '../src/storage/AliasStore';
import { MockSecureStorage } from '../src/storage/mockSecureStorage';

describe('Sovereign Privacy & Address Book Isolation (ADR-006)', () => {
  let store: AliasStore;
  let mockStorage: MockSecureStorage;

  beforeEach(() => {
    mockStorage = new MockSecureStorage();
    store = new AliasStore(mockStorage);
  });

  it('stores real contact names locally but strictly omits them in exportForNetworkSync', async () => {
    // Register alias locally with real contact name
    await store.setAlias('مرتي', 'cnt_550e8400-e29b-41d4-a716-446655440000', 'هدى إبراهيم');

    // Local getAliases contains contactName for on-device resolution
    const localList = await store.getAliases();
    expect(localList[0].contactName).toBe('هدى إبراهيم');
    expect(localList[0].contactId).toBe('cnt_550e8400-e29b-41d4-a716-446655440000');

    // Network export MUST strictly exclude contactName per ADR-006
    const networkPayload = await store.exportForNetworkSync();
    expect(networkPayload.length).toBe(1);
    expect(networkPayload[0].alias).toBe('مرتي');
    expect(networkPayload[0].contactId).toBe('cnt_550e8400-e29b-41d4-a716-446655440000');
    expect((networkPayload[0] as unknown as Record<string, unknown>).contactName).toBeUndefined();

    // Verify string serialization does not contain the real name
    const serialized = JSON.stringify(networkPayload);
    expect(serialized).not.toContain('هدى');
    expect(serialized).not.toContain('إبراهيم');
  });

  it('blocks registration of emergency/system keywords as contact aliases (SEC-P2-01)', async () => {
    // Attempting to hijack "طوارئ"
    await expect(
      store.setAlias('طوارئ', 'cnt_attacker', 'المهاجم')
    ).rejects.toThrow(/CANNOT_USE_RESERVED_KEYWORD/);

    // Attempting to hijack "النجدة"
    await expect(
      store.setAlias('النجدة', 'cnt_attacker', 'المهاجم')
    ).rejects.toThrow(/CANNOT_USE_RESERVED_KEYWORD/);

    // Attempting to hijack "إلغاء"
    await expect(
      store.setAlias('إلغاء', 'cnt_attacker', 'المهاجم')
    ).rejects.toThrow(/CANNOT_USE_RESERVED_KEYWORD/);
  });

  it('blocks using phone numbers directly as contactId (prohibits phone de-anonymization)', async () => {
    // Palestinian Jawwal number
    await expect(
      store.setAlias('أخوي', '0599123456', 'أحمد')
    ).rejects.toThrow(/CONTACT_ID_CANNOT_BE_PHONE_NUMBER/);

    // Palestinian Ooredoo number
    await expect(
      store.setAlias('صاحبي', '0568123456', 'محمود')
    ).rejects.toThrow(/CONTACT_ID_CANNOT_BE_PHONE_NUMBER/);

    // International +970 number
    await expect(
      store.setAlias('عمي', '+970599112233', 'يوسف')
    ).rejects.toThrow(/CONTACT_ID_CANNOT_BE_PHONE_NUMBER/);
  });

  it('sanitizeForNetworkEgress scrubs personal identifiers and phone fields', () => {
    const rawData = {
      actionId: 'act_123',
      aliasName: 'دكتور العيون',
      contactId: 'cnt_999',
      contactName: 'د. طارق خليل',
      phoneNumber: '0599000000',
      phone: '0599000000',
    };

    const sanitized = store.sanitizeForNetworkEgress(rawData);

    expect(sanitized.actionId).toBe('act_123');
    expect(sanitized.aliasName).toBe('دكتور العيون');
    expect(sanitized.contactId).toBe('cnt_999');
    expect(sanitized.contactName).toBeUndefined();
    expect(sanitized.phoneNumber).toBeUndefined();
    expect(sanitized.phone).toBeUndefined();
  });
});
