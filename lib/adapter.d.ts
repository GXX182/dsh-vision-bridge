/** Image-admitting provider route that delegates text-only requests upstream. */
import type { Context } from '@deepseek-ai/cordis';
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, Message, StreamChunk } from '@deepseek-ai/dsh-llm';
/** Default route selected when users want DeepSeek plus session-backed vision. */
export declare const DEFAULT_BRIDGE_PROVIDER = "deepseek-vision-bridge";
/**
 * Replace image blocks only in the provider-bound request copy. Session
 * messages remain unchanged, so the transcript and attachment references stay
 * durable and the vision tool can resolve them later.
 */
export declare function bridgeMessages(messages: readonly Message[]): Message[];
/** Public configuration needed by the provider wrapper. */
export interface VisionBridgeAdapterOptions {
    bridgeProvider: string;
    upstreamProvider: string;
}
/**
 * A Harness-native adapter route that accepts durable image messages while
 * forwarding a text-only projection to the configured upstream provider.
 */
export declare class VisionBridgeAdapter extends LlmAdapter {
    private readonly ctx;
    private readonly options;
    constructor(ctx: Context, options: VisionBridgeAdapterOptions);
    providerInfo(provider: string): LlmProviderInfo;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
/** Register the uniquely named bridge route through the public LLM seam. */
export declare function registerVisionBridgeAdapter(ctx: Context, options: VisionBridgeAdapterOptions): void;
