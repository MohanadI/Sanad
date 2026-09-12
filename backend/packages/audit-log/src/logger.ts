import {
  type AuditEvent,
  type AuditLogFilter,
  type AuditLogger,
  AuditEventSchema,
} from './types.js';
import { sanitizeMetadataForAudit } from './redactor.js';

export class InMemoryAuditLogger implements AuditLogger {
  private readonly events: AuditEvent[] = [];

  async log(event: AuditEvent): Promise<void> {
    // 1. Sanitize metadata to guarantee zero raw PII persistence
    const sanitizedEvent: AuditEvent = {
      ...event,
      sanitizedMetadata: sanitizeMetadataForAudit(event.sanitizedMetadata),
    };

    // 2. Strict runtime schema validation
    const validated = AuditEventSchema.parse(sanitizedEvent);

    // 3. Append-only storage invariant
    this.events.push(Object.freeze({ ...validated }));
  }

  async query(filter: AuditLogFilter = {}): Promise<readonly AuditEvent[]> {
    let result = [...this.events];

    if (filter.userId) {
      result = result.filter((e) => e.userId === filter.userId);
    }
    if (filter.capability) {
      result = result.filter((e) => e.requestedCapability === filter.capability);
    }
    if (filter.decision) {
      result = result.filter((e) => e.policyDecision === filter.decision);
    }
    if (filter.startTime) {
      const startMs = new Date(filter.startTime).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }
    if (filter.endTime) {
      const endMs = new Date(filter.endTime).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }
    if (filter.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return Object.freeze(result);
  }

  async count(): Promise<number> {
    return this.events.length;
  }
}
