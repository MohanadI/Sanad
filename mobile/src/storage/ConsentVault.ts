import { EncryptedVault } from './EncryptedVault';
import { ISecureStorage, UserConsentRecord } from './types';

export class ConsentVault {
  private vault: EncryptedVault<UserConsentRecord>;

  constructor(storage?: ISecureStorage) {
    this.vault = new EncryptedVault<UserConsentRecord>('sanad_consent', storage);
  }

  public async recordConsent(permissionId: string, granted: boolean): Promise<void> {
    const record: UserConsentRecord = {
      permissionId,
      grantedAt: new Date().toISOString(),
      status: granted ? 'GRANTED' : 'REVOKED',
    };
    await this.vault.set(permissionId, record);
  }

  public async hasConsent(permissionId: string): Promise<boolean> {
    const record = await this.vault.get(permissionId);
    return record?.status === 'GRANTED';
  }

  public async clearAllConsents(): Promise<void> {
    await this.vault.clear();
  }
}

export const consentVault = new ConsentVault();
