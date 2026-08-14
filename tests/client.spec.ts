import { describe, expect, it } from 'vitest'
import {
  isVisionBridgeModelChange,
  normalizeGoogleApiKey,
} from '../src/client.tsx'
import { maskCredentialValue, parseCredentialMaskView } from '../src/credential-mask.ts'

describe('Vision Bridge client credential controls', () => {
  it('normalizes a pasted API key without accepting blanks or embedded whitespace', () => {
    expect(normalizeGoogleApiKey('  AQ.example-key_1  ')).toEqual({ value: 'AQ.example-key_1' })
    expect(normalizeGoogleApiKey('   ')).toEqual({ error: 'required' })
    expect(normalizeGoogleApiKey('AQ.bad key')).toEqual({ error: 'invalid' })
  })

  it('prompts only when an established model changes into the Vision Bridge route', () => {
    const bridge = { provider: 'deepseek-vision-bridge', model: 'deepseek-v4-flash' }
    const otherBridgeModel = { provider: 'deepseek-vision-bridge', model: 'deepseek-v4-pro' }
    const regular = { provider: 'deepseek', model: 'deepseek-v4-flash' }

    expect(isVisionBridgeModelChange(null, bridge)).toBe(false)
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
})
