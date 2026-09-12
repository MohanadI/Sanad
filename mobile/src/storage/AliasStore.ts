import { EncryptedVault } from './EncryptedVault';
import { ContactAlias, ContactAliasSyncPayload, ISecureStorage } from './types';

export const RESERVED_SYSTEM_KEYWORDS = [
  'طوارئ',
  'طواري',
  'النجدة',
  'النجده',
  'إسعاف',
  'اسعاف',
  'شرطة',
  'شرطه',
  'إلغاء',
  'الغاء',
  'تراجع',
  'وقف',
  'emergency',
  'cancel',
  'stop',
  'police',
  'ambulance',
] as const;

export class AliasStore {
  private vault: EncryptedVault<ContactAlias[]>;
  private readonly ALIAS_KEY = 'registered_aliases';

  constructor(storage?: ISecureStorage) {
    this.vault = new EncryptedVault<ContactAlias[]>('sanad_aliases', storage);
  }

  public async getAliases(): Promise<ContactAlias[]> {
    const list = await this.vault.get(this.ALIAS_KEY);
    return list || [];
  }

  /**
   * Registers or updates a contact alias.
   * Conforms to:
   * - SEC-P2-01: Prohibits registering emergency or system keywords as aliases.
   * - ADR-006: Keeps contactName strictly local in device storage.
   */
  public async setAlias(aliasName: string, contactId: string, contactName: string): Promise<ContactAlias> {
    const trimmedAlias = aliasName.trim();
    const normalizedAlias = trimmedAlias.toLowerCase();

    // Check reserved emergency & system keywords
    if (RESERVED_SYSTEM_KEYWORDS.some((kw) => kw.toLowerCase() === normalizedAlias)) {
      throw new Error('CANNOT_USE_RESERVED_KEYWORD');
    }

    // Check contactId format - must be opaque UUID/identifier, NEVER a raw phone number
    const phonePattern = /^(05[69]\d{7}|\+?97[02]\d{8,9})$/;
    if (phonePattern.test(contactId.replace(/\s+/g, ''))) {
      throw new Error('CONTACT_ID_CANNOT_BE_PHONE_NUMBER');
    }

    const aliases = await this.getAliases();
    const existingIndex = aliases.findIndex((a) => a.alias.trim() === trimmedAlias);

    const record: ContactAlias = {
      id: `als_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alias: trimmedAlias,
      contactId: contactId.trim(),
      contactName: contactName.trim(), // Stored locally only
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      aliases[existingIndex] = record;
    } else {
      aliases.push(record);
    }

    await this.vault.set(this.ALIAS_KEY, aliases);
    return record;
  }

  public async findByAlias(aliasName: string): Promise<ContactAlias | null> {
    const aliases = await this.getAliases();
    return aliases.find((a) => a.alias.trim() === aliasName.trim()) || null;
  }

  public async removeAlias(aliasId: string): Promise<boolean> {
    const aliases = await this.getAliases();
    const filtered = aliases.filter((a) => a.id !== aliasId);
    if (filtered.length !== aliases.length) {
      await this.vault.set(this.ALIAS_KEY, filtered);
      return true;
    }
    return false;
  }

  /**
   * ADR-006: Sovereign Address Book Isolation.
   * Exports aliases for network synchronization / server communication.
   * Contact real names are strictly omitted from egress payloads.
   */
  public async exportForNetworkSync(): Promise<ContactAliasSyncPayload[]> {
    const aliases = await this.getAliases();
    return aliases.map((item) => ({
      id: item.id,
      alias: item.alias,
      contactId: item.contactId,
    }));
  }

  /**
   * Sanitizes any egress data structure to guarantee contact names or phone numbers never leak.
   */
  public sanitizeForNetworkEgress<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'contactName' || key === 'phoneNumber' || key === 'phone' || key === 'mobile') {
        continue; // Drop personal identifiers
      }
      sanitized[key] = value;
    }
    return sanitized;
  }

  public async clearAllAliases(): Promise<void> {
    await this.vault.clear();
  }
}

export const aliasStore = new AliasStore();
