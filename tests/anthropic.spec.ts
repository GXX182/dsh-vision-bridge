import { describe, expect, it, vi } from 'vitest'
import { analyzeWithAnthropic } from '../src/anthropic.ts'

describe('analyzeWithAnthropic', () => {
  it('sends Anthropic message image blocks and parses text content', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: 'text', text: 'A compact settings window.' }],
      usage: { input_tokens: 11, output_tokens: 4 },
    }), { status: 200 }))
    const result = await analyzeWithAnthropic({
      apiKey: 'anthropic-key',
      baseURL: 'https://relay.example.test',
      model: 'claude-vision',
      question: 'What is visible?',
      images: [{
        source: 'screen.webp',
        mediaType: 'image/webp',
        bytes: 8,
        dataBase64: 'UklGRg==',
      }],
      maxOutputTokens: 128,
      maxResponseBytes: 4096,
      maxAnswerBytes: 4096,
      timeoutMs: 1000,
      signal: new AbortController().signal,
      fetchImpl,
    })

    expect(result).toMatchObject({
      answer: 'A compact settings window.',
      provider: 'anthropic-compatible',
      usage: { promptTokens: 11, completionTokens: 4, totalTokens: 15 },
    })
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://relay.example.test/v1/messages')
    const headers = init?.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('anthropic-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(String(init?.body)).toContain('"media_type":"image/webp"')
  })
})
