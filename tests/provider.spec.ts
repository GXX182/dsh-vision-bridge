import { describe, expect, it } from 'vitest'
import { detectVisionApiFormat, resolveVisionApiFormat } from '../src/provider.ts'

describe('vision API format detection', () => {
  it.each([
    ['https://generativelanguage.googleapis.com', 'gemini-native'],
    ['https://relay.example.com/v1beta', 'gemini-native'],
    ['https://relay.example.com/v1beta/models/gemini:test:generateContent', 'gemini-native'],
    ['https://api.anthropic.com', 'anthropic-compatible'],
    ['https://relay.example.com/v1/messages', 'anthropic-compatible'],
    ['https://api.openai.com/v1', 'openai-compatible'],
    ['https://openrouter.ai/api/v1/chat/completions', 'openai-compatible'],
    ['https://relay.example.com/v1/responses', 'openai-compatible'],
    ['https://unknown-relay.example.com', 'openai-compatible'],
  ] as const)('detects %s as %s', (baseURL, expected) => {
    expect(detectVisionApiFormat(baseURL)).toBe(expected)
  })

  it('honors an explicit override for an otherwise ambiguous URL', () => {
    expect(resolveVisionApiFormat('anthropic-compatible', 'https://relay.example.com/v1'))
      .toBe('anthropic-compatible')
  })
})
