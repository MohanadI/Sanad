export interface CalendarEventSummary {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
}

export interface CreateEventParams {
  title: string;
  startTime: string;
  durationMinutes: number;
}

export interface ICalendarCapability {
  readUpcomingEvents(): Promise<CalendarEventSummary[]>;
  createEvent(params: CreateEventParams): Promise<CalendarEventSummary>;
}
