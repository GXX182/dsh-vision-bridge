/** Bounded Gemini-native REST client used by the Vision Bridge tool. */
import { VisionBridgeError } from "./errors.js";
import { canonicalResult, fetchProviderRecord, integer, requestPrompt, } from "./provider-common.js";
function geminiEndpoint(baseURL, model) {
    const trimmed = baseURL.replace(/\/+$/u, '');
    const path = new URL(trimmed).pathname.toLowerCase();
    if (path.endsWith(':generatecontent'))
        return trimmed;
    if (/(?:^|\/)v1(?:beta)?$/u.test(path)) {
        return `${trimmed}/models/${encodeURIComponent(model)}:generateContent`;
    }
    return `${trimmed}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}
function textParts(body) {
    const candidates = body.candidates;
    if (!Array.isArray(candidates))
        return [];
    const first = candidates[0];
    if (first === null || typeof first !== 'object' || Array.isArray(first))
        return [];
    const content = first.content;
    if (content === null || typeof content !== 'object' || Array.isArray(content))
        return [];
    const parts = content.parts;
    if (!Array.isArray(parts))
        return [];
    const texts = [];
    for (const part of parts) {
        if (part === null || typeof part !== 'object' || Array.isArray(part))
            continue;
        const text = part.text;
        if (typeof text === 'string' && text.length > 0)
            texts.push(text);
    }
    return texts;
}
function usageFrom(body) {
    const raw = body.usageMetadata;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return undefined;
    const record = raw;
    const promptTokens = integer(record, 'promptTokenCount');
    const completionTokens = integer(record, 'candidatesTokenCount');
    const totalTokens = integer(record, 'totalTokenCount');
    const usage = {
        ...promptTokens === undefined ? {} : { promptTokens },
        ...completionTokens === undefined ? {} : { completionTokens },
        ...totalTokens === undefined ? {} : { totalTokens },
    };
    return Object.keys(usage).length === 0 ? undefined : usage;
}
/** Send one bounded visual-analysis request using the Gemini native protocol. */
export async function analyzeWithGemini(request) {
    const body = await fetchProviderRecord({
        providerName: 'Gemini-compatible provider',
        endpoint: geminiEndpoint(request.baseURL, request.model),
        headers: { 'x-goog-api-key': request.apiKey },
        body: {
            contents: [{
                    role: 'user',
                    parts: [
                        { text: requestPrompt(request.question) },
                        ...request.images.map(image => ({
                            inline_data: {
                                mime_type: image.mediaType,
                                data: image.dataBase64,
                            },
                        })),
                    ],
                }],
            generationConfig: { maxOutputTokens: request.maxOutputTokens },
        },
        maxResponseBytes: request.maxResponseBytes,
        timeoutMs: request.timeoutMs,
        signal: request.signal,
        ...request.fetchImpl === undefined ? {} : { fetchImpl: request.fetchImpl },
    });
    const answer = textParts(body).join('\n').trim();
    if (answer.length === 0) {
        throw new VisionBridgeError('VISION_PROVIDER_RESPONSE', 'Gemini-compatible provider returned no analysis text');
    }
    return canonicalResult(request, 'google', answer, usageFrom(body));
}
