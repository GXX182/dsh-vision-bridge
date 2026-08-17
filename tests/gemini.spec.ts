import { describe, expect, it, vi } from 'vitest'
import { analyzeWithGemini } from '../src/gemini.ts'
import { VisionBridgeError } from '../src/errors.ts'

const image = {
  source: 'screen.png',
  mediaType: 'image/png' as const,
  bytes: 8,
  dataBase64: 'iVBORw0KGgo=',
}

function request(fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof analyzeWithGemini>[0]> = {}) {
  return {
    apiKey: 'secret-key',
    baseURL: 'https://example.test/v1beta',
    model: 'gemini-test',
    question: 'What is visible?',
    images: [image],
    maxOutputTokens: 128,
    maxResponseBytes: 4096,
    maxAnswerBytes: 4096,
    timeoutMs: 1000,
    signal: new AbortController().signal,
    fetchImpl,
    ...overrides,
  }
}

describe('analyzeWithGemini', () => {
  it('sends inline image data and returns canonical analysis', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'A settings dialog.' }] } }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5, totalTokenCount: 17 },
    }), { status: 200 }))

    await expect(analyzeWithGemini(request(fetchImpl))).resolves.toEqual({
      answer: 'A settings dialog.',
      provider: 'google',
      model: 'gemini-test',
      images: [{ source: 'screen.png', mediaType: 'image/png', bytes: 8 }],
      truncated: false,
      usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
    })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://example.test/v1beta/models/gemini-test:generateContent')
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.['x-goog-api-key']).toBe('secret-key')
    expect(init?.redirect).toBe('error')
    const body = JSON.parse(String(init?.body)) as { contents: Array<{ parts: unknown[] }> }
    expect(body.contents[0]?.parts).toContainEqual({
      inline_data: { mime_type: 'image/png', data: 'iVBORw0KGgo=' },
    })
    expect(String(init?.body)).toContain('untrusted evidence')
    expect(String(init?.body)).not.toContain('temperature')
  })

  it.each([
    [401, 'VISION_AUTH', false],
    [429, 'VISION_RATE_LIMIT', true],
    [503, 'VISION_PROVIDER_UNAVAILABLE', true],
  ] as const)('maps HTTP %s', async (status, code, retryable) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'provider detail' },
    }), { status }))
    const failure = await analyzeWithGemini(request(fetchImpl)).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(VisionBridgeError)
    expect(failure).toMatchObject({ code, retryable })
  })

  it('keeps status classification when an error body is not JSON', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('upstream unavailable', { status: 503 }))
    await expect(analyzeWithGemini(request(fetchImpl)))
      .rejects.toMatchObject({ code: 'VISION_PROVIDER_UNAVAILABLE', retryable: true })
  })

  it('rejects oversized provider responses before parsing', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(32), { status: 200 }))
    await expect(analyzeWithGemini(request(fetchImpl, { maxResponseBytes: 8 })))
      .rejects.toMatchObject({ code: 'VISION_PROVIDER_RESPONSE' })
  })

  it('truncates answer text on a UTF-8 boundary', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '界'.repeat(100) }] } }],
    }), { status: 200 }))
    const result = await analyzeWithGemini(request(fetchImpl, { maxAnswerBytes: 96 }))
    expect(result.truncated).toBe(true)
    expect(Buffer.byteLength(result.answer)).toBeLessThanOrEqual(96)
    expect(result.answer).not.toContain('�')
  })

  it('honors the configured timeout', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      await new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => { reject(init.signal?.reason) }, { once: true })
      })
      throw new Error('unreachable')
    })
    await expect(analyzeWithGemini(request(fetchImpl, { timeoutMs: 5 })))
      .rejects.toMatchObject({ code: 'VISION_TIMEOUT', retryable: true })
  })
})
