/** Shared bounded HTTP and output helpers for vision provider clients. */
import type { PreparedImage, VisionAnalysis, VisionUsage } from './types.ts';
export interface VisionProviderRequest {
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
export interface ProviderHttpRequest {
    providerName: string;
    endpoint: string;
    headers: Record<string, string>;
    method?: 'GET' | 'POST';
    body?: unknown;
    maxResponseBytes: number;
    timeoutMs: number;
    signal: AbortSignal;
    fetchImpl?: typeof fetch;
}
export declare function requestPrompt(question: string): string;
export declare function fetchProviderRecord(request: ProviderHttpRequest): Promise<Record<string, unknown>>;
export declare function truncateUtf8(text: string, maxBytes: number): {
    text: string;
    truncated: boolean;
};
export declare function integer(record: Record<string, unknown>, key: string): number | undefined;
export declare function canonicalResult(request: VisionProviderRequest, provider: VisionAnalysis['provider'], answer: string, usage?: VisionUsage): VisionAnalysis;
