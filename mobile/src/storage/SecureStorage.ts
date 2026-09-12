import { ISecureStorage } from './types';
import { MockSecureStorage } from './mockSecureStorage';

interface NativeModulesType {
  SanadKeyStoreModule?: {
    setItem?: (key: string, value: string) => Promise<boolean>;
    getItem?: (key: string) => Promise<string | null>;
    removeItem?: (key: string) => Promise<boolean>;
    purgeVault?: () => Promise<boolean>;
  };
}

let nativeModules: NativeModulesType | undefined;
let currentPlatform: { OS: string } | undefined;

try {
  const rn = require('react-native');
  nativeModules = rn.NativeModules;
  currentPlatform = rn.Platform;
} catch {
  // Fallback for non-React Native / Node environments
}

/**
 * Android KeyStore & EncryptedSharedPreferences Bridge Wrapper.
 */
class NativeKeyStoreAdapter implements ISecureStorage {
  private get nativeModule() {
    return nativeModules?.SanadKeyStoreModule;
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (this.nativeModule?.setItem) {
      await this.nativeModule.setItem(key, value);
    }
  }

  public async getItem(key: string): Promise<string | null> {
    if (this.nativeModule?.getItem) {
      return this.nativeModule.getItem(key);
    }
    return null;
  }

  public async removeItem(key: string): Promise<void> {
    if (this.nativeModule?.removeItem) {
      await this.nativeModule.removeItem(key);
    }
  }

  public async clear(): Promise<void> {
    if (this.nativeModule?.purgeVault) {
      await this.nativeModule.purgeVault();
    }
  }

  public async getAllKeys(): Promise<string[]> {
    return [];
  }
}

function createSecureStorage(): ISecureStorage {
  if (currentPlatform?.OS === 'android' && nativeModules?.SanadKeyStoreModule) {
    return new NativeKeyStoreAdapter();
  }
  return new MockSecureStorage();
}

export const secureStorage: ISecureStorage = createSecureStorage();
