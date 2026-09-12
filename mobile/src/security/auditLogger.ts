import { DataSanitizer } from './sanitizer';

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  userId: string;
  requestedCapability: string;
  policyDecision: 'ALLOWED' | 'CONFIRMATION_REQUIRED' | 'DENIED';
  reasonCode: string;
  executionStatus: 'SUCCESS' | 'FAILED' | 'ABORTED' | 'PENDING';
  safeMetadata?: Record<string, string | number | boolean>;
}

export class AuditLogger {
  private inMemoryLogs: AuditEvent[] = [];
  private static instance: AuditLogger;

  public static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }

  public logEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent {
    const safeMetadata = event.safeMetadata || {};

    // Enforce Zero PII invariant: throws if forbidden fields exist
    DataSanitizer.assertZeroPII(safeMetadata);

    const record: AuditEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...event,
      safeMetadata,
    };

    this.inMemoryLogs.unshift(record);

    // Keep memory logs bounded to 100 recent entries
    if (this.inMemoryLogs.length > 100) {
      this.inMemoryLogs.pop();
    }

    return record;
  }

  public getRecentLogs(): AuditEvent[] {
    return [...this.inMemoryLogs];
  }

  public getEvents(): AuditEvent[] {
    return this.getRecentLogs();
  }

  public clearLogs(): void {
    this.inMemoryLogs = [];
  }

  public clearEvents(): void {
    this.clearLogs();
  }
}

export const auditLogger = AuditLogger.getInstance();
