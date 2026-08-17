import { describe, expect, it } from 'vitest'
import {
  isEmptyPayload,
  parseBridgeRoutingView,
  parseAddProviderValue,
  parseConfigurationView,
  parseModelsView,
  parseProviderId,
  parseSetModelValue,
  parseSetBridgeValue,
  profileView,
} from '../src/configuration.ts'

describe('multi-provider vision configuration', () => {
  it('normalizes a provider added from the browser', () => {
    expect(parseAddProviderValue({
      name: '  Team relay  ',
      apiFormat: 'auto',
      baseURL: '  https://relay.example.com/v1/  ',
      apiKey: '  sk-test  ',
    })).toEqual({
      name: 'Team relay',
      apiFormat: 'auto',
      baseURL: 'https://relay.example.com/v1',
      apiKey: 'sk-test',
    })
  })

  it.each([
    { name: '', apiFormat: 'auto', baseURL: 'https://example.com/v1', apiKey: 'key' },
    { name: 'Relay', apiFormat: 'unknown', baseURL: 'https://example.com/v1', apiKey: 'key' },
    { name: 'Relay', apiFormat: 'auto', baseURL: 'http://example.com/v1', apiKey: 'key' },
    { name: 'Relay', apiFormat: 'auto', baseURL: 'https://key@example.com/v1', apiKey: 'key' },
    { name: 'Relay', apiFormat: 'auto', baseURL: 'https://example.com/v1?key=secret', apiKey: 'key' },
    { name: 'Relay', apiFormat: 'auto', baseURL: 'https://example.com/v1', apiKey: 'bad key' },
  ])('rejects unsafe or malformed providers', (value) => {
    expect(parseAddProviderValue(value)).toBeUndefined()
  })

  it('parses provider and model mutations exactly', () => {
    expect(parseProviderId({ providerId: 'relay-1' })).toBe('relay-1')
    expect(parseProviderId({ providerId: '../relay' })).toBeUndefined()
    expect(parseSetModelValue({ providerId: 'relay-1', model: ' vision-model ' })).toEqual({
      providerId: 'relay-1',
      model: 'vision-model',
    })
    expect(parseSetModelValue({ providerId: 'relay-1', model: '', extra: true })).toBeUndefined()
    expect(parseSetBridgeValue({ model: 'deepseek-v4-flash', enabled: true })).toEqual({
      model: 'deepseek-v4-flash',
      enabled: true,
    })
    expect(parseSetBridgeValue({ model: '', enabled: true })).toBeUndefined()
  })

  it('projects and validates a redacted directory without a credential value', () => {
    const provider = profileView({
      id: 'relay-1',
      name: 'Team relay',
      apiFormat: 'auto',
      baseURL: 'https://relay.example.com/v1',
      model: 'vision-model',
      apiKeyEnv: 'VISION_BRIDGE_RELAY_1_API_KEY',
    }, { configured: true, writable: true, maskedApiKey: 'sk-t****test' })
    const view = { activeProviderId: 'relay-1', providers: [provider] }
    expect(parseConfigurationView(view)).toEqual(view)
    expect(parseConfigurationView({ ...view, apiKey: 'must-not-cross-the-wire' })).toBeUndefined()
  })

  it('validates model directories and empty reads', () => {
    expect(isEmptyPayload({})).toBe(true)
    expect(isEmptyPayload({ extra: true })).toBe(false)
    expect(parseModelsView({
      resolvedApiFormat: 'openai-compatible',
      models: [{ id: 'vision-1', name: 'Vision 1' }],
    })?.models).toHaveLength(1)
  })

  it('accepts only the browser-safe bridge routing projection', () => {
    const view = {
      bridgeProvider: 'deepseek-vision-bridge',
      upstreamProvider: 'deepseek-official',
      visionProvider: { name: 'Google Gemini', model: 'gemini-3.6-flash' },
      models: [
        { id: 'text-model', nativeVision: 'unsupported', bridgeEnabled: true },
        { id: 'vision-model', nativeVision: 'native', bridgeEnabled: false },
        { id: 'relay-model', nativeVision: 'unknown', bridgeEnabled: false },
      ],
    }
    expect(parseBridgeRoutingView(view)).toEqual(view)
    expect(parseBridgeRoutingView({ ...view, apiKey: 'must-not-cross-the-wire' })).toBeUndefined()
    expect(parseBridgeRoutingView({
      ...view,
      models: [{ id: 'text-model', nativeVision: 'guessed', bridgeEnabled: false }],
    })).toBeUndefined()
  })
})
