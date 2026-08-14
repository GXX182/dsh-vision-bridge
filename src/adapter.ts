/** Image-admitting provider route that delegates text-only requests upstream. */

import type { Context } from '@deepseek-ai/cordis'
import {
  freezeMessage,
  LlmAdapter,
} from '@deepseek-ai/dsh-llm'
import type {
  ContentBlock,
  GenerateOptions,
  LlmModelInfo,
  LlmProviderInfo,
  LlmResolvedModelInfo,
  Message,
  ModelModality,
  StreamChunk,
} from '@deepseek-ai/dsh-llm'

/** Default route selected when users want DeepSeek plus session-backed vision. */
export const DEFAULT_BRIDGE_PROVIDER = 'deepseek-vision-bridge'

const IMAGE_PLACEHOLDER_TAG = 'vision-bridge-image'

function imageModalities(input: readonly ModelModality[] | undefined): ModelModality[] {
  return [...new Set<ModelModality>([...(input ?? ['text']), 'image'])]
}

function imagePlaceholder(block: Extract<ContentBlock, { type: 'image' }>): ContentBlock {
  const attachmentId = String(block.attachment.attachmentId)
  return {
    type: 'text',
    text: `<${IMAGE_PLACEHOLDER_TAG} attachment_id=${JSON.stringify(attachmentId)}>The image bytes remain in the current Harness session and were not sent to this upstream model. Call vision_bridge with this attachment id when visual inspection is required.</${IMAGE_PLACEHOLDER_TAG}>`,
  }
}

function bridgeContent(content: readonly ContentBlock[]): { content: ContentBlock[]; changed: boolean } {
  let changed = false
  const bridged = content.map((block): ContentBlock => {
    if (block.type === 'image') {
      changed = true
      return imagePlaceholder(block)
    }
    if (block.type === 'tool-result') {
      const nested = bridgeContent(block.content)
      if (!nested.changed) return block
      changed = true
      return { ...block, content: nested.content }
    }
    return block
  })
  return { content: changed ? bridged : [...content], changed }
}

/**
 * Replace image blocks only in the provider-bound request copy. Session
 * messages remain unchanged, so the transcript and attachment references stay
 * durable and the vision tool can resolve them later.
 */
export function bridgeMessages(messages: readonly Message[]): Message[] {
  return messages.map((message) => {
    const bridged = bridgeContent(message.content)
    return bridged.changed
      ? freezeMessage({ ...message, content: bridged.content })
      : message
  })
}

/** Public configuration needed by the provider wrapper. */
export interface VisionBridgeAdapterOptions {
  bridgeProvider: string
  upstreamProvider: string
}

/**
 * A Harness-native adapter route that accepts durable image messages while
 * forwarding a text-only projection to the configured upstream provider.
 */
export class VisionBridgeAdapter extends LlmAdapter {
  constructor(
    private readonly ctx: Context,
    private readonly options: VisionBridgeAdapterOptions,
  ) {
    super()
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'DeepSeek + Vision Bridge' }
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const models = await this.ctx.llm.listModels(this.options.upstreamProvider)
    return models.map(model => ({
      ...model,
      provider,
      name: `${model.name} (Vision Bridge)`,
      inputModalities: imageModalities(model.inputModalities),
    }))
  }

  override async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const resolved = await this.ctx.llm.resolveModelInfo(this.options.upstreamProvider, model, signal)
    return {
      ...resolved,
      provider,
      name: `${resolved.name} (Vision Bridge)`,
      inputModalities: imageModalities(resolved.inputModalities),
    }
  }

  override stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    return this.ctx.llm.stream({
      ...options,
      provider: this.options.upstreamProvider,
      messages: bridgeMessages(options.messages),
    })
  }
}

/** Register the uniquely named bridge route through the public LLM seam. */
export function registerVisionBridgeAdapter(ctx: Context, options: VisionBridgeAdapterOptions): void {
  ctx.llm.registerAdapter([options.bridgeProvider], new VisionBridgeAdapter(ctx, options))
}
