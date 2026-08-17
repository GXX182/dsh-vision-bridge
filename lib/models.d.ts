/** Provider model-directory discovery for the Settings UI. */
import type { ResolvedVisionApiFormat, VisionApiFormat } from './types.ts';
export interface VisionModelOption {
    id: string;
    name: string;
}
export interface VisionModelListRequest {
    apiFormat: VisionApiFormat;
    apiKey: string;
    baseURL: string;
    maxResponseBytes: number;
    timeoutMs: number;
    signal: AbortSignal;
    fetchImpl?: typeof fetch;
}
export interface VisionModelList {
    models: VisionModelOption[];
    resolvedApiFormat: ResolvedVisionApiFormat;
}
/** List models from the provider endpoint selected by URL/protocol. */
export declare function listVisionModels(request: VisionModelListRequest): Promise<VisionModelList>;
