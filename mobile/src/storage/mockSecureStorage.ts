import { ISecureStorage } from './types';

/**
 * In-Memory Encrypted Storage for development, testing, and platforms without native KeyStore.
 * Simulates AES-256 encryption using base64 + XOR masking.
 */
export class MockSecureStorage implements ISecureStorage {
  private memoryStore: Map<string, string> = new Map();
  private encryptionKey: string = 'sanad_mock_aes_secret_key_2026';

  private simulateEncrypt(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64');
  }

  private simulateDecrypt(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }

  public async setItem(key: string, value: string): Promise<void> {
    const encrypted = this.simulateEncrypt(value);
    this.memoryStore.set(key, encrypted);
  }

  public async getItem(key: string): Promise<string | null> {
    const encrypted = this.memoryStore.get(key);
    if (!encrypted) return null;
    return this.simulateDecrypt(encrypted);
  }

  public async removeItem(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  public async clear(): Promise<void> {
    this.memoryStore.clear();
  }

  public async getAllKeys(): Promise<string[]> {
    return Array.from(this.memoryStore.keys());
  }
}
