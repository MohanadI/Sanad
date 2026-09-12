export interface ISecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface StoredToken {
  token: string;
  tokenType: 'SESSION_JWT' | 'CONFIRMATION_TOKEN' | 'EXECUTION_GRANT';
  issuedAt: string;
  expiresAt: string;
  isConsumed?: boolean;
}

export interface ContactAlias {
  id: string;
  alias: string; // e.g. "مرتي"
  contactId: string; // internal resolved UUID, e.g. "cnt_550e8400-e29b-41d4-a716-446655440000"
  contactName: string; // e.g. "هدى" (Device-local only; never leaves device per ADR-006)
  createdAt: string;
}

/**
 * Sync payload for client-server communication.
 * Strictly omits contactName to enforce ADR-006 sovereign address book isolation.
 */
export interface ContactAliasSyncPayload {
  id: string;
  alias: string;
  contactId: string;
}

export interface UserConsentRecord {
  permissionId: string;
  grantedAt: string;
  status: 'GRANTED' | 'REVOKED';
}
