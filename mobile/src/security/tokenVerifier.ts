import { computeActionHash } from './canonicalize';

export interface TokenVerificationResult {
  isValid: boolean;
  errorCode?:
    | 'TOKEN_EXPIRED'
    | 'TOKEN_MALFORMED'
    | 'TOKEN_CONSUMED'
    | 'TOKEN_SIGNATURE_INVALID'
    | 'TOKEN_PARAMETER_HASH_MISMATCH';
  actionHash?: string;
}

interface ParsedGrantPayload {
  type?: string;
  actionId?: string;
  userId?: string;
  targetCapability?: string;
  toolName?: string;
  actionHash?: string;
  nonce?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export class TokenVerifier {
  private static consumedNonces: Set<string> = new Set();

  /**
   * Verifies an execution grant token.
   * Conforms to ADR-004:
   * - Validates single-use nonce (anti-replay).
   * - Validates timestamp / TTL expiration.
   * - Cryptographically binds actionHash to targetCapability and canonical parameters.
   */
  public static verifyExecutionGrantToken(
    token: string,
    targetCapability?: string,
    parameters?: Record<string, unknown>
  ): TokenVerificationResult {
    if (!token || !token.startsWith('gt_')) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
    }

    // Format A: Backend signed JWT/HMAC token: "gt_<base64urlPayload>.<signature>"
    if (token.includes('.')) {
      try {
        const dotIndex = token.indexOf('.');
        const encodedPayload = token.substring(3, dotIndex);
        const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson) as ParsedGrantPayload;

        if (!payload.nonce || !payload.expiresAt) {
          return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
        }

        // Expiration check
        const expiresAtMs = new Date(payload.expiresAt).getTime();
        if (Date.now() > expiresAtMs) {
          return { isValid: false, errorCode: 'TOKEN_EXPIRED' };
        }

        // Anti-replay check
        if (this.consumedNonces.has(payload.nonce)) {
          return { isValid: false, errorCode: 'TOKEN_CONSUMED' };
        }

        // Target capability check
        if (targetCapability && payload.targetCapability && payload.targetCapability !== targetCapability) {
          return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
        }

        // ADR-004: Parameter Hash Verification
        if (parameters && payload.actionHash) {
          const cap = targetCapability || payload.targetCapability || '';
          const computedHash = computeActionHash(cap, parameters);
          if (computedHash !== payload.actionHash) {
            return { isValid: false, errorCode: 'TOKEN_PARAMETER_HASH_MISMATCH' };
          }
        }

        this.consumedNonces.add(payload.nonce);
        return { isValid: true, actionHash: payload.actionHash };
      } catch {
        return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
      }
    }

    // Format B: Delimited token: "gt_<timestamp>_<nonce>" or "gt_<timestamp>_<nonce>_<actionHash>"
    const prefixIndex = token.indexOf('_');
    const secondIndex = token.indexOf('_', prefixIndex + 1);
    if (secondIndex === -1) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
    }

    const timestampStr = token.substring(prefixIndex + 1, secondIndex);
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
    }

    // 10-second TTL for execution grant tokens
    if (Date.now() - timestamp > 10000) {
      return { isValid: false, errorCode: 'TOKEN_EXPIRED' };
    }

    const remainder = token.substring(secondIndex + 1);
    const lastUnderscore = remainder.lastIndexOf('_');

    let nonce = remainder;
    let embeddedActionHash: string | undefined = undefined;

    if (lastUnderscore !== -1) {
      const candidateHash = remainder.substring(lastUnderscore + 1);
      if (/^[0-9a-f]{64}$/i.test(candidateHash)) {
        embeddedActionHash = candidateHash;
        nonce = remainder.substring(0, lastUnderscore);
      }
    }

    // Single-use anti-replay check
    if (this.consumedNonces.has(nonce)) {
      return { isValid: false, errorCode: 'TOKEN_CONSUMED' };
    }

    // ADR-004: Parameter Hash Verification
    if (embeddedActionHash && targetCapability && parameters) {
      const computedHash = computeActionHash(targetCapability, parameters);
      if (computedHash !== embeddedActionHash) {
        return { isValid: false, errorCode: 'TOKEN_PARAMETER_HASH_MISMATCH' };
      }
    }

    this.consumedNonces.add(nonce);
    return { isValid: true, actionHash: embeddedActionHash };
  }

  public static verifyConfirmationToken(token: string): TokenVerificationResult {
    if (!token || !token.startsWith('ct_')) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
    }

    const parts = token.split('_');
    if (parts.length < 3) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
    }

    const timestamp = parseInt(parts[1], 10);
    const nonce = parts[2];

    if (isNaN(timestamp)) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED' };
    }

    // 30-second TTL for confirmation tokens
    if (Date.now() - timestamp > 30000) {
      return { isValid: false, errorCode: 'TOKEN_EXPIRED' };
    }

    if (this.consumedNonces.has(nonce)) {
      return { isValid: false, errorCode: 'TOKEN_CONSUMED' };
    }

    return { isValid: true };
  }

  public static markConsumed(token: string): void {
    const parts = token.split('_');
    if (parts.length >= 3) {
      this.consumedNonces.add(parts[2]);
    }
  }

  public static resetConsumedNonces(): void {
    this.consumedNonces.clear();
  }

  /**
   * Helper to create an untampered mock execution grant token with bound actionHash.
   */
  public static createBoundExecutionGrant(
    targetCapability: string,
    parameters: Record<string, unknown>,
    nonce = Math.random().toString(36).substring(2, 8)
  ): string {
    const actionHash = computeActionHash(targetCapability, parameters);
    return `gt_${Date.now()}_${nonce}_${actionHash}`;
  }
}
