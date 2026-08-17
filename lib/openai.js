/** Bounded OpenAI-compatible vision client used by the Vision Bridge tool. */
import { VisionBridgeError } from "./errors.js";
import { canonicalResult, fetchProviderRecord, integer, requestPrompt, } from "./provider-common.js";
function openAIEndpoint(baseURL) {
    const trimmed = baseURL.replace(/\/+$/u, '');
    const path = new URL(trimmed).pathname.toLowerCase();
    if (path.endsWith('/responses'))
        return { endpoint: trimmed, responses: true };
    if (path.endsWith('/chat/completions'))
        return { endpoint: trimmed, responses: false };
    if (path.endsWith('/v1'))
        return { endpoint: `${trimmed}/chat/completions`, responses: false };
    if (path === '' || path === '/') {
        return { endpoint: `${trimmed}/v1/chat/completions`, responses: false };
    }
    return { endpoint: `${trimmed}/chat/completions`, responses: false };
}
function dataURL(image) {
    return `data:${image.mediaType};base64,${image.dataBase64}`;
}
function chatAnswer(body) {
    const choices = body.choices;
    if (!Array.isArray(choices))
        return '';
    const first = choices[0];
    if (first === null || typeof first !== 'object' || Array.isArray(first))
        return '';
    const message = first.message;
    if (message === null || typeof message !== 'object' || Array.isArray(message))
        return '';
    const content = message.content;
    if (typeof content === 'string')
        return content.trim();
    if (!Array.isArray(content))
        return '';
    return content.flatMap((part) => {
        if (part === null || typeof part !== 'object' || Array.isArray(part))
            return [];
        const text = part.text;
        return typeof text === 'string' ? [text] : [];
    }).join('\n').trim();
}
function responsesAnswer(body) {
    if (typeof body.output_text === 'string')
        return body.output_text.trim();
    if (!Array.isArray(body.output))
        return '';
    return body.output.flatMap((item) => {
        if (item === null || typeof item !== 'object' || Array.isArray(item))
            return [];
        const content = item.content;
        if (!Array.isArray(content))
            return [];
        return content.flatMap((part) => {
            if (part === null || typeof part !== 'object' || Array.isArray(part))
                return [];
            const text = part.text;
            return typeof text === 'string' ? [text] : [];
        });
    }).join('\n').trim();
}
function usageFrom(body, responses) {
    const raw = body.usage;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return undefined;
    const record = raw;
    const promptTokens = integer(record, responses ? 'input_tokens' : 'prompt_tokens');
    const completionTokens = integer(record, responses ? 'output_tokens' : 'completion_tokens');
    const totalTokens = integer(record, 'total_tokens');
    const usage = {
        ...promptTokens === undefined ? {} : { promptTokens },
        ...completionTokens === undefined ? {} : { completionTokens },
        ...totalTokens === undefined ? {} : { totalTokens },
    };
    return Object.keys(usage).length === 0 ? undefined : usage;
}
/** Send one bounded visual-analysis request using an OpenAI-compatible protocol. */
export async function analyzeWithOpenAI(request) {
    const route = openAIEndpoint(request.baseURL);
    const prompt = requestPrompt(request.question);
    const body = await fetchProviderRecord({
        providerName: 'OpenAI-compatible provider',
        endpoint: route.endpoint,
        headers: { authorization: `Bearer ${request.apiKey}` },
        body: route.responses
            ? {
                model: request.model,
                max_output_tokens: request.maxOutputTokens,
                input: [{
                        role: 'user',
                        content: [
                            { type: 'input_text', text: prompt },
                            ...request.images.map(image => ({ type: 'input_image', image_url: dataURL(image) })),
                        ],
                    }],
            }
            : {
                model: request.model,
                max_tokens: request.maxOutputTokens,
                messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            ...request.images.map(image => ({
                                type: 'image_url',
                                image_url: { url: dataURL(image) },
                            })),
                        ],
                    }],
            },
        maxResponseBytes: request.maxResponseBytes,
        timeoutMs: request.timeoutMs,
        signal: request.signal,
        ...request.fetchImpl === undefined ? {} : { fetchImpl: request.fetchImpl },
    });
    const answer = route.responses ? responsesAnswer(body) : chatAnswer(body);
    if (answer.length === 0) {
        throw new VisionBridgeError('VISION_PROVIDER_RESPONSE', 'OpenAI-compatible provider returned no analysis text');
    }
    return canonicalResult(request, 'openai-compatible', answer, usageFrom(body, route.responses));
}
