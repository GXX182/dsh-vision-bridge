/** Bounded Anthropic-compatible vision client used by the Vision Bridge tool. */

import { VisionBridgeError } from './errors.ts'
import {
  canonicalResult,
  fetchProviderRecord,
  integer,
  requestPrompt,
} from './provider-common.ts'
import type { VisionProviderRequest } from './provider-common.ts'
import type { VisionAnalysis, VisionUsage } from './types.ts'

export type AnthropicRequest = VisionProviderRequest

function anthropicEndpoint(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/u, '')
  const path = new URL(trimmed).pathname.toLowerCase()
  if (path.endsWith('/messages')) return trimmed
  if (path.endsWith('/v1')) return `${trimmed}/messages`
  return `${trimmed}/v1/messages`
}

function answerFrom(body: Record<string, unknown>): string {
  if (!Array.isArray(body.content)) return ''
  return body.content.flatMap((part): string[] => {
    if (part === null || typeof part !== 'object' || Array.isArray(part)) return []
    const record = part as Record<string, unknown>
    return record.type === 'text' && typeof record.text === 'string' ? [record.text] : []
  }).join('\n').trim()
}

function usageFrom(body: Record<string, unknown>): VisionUsage | undefined {
  const raw = body.usage
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const promptTokens = integer(record, 'input_tokens')
  const completionTokens = integer(record, 'output_tokens')
  const totalTokens = promptTokens === undefined || completionTokens === undefined
    ? undefined
    : promptTokens + completionTokens
  const usage: VisionUsage = {
    ...promptTokens === undefined ? {} : { promptTokens },
    ...completionTokens === undefined ? {} : { completionTokens },
    ...totalTokens === undefined ? {} : { totalTokens },
  }
  return Object.keys(usage).length === 0 ? undefined : usage
}

/** Send one bounded visual-analysis request using an Anthropic-compatible protocol. */
export async function analyzeWithAnthropic(request: AnthropicRequest): Promise<VisionAnalysis> {
  const body = await fetchProviderRecord({
    providerName: 'Anthropic-compatible provider',
    endpoint: anthropicEndpoint(request.baseURL),
    headers: {
      'x-api-key': request.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: {
      model: request.model,
      max_tokens: request.maxOutputTokens,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: requestPrompt(request.question) },
          ...request.images.map(image => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mediaType,
              data: image.dataBase64,
            },
          })),
        ],
      }],
    },
    maxResponseBytes: request.maxResponseBytes,
    timeoutMs: request.timeoutMs,
    signal: request.signal,
    ...request.fetchImpl === undefined ? {} : { fetchImpl: request.fetchImpl },
  })
  const answer = answerFrom(body)
  if (answer.length === 0) {
    throw new VisionBridgeError('VISION_PROVIDER_RESPONSE', 'Anthropic-compatible provider returned no analysis text')
  }
  return canonicalResult(request, 'anthropic-compatible', answer, usageFrom(body))
}
