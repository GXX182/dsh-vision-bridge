import { describe, expect, it, vi } from 'vitest'
import { analyzeWithOpenAI } from '../src/openai.ts'

const image = {
  source: 'screen.png',
  mediaType: 'image/png' as const,
  bytes: 8,
  dataBase64: 'iVBORw0KGgo=',
}

function request(fetchImpl: typeof fetch, baseURL = 'https://relay.example.test/v1') {
  return {
    apiKey: 'relay-key',
    baseURL,
    model: 'vision-model',
    question: 'What is visible?',
    images: [image],
    maxOutputTokens: 128,
    maxResponseBytes: 4096,
    maxAnswerBytes: 4096,
    timeoutMs: 1000,
    signal: new AbortController().signal,
    fetchImpl,
  }
}

describe('analyzeWithOpenAI', () => {
  it('uses Chat Completions for a conventional OpenAI base URL', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'A settings dialog.' } }],
      usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
    }), { status: 200 }))

    await expect(analyzeWithOpenAI(request(fetchImpl))).resolves.toEqual({
      answer: 'A settings dialog.',
      provider: 'openai-compatible',
      model: 'vision-model',
      images: [{ source: 'screen.png', mediaType: 'image/png', bytes: 8 }],
      truncated: false,
      usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
    })
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://relay.example.test/v1/chat/completions')
    expect((init?.headers as Record<string, string>)?.authorization).toBe('Bearer relay-key')
    expect(init?.redirect).toBe('error')
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ content: unknown[] }>
    }
    expect(body.messages[0]?.content).toContainEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' },
    })
  })

  it('preserves a complete Responses endpoint and uses its image format', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: 'A chart.' }] }],
      usage: { input_tokens: 9, output_tokens: 3, total_tokens: 12 },
    }), { status: 200 }))

    const result = await analyzeWithOpenAI(request(fetchImpl, 'https://relay.example.test/v1/responses'))
    expect(result).toMatchObject({ answer: 'A chart.', provider: 'openai-compatible' })
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://relay.example.test/v1/responses')
    expect(String(init?.body)).toContain('input_image')
    expect(String(init?.body)).toContain('data:image/png;base64,iVBORw0KGgo=')
  })
})
