import { MESSAGE_KEYS, t, type MessageKey } from './i18n.js';
import type { SanadApiError } from './api.js';

export class SanadDomainError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly messageKey: MessageKey;
  public readonly messageArabic: string;
  public readonly messageEnglish: string;
  public readonly incidentId: string;
  public readonly isRecoverable: boolean;

  constructor(options: {
    errorCode: string;
    statusCode: number;
    messageKey: MessageKey;
    params?: Record<string, string | number>;
    incidentId?: string;
    isRecoverable?: boolean;
    details?: string;
  }) {
    const arabic = t(options.messageKey, 'ar-PS', options.params);
    const english = t(options.messageKey, 'en', options.params);
    super(options.details ? `${english} (${options.details})` : english);

    this.name = 'SanadDomainError';
    this.errorCode = options.errorCode;
    this.statusCode = options.statusCode;
    this.messageKey = options.messageKey;
    this.messageArabic = arabic;
    this.messageEnglish = english;
    this.incidentId = options.incidentId ?? `inc_${Math.random().toString(36).substring(2, 10)}`;
    this.isRecoverable = options.isRecoverable ?? true;
  }

  toApiError(): SanadApiError {
    return {
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      messageEnglish: this.messageEnglish,
      messageArabic: this.messageArabic,
      timestamp: new Date().toISOString(),
      incidentId: this.incidentId,
      isRecoverable: this.isRecoverable,
      messageKey: this.messageKey,
    };
  }
}

export class CapabilityDisabledError extends SanadDomainError {
  constructor(capabilityId: string) {
    super({
      errorCode: 'POLICY_ERR_CAPABILITY_DISABLED',
      statusCode: 403,
      messageKey: MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED,
      details: `Capability ${capabilityId} is formally gated/disabled.`,
      isRecoverable: false,
    });
    this.name = 'CapabilityDisabledError';
  }
}

export class ValidationError extends SanadDomainError {
  constructor(details: string) {
    super({
      errorCode: 'ERR_VALIDATION_FAILED',
      statusCode: 400,
      messageKey: MESSAGE_KEYS.ERR_VALIDATION_FAILED,
      details,
      isRecoverable: true,
    });
    this.name = 'ValidationError';
  }
}

export class SecurityTokenError extends SanadDomainError {
  constructor(reason: 'INVALID' | 'EXPIRED' | 'REPLAY', details?: string) {
    const codeMap = {
      INVALID: { code: 'ERR_INVALID_TOKEN', key: MESSAGE_KEYS.ERR_INVALID_TOKEN },
      EXPIRED: { code: 'ERR_TOKEN_EXPIRED', key: MESSAGE_KEYS.ERR_TOKEN_EXPIRED },
      REPLAY: { code: 'ERR_TOKEN_REPLAY', key: MESSAGE_KEYS.ERR_TOKEN_REPLAY },
    };
    const item = codeMap[reason];
    super({
      errorCode: item.code,
      statusCode: 401,
      messageKey: item.key,
      details,
      isRecoverable: false,
    });
    this.name = 'SecurityTokenError';
  }
}

export class TamperedParametersError extends SanadDomainError {
  constructor(details?: string) {
    super({
      errorCode: 'ERR_PARAMETERS_TAMPERED',
      statusCode: 403,
      messageKey: MESSAGE_KEYS.ERR_INVALID_TOKEN,
      details: details ?? 'Execution parameters do not match signed authorization grant.',
      isRecoverable: false,
    });
    this.name = 'TamperedParametersError';
  }
}

