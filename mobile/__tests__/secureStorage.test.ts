import { MockSecureStorage } from '../src/storage/mockSecureStorage';
import { EncryptedVault } from '../src/storage/EncryptedVault';
import { TokenStore } from '../src/storage/TokenStore';
import { ConsentVault } from '../src/storage/ConsentVault';
import { AliasStore } from '../src/storage/AliasStore';
import { EmergencyPurgeService } from '../src/storage/EmergencyPurgeService';

describe('Secure Storage Abstraction', () => {
  let mockStorage: MockSecureStorage;

  beforeEach(() => {
    mockStorage = new MockSecureStorage();
  });

  describe('MockSecureStorage', () => {
    it('sets, gets and removes items with simulated encryption', async () => {
      await mockStorage.setItem('testKey', 'secretValue');
      const retrieved = await mockStorage.getItem('testKey');
      expect(retrieved).toBe('secretValue');

      await mockStorage.removeItem('testKey');
      const afterDelete = await mockStorage.getItem('testKey');
      expect(afterDelete).toBeNull();
    });

    it('clears all items', async () => {
      await mockStorage.setItem('k1', 'v1');
      await mockStorage.setItem('k2', 'v2');
      await mockStorage.clear();

      expect(await mockStorage.getItem('k1')).toBeNull();
      expect(await mockStorage.getItem('k2')).toBeNull();
    });
  });

  describe('EncryptedVault', () => {
    it('serializes and deserializes structured objects safely', async () => {
      const vault = new EncryptedVault<{ id: number; name: string }>('test_prefix', mockStorage);
      await vault.set('user_1', { id: 1, name: 'سند' });

      const retrieved = await vault.get('user_1');
      expect(retrieved).toEqual({ id: 1, name: 'سند' });
    });
  });

  describe('TokenStore', () => {
    it('stores and retrieves unexpired tokens', async () => {
      const tokenStore = new TokenStore(mockStorage);
      await tokenStore.saveToken('t1', 'gt_valid_token_123', 'EXECUTION_GRANT', 10);

      const token = await tokenStore.getToken('t1');
      expect(token).toBe('gt_valid_token_123');
    });

    it('enforces single-use consumption and anti-replay', async () => {
      const tokenStore = new TokenStore(mockStorage);
      await tokenStore.saveToken('grant_1', 'gt_single_use_token', 'EXECUTION_GRANT', 10);

      const consumed = await tokenStore.consumeToken('grant_1');
      expect(consumed).toBe(true);

      // Subsequent retrieval fails because token is consumed
      const afterConsume = await tokenStore.getToken('grant_1');
      expect(afterConsume).toBeNull();

      // Double-consume fails
      const reConsumed = await tokenStore.consumeToken('grant_1');
      expect(reConsumed).toBe(false);
    });

    it('rejects expired tokens', async () => {
      const tokenStore = new TokenStore(mockStorage);
      // Save with 0 seconds TTL (already expired)
      await tokenStore.saveToken('expired_t', 'ct_expired', 'CONFIRMATION_TOKEN', -1);

      const token = await tokenStore.getToken('expired_t');
      expect(token).toBeNull();
    });
  });

  describe('ConsentVault', () => {
    it('records and verifies user permission grants', async () => {
      const vault = new ConsentVault(mockStorage);
      expect(await vault.hasConsent('sanad:perm:contacts:read')).toBe(false);

      await vault.recordConsent('sanad:perm:contacts:read', true);
      expect(await vault.hasConsent('sanad:perm:contacts:read')).toBe(true);

      await vault.recordConsent('sanad:perm:contacts:read', false);
      expect(await vault.hasConsent('sanad:perm:contacts:read')).toBe(false);
    });
  });

  describe('AliasStore', () => {
    it('adds, finds and removes contact nicknames without persisting phone numbers', async () => {
      const store = new AliasStore(mockStorage);
      const alias = await store.setAlias('مرتي', 'cnt_001_huda', 'هدى');

      expect(alias.alias).toBe('مرتي');
      expect(alias.contactName).toBe('هدى');
      expect((alias as unknown as Record<string, unknown>).phoneNumber).toBeUndefined();

      const found = await store.findByAlias('مرتي');
      expect(found?.contactId).toBe('cnt_001_huda');

      const deleted = await store.removeAlias(alias.id);
      expect(deleted).toBe(true);
      expect(await store.findByAlias('مرتي')).toBeNull();
    });
  });

  describe('EmergencyPurgeService', () => {
    it('executes full purge without throwing errors', async () => {
      await expect(EmergencyPurgeService.executeEmergencyPurge()).resolves.not.toThrow();
    });
  });
});
