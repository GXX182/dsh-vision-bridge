/** Loopback-only RPC channel used to project a display-safe credential hint. */
export const CREDENTIAL_MASK_CHANNEL = '/vision-bridge'

/** Endpoint that returns only whether the bridge credential exists and its mask. */
export const CREDENTIAL_MASK_ENDPOINT = 'credential-mask'

/** Browser-safe view of the bridge credential. */
export interface CredentialMaskView {
  configured: boolean
  masked?: string
}

/**
 * Reduce one secret to the four leading and four trailing characters.
 * Short values reveal no literal characters.
 */
export function maskCredentialValue(value: string): string {
  if (value.length <= 8) return '********'
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

/** Validate an untrusted RPC result without accepting any extra secret-shaped fields. */
export function parseCredentialMaskView(value: unknown): CredentialMaskView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (record.configured === false && keys.length === 1) return { configured: false }
  if (record.configured !== true || keys.length !== 2 || typeof record.masked !== 'string') return undefined
  if (!/^.{4}\*{4}.{4}$/u.test(record.masked)) return undefined
  return { configured: true, masked: record.masked }
}
