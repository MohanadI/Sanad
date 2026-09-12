import { z } from 'zod';
import { CapabilityIdSchema, type CapabilityId } from './capabilities.js';

export const ConfirmationTokenPayloadSchema = z
  .object({
    type: z.literal('CONFIRMATION_TOKEN'),
    actionId: z.string().uuid(),
    userId: z.string().min(1),
    targetCapability: CapabilityIdSchema,
    actionHash: z.string().length(64), // SHA-256 hex
    nonce: z.string().uuid(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type ConfirmationTokenPayload = z.infer<typeof ConfirmationTokenPayloadSchema>;

export const ExecutionGrantTokenPayloadSchema = z
  .object({
    type: z.literal('EXECUTION_GRANT'),
    actionId: z.string().uuid(),
    userId: z.string().min(1),
    targetCapability: CapabilityIdSchema,
    toolName: z.string().min(1),
    actionHash: z.string().length(64), // SHA-256 hex
    nonce: z.string().uuid(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type ExecutionGrantTokenPayload = z.infer<typeof ExecutionGrantTokenPayloadSchema>;

export const CandidateTokenPayloadSchema = z
  .object({
    type: z.literal('CANDIDATE_TOKEN'),
    intentId: z.string().min(1),
    targetCapability: CapabilityIdSchema,
    candidateHash: z.string().length(64), // SHA-256 hex
    nonce: z.string().uuid(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type CandidateTokenPayload = z.infer<typeof CandidateTokenPayloadSchema>;

export interface ExecutionAuthToken {
  token: string;
  actionId: string;
  targetCapability: CapabilityId;
  toolName?: string;
  actionHash: string;
  expiresAt: string;
  issuedAt: string;
  nonce: string;
}

import crypto from 'node:crypto';
import { SecurityTokenError } from './errors.js';

export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (key) =>
          JSON.stringify(key) +
          ':' +
          canonicalizeJson((obj as Record<string, unknown>)[key])
      )
      .join(',') +
    '}'
  );
}

export function computeActionHash(identifier: string, parameters: unknown): string {
  const canonicalString = identifier + ':' + canonicalizeJson(parameters ?? {});
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function generateCandidateToken(
  secretKey: string,
  intentId: string,
  targetCapability: CapabilityId,
  slots: Record<string, unknown>,
  ttlSeconds = 60
): { token: string; expiresAt: string } {
  const now = Date.now();
  const expiresAtDate = new Date(now + ttlSeconds * 1000);
  const expiresAt = expiresAtDate.toISOString();
  const nonce = crypto.randomUUID();
  const candidateHash = computeActionHash(intentId, slots);

  const payload: CandidateTokenPayload = {
    type: 'CANDIDATE_TOKEN',
    intentId,
    targetCapability,
    candidateHash,
    nonce,
    issuedAt: new Date(now).toISOString(),
    expiresAt,
  };

  const json = JSON.stringify(payload);
  const encodedPayload = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`act.${encodedPayload}`)
    .digest('base64url');

  return {
    token: `act_${encodedPayload}.${signature}`,
    expiresAt,
  };
}

export function verifyCandidateToken(
  secretKey: string,
  token: string,
  consumedNonces?: Set<string>
): CandidateTokenPayload {
  if (!token || !token.startsWith('act_')) {
    throw new SecurityTokenError('INVALID', "Candidate token missing prefix 'act_'");
  }

  const withoutPrefix = token.slice(4);
  const parts = withoutPrefix.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new SecurityTokenError('INVALID', 'Malformed candidate token structure');
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(`act.${encodedPayload}`)
    .digest('base64url');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const providedBuf = Buffer.from(providedSignature, 'utf8');

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    throw new SecurityTokenError('INVALID', 'Cryptographic signature mismatch on candidate token');
  }

  let payload: unknown;
  try {
    const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    payload = JSON.parse(decodedJson);
  } catch {
    throw new SecurityTokenError('INVALID', 'Unparseable candidate token payload');
  }

  const parsed = CandidateTokenPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SecurityTokenError('INVALID', 'Invalid candidate token schema');
  }

  const now = Date.now();
  if (now > new Date(parsed.data.expiresAt).getTime()) {
    throw new SecurityTokenError('EXPIRED', 'Candidate token has expired');
  }

  if (consumedNonces) {
    if (consumedNonces.has(parsed.data.nonce)) {
      throw new SecurityTokenError('REPLAY', 'Candidate token nonce already consumed');
    }
    consumedNonces.add(parsed.data.nonce);
  }

  return parsed.data;
}

export function verifyCandidateActionBinding(
  secretKey: string,
  candidateToken: string,
  action: { intentId: string; targetCapability: string; slots: Record<string, unknown> }
): CandidateTokenPayload {
  const tokenPayload = verifyCandidateToken(secretKey, candidateToken);

  if (tokenPayload.targetCapability !== action.targetCapability) {
    throw new SecurityTokenError('INVALID', 'Candidate token target capability mismatch');
  }
  if (tokenPayload.intentId !== action.intentId) {
    throw new SecurityTokenError('INVALID', 'Candidate token intentId mismatch');
  }
  const currentHash = computeActionHash(action.intentId, action.slots);
  if (tokenPayload.candidateHash !== currentHash) {
    throw new SecurityTokenError('INVALID', 'Candidate token does not match action slots (tampered action)');
  }

  return tokenPayload;
}
