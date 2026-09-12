import { autonomousEmergencyService } from '../src/capabilities/emergency/AutonomousEmergencyService';
import { earconService } from '../src/accessibility/EarconService';
import { auditLogger } from '../src/security/auditLogger';

describe('Autonomous Native Emergency Subsystem (ADR-005)', () => {
  beforeEach(() => {
    autonomousEmergencyService.resetState();
    autonomousEmergencyService.clearOfflineTelemetryQueue();
    earconService.clearHistory();
    auditLogger.clearEvents();
  });

  it('triggers emergency with zero cloud network dependency via handleDistressTrigger', () => {
    const result = autonomousEmergencyService.handleDistressTrigger(
      'HARDWARE_BUTTON_PATTERN',
      () => false
    );

    expect(result.triggered).toBe(true);
    expect(result.channel).toBe('LOCAL_NATIVE_DIALER');
    expect(result.offlineResilient).toBe(true);
    expect(autonomousEmergencyService.getState()).toBe('DISPATCHED');

    // Verify zero-PII offline telemetry
    const queue = autonomousEmergencyService.getOfflineTelemetryQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].eventType).toBe('EMERGENCY_DISPATCHED');
    expect(queue[0].channel).toBe('LOCAL_NATIVE_DIALER');
  });

  it('aborts emergency countdown cleanly when cancel is invoked', () => {
    const result = autonomousEmergencyService.handleDistressTrigger(
      'OFFLINE_KEYWORD_DISTRESS',
      () => true // user cancelled
    );

    expect(result.triggered).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.cancelReason).toBe('USER_CANCELLED');

    const queue = autonomousEmergencyService.getOfflineTelemetryQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].eventType).toBe('EMERGENCY_CANCELLED');
  });

  it('recognizes Palestinian Arabic distress keywords offline', () => {
    expect(autonomousEmergencyService.isDistressKeyword('طوارئ')).toBe(true);
    expect(autonomousEmergencyService.isDistressKeyword('يا سند النجدة')).toBe(true);
    expect(autonomousEmergencyService.isDistressKeyword('ساعدوني بسرعة')).toBe(true);
    expect(autonomousEmergencyService.isDistressKeyword('مرحبا كيفك')).toBe(false);
  });

  it('recognizes cancellation keywords offline', () => {
    expect(autonomousEmergencyService.isCancelKeyword('إلغاء')).toBe(true);
    expect(autonomousEmergencyService.isCancelKeyword('الغاء')).toBe(true);
    expect(autonomousEmergencyService.isCancelKeyword('تراجع عن الأمر')).toBe(true);
    expect(autonomousEmergencyService.isCancelKeyword('نعم تابع')).toBe(false);
  });

  it('executes countdown and triggers earcons and ticks', async () => {
    jest.useFakeTimers();

    const tickTicks: number[] = [];
    const countdownPromise = autonomousEmergencyService.startCountdown(
      'OFFLINE_KEYWORD_DISTRESS',
      3000,
      (sec) => tickTicks.push(sec)
    );

    expect(autonomousEmergencyService.getState()).toBe('COUNTDOWN');
    expect(earconService.getHistory()).toContain('EARCON_EMERGENCY_COUNTDOWN');

    // Advance 1 second
    jest.advanceTimersByTime(1000);
    // Advance 2 seconds
    jest.advanceTimersByTime(2000);

    const result = await countdownPromise;
    expect(result.triggered).toBe(true);
    expect(result.channel).toBe('LOCAL_NATIVE_DIALER');
    expect(earconService.getHistory()).toContain('EARCON_SUCCESS');
    expect(autonomousEmergencyService.getState()).toBe('DISPATCHED');

    jest.useRealTimers();
  });

  it('allows user to cancel during the active countdown window', async () => {
    jest.useFakeTimers();

    const _countdownPromise = autonomousEmergencyService.startCountdown(
      'OFFLINE_KEYWORD_DISTRESS',
      5000
    );

    expect(autonomousEmergencyService.getState()).toBe('COUNTDOWN');

    // Advance 2 seconds into countdown
    jest.advanceTimersByTime(2000);

    // User cancels
    const cancelled = autonomousEmergencyService.cancelEmergency('SPOKEN_CANCEL');
    expect(cancelled).toBe(true);
    expect(autonomousEmergencyService.getState()).toBe('CANCELLED');
    expect(earconService.getHistory()).toContain('EARCON_CANCELLED');

    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('guarantees offline telemetry contains zero phone numbers or PII', () => {
    autonomousEmergencyService.setTrustedNumber('0599123456');
    autonomousEmergencyService.handleDistressTrigger('HARDWARE_BUTTON_PATTERN', () => false);

    const queue = autonomousEmergencyService.getOfflineTelemetryQueue();
    const serialized = JSON.stringify(queue);

    // Must strictly NOT contain phone numbers
    expect(serialized).not.toContain('0599123456');
    expect(serialized).not.toMatch(/05[69]\d{7}/);
  });
});
