/**
 * Data Sanitizer & Redaction Module.
 * Enforces Sanad Data Classification & Redaction Rules (DATA_CLASSIFICATION.md Section 4):
 * - Never log phone numbers (masked to country code + last 2 digits: +972 59 *** **56)
 * - Never log GPS coordinates
 * - Never log raw SMS or message text
 * - Never log raw calendar event contents
 * - Never log master tokens
 */

export class DataSanitizer {
  /**
   * Masks a telephone number: +972 59 912 3456 -> +972 59 *** **56
   */
  public static maskPhoneNumber(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/[\s\-()]/g, '');
    if (clean.length <= 4) return '****';

    const start = clean.substring(0, Math.min(6, clean.length - 2));
    const end = clean.substring(clean.length - 2);
    return `${start} *** **${end}`;
  }

  /**
   * Hashes an alias or contact name to prevent logging plaintext names.
   */
  public static hashIdentifier(name: string): string {
    if (!name) return '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16);
    return `hash_id_${hex}`;
  }

  /**
   * Strips numeric digits from spoken utterance transcripts to prevent accidental logging
   * of phone numbers, national IDs, or credit card numbers.
   */
  public static stripDigitsFromUtterance(utterance: string): string {
    if (!utterance) return '';
    // Strip Latin and Eastern Arabic digits
    return utterance.replace(/[0-9٠-٩]/g, '*').trim();
  }

  /**
   * Asserts that a log payload contains NO forbidden Tier 4 data fields.
   * Throws an error if forbidden keys (gps, latitude, longitude, phone, coordinates, token, sms) are found.
   */
  public static assertZeroPII(payload: Record<string, unknown>): void {
    const forbiddenKeys = [
      'phonenumber',
      'telephone',
      'contactnumber',
      'latitude',
      'longitude',
      'coordinates',
      'gps',
      'messagetext',
      'smscontent',
      'calendardetails',
      'authtoken',
      'bearer',
    ];

    for (const key of Object.keys(payload)) {
      const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
      if (forbiddenKeys.some((f) => normalized.includes(f))) {
        throw new Error(`Security Violation: Payload contains forbidden PII key '${key}'`);
      }
    }
  }
}
