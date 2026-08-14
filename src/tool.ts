/** Model-facing `vision_bridge` tool registration. */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { VisionBridgeError } from './errors.ts'
import { analyzeWithGemini } from './gemini.ts'
import { loadImages } from './images.ts'
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
export function registerVisionBridgeTool(ctx: Context, config: ResolvedConfig): void {
  const apiKeyRef = credentialRef(config.apiKeyEnv)
  ctx.tools.register(defineTool({
    name: TOOL_NAME,
    description: 'Analyze local PNG, JPEG, WebP, or GIF images with Gemini and return text-only visual findings. Use this when the active DeepSeek route cannot accept images.',
    parameters: {
      question: {
        type: 'string',
        required: true,
        description: 'Specific question to answer from the images. Preserve the user\'s language.',
      },
      image_paths: {
        type: 'array',
        required: true,
        description: `One to ${config.maxImages} local image paths, resolved from the session workspace.`,
        items: { type: 'string' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answer: { type: 'string', required: true },
          provider: { type: 'string', enum: ['google'], required: true },
          model: { type: 'string', required: true },
          images: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string', required: true },
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
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const question = validateQuestion(args.question, config.maxQuestionChars)
      const credential = await ctx.credentials.resolve(apiKeyRef)
      if (credential === undefined) {
        throw new VisionBridgeError('VISION_AUTH', `credential ${config.apiKeyEnv} is not configured`)
      }
      const images = await loadImages(ctx, args.image_paths, exec, config)
      return analyzeWithGemini({
        apiKey: credential.value,
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
      return {
        card: 'generic',
        title: `Analyze ${args.image_paths.length} image${args.image_paths.length === 1 ? '' : 's'}`,
        kind: 'search',
        rawInput: args.question,
        locations: args.image_paths.map(path => ({ path })),
      }
    },
  }))
}
