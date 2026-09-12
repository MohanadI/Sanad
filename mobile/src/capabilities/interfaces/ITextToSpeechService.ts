export interface TTSOptions {
  rate?: number; // 0.5 to 2.0
  pitch?: number;
  language?: string; // 'ar-XA' or 'ar-PS'
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface ITextToSpeechService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): Promise<void>;
  isSpeaking(): boolean;
}
