/** Bounded OpenAI-compatible vision client used by the Vision Bridge tool. */
import type { VisionProviderRequest } from './provider-common.ts';
import type { VisionAnalysis } from './types.ts';
export type OpenAIRequest = VisionProviderRequest;
/** Send one bounded visual-analysis request using an OpenAI-compatible protocol. */
export declare function analyzeWithOpenAI(request: OpenAIRequest): Promise<VisionAnalysis>;
