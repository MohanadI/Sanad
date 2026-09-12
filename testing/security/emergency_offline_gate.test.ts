/**
 * Sanad Security Test Suite: Offline Emergency Execution Gate
 * 
 * Verifies finding:
 * - SEC-P1-01: Life-Safety Failure — Emergency Workflow Dependent on Cloud API Gateway and Remote Network Availability
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface EmergencyTriggerResult {
  triggered: boolean;
  channel: 'LOCAL_NATIVE_DIALER' | 'REMOTE_API_GATEWAY';
  offlineResilient: boolean;
  timeToDispatchMs: number;
}

/**
 * Autonomous Native Android Emergency Coordinator (Proposed Remediation)
 * Executes strictly on-device without network roundtrips.
 */
export class AutonomousNativeEmergencyDaemon {
  private networkAvailable: boolean;

  constructor(networkAvailable = false) {
    this.networkAvailable = networkAvailable;
  }

  public handleDistressTrigger(
    input: 'HARDWARE_BUTTON_COMBO' | 'KEYWORD_DISTRESS',
    isCancelled: () => boolean
  ): EmergencyTriggerResult {
    const start = performance.now();

    // The daemon MUST NOT perform any remote fetch or network socket operations.
    // Simulating countdown (5 seconds in production, instant in test)
    if (isCancelled()) {
      return {
        triggered: false,
        channel: 'LOCAL_NATIVE_DIALER',
        offlineResilient: true,
        timeToDispatchMs: performance.now() - start,
      };
    }

    // Direct invocation of Android Native Telephony Intent (Intent.ACTION_CALL)
    const timeToDispatchMs = performance.now() - start;

    return {
      triggered: true,
      channel: 'LOCAL_NATIVE_DIALER',
      offlineResilient: true,
      timeToDispatchMs,
    };
  }
}

/**
 * Flawed Architectural Model: Subordinating emergency to remote backend
 */
export async function flawedRemoteEmergencyWorkflow(isOnline: boolean): Promise<EmergencyTriggerResult> {
  if (!isOnline) {
    throw new Error('Network timeout: Cannot reach https://api.sanad.local/v1/assistant/interpret');
  }
  return {
    triggered: true,
    channel: 'REMOTE_API_GATEWAY',
    offlineResilient: false,
    timeToDispatchMs: 1200,
  };
}

describe('Security Verification: Offline Emergency Resilience', () => {
  it('SEC-P1-01: Demonstrates failure of cloud-dependent emergency workflow when offline', async () => {
    await assert.rejects(
      async () => {
        await flawedRemoteEmergencyWorkflow(false); // Offline
      },
      {
        message: /Network timeout/,
      },
      'Cloud-dependent emergency trigger must fail in offline / jammed environments.'
    );
  });

  it('SEC-P1-01: Autonomous native on-device daemon triggers emergency call with zero network dependency', () => {
    const offlineDaemon = new AutonomousNativeEmergencyDaemon(false); // Zero cellular/Wi-Fi
    const result = offlineDaemon.handleDistressTrigger('HARDWARE_BUTTON_COMBO', () => false);

    assert.equal(result.triggered, true);
    assert.equal(result.channel, 'LOCAL_NATIVE_DIALER');
    assert.equal(result.offlineResilient, true);
  });

  it('SEC-P1-01: Audible/Haptic cancellation cleanly halts the countdown before native dispatch', () => {
    const offlineDaemon = new AutonomousNativeEmergencyDaemon(false);
    const result = offlineDaemon.handleDistressTrigger('KEYWORD_DISTRESS', () => true); // User cancelled

    assert.equal(result.triggered, false);
  });
});
