import { locationAudioGuard } from '../src/capabilities/location/LocationAudioGuard';
import { accessibilityManager } from '../src/accessibility/AccessibilityManager';
import { earconService } from '../src/accessibility/EarconService';

describe('Public Geolocation Audio Guard (SEC-P2-02)', () => {
  beforeEach(() => {
    accessibilityManager.setScreenCurtain(false);
    earconService.clearHistory();
    locationAudioGuard.setAudioRoute('LOUDSPEAKER');
  });

  it('permits direct vocalization when private headphones or bluetooth are connected', () => {
    const decisionHeadset = locationAudioGuard.evaluateVocalizationGate({
      audioRoute: 'HEADSET',
      approximateAreaArabic: 'رام الله - بالقرب من المستشفى الاستشاري',
    });

    expect(decisionHeadset.allowed).toBe(true);
    expect(decisionHeadset.requiresConfirmation).toBe(false);
    expect(decisionHeadset.spokenOutput).toContain('رام الله');

    const decisionBluetooth = locationAudioGuard.evaluateVocalizationGate({
      audioRoute: 'BLUETOOTH',
      approximateAreaArabic: 'نابلس - رفيديا',
    });

    expect(decisionBluetooth.allowed).toBe(true);
    expect(decisionBluetooth.requiresConfirmation).toBe(false);
  });

  it('blocks loudspeaker vocalization and triggers confirmation challenge prompt', () => {
    const decision = locationAudioGuard.evaluateVocalizationGate({
      audioRoute: 'LOUDSPEAKER',
      approximateAreaArabic: 'رام الله - المنارة',
      userConfirmedLoudspeaker: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.requiresConfirmation).toBe(true);
    expect(decision.promptArabic).toBe('موقعك حساس. هل تريد سماعه عبر السماعة الخارجية؟');
    expect(decision.earconCue).toBe('EARCON_CONFIRM_CHALLENGE');
    expect(decision.hapticCue).toBe('NOTIFICATION_WARNING');
  });

  it('blocks vocalization when Screen Curtain is active regardless of route', () => {
    // Screen curtain indicates sensitive environment (e.g. checkpoint or public transit)
    accessibilityManager.setScreenCurtain(true);

    const decision = locationAudioGuard.evaluateVocalizationGate({
      audioRoute: 'HEADSET',
      userConfirmedLoudspeaker: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.requiresConfirmation).toBe(true);
  });

  it('permits vocalization after user gives explicit affirmative confirmation', () => {
    const decision = locationAudioGuard.evaluateVocalizationGate({
      audioRoute: 'LOUDSPEAKER',
      userConfirmedLoudspeaker: true,
      approximateAreaArabic: 'القدس - شارع صلاح الدين',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(false);
    expect(decision.spokenOutput).toContain('القدس - شارع صلاح الدين');
  });

  it('redacts raw GPS coordinates to coarse descriptive landmarks', () => {
    // Input contains precise decimal GPS coordinates
    const rawInput = '31.9038, 35.2034 بالقرب من دوار المنارة، رام الله';
    const sanitized = locationAudioGuard.formatCoarseLandmark(rawInput);

    expect(sanitized).not.toContain('31.9038');
    expect(sanitized).not.toContain('35.2034');
    expect(sanitized).toContain('دوار المنارة، رام الله');
  });

  it('triggers audio and haptic privacy challenge when invoked', async () => {
    await locationAudioGuard.triggerPrivacyChallenge();

    expect(earconService.getHistory()).toContain('EARCON_CONFIRM_CHALLENGE');
    expect(earconService.getLastPlayed()).toBe('EARCON_CONFIRM_CHALLENGE');
  });
});
