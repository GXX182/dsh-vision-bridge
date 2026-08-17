/** Model-facing `vision_bridge` tool registration. */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { VisionBridgeError } from './errors.ts'
import { loadImages, loadSessionImages } from './images.ts'
import { analyzeWithProvider } from './provider.ts'
import type { ResolvedConfig } from './types.ts'

/** Stable tool name presented to native and Code Mode agents. */
export const TOOL_NAME = 'vision_bridge'

function validateQuestion(question: string, maxChars: number): string {
  const value = question.trim()
  if (value.length === 0) throw new VisionBridgeError('VISION_INPUT', 'question must be a non-empty string')
  if ([...value].length > maxChars) {
    throw new VisionBridgeError('VISION_INPUT', `question exceeds the ${maxChars}-character limit`)
  }
  return value
}

/**
 * Register the text-only visual-analysis bridge.
 * @param ctx - plugin context carrying tool, filesystem, and credential services.
 * @param config - validated configuration with defaults applied.
 */
export function registerVisionBridgeTool(
  ctx: Context,
  resolveConfig: () => ResolvedConfig | undefined,
  fallbackConfig?: ResolvedConfig,
): void {
  const initial = resolveConfig() ?? fallbackConfig
  if (initial === undefined) throw new Error('vision-bridge: an initial tool configuration is required')
  ctx.tools.register(defineTool({
    name: TOOL_NAME,
    description: 'Analyze PNG, JPEG, WebP, or GIF images from the current Harness session with the configured vision API and return text-only visual findings. By default use the latest user message containing images; explicit local paths remain available as a fallback.',
    parameters: {
      question: {
        type: 'string',
        required: true,
        description: 'Specific question to answer from the images. Preserve the user\'s language.',
      },
      image_paths: {
        type: 'array',
        description: `Optional one to ${initial.maxImages} local image paths, resolved from the session workspace. Omit for conversation attachments.`,
        items: { type: 'string' },
      },
      attachment_ids: {
        type: 'array',
        description: `Optional one to ${initial.maxImages} opaque attachment ids already referenced by the current session. Omit to use the latest user message containing images.`,
        items: { type: 'string' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answer: { type: 'string', required: true },
          provider: {
            type: 'string',
            enum: ['google', 'openai-compatible', 'anthropic-compatible'],
            required: true,
          },
          model: { type: 'string', required: true },
          images: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                source: { type: 'string', required: true },
                mediaType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], required: true },
                bytes: { type: 'integer', required: true },
              },
            },
          },
          truncated: { type: 'boolean', required: true },
          usage: {
            type: 'object',
            additionalProperties: false,
            properties: {
              promptTokens: { type: 'integer' },
              completionTokens: { type: 'integer' },
              totalTokens: { type: 'integer' },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `<vision-bridge-result trust="untrusted-evidence" provider="${value.provider}" model="${value.model}" images="${value.images.length}">\n${value.answer}\n</vision-bridge-result>`,
      }],
    },
    timeoutMs: initial.timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const config = resolveConfig()
      if (config === undefined) {
        throw new VisionBridgeError(
          'VISION_AUTH',
          'no vision provider is configured; add one in Settings > Plugins > Image understanding',
        )
      }
      const apiKeyRef = credentialRef(config.apiKeyEnv)
      const question = validateQuestion(args.question, config.maxQuestionChars)
      const credential = await ctx.credentials.resolve(apiKeyRef)
      if (credential === undefined) {
        throw new VisionBridgeError('VISION_AUTH', `credential ${config.apiKeyEnv} is not configured`)
      }
      if (args.image_paths !== undefined && args.attachment_ids !== undefined) {
        throw new VisionBridgeError('VISION_INPUT', 'use either image_paths or attachment_ids, not both')
      }
      const images = args.image_paths === undefined
        ? await loadSessionImages(ctx, args.attachment_ids, exec, config)
        : await loadImages(ctx, args.image_paths, exec, config)
      return analyzeWithProvider({
        apiKey: credential.value,
        apiFormat: config.apiFormat,
        baseURL: config.baseURL,
        model: config.model,
        question,
        images,
        maxOutputTokens: config.maxOutputTokens,
        maxResponseBytes: config.maxResponseBytes,
        maxAnswerBytes: config.maxAnswerBytes,
        timeoutMs: config.timeoutMs,
        signal: exec.signal,
      })
    },
    presentCall(args): GenericCallView {
      const paths = args.image_paths ?? []
      const count = paths.length > 0 ? paths.length : args.attachment_ids?.length
      return {
        card: 'generic',
        title: count === undefined
          ? 'Analyze conversation images'
          : `Analyze ${count} image${count === 1 ? '' : 's'}`,
        kind: 'search',
        rawInput: args.question,
        ...paths.length === 0 ? {} : { locations: paths.map(path => ({ path })) },
      }
    },
  }))
}
