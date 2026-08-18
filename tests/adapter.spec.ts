import { describe, expect, it } from 'vitest'
import {
  bridgeModelIdFor,
  resolveBridgeModelRoute,
  routedBridgeModelId,
} from '../src/adapter.ts'

describe('Vision Bridge provider/model routing', () => {
  it('preserves legacy ids for the configured default provider', () => {
    expect(bridgeModelIdFor('deepseek-official', 'shared-model', 'deepseek-official')).toBe('shared-model')
    expect(resolveBridgeModelRoute('shared-model', 'deepseek-official')).toEqual({
      upstreamProvider: 'deepseek-official',
      model: 'shared-model',
    })
  })

  it('round-trips an opaque route for another provider without model-id collisions', () => {
    const routed = routedBridgeModelId('teamrouter', 'shared-model')
    expect(routed).not.toBe('shared-model')
    expect(resolveBridgeModelRoute(routed, 'deepseek-official')).toEqual({
      upstreamProvider: 'teamrouter',
      model: 'shared-model',
    })
  })

  it('rejects malformed routed ids instead of sending them to the legacy provider', () => {
    expect(() => resolveBridgeModelRoute('vision-bridge-v1.not-base64-json', 'deepseek-official'))
      .toThrow('invalid routed model id')
  })
})
