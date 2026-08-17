/** Vision API format detection and provider dispatch. */

import { analyzeWithAnthropic } from './anthropic.ts'
import { resolveVisionApiFormat } from './api-format.ts'
import { analyzeWithGemini } from './gemini.ts'
import { analyzeWithOpenAI } from './openai.ts'
import type { VisionProviderRequest } from './provider-common.ts'
import type { VisionAnalysis, VisionApiFormat } from './types.ts'

export { detectVisionApiFormat, resolveVisionApiFormat } from './api-format.ts'

export interface RoutedVisionProviderRequest extends VisionProviderRequest {
  apiFormat: VisionApiFormat
}

/** Send a request using the explicitly configured or URL-inferred wire format. */
export function analyzeWithProvider(request: RoutedVisionProviderRequest): Promise<VisionAnalysis> {
  const format = resolveVisionApiFormat(request.apiFormat, request.baseURL)
  switch (format) {
    case 'gemini-native': return analyzeWithGemini(request)
    case 'openai-compatible': return analyzeWithOpenAI(request)
    case 'anthropic-compatible': return analyzeWithAnthropic(request)
  }
}
