/** Image-admitting provider route that delegates text-only requests upstream. */
import type { Context } from '@deepseek-ai/cordis';
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, Message, StreamChunk } from '@deepseek-ai/dsh-llm';
/** Shared hidden route selected when users enable session-backed vision. */
export declare const DEFAULT_BRIDGE_PROVIDER = "deepseek-vision-bridge";
export interface VisionBridgeModelRoute {
    upstreamProvider: string;
    model: string;
}
/** Encode a provider/model pair into one opaque model id owned by the bridge route. */
export declare function routedBridgeModelId(upstreamProvider: string, model: string): string;
/** Decode a routed bridge model, falling back to the legacy single-upstream format. */
export declare function resolveBridgeModelRoute(model: string, legacyUpstreamProvider: string): VisionBridgeModelRoute;
/** Preserve legacy model ids for the configured default route and encode every other provider. */
export declare function bridgeModelIdFor(upstreamProvider: string, model: string, legacyUpstreamProvider: string): string;
/**
 * Replace image blocks only in the provider-bound request copy. Session
 * messages remain unchanged, so the transcript and attachment references stay
 * durable and the vision tool can resolve them later.
 */
export declare function bridgeMessages(messages: readonly Message[]): Message[];
/** Public configuration needed by the provider wrapper. */
export interface VisionBridgeAdapterOptions {
    bridgeProvider: string;
    /** Legacy default retained for existing sessions and model selections. */
    upstreamProvider: string;
}
/**
 * A Harness-native adapter route that accepts durable image messages while
 * forwarding a text-only projection to the model's original provider.
 */
export declare class VisionBridgeAdapter extends LlmAdapter {
    private readonly ctx;
    private readonly options;
    constructor(ctx: Context, options: VisionBridgeAdapterOptions);
    providerInfo(provider: string): LlmProviderInfo;
    private routeFor;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
/** Register the uniquely named bridge route through the public LLM seam. */
export declare function registerVisionBridgeAdapter(ctx: Context, options: VisionBridgeAdapterOptions): void;
