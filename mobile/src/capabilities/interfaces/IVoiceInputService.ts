export type VoiceInputState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'ERROR';

export interface VoiceInputResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface IVoiceInputService {
  startListening(onResult: (result: VoiceInputResult) => void): Promise<void>;
  stopListening(): Promise<void>;
  cancelListening(): void;
  getState(): VoiceInputState;
}
