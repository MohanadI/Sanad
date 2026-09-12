import { ISecureStorage } from './types';
import { secureStorage } from './SecureStorage';

export class EncryptedVault<T> {
  private storage: ISecureStorage;
  private prefix: string;

  constructor(prefix: string, storage?: ISecureStorage) {
    this.prefix = prefix;
    this.storage = storage || secureStorage;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  public async set(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.storage.setItem(this.getKey(key), serialized);
  }

  public async get(key: string): Promise<T | null> {
    const raw = await this.storage.getItem(this.getKey(key));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public async remove(key: string): Promise<void> {
    await this.storage.removeItem(this.getKey(key));
  }

  public async clear(): Promise<void> {
    const allKeys = await this.storage.getAllKeys();
    for (const k of allKeys) {
      if (k.startsWith(`${this.prefix}:`)) {
        await this.storage.removeItem(k);
      }
    }
  }
}
