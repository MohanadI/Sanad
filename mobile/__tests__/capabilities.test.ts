import { BoundedToolExecutor } from '../src/capabilities/toolExecutor';
import { SecurityAuthorizationError, CapabilityDisabledError } from '../src/capabilities/types';
import { mockVoiceInputService } from '../src/capabilities/mocks/MockVoiceInputService';
import { mockTextToSpeechService } from '../src/capabilities/mocks/MockTextToSpeechService';
import { mockTelephonyCapability } from '../src/capabilities/mocks/MockTelephonyCapability';
import { mockMessagingCapability } from '../src/capabilities/mocks/MockMessagingCapability';
import { mockLocationCapability } from '../src/capabilities/mocks/MockLocationCapability';
import { mockCalendarCapability } from '../src/capabilities/mocks/MockCalendarCapability';
import { mockEmergencyCapability } from '../src/capabilities/mocks/MockEmergencyCapability';
import { TokenVerifier } from '../src/security/tokenVerifier';

describe('Device Capabilities & Tool Execution Sandbox', () => {
  beforeEach(() => {
    TokenVerifier.resetConsumedNonces();
    mockTextToSpeechService.clearHistory();
  });

  describe('BoundedToolExecutor Security Invariants', () => {
    it('executes authorized tool when valid execution grant token is provided', async () => {
      const grantToken = `gt_${Date.now()}_valid_token_abc`;

      const response = await BoundedToolExecutor.executeTool({
        toolName: 'TOOL_ASSISTANT_QUERY',
        targetCapability: 'CAP_ASSISTANT_QUERY',
        executionGrantToken: grantToken,
        parameters: {},
      });

      expect(response.success).toBe(true);
      expect(response.audioCue).toBe('EARCON_SUCCESS');
      expect(response.arabicFeedback).toBeDefined();
    });

    it('rejects execution when token is missing or malformed', async () => {
      await expect(
        BoundedToolExecutor.executeTool({
          toolName: 'TOOL_ASSISTANT_QUERY',
          targetCapability: 'CAP_ASSISTANT_QUERY',
          executionGrantToken: 'invalid_token',
          parameters: {},
        })
      ).rejects.toThrow(SecurityAuthorizationError);
    });

    it('rejects token replay (single-use anti-replay enforcement)', async () => {
      const grantToken = `gt_${Date.now()}_replayed_nonce_123`;

      // First call succeeds
      await BoundedToolExecutor.executeTool({
        toolName: 'TOOL_ASSISTANT_QUERY',
        targetCapability: 'CAP_ASSISTANT_QUERY',
        executionGrantToken: grantToken,
        parameters: {},
      });

      // Second call with same grant token MUST be rejected
      await expect(
        BoundedToolExecutor.executeTool({
          toolName: 'TOOL_ASSISTANT_QUERY',
          targetCapability: 'CAP_ASSISTANT_QUERY',
          executionGrantToken: grantToken,
          parameters: {},
        })
      ).rejects.toThrow(SecurityAuthorizationError);
    });

    it('rejects execution of gated capabilities', async () => {
      const grantToken = `gt_${Date.now()}_gated_token_xyz`;

      await expect(
        BoundedToolExecutor.executeTool({
          toolName: 'TOOL_CALL_PHONE',
          targetCapability: 'CAP_CONTACT_CALL',
          executionGrantToken: grantToken,
          parameters: {},
        })
      ).rejects.toThrow(SecurityAuthorizationError);
    });
  });

  describe('Gated Device Capability Mocks', () => {
    it('throws CapabilityDisabledError when calling telephony directly', async () => {
      await expect(
        mockTelephonyCapability.initiateCall({
          contactId: 'cnt_123',
          contactName: 'أحمد',
        })
      ).rejects.toThrow(CapabilityDisabledError);
    });

    it('throws CapabilityDisabledError when calling messaging directly', async () => {
      await expect(
        mockMessagingCapability.sendMessage({
          contactId: 'cnt_123',
          contactName: 'أحمد',
          messageBody: 'مرحبا',
        })
      ).rejects.toThrow(CapabilityDisabledError);
    });

    it('throws CapabilityDisabledError when calling location directly', async () => {
      await expect(mockLocationCapability.readCurrentLocation()).rejects.toThrow(
        CapabilityDisabledError
      );
      await expect(
        mockLocationCapability.shareLocation({
          recipientContactId: 'cnt_123',
          recipientName: 'هدى',
        })
      ).rejects.toThrow(CapabilityDisabledError);
    });

    it('throws CapabilityDisabledError when calling calendar directly', async () => {
      await expect(mockCalendarCapability.readUpcomingEvents()).rejects.toThrow(
        CapabilityDisabledError
      );
      await expect(
        mockCalendarCapability.createEvent({
          title: 'موعد',
          startTime: '2026-09-12T10:00:00Z',
          durationMinutes: 30,
        })
      ).rejects.toThrow(CapabilityDisabledError);
    });

    it('throws CapabilityDisabledError when calling emergency trigger directly', async () => {
      await expect(
        mockEmergencyCapability.triggerEmergency({
          triggerType: 'VOICE_DISTRESS',
        })
      ).rejects.toThrow(CapabilityDisabledError);
    });
  });

  describe('Voice and TTS Mocks', () => {
    it('simulates voice recognition stream', async () => {
      let receivedTranscript = '';
      await mockVoiceInputService.startListening((res) => {
        receivedTranscript = res.transcript;
      });

      mockVoiceInputService.emitSpokenInput('سند احفظ مرتي هدى');
      expect(receivedTranscript).toBe('سند احفظ مرتي هدى');
      expect(mockVoiceInputService.getState()).toBe('LISTENING');

      await mockVoiceInputService.stopListening();
      expect(mockVoiceInputService.getState()).toBe('IDLE');
    });

    it('records spoken feedback in TTS history', async () => {
      await mockTextToSpeechService.speak('صباح الخير');
      expect(mockTextToSpeechService.getHistory()).toContain('صباح الخير');
    });
  });
});
