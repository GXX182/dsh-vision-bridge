import { describe, expect, it, vi } from 'vitest'
import { listVisionModels } from '../src/models.ts'

function request(overrides: Partial<Parameters<typeof listVisionModels>[0]> = {}) {
  return {
    apiFormat: 'auto' as const,
    apiKey: 'secret-key',
    baseURL: 'https://relay.example.com/v1',
    maxResponseBytes: 64 * 1024,
    timeoutMs: 1_000,
    signal: new AbortController().signal,
    ...overrides,
  }
}

describe('vision model discovery', () => {
  it('lists and sorts OpenAI-compatible models with bearer authentication', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: [{ id: 'vision-10' }, { id: 'vision-2' }, { id: 'vision-2' }],
    }), { status: 200 }))
    const result = await listVisionModels(request({ fetchImpl }))
    expect(result).toEqual({
      resolvedApiFormat: 'openai-compatible',
      models: [
        { id: 'vision-2', name: 'vision-2' },
        { id: 'vision-10', name: 'vision-10' },
      ],
    })
    expect(fetchImpl).toHaveBeenCalledWith('https://relay.example.com/v1/models', expect.objectContaining({
      method: 'GET',
      headers: { authorization: 'Bearer secret-key' },
      redirect: 'error',
    }))
  })

  it('uses Gemini model discovery and keeps generateContent-capable models', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      models: [
        { name: 'models/gemini-vision', displayName: 'Gemini Vision', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding', supportedGenerationMethods: ['embedContent'] },
      ],
    }), { status: 200 }))
    const result = await listVisionModels(request({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      fetchImpl,
    }))
    expect(result.models).toEqual([{ id: 'gemini-vision', name: 'Gemini Vision' }])
    expect(fetchImpl).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models', expect.objectContaining({
      headers: { 'x-goog-api-key': 'secret-key' },
    }))
  })

  it('prefers Anthropic models with image input support', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: [
        { id: 'claude-vision', display_name: 'Claude Vision', capabilities: { image_input: { supported: true } } },
        { id: 'claude-text', capabilities: { image_input: { supported: false } } },
        { id: 'relay-model-without-capabilities' },
      ],
    }), { status: 200 }))
    const result = await listVisionModels(request({
      apiFormat: 'anthropic-compatible',
      baseURL: 'https://api.anthropic.com/v1/messages',
      fetchImpl,
    }))
    expect(result.models.map(model => model.id)).toEqual(['claude-vision', 'relay-model-without-capabilities'])
    expect(fetchImpl).toHaveBeenCalledWith('https://api.anthropic.com/v1/models', expect.objectContaining({
      headers: { 'x-api-key': 'secret-key', 'anthropic-version': '2023-06-01' },
    }))
  })
})
