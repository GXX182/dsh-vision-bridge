/** Provider model-directory discovery for the Settings UI. */
import { resolveVisionApiFormat } from "./api-format.js";
import { fetchProviderRecord } from "./provider-common.js";
function endpointFor(baseURL, format) {
    const url = new URL(baseURL);
    const path = url.pathname.replace(/\/+$/u, '');
    if (format === 'gemini-native') {
        url.pathname = /\/models\/[^/]+:generateContent$/iu.test(path)
            ? path.replace(/\/models\/[^/]+:generateContent$/iu, '/models')
            : /\/(?:v1|v1beta)$/iu.test(path)
                ? `${path}/models`
                : path.length === 0 || path === '/'
                    ? '/v1beta/models'
                    : `${path}/models`;
    }
    else if (format === 'anthropic-compatible') {
        url.pathname = /\/(?:v1\/)?messages$/iu.test(path)
            ? path.replace(/\/(?:v1\/)?messages$/iu, '/v1/models')
            : /\/v1$/iu.test(path)
                ? `${path}/models`
                : path.length === 0 || path === '/'
                    ? '/v1/models'
                    : `${path}/models`;
    }
    else {
        url.pathname = /\/(?:chat\/completions|responses)$/iu.test(path)
            ? path.replace(/\/(?:chat\/completions|responses)$/iu, '/models')
            : /\/v1$/iu.test(path)
                ? `${path}/models`
                : path.length === 0 || path === '/'
                    ? '/v1/models'
                    : `${path}/models`;
    }
    return url.toString();
}
function stringField(record, key) {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
function records(value) {
    return Array.isArray(value)
        ? value.filter(item => item !== null && typeof item === 'object' && !Array.isArray(item))
        : [];
}
function normalizeModels(items) {
    const unique = new Map();
    for (const item of items) {
        if (item.id.length === 0 || unique.has(item.id))
            continue;
        unique.set(item.id, item);
        if (unique.size >= 1_000)
            break;
    }
    return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: 'base',
    }));
}
function openAIModels(body) {
    return normalizeModels(records(body.data).flatMap((item) => {
        const id = stringField(item, 'id');
        return id === undefined ? [] : [{ id, name: id }];
    }));
}
function geminiModels(body) {
    return normalizeModels(records(body.models).flatMap((item) => {
        const methods = item.supportedGenerationMethods;
        if (Array.isArray(methods) && !methods.includes('generateContent'))
            return [];
        const rawName = stringField(item, 'baseModelId') ?? stringField(item, 'name');
        if (rawName === undefined)
            return [];
        const id = rawName.replace(/^models\//u, '');
        return [{ id, name: stringField(item, 'displayName') ?? id }];
    }));
}
function anthropicModels(body) {
    return normalizeModels(records(body.data).flatMap((item) => {
        const capabilities = item.capabilities;
        if (capabilities !== null && typeof capabilities === 'object' && !Array.isArray(capabilities)) {
            const imageInput = capabilities.image_input;
            if (imageInput !== null && typeof imageInput === 'object' && !Array.isArray(imageInput)
                && imageInput.supported === false)
                return [];
        }
        const id = stringField(item, 'id');
        return id === undefined ? [] : [{ id, name: stringField(item, 'display_name') ?? id }];
    }));
}
/** List models from the provider endpoint selected by URL/protocol. */
export async function listVisionModels(request) {
    const resolvedApiFormat = resolveVisionApiFormat(request.apiFormat, request.baseURL);
    const headers = resolvedApiFormat === 'gemini-native'
        ? { 'x-goog-api-key': request.apiKey }
        : resolvedApiFormat === 'anthropic-compatible'
            ? { 'x-api-key': request.apiKey, 'anthropic-version': '2023-06-01' }
            : { authorization: `Bearer ${request.apiKey}` };
    const body = await fetchProviderRecord({
        providerName: 'Vision model directory',
        endpoint: endpointFor(request.baseURL, resolvedApiFormat),
        method: 'GET',
        headers,
        maxResponseBytes: request.maxResponseBytes,
        timeoutMs: request.timeoutMs,
        signal: request.signal,
        ...request.fetchImpl === undefined ? {} : { fetchImpl: request.fetchImpl },
    });
    return {
        resolvedApiFormat,
        models: resolvedApiFormat === 'gemini-native'
            ? geminiModels(body)
            : resolvedApiFormat === 'anthropic-compatible'
                ? anthropicModels(body)
                : openAIModels(body),
    };
}
