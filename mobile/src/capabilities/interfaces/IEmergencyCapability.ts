export interface EmergencyTriggerParams {
  triggerType: 'HARDWARE_BUTTON' | 'VOICE_DISTRESS' | 'HARDWARE_BUTTON_PATTERN' | 'OFFLINE_KEYWORD_DISTRESS';
  countdownDurationMs?: number;
}

export interface EmergencyTriggerResult {
  triggered: boolean;
  channel: 'LOCAL_NATIVE_DIALER' | 'REMOTE_API_GATEWAY';
  offlineResilient: boolean;
  timestamp: string;
  cancelled?: boolean;
}

export interface IEmergencyCapability {
  triggerEmergency(params: EmergencyTriggerParams): Promise<EmergencyTriggerResult>;
  cancelEmergency(reason?: string): Promise<boolean>;
}
