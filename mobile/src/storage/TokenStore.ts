import { EncryptedVault } from './EncryptedVault';
import { ISecureStorage, StoredToken } from './types';

export class TokenStore {
  private vault: EncryptedVault<StoredToken>;

  constructor(storage?: ISecureStorage) {
    this.vault = new EncryptedVault<StoredToken>('sanad_tokens', storage);
  }

  public async saveToken(
    tokenId: string,
    token: string,
    tokenType: StoredToken['tokenType'],
    ttlSeconds: number
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const record: StoredToken = {
      token,
      tokenType,
      issuedAt: now.toISOString(),
      expiresAt,
      isConsumed: false,
    };

    await this.vault.set(tokenId, record);
  }

  public async getToken(tokenId: string): Promise<string | null> {
    const record = await this.vault.get(tokenId);
    if (!record) return null;

    // Check expiration
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await this.vault.remove(tokenId);
      return null;
    }

    // Single-use execution grant tokens cannot be reused
    if (record.isConsumed) {
      return null;
    }

    return record.token;
  }

  public async consumeToken(tokenId: string): Promise<boolean> {
    const record = await this.vault.get(tokenId);
    if (!record || record.isConsumed) return false;

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await this.vault.remove(tokenId);
      return false;
    }

    record.isConsumed = true;
    await this.vault.set(tokenId, record);
    return true;
  }

  public async clearAllTokens(): Promise<void> {
    await this.vault.clear();
  }
}

export const tokenStore = new TokenStore();
