import type {
  AssistantInterpretRequest,
  AssistantInterpretResponse,
  StructuredActionCandidate,
} from '@sanad/common';

export interface IntentClassifierResult {
  readonly candidate: StructuredActionCandidate;
  readonly candidateToken?: string;
  readonly explanationArabic: string;
  readonly matchedPattern?: string;
  readonly executionTimeMs: number;
}

export interface IntentClassifier {
  /**
   * Classifies user utterance into a validated StructuredActionCandidate.
   * Untrusted generative/heuristic boundary:
   * AI proposes, but NEVER executes or authorizes.
   */
  classify(request: AssistantInterpretRequest): Promise<StructuredActionCandidate>;

  /**
   * Interprets user utterance and emits an HMAC-signed candidateToken (ADR-006)
   * to cryptographically seal output against Confused Deputy attacks.
   */
  interpret(
    request: AssistantInterpretRequest,
    secretKey?: string
  ): Promise<AssistantInterpretResponse>;
}
