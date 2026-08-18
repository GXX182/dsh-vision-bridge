/** Image-admitting provider route that delegates text-only requests upstream. */
import { Buffer } from 'node:buffer';
import { freezeMessage, LlmAdapter, } from '@deepseek-ai/dsh-llm';
/** Shared hidden route selected when users enable session-backed vision. */
export const DEFAULT_BRIDGE_PROVIDER = 'deepseek-vision-bridge';
const IMAGE_PLACEHOLDER_TAG = 'vision-bridge-image';
const ROUTED_MODEL_PREFIX = 'vision-bridge-v1.';
/** Encode a provider/model pair into one opaque model id owned by the bridge route. */
export function routedBridgeModelId(upstreamProvider, model) {
    return `${ROUTED_MODEL_PREFIX}${Buffer.from(JSON.stringify([upstreamProvider, model]), 'utf8').toString('base64url')}`;
}
/** Decode a routed bridge model, falling back to the legacy single-upstream format. */
export function resolveBridgeModelRoute(model, legacyUpstreamProvider) {
    if (!model.startsWith(ROUTED_MODEL_PREFIX))
        return { upstreamProvider: legacyUpstreamProvider, model };
    try {
        const value = JSON.parse(Buffer.from(model.slice(ROUTED_MODEL_PREFIX.length), 'base64url').toString('utf8'));
        if (!Array.isArray(value) || value.length !== 2
            || typeof value[0] !== 'string' || value[0].length === 0
            || typeof value[1] !== 'string' || value[1].length === 0) {
            throw new Error('invalid routed model');
        }
        return { upstreamProvider: value[0], model: value[1] };
    }
    catch (error) {
        throw new Error('vision-bridge: invalid routed model id', { cause: error });
    }
}
/** Preserve legacy model ids for the configured default route and encode every other provider. */
export function bridgeModelIdFor(upstreamProvider, model, legacyUpstreamProvider) {
    return upstreamProvider === legacyUpstreamProvider ? model : routedBridgeModelId(upstreamProvider, model);
}
function imageModalities(input) {
    return [...new Set([...(input ?? ['text']), 'image'])];
}
function imagePlaceholder(block) {
    const attachmentId = String(block.attachment.attachmentId);
    return {
        type: 'text',
        text: `<${IMAGE_PLACEHOLDER_TAG} attachment_id=${JSON.stringify(attachmentId)}>The image bytes remain in the current Harness session and were not sent to this upstream model. Call vision_bridge with this attachment id when visual inspection is required.</${IMAGE_PLACEHOLDER_TAG}>`,
    };
}
function bridgeContent(content) {
    let changed = false;
    const bridged = content.map((block) => {
        if (block.type === 'image') {
            changed = true;
            return imagePlaceholder(block);
        }
        if (block.type === 'tool-result') {
            const nested = bridgeContent(block.content);
            if (!nested.changed)
                return block;
            changed = true;
            return { ...block, content: nested.content };
        }
        return block;
    });
    return { content: changed ? bridged : [...content], changed };
}
/**
 * Replace image blocks only in the provider-bound request copy. Session
 * messages remain unchanged, so the transcript and attachment references stay
 * durable and the vision tool can resolve them later.
 */
export function bridgeMessages(messages) {
    return messages.map((message) => {
        const bridged = bridgeContent(message.content);
        return bridged.changed
            ? freezeMessage({ ...message, content: bridged.content })
            : message;
    });
}
/**
 * A Harness-native adapter route that accepts durable image messages while
 * forwarding a text-only projection to the model's original provider.
 */
export class VisionBridgeAdapter extends LlmAdapter {
    ctx;
    options;
    constructor(ctx, options) {
        super();
        this.ctx = ctx;
        this.options = options;
    }
    providerInfo(provider) {
        return { id: provider, name: 'Vision Bridge' };
    }
    routeFor(model) {
        const route = resolveBridgeModelRoute(model, this.options.upstreamProvider);
        if (route.upstreamProvider === this.options.bridgeProvider) {
            throw new Error('vision-bridge: a routed model cannot target the bridge provider');
        }
        return route;
    }
    async listModels(provider) {
        const upstreams = this.ctx.llm.listProviders().filter(item => item.id !== this.options.bridgeProvider);
        const directories = await Promise.allSettled(upstreams.map(async (upstream) => ({
            upstream,
            models: await this.ctx.llm.listModels(upstream.id),
        })));
        return directories.flatMap((result) => {
            if (result.status === 'rejected')
                return [];
            const { upstream, models } = result.value;
            return models.map(model => ({
                ...model,
                provider,
                id: bridgeModelIdFor(upstream.id, model.id, this.options.upstreamProvider),
                name: `${model.name} (Vision Bridge)`,
                description: model.description ?? upstream.name,
                inputModalities: imageModalities(model.inputModalities),
            }));
        });
    }
    async resolveModel(provider, model, signal) {
        const route = this.routeFor(model);
        const resolved = await this.ctx.llm.resolveModelInfo(route.upstreamProvider, route.model, signal);
        return {
            ...resolved,
            provider,
            id: model,
            name: `${resolved.name} (Vision Bridge)`,
            inputModalities: imageModalities(resolved.inputModalities),
        };
    }
    stream(options) {
        const route = this.routeFor(options.model);
        return this.ctx.llm.stream({
            ...options,
            provider: route.upstreamProvider,
            model: route.model,
            messages: bridgeMessages(options.messages),
        });
    }
}
/** Register the uniquely named bridge route through the public LLM seam. */
export function registerVisionBridgeAdapter(ctx, options) {
    ctx.llm.registerAdapter([options.bridgeProvider], new VisionBridgeAdapter(ctx, options));
}
