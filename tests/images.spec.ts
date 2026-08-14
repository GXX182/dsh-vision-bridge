import { describe, expect, it } from 'vitest'
import { detectImageMediaType } from '../src/images.ts'

describe('detectImageMediaType', () => {
  it.each([
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    [new TextEncoder().encode('GIF89a'), 'image/gif'],
    [new Uint8Array([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBP')]), 'image/webp'],
  ] as const)('detects %s', (bytes, expected) => {
    expect(detectImageMediaType(bytes)).toBe(expected)
  })

  it('rejects unsupported bytes', () => {
    expect(detectImageMediaType(new TextEncoder().encode('not an image'))).toBeUndefined()
  })
})
