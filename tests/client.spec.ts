import { describe, expect, it } from 'vitest'
import {
  apply,
  foldBridgeModelGroups,
  isVisionBridgeModelChange,
  logicalModelSelection,
  normalizeGoogleApiKey,
  providerForModelPreference,
  withBridgePreferences,
} from '../src/client.tsx'
import { maskCredentialValue, parseCredentialMaskView } from '../src/credential-mask.ts'

describe('Vision Bridge client credential controls', () => {
  it('registers its settings card under the Host settings namespace key', () => {
    const registrations: Array<{ name: string; key?: string; id?: string }> = []
    const slots = {
      inject: (_name: string, register: () => void) => { register() },
      register: (options: { name: string; key?: string; id?: string }) => {
        registrations.push(options)
        return () => {}
      },
    }
    const services = {
      connection: { rpc: {} },
      sessions: { list: {} },
      modelDirectories: {},
    }
    apply({
      slots,
      get: (name: keyof typeof services) => services[name],
    } as never)

    expect(registrations.find(item => item.name === 'settings.plugin.item')).toMatchObject({
      key: 'vision-bridge',
    })
  })

  it('normalizes a pasted API key without accepting blanks or embedded whitespace', () => {
    expect(normalizeGoogleApiKey('  AQ.example-key_1  ')).toEqual({ value: 'AQ.example-key_1' })
    expect(normalizeGoogleApiKey('   ')).toEqual({ error: 'required' })
    expect(normalizeGoogleApiKey('AQ.bad key')).toEqual({ error: 'invalid' })
  })

  it('prompts when a Vision Bridge model appears initially or changes', () => {
    const bridge = { provider: 'deepseek-vision-bridge', model: 'deepseek-v4-flash' }
    const otherBridgeModel = { provider: 'deepseek-vision-bridge', model: 'deepseek-v4-pro' }
    const regular = { provider: 'deepseek', model: 'deepseek-v4-flash' }

    expect(isVisionBridgeModelChange(null, bridge)).toBe(true)
    expect(isVisionBridgeModelChange(null, regular)).toBe(false)
    expect(isVisionBridgeModelChange(bridge, bridge)).toBe(false)
    expect(isVisionBridgeModelChange(bridge, regular)).toBe(false)
    expect(isVisionBridgeModelChange(regular, bridge)).toBe(true)
    expect(isVisionBridgeModelChange(bridge, otherBridgeModel)).toBe(true)
  })

  it('shows only four leading and trailing characters from a normal credential', () => {
    expect(maskCredentialValue('AQ.example-secret-value_mso-cQ')).toBe('AQ.e****o-cQ')
    expect(maskCredentialValue('short')).toBe('********')
  })

  it('accepts only the value-free credential mask response shape', () => {
    expect(parseCredentialMaskView({ configured: true, masked: 'AQ.e****o-cQ' }))
      .toEqual({ configured: true, masked: 'AQ.e****o-cQ' })
    expect(parseCredentialMaskView({ configured: false })).toEqual({ configured: false })
    expect(parseCredentialMaskView({
      configured: true,
      masked: 'AQ.e****o-cQ',
      value: 'must-not-cross-the-wire',
    })).toBeUndefined()
  })

  it('folds one bridge catalog into glasses controls across every upstream group', () => {
    const groups = foldBridgeModelGroups([
      {
        id: 'deepseek-official',
        name: 'DeepSeek',
        models: [
          { id: 'flash', name: 'Flash' },
          { id: 'native', name: 'Native Vision' },
        ],
      },
      {
        id: 'teamrouter',
        name: 'teamrouter',
        models: [
          { id: 'claude', name: 'Claude' },
          { id: 'claude-vision', name: 'Claude Vision' },
        ],
      },
      {
        id: 'deepseek-vision-bridge',
        name: 'Vision Bridge',
        models: [
          { id: 'flash', name: 'Flash (Vision Bridge)' },
          { id: 'native', name: 'Native Vision (Vision Bridge)' },
          { id: 'routed-claude', name: 'Claude (Vision Bridge)' },
          { id: 'routed-claude-vision', name: 'Claude Vision (Vision Bridge)' },
        ],
      },
    ], {
      bridgeProvider: 'deepseek-vision-bridge',
      routes: [
        {
          upstreamProvider: 'deepseek-official',
          models: [
            { id: 'flash', bridgeModelId: 'flash', nativeVision: 'unsupported', bridgeEnabled: true },
            { id: 'native', bridgeModelId: 'native', nativeVision: 'native', bridgeEnabled: false },
          ],
        },
        {
          upstreamProvider: 'teamrouter',
          models: [
            { id: 'claude', bridgeModelId: 'routed-claude', nativeVision: 'unknown', bridgeEnabled: true },
            { id: 'claude-vision', bridgeModelId: 'routed-claude-vision', nativeVision: 'native', bridgeEnabled: false },
          ],
        },
      ],
    })

    expect(groups).toHaveLength(2)
    expect(groups[0]?.name).toBe('DeepSeek')
    expect(groups[0]?.models[0]).toMatchObject({
      id: 'flash',
      name: 'Flash',
      nativeVision: 'unsupported',
      bridgeEnabled: true,
      bridgeModel: { id: 'flash' },
    })
    expect(groups[0]?.models[1]).toMatchObject({ nativeVision: 'native' })
    expect(groups[1]?.models[0]).toMatchObject({
      id: 'claude',
      nativeVision: 'unknown',
      bridgeEnabled: true,
      bridgeModel: { id: 'routed-claude' },
    })
    expect(groups[1]?.models[1]).toMatchObject({ nativeVision: 'native' })
    expect(providerForModelPreference('deepseek-official', groups[0]!.models[0]!, {
      bridgeProvider: 'deepseek-vision-bridge',
      routes: [{ upstreamProvider: 'deepseek-official', models: [] }],
    })).toBe('deepseek-vision-bridge')
    expect(providerForModelPreference('teamrouter', groups[1]!.models[0]!, {
      bridgeProvider: 'deepseek-vision-bridge',
      routes: [{ upstreamProvider: 'teamrouter', models: [] }],
    })).toBe('deepseek-vision-bridge')
    expect(logicalModelSelection({ provider: 'deepseek-vision-bridge', model: 'routed-claude' }, {
      bridgeProvider: 'deepseek-vision-bridge',
      routes: [{
        upstreamProvider: 'teamrouter',
        models: [{
          id: 'claude', bridgeModelId: 'routed-claude', nativeVision: 'unknown', bridgeEnabled: true,
        }],
      }],
    })).toEqual({ provider: 'teamrouter', model: 'claude', bridge: true })
  })

  it('overlays local glasses preferences without changing routing metadata', () => {
    const routing = withBridgePreferences({
      bridgeProvider: 'deepseek-vision-bridge',
      visionProvider: { name: 'Google Gemini', model: 'gemini-3.6-flash' },
      routes: [{
        upstreamProvider: 'deepseek-official',
        models: [
          { id: 'flash', bridgeModelId: 'flash', nativeVision: 'unsupported', bridgeEnabled: false },
          { id: 'pro', bridgeModelId: 'pro', nativeVision: 'unsupported', bridgeEnabled: true },
        ],
      }, {
        upstreamProvider: 'teamrouter',
        models: [
          { id: 'flash', bridgeModelId: 'routed-flash', nativeVision: 'unknown', bridgeEnabled: true },
        ],
      }],
    }, 'deepseek-official', ['flash'])

    expect(routing).toEqual({
      bridgeProvider: 'deepseek-vision-bridge',
      visionProvider: { name: 'Google Gemini', model: 'gemini-3.6-flash' },
      routes: [{
        upstreamProvider: 'deepseek-official',
        models: [
          { id: 'flash', bridgeModelId: 'flash', nativeVision: 'unsupported', bridgeEnabled: true },
          { id: 'pro', bridgeModelId: 'pro', nativeVision: 'unsupported', bridgeEnabled: false },
        ],
      }, {
        upstreamProvider: 'teamrouter',
        models: [
          { id: 'flash', bridgeModelId: 'routed-flash', nativeVision: 'unknown', bridgeEnabled: true },
        ],
      }],
    })
  })
})
