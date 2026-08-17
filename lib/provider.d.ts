/** Vision API format detection and provider dispatch. */
import type { VisionProviderRequest } from './provider-common.ts';
import type { VisionAnalysis, VisionApiFormat } from './types.ts';
export { detectVisionApiFormat, resolveVisionApiFormat } from './api-format.ts';
export interface RoutedVisionProviderRequest extends VisionProviderRequest {
    apiFormat: VisionApiFormat;
}
/** Send a request using the explicitly configured or URL-inferred wire format. */
export declare function analyzeWithProvider(request: RoutedVisionProviderRequest): Promise<VisionAnalysis>;
