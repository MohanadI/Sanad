import { ITextToSpeechService, TTSOptions } from '../interfaces/ITextToSpeechService';

export class MockTextToSpeechService implements ITextToSpeechService {
  private currentlySpeaking: boolean = false;
  private spokenHistory: string[] = [];

  public async speak(text: string, options?: TTSOptions): Promise<void> {
    this.currentlySpeaking = true;
    this.spokenHistory.push(text);

    if (options?.onStart) options.onStart();

    // Simulate completion
    this.currentlySpeaking = false;
    if (options?.onDone) options.onDone();
  }

  public async stop(): Promise<void> {
    this.currentlySpeaking = false;
  }

  public isSpeaking(): boolean {
    return this.currentlySpeaking;
  }

  public getHistory(): string[] {
    return [...this.spokenHistory];
  }

  public clearHistory(): void {
    this.spokenHistory = [];
  }
}

export const mockTextToSpeechService = new MockTextToSpeechService();
