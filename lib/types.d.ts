/** Configuration accepted by the Vision Bridge Cordis plugin. */
export interface Config {
    /** Provider route registered by this plugin. */
    bridgeProvider?: string;
    /** Existing text-capable provider route that receives bridged requests. */
    upstreamProvider?: string;
    /** Credential reference resolved for every call. */
    apiKeyEnv?: string;
    /** Gemini REST API base URL. */
    baseURL?: string;
    /** Gemini model used for visual analysis. */
    model?: string;
    /** Maximum number of images accepted by one call. */
    maxImages?: number;
    /** Maximum bytes accepted from one image. */
    maxImageBytes?: number;
    /** Maximum combined bytes accepted from all images. */
    maxTotalImageBytes?: number;
    /** Maximum characters accepted in the question. */
    maxQuestionChars?: number;
    /** Gemini generation-token limit. */
    maxOutputTokens?: number;
    /** Maximum bytes read from the Gemini HTTP response. */
    maxResponseBytes?: number;
    /** Maximum UTF-8 bytes returned in the analysis text. */
    maxAnswerBytes?: number;
    /** Per-call Gemini deadline in milliseconds. */
    timeoutMs?: number;
}
/** Configuration after Schemastery defaults have been applied. */
export type ResolvedConfig = Required<Config>;
/** Image data prepared for one Gemini request. */
export interface PreparedImage {
    /** Display-safe path or opaque session-attachment label. */
    source: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    bytes: number;
    dataBase64: string;
}
/** Gemini token accounting when the provider reports it. */
export interface VisionUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}
/** Canonical successful output of the `vision_bridge` tool. */
export interface VisionAnalysis {
    answer: string;
    provider: 'google';
    model: string;
    images: Array<{
        source: string;
        mediaType: PreparedImage['mediaType'];
        bytes: number;
    }>;
    truncated: boolean;
    usage?: VisionUsage;
}
