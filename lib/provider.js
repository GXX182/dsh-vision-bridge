/** Vision API format detection and provider dispatch. */
import { analyzeWithAnthropic } from "./anthropic.js";
import { resolveVisionApiFormat } from "./api-format.js";
import { analyzeWithGemini } from "./gemini.js";
import { analyzeWithOpenAI } from "./openai.js";
export { detectVisionApiFormat, resolveVisionApiFormat } from "./api-format.js";
/** Send a request using the explicitly configured or URL-inferred wire format. */
export function analyzeWithProvider(request) {
    const format = resolveVisionApiFormat(request.apiFormat, request.baseURL);
    switch (format) {
        case 'gemini-native': return analyzeWithGemini(request);
        case 'openai-compatible': return analyzeWithOpenAI(request);
        case 'anthropic-compatible': return analyzeWithAnthropic(request);
    }
}
