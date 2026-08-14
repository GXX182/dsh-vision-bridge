/** Bounded Gemini REST client used by the Vision Bridge tool. */
import type { PreparedImage, VisionAnalysis } from './types.ts';
/** Complete options for one Gemini visual-analysis request. */
export interface GeminiRequest {
    apiKey: string;
    baseURL: string;
    model: string;
    question: string;
    images: readonly PreparedImage[];
    maxOutputTokens: number;
    maxResponseBytes: number;
    maxAnswerBytes: number;
    timeoutMs: number;
    signal: AbortSignal;
    fetchImpl?: typeof fetch;
}
/**
 * Send one bounded visual-analysis request to Gemini.
 * @param request - credential, provider configuration, inputs, limits, and cancellation.
 * @returns canonical text analysis and provider metadata.
 */
export declare function analyzeWithGemini(request: GeminiRequest): Promise<VisionAnalysis>;
