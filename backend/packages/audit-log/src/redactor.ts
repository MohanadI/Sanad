import crypto from 'node:crypto';
import { FORBIDDEN_PHONE_KEYS, PALESTINIAN_PHONE_REGEX } from './types.js';

/**
 * PII Redaction and Masking Utilities
 * Enforces radical data minimization required by Palestinian threat model
 * (docs/security/DATA_CLASSIFICATION.md & ADR-006)
 */

/**
 * Hashes contact alias names deterministically for audit log correlation
 * without exposing real personal or kinship names.
 */
export function hashAliasName(alias: string, salt: string = 'sanad-alias-salt'): string {
  const hash = crypto.createHmac('sha256', salt).update(alias.trim()).digest('hex').substring(0, 8);
  return `hash_alias_${hash}`;
}

/**
 * Strips all numeric digits from spoken utterance text to prevent
 * accidental persistence of credit card numbers, phone numbers, or national IDs.
 */
export function sanitizeUtteranceForAudit(text: string): string {
  return text
    // Replace standard digits (0-9)
    .replace(/\d+/g, '[REDACTED_NUMBER]')
    // Replace Arabic-Indic digits (٠-٩)
    .replace(/[\u0660-\u0669]+/g, '[REDACTED_NUMBER]')
    .trim();
}

/**
 * Recursively scrubs an arbitrary metadata object, removing
 * coordinates, dropping phone numbers/hashes entirely, and scrubbing sensitive fields.
 * Enforces Zero-Phone Retention Invariant (ADR-006).
 */
export function sanitizeMetadataForAudit(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    // 1. Zero-Phone Storage Invariant: Completely DROP any phone numbers, phone hashes, or MSISDN keys
    if (
      FORBIDDEN_PHONE_KEYS.has(lowerKey) ||
      lowerKey.includes('phone') ||
      lowerKey.includes('msisdn') ||
      lowerKey.includes('mobile')
    ) {
      continue;
    }

    // 2. Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeMetadataForAudit(value as Record<string, unknown>);
      continue;
    }

    // 3. Completely drop GPS coordinates
    if (
      lowerKey.includes('latitude') ||
      lowerKey.includes('longitude') ||
      lowerKey === 'lat' ||
      lowerKey === 'lon' ||
      lowerKey.includes('coords') ||
      lowerKey.includes('gps')
    ) {
      result[key] = '[GPS_OMITTED_PER_POLICY]';
      continue;
    }

    // 4. Hash alias names
    if (lowerKey.includes('alias')) {
      result[key] = typeof value === 'string' ? hashAliasName(value) : '[HASHED_ALIAS]';
      continue;
    }

    // 5. Sanitize text utterances or message bodies
    if (lowerKey.includes('utterance') || lowerKey.includes('body') || lowerKey.includes('text')) {
      result[key] = typeof value === 'string' ? sanitizeUtteranceForAudit(value) : '[REDACTED_TEXT]';
      continue;
    }

    // 6. Check string values for embedded Palestinian phone numbers
    if (typeof value === 'string') {
      const normalized = value.replace(/[\s\-()]/g, '');
      if (PALESTINIAN_PHONE_REGEX.test(normalized)) {
        result[key] = '[REDACTED_PHONE]';
        continue;
      }
    }

    result[key] = value;
  }

  return result;
}
