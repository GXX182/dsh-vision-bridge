/** Bounded Gemini-native REST client used by the Vision Bridge tool. */
import type { VisionProviderRequest } from './provider-common.ts';
import type { VisionAnalysis } from './types.ts';
/** Complete options for one Gemini visual-analysis request. */
export type GeminiRequest = VisionProviderRequest;
/** Send one bounded visual-analysis request using the Gemini native protocol. */
export declare function analyzeWithGemini(request: GeminiRequest): Promise<VisionAnalysis>;
