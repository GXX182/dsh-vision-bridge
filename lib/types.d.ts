/** API wire formats understood by the Vision Bridge provider clients. */
export type VisionApiFormat = 'auto' | 'gemini-native' | 'openai-compatible' | 'anthropic-compatible';
/** API wire format after automatic URL detection. */
export type ResolvedVisionApiFormat = Exclude<VisionApiFormat, 'auto'>;
/** Configuration accepted by the Vision Bridge Cordis plugin. */
export interface Config {
    /** Provider route registered by this plugin. */
    bridgeProvider?: string;
    /** Existing text-capable provider route that receives bridged requests. */
    upstreamProvider?: string;
    /** Credential reference resolved for every call. */
    apiKeyEnv?: string;
    /** Provider wire format. Auto detects from baseURL and defaults to OpenAI compatibility. */
    apiFormat?: VisionApiFormat;
    /** Vision API base URL or a supported complete request endpoint. */
    baseURL?: string;
    /** Provider model used for visual analysis. */
    model?: string;
    /** Maximum number of images accepted by one call. */
    maxImages?: number;
    /** Maximum bytes accepted from one image. */
    maxImageBytes?: number;
    /** Maximum combined bytes accepted from all images. */
    maxTotalImageBytes?: number;
    /** Maximum characters accepted in the question. */
    maxQuestionChars?: number;
    /** Provider generation-token limit. */
    maxOutputTokens?: number;
    /** Maximum bytes read from the provider HTTP response. */
    maxResponseBytes?: number;
    /** Maximum UTF-8 bytes returned in the analysis text. */
    maxAnswerBytes?: number;
    /** Per-call provider deadline in milliseconds. */
    timeoutMs?: number;
}
/** Configuration after Schemastery defaults have been applied. */
export type ResolvedConfig = Required<Config>;
/** Image data prepared for one provider request. */
export interface PreparedImage {
    /** Display-safe path or opaque session-attachment label. */
    source: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    bytes: number;
    dataBase64: string;
}
/** Token accounting when the provider reports it. */
export interface VisionUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}
/** Canonical successful output of the `vision_bridge` tool. */
export interface VisionAnalysis {
    answer: string;
    provider: 'google' | 'openai-compatible' | 'anthropic-compatible';
    model: string;
    images: Array<{
        source: string;
        mediaType: PreparedImage['mediaType'];
        bytes: number;
    }>;
    truncated: boolean;
    usage?: VisionUsage;
}
