import crypto from 'node:crypto';
import {
  type ConfirmationTokenPayload,
  type ExecutionGrantTokenPayload,
  ConfirmationTokenPayloadSchema,
  ExecutionGrantTokenPayloadSchema,
  SecurityTokenError,
  computeActionHash as commonComputeActionHash,
  type CapabilityId,
} from '@sanad/common';

export interface TokenServiceOptions {
  secretKey?: string;
  confirmationTtlSeconds?: number;
  grantTtlSeconds?: number;
}

export class TokenService {
  private readonly secretKey: string;
  private readonly confirmationTtlMs: number;
  private readonly grantTtlMs: number;
  private readonly consumedNonces = new Map<string, number>(); // nonce -> expiresAtMs

  constructor(options: TokenServiceOptions = {}) {
    this.secretKey = options.secretKey || process.env.SANAD_POLICY_SECRET || 'sanad-dev-ephemeral-secret-key-32b';
    this.confirmationTtlMs = (options.confirmationTtlSeconds ?? 30) * 1000;
    this.grantTtlMs = (options.grantTtlSeconds ?? 10) * 1000;
  }

  computeActionHash(identifier: string, slots: Record<string, unknown>): string {
    return commonComputeActionHash(identifier, slots);
  }

  generateConfirmationToken(
    actionId: string,
    userId: string,
    targetCapability: CapabilityId,
    actionHash: string
  ): { token: string; expiresAt: string } {
    const now = Date.now();
    const expiresAtDate = new Date(now + this.confirmationTtlMs);
    const expiresAt = expiresAtDate.toISOString();
    const nonce = crypto.randomUUID();

    const payload: ConfirmationTokenPayload = {
      type: 'CONFIRMATION_TOKEN',
      actionId,
      userId,
      targetCapability,
      actionHash,
      nonce,
      issuedAt: new Date(now).toISOString(),
      expiresAt,
    };

    const token = this.signPayload('ct', payload);
    return { token, expiresAt };
  }

  verifyConfirmationToken(token: string): ConfirmationTokenPayload {
    const payload = this.verifyAndParseToken('ct', token);
    const parsed = ConfirmationTokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SecurityTokenError('INVALID', 'Malformed confirmation token schema');
    }

    this.checkExpirationAndConsumeNonce(parsed.data.nonce, parsed.data.expiresAt);
    return parsed.data;
  }

  generateExecutionGrantToken(
    actionId: string,
    userId: string,
    targetCapability: CapabilityId,
    toolName: string,
    actionHash: string
  ): { token: string; expiresAt: string } {
    const now = Date.now();
    const expiresAtDate = new Date(now + this.grantTtlMs);
    const expiresAt = expiresAtDate.toISOString();
    const nonce = crypto.randomUUID();

    const payload: ExecutionGrantTokenPayload = {
      type: 'EXECUTION_GRANT',
      actionId,
      userId,
      targetCapability,
      toolName,
      actionHash,
      nonce,
      issuedAt: new Date(now).toISOString(),
      expiresAt,
    };

    const token = this.signPayload('gt', payload);
    return { token, expiresAt };
  }

  verifyExecutionGrantToken(token: string): ExecutionGrantTokenPayload {
    const payload = this.verifyAndParseToken('gt', token);
    const parsed = ExecutionGrantTokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SecurityTokenError('INVALID', 'Malformed execution grant token schema');
    }

    this.checkExpirationAndConsumeNonce(parsed.data.nonce, parsed.data.expiresAt);
    return parsed.data;
  }

  private signPayload(prefix: string, payload: unknown): string {
    const json = JSON.stringify(payload);
    const encodedPayload = Buffer.from(json, 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${prefix}.${encodedPayload}`)
      .digest('base64url');
    return `${prefix}_${encodedPayload}.${signature}`;
  }

  private verifyAndParseToken(expectedPrefix: string, token: string): unknown {
    if (!token || !token.startsWith(`${expectedPrefix}_`)) {
      throw new SecurityTokenError('INVALID', `Token missing expected prefix '${expectedPrefix}_'`);
    }

    const withoutPrefix = token.slice(expectedPrefix.length + 1);
    const parts = withoutPrefix.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new SecurityTokenError('INVALID', 'Token structure invalid');
    }

    const [encodedPayload, providedSignature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${expectedPrefix}.${encodedPayload}`)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(providedSignature, 'utf8');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      throw new SecurityTokenError('INVALID', 'Cryptographic signature mismatch');
    }

    try {
      const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      return JSON.parse(decodedJson);
    } catch {
      throw new SecurityTokenError('INVALID', 'Unparseable token payload');
    }
  }

  private checkExpirationAndConsumeNonce(nonce: string, expiresAt: string): void {
    const now = Date.now();
    const expiryMs = new Date(expiresAt).getTime();

    if (now > expiryMs) {
      throw new SecurityTokenError('EXPIRED', 'Token TTL has elapsed');
    }

    this.purgeExpiredNonces(now);

    if (this.consumedNonces.has(nonce)) {
      throw new SecurityTokenError('REPLAY', 'Nonce already consumed (replay detected)');
    }

    this.consumedNonces.set(nonce, expiryMs);
  }

  private purgeExpiredNonces(now: number): void {
    for (const [nonce, expiry] of this.consumedNonces.entries()) {
      if (now > expiry) {
        this.consumedNonces.delete(nonce);
      }
    }
  }
}
