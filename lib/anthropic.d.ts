/** Bounded Anthropic-compatible vision client used by the Vision Bridge tool. */
import type { VisionProviderRequest } from './provider-common.ts';
import type { VisionAnalysis } from './types.ts';
export type AnthropicRequest = VisionProviderRequest;
/** Send one bounded visual-analysis request using an Anthropic-compatible protocol. */
export declare function analyzeWithAnthropic(request: AnthropicRequest): Promise<VisionAnalysis>;
