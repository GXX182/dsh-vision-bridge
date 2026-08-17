/** Pure URL-based vision API format detection shared by Host and browser. */

import type { ResolvedVisionApiFormat, VisionApiFormat } from './types.ts'

export function detectVisionApiFormat(baseURL: string): ResolvedVisionApiFormat {
  const url = new URL(baseURL)
  const host = url.hostname.toLowerCase()
  const path = url.pathname.replace(/\/+$/u, '').toLowerCase()

  if (path.endsWith(':generatecontent') || /(?:^|\/)v1beta(?:\/|$)/u.test(path)) {
    return 'gemini-native'
  }
  if (path.endsWith('/v1/messages') || path.endsWith('/messages')) {
    return 'anthropic-compatible'
  }
  if (path.endsWith('/chat/completions') || path.endsWith('/responses')) {
    return 'openai-compatible'
  }
  if (host === 'generativelanguage.googleapis.com') return 'gemini-native'
  if (host === 'api.anthropic.com') return 'anthropic-compatible'
  return 'openai-compatible'
}

export function resolveVisionApiFormat(apiFormat: VisionApiFormat, baseURL: string): ResolvedVisionApiFormat {
  return apiFormat === 'auto' ? detectVisionApiFormat(baseURL) : apiFormat
}
