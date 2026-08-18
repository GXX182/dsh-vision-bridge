/** Safe Host/browser contract for multi-provider vision settings. */
import { resolveVisionApiFormat } from "./api-format.js";
export const CONFIGURATION_CHANNEL = '/vision-bridge-configuration';
export const CONFIGURATION_GET_ENDPOINT = 'get';
export const CONFIGURATION_ADD_ENDPOINT = 'add';
export const CONFIGURATION_SELECT_ENDPOINT = 'select';
export const CONFIGURATION_DELETE_ENDPOINT = 'delete';
export const CONFIGURATION_SET_MODEL_ENDPOINT = 'set-model';
export const CONFIGURATION_MODELS_ENDPOINT = 'models';
export const CONFIGURATION_ROUTING_ENDPOINT = 'routing';
export const CONFIGURATION_SET_BRIDGE_ENDPOINT = 'set-bridge';
const API_FORMATS = new Set([
    'auto',
    'gemini-native',
    'openai-compatible',
    'anthropic-compatible',
]);
function exactRecord(payload, keys) {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
        return undefined;
    const record = payload;
    return Object.keys(record).some(key => !keys.includes(key)) ? undefined : record;
}
function normalizeBaseURL(raw) {
    if (typeof raw !== 'string')
        return undefined;
    const baseURL = raw.trim().replace(/\/+$/u, '');
    if (baseURL.length === 0)
        return undefined;
    let url;
    try {
        url = new URL(baseURL);
    }
    catch {
        return undefined;
    }
    if (url.protocol !== 'https:' || url.username.length > 0 || url.password.length > 0
        || url.search.length > 0 || url.hash.length > 0)
        return undefined;
    return baseURL;
}
function apiFormatValue(raw) {
    return typeof raw === 'string' && API_FORMATS.has(raw)
        ? raw
        : undefined;
}
function safeId(raw) {
    return typeof raw === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/u.test(raw) ? raw : undefined;
}
export function isEmptyPayload(payload) {
    const record = exactRecord(payload, []);
    return record !== undefined && Object.keys(record).length === 0;
}
export function parseAddProviderValue(payload) {
    const record = exactRecord(payload, ['name', 'apiFormat', 'baseURL', 'apiKey']);
    if (record === undefined)
        return undefined;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const apiFormat = apiFormatValue(record.apiFormat);
    const baseURL = normalizeBaseURL(record.baseURL);
    const apiKey = typeof record.apiKey === 'string' ? record.apiKey.trim() : '';
    if (name.length === 0 || name.length > 80 || apiFormat === undefined || baseURL === undefined
        || apiKey.length === 0 || apiKey.length > 8_192 || !/^[\x21-\x7E]+$/u.test(apiKey))
        return undefined;
    return { name, apiFormat, baseURL, apiKey };
}
export function parseProviderId(payload) {
    const record = exactRecord(payload, ['providerId']);
    return record === undefined ? undefined : safeId(record.providerId);
}
export function parseSetModelValue(payload) {
    const record = exactRecord(payload, ['providerId', 'model']);
    if (record === undefined)
        return undefined;
    const providerId = safeId(record.providerId);
    const model = typeof record.model === 'string' ? record.model.trim() : '';
    return providerId === undefined || model.length === 0 || model.length > 300
        ? undefined
        : { providerId, model };
}
export function parseSetBridgeValue(payload) {
    const record = exactRecord(payload, ['model', 'enabled']);
    if (record === undefined)
        return undefined;
    const model = typeof record.model === 'string' ? record.model.trim() : '';
    return model.length === 0 || model.length > 300 || typeof record.enabled !== 'boolean'
        ? undefined
        : { model, enabled: record.enabled };
}
export function profileView(profile, credential) {
    return {
        id: profile.id,
        name: profile.name,
        apiFormat: profile.apiFormat,
        resolvedApiFormat: resolveVisionApiFormat(profile.apiFormat, profile.baseURL),
        baseURL: profile.baseURL,
        model: profile.model,
        configured: credential.configured,
        writable: credential.writable,
        ...credential.maskedApiKey === undefined ? {} : { maskedApiKey: credential.maskedApiKey },
    };
}
/** Strictly validate the redacted provider directory crossing into the browser. */
export function parseConfigurationView(payload) {
    const record = exactRecord(payload, ['activeProviderId', 'providers']);
    if (record === undefined || typeof record.activeProviderId !== 'string'
        || !Array.isArray(record.providers) || record.providers.length > 100)
        return undefined;
    const providers = [];
    for (const item of record.providers) {
        const provider = exactRecord(item, [
            'id', 'name', 'apiFormat', 'resolvedApiFormat', 'baseURL', 'model',
            'configured', 'writable', 'maskedApiKey',
        ]);
        if (provider === undefined)
            return undefined;
        const id = safeId(provider.id);
        const apiFormat = apiFormatValue(provider.apiFormat);
        const baseURL = normalizeBaseURL(provider.baseURL);
        if (id === undefined || typeof provider.name !== 'string' || provider.name.length === 0
            || apiFormat === undefined || baseURL === undefined || typeof provider.model !== 'string'
            || typeof provider.configured !== 'boolean' || typeof provider.writable !== 'boolean'
            || (provider.maskedApiKey !== undefined && typeof provider.maskedApiKey !== 'string'))
            return undefined;
        const resolvedApiFormat = provider.resolvedApiFormat;
        if (resolvedApiFormat !== 'gemini-native' && resolvedApiFormat !== 'openai-compatible'
            && resolvedApiFormat !== 'anthropic-compatible')
            return undefined;
        providers.push({
            id,
            name: provider.name,
            apiFormat,
            resolvedApiFormat,
            baseURL,
            model: provider.model,
            configured: provider.configured,
            writable: provider.writable,
            ...provider.maskedApiKey === undefined ? {} : { maskedApiKey: provider.maskedApiKey },
        });
    }
    return { activeProviderId: record.activeProviderId, providers };
}
export function parseModelsView(payload) {
    const record = exactRecord(payload, ['models', 'resolvedApiFormat']);
    if (record === undefined || !Array.isArray(record.models) || record.models.length > 1_000)
        return undefined;
    const models = [];
    for (const item of record.models) {
        const model = exactRecord(item, ['id', 'name']);
        if (model === undefined || typeof model.id !== 'string' || model.id.length === 0
            || typeof model.name !== 'string' || model.name.length === 0)
            return undefined;
        models.push({ id: model.id, name: model.name });
    }
    const resolvedApiFormat = record.resolvedApiFormat;
    if (resolvedApiFormat !== 'gemini-native' && resolvedApiFormat !== 'openai-compatible'
        && resolvedApiFormat !== 'anthropic-compatible')
        return undefined;
    return { models, resolvedApiFormat };
}
function parseRoutingModels(payload, legacy = false) {
    if (!Array.isArray(payload) || payload.length > 1_000)
        return undefined;
    const models = [];
    for (const item of payload) {
        const model = exactRecord(item, legacy
            ? ['id', 'nativeVision', 'bridgeEnabled']
            : ['id', 'bridgeModelId', 'nativeVision', 'bridgeEnabled']);
        if (model === undefined || typeof model.id !== 'string' || model.id.length === 0
            || (!legacy && (typeof model.bridgeModelId !== 'string' || model.bridgeModelId.length === 0))
            || typeof model.bridgeEnabled !== 'boolean'
            || (model.nativeVision !== 'native' && model.nativeVision !== 'unsupported'
                && model.nativeVision !== 'unknown'))
            return undefined;
        models.push({
            id: model.id,
            bridgeModelId: legacy ? model.id : model.bridgeModelId,
            nativeVision: model.nativeVision,
            bridgeEnabled: model.bridgeEnabled,
        });
    }
    return models;
}
function parseRoutingVisionProvider(payload) {
    if (payload === undefined)
        return undefined;
    const visionProvider = exactRecord(payload, ['name', 'model']);
    if (visionProvider === undefined || typeof visionProvider.name !== 'string'
        || visionProvider.name.length === 0 || visionProvider.name.length > 80
        || typeof visionProvider.model !== 'string' || visionProvider.model.length === 0
        || visionProvider.model.length > 300)
        return false;
    return { name: visionProvider.name, model: visionProvider.model };
}
/** Strictly validate bridge routing metadata crossing into the browser. */
export function parseBridgeRoutingView(payload) {
    const modern = exactRecord(payload, ['bridgeProvider', 'visionProvider', 'routes']);
    if (modern !== undefined) {
        if (typeof modern.bridgeProvider !== 'string' || modern.bridgeProvider.length === 0
            || !Array.isArray(modern.routes) || modern.routes.length > 100)
            return undefined;
        const routes = [];
        const upstreams = new Set();
        for (const item of modern.routes) {
            const route = exactRecord(item, ['upstreamProvider', 'models']);
            if (route === undefined || typeof route.upstreamProvider !== 'string'
                || route.upstreamProvider.length === 0 || upstreams.has(route.upstreamProvider))
                return undefined;
            const models = parseRoutingModels(route.models);
            if (models === undefined)
                return undefined;
            upstreams.add(route.upstreamProvider);
            routes.push({ upstreamProvider: route.upstreamProvider, models });
        }
        const visionProvider = parseRoutingVisionProvider(modern.visionProvider);
        if (visionProvider === false)
            return undefined;
        return {
            bridgeProvider: modern.bridgeProvider,
            ...visionProvider === undefined ? {} : { visionProvider },
            routes,
        };
    }
    // Accept the v1 single-upstream response so mixed-version Host/client bundles fail gracefully.
    const legacy = exactRecord(payload, ['bridgeProvider', 'upstreamProvider', 'visionProvider', 'models']);
    if (legacy === undefined || typeof legacy.bridgeProvider !== 'string'
        || typeof legacy.upstreamProvider !== 'string' || legacy.bridgeProvider.length === 0
        || legacy.upstreamProvider.length === 0)
        return undefined;
    const models = parseRoutingModels(legacy.models, true);
    if (models === undefined)
        return undefined;
    const visionProvider = parseRoutingVisionProvider(legacy.visionProvider);
    if (visionProvider === false)
        return undefined;
    return {
        bridgeProvider: legacy.bridgeProvider,
        ...visionProvider === undefined ? {} : { visionProvider },
        routes: [{ upstreamProvider: legacy.upstreamProvider, models }],
    };
}
