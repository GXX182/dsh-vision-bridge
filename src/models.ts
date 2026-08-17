/** Provider model-directory discovery for the Settings UI. */

import { resolveVisionApiFormat } from './api-format.ts'
import { fetchProviderRecord } from './provider-common.ts'
import type { ResolvedVisionApiFormat, VisionApiFormat } from './types.ts'

export interface VisionModelOption {
  id: string
  name: string
}

export interface VisionModelListRequest {
  apiFormat: VisionApiFormat
  apiKey: string
  baseURL: string
  maxResponseBytes: number
  timeoutMs: number
  signal: AbortSignal
  fetchImpl?: typeof fetch
}

export interface VisionModelList {
  models: VisionModelOption[]
  resolvedApiFormat: ResolvedVisionApiFormat
}

function endpointFor(baseURL: string, format: ResolvedVisionApiFormat): string {
  const url = new URL(baseURL)
  const path = url.pathname.replace(/\/+$/u, '')
  if (format === 'gemini-native') {
    url.pathname = /\/models\/[^/]+:generateContent$/iu.test(path)
      ? path.replace(/\/models\/[^/]+:generateContent$/iu, '/models')
      : /\/(?:v1|v1beta)$/iu.test(path)
        ? `${path}/models`
        : path.length === 0 || path === '/'
          ? '/v1beta/models'
          : `${path}/models`
  } else if (format === 'anthropic-compatible') {
    url.pathname = /\/(?:v1\/)?messages$/iu.test(path)
      ? path.replace(/\/(?:v1\/)?messages$/iu, '/v1/models')
      : /\/v1$/iu.test(path)
        ? `${path}/models`
        : path.length === 0 || path === '/'
          ? '/v1/models'
          : `${path}/models`
  } else {
    url.pathname = /\/(?:chat\/completions|responses)$/iu.test(path)
      ? path.replace(/\/(?:chat\/completions|responses)$/iu, '/models')
      : /\/v1$/iu.test(path)
        ? `${path}/models`
        : path.length === 0 || path === '/'
          ? '/v1/models'
          : `${path}/models`
  }
  return url.toString()
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(item => item !== null && typeof item === 'object' && !Array.isArray(item)) as Record<string, unknown>[]
    : []
}

function normalizeModels(items: VisionModelOption[]): VisionModelOption[] {
  const unique = new Map<string, VisionModelOption>()
  for (const item of items) {
    if (item.id.length === 0 || unique.has(item.id)) continue
    unique.set(item.id, item)
    if (unique.size >= 1_000) break
  }
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  }))
}

function openAIModels(body: Record<string, unknown>): VisionModelOption[] {
  return normalizeModels(records(body.data).flatMap((item) => {
    const id = stringField(item, 'id')
    return id === undefined ? [] : [{ id, name: id }]
  }))
}

function geminiModels(body: Record<string, unknown>): VisionModelOption[] {
  return normalizeModels(records(body.models).flatMap((item) => {
    const methods = item.supportedGenerationMethods
    if (Array.isArray(methods) && !methods.includes('generateContent')) return []
    const rawName = stringField(item, 'baseModelId') ?? stringField(item, 'name')
    if (rawName === undefined) return []
    const id = rawName.replace(/^models\//u, '')
    return [{ id, name: stringField(item, 'displayName') ?? id }]
  }))
}

function anthropicModels(body: Record<string, unknown>): VisionModelOption[] {
  return normalizeModels(records(body.data).flatMap((item) => {
    const capabilities = item.capabilities
    if (capabilities !== null && typeof capabilities === 'object' && !Array.isArray(capabilities)) {
      const imageInput = (capabilities as Record<string, unknown>).image_input
      if (imageInput !== null && typeof imageInput === 'object' && !Array.isArray(imageInput)
        && (imageInput as Record<string, unknown>).supported === false) return []
    }
    const id = stringField(item, 'id')
    return id === undefined ? [] : [{ id, name: stringField(item, 'display_name') ?? id }]
  }))
}

/** List models from the provider endpoint selected by URL/protocol. */
export async function listVisionModels(request: VisionModelListRequest): Promise<VisionModelList> {
  const resolvedApiFormat = resolveVisionApiFormat(request.apiFormat, request.baseURL)
  const headers = resolvedApiFormat === 'gemini-native'
    ? { 'x-goog-api-key': request.apiKey }
    : resolvedApiFormat === 'anthropic-compatible'
      ? { 'x-api-key': request.apiKey, 'anthropic-version': '2023-06-01' }
      : { authorization: `Bearer ${request.apiKey}` }
  const body = await fetchProviderRecord({
    providerName: 'Vision model directory',
    endpoint: endpointFor(request.baseURL, resolvedApiFormat),
    method: 'GET',
    headers,
    maxResponseBytes: request.maxResponseBytes,
    timeoutMs: request.timeoutMs,
    signal: request.signal,
    ...request.fetchImpl === undefined ? {} : { fetchImpl: request.fetchImpl },
  })
  return {
    resolvedApiFormat,
    models: resolvedApiFormat === 'gemini-native'
      ? geminiModels(body)
      : resolvedApiFormat === 'anthropic-compatible'
        ? anthropicModels(body)
        : openAIModels(body),
  }
}
