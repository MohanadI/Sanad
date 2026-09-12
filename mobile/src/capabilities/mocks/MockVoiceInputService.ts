import { IVoiceInputService, VoiceInputResult, VoiceInputState } from '../interfaces/IVoiceInputService';

export class MockVoiceInputService implements IVoiceInputService {
  private state: VoiceInputState = 'IDLE';
  private callback: ((result: VoiceInputResult) => void) | null = null;

  public async startListening(onResult: (result: VoiceInputResult) => void): Promise<void> {
    this.state = 'LISTENING';
    this.callback = onResult;
  }

  public async stopListening(): Promise<void> {
    this.state = 'IDLE';
    this.callback = null;
  }

  public cancelListening(): void {
    this.state = 'IDLE';
    this.callback = null;
  }

  public getState(): VoiceInputState {
    return this.state;
  }

  // Test helper to simulate incoming speech recognition
  public emitSpokenInput(transcript: string, isFinal: boolean = true, confidence: number = 0.95): void {
    if (this.callback) {
      this.callback({
        transcript,
        confidence,
        isFinal,
      });
    }
  }
}

export const mockVoiceInputService = new MockVoiceInputService();
