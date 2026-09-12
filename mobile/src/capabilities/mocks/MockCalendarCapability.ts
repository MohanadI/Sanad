import { CalendarEventSummary, CreateEventParams, ICalendarCapability } from '../interfaces/ICalendarCapability';
import { CapabilityDisabledError } from '../types';
import { CAPABILITY_CONFIG } from '../capabilityRegistry';
import { t } from '../../localization/i18n';

export class MockCalendarCapability implements ICalendarCapability {
  public async readUpcomingEvents(): Promise<CalendarEventSummary[]> {
    if (!CAPABILITY_CONFIG.CAP_CALENDAR_READ.enabled) {
      throw new CapabilityDisabledError('CAP_CALENDAR_READ', t('gate_calendar_disabled'));
    }

    return [];
  }

  public async createEvent(_params: CreateEventParams): Promise<CalendarEventSummary> {
    if (!CAPABILITY_CONFIG.CAP_CALENDAR_WRITE.enabled) {
      throw new CapabilityDisabledError('CAP_CALENDAR_WRITE', t('gate_calendar_disabled'));
    }

    return {
      eventId: 'evt_mock_001',
      title: 'موعد طبي',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    };
  }
}

export const mockCalendarCapability = new MockCalendarCapability();
