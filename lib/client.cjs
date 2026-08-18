window.__ModuleLoader__.load({ id: "dsh-vision-bridge", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.tsx
var client_exports = {};
__export(client_exports, {
  DEFAULT_BRIDGE_PROVIDER: () => DEFAULT_BRIDGE_PROVIDER,
  DEFAULT_GOOGLE_CREDENTIAL_REF: () => DEFAULT_GOOGLE_CREDENTIAL_REF,
  VisionBridgeCredentialCard: () => VisionBridgeCredentialCard,
  VisionBridgeModelSelect: () => VisionBridgeModelSelect,
  VisionBridgeRouteCredentialDialog: () => VisionBridgeRouteCredentialDialog,
  apply: () => apply,
  foldBridgeModelGroups: () => foldBridgeModelGroups,
  inject: () => inject,
  isVisionBridgeModelChange: () => isVisionBridgeModelChange,
  logicalModelSelection: () => logicalModelSelection,
  normalizeGoogleApiKey: () => normalizeGoogleApiKey,
  providerForModelPreference: () => providerForModelPreference,
  withBridgePreferences: () => withBridgePreferences
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_react_dom = require("react-dom");

// src/configuration.ts
var CONFIGURATION_CHANNEL = "/vision-bridge-configuration";
var CONFIGURATION_GET_ENDPOINT = "get";
var CONFIGURATION_ADD_ENDPOINT = "add";
var CONFIGURATION_SELECT_ENDPOINT = "select";
var CONFIGURATION_DELETE_ENDPOINT = "delete";
var CONFIGURATION_SET_MODEL_ENDPOINT = "set-model";
var CONFIGURATION_MODELS_ENDPOINT = "models";
var CONFIGURATION_ROUTING_ENDPOINT = "routing";
var API_FORMATS = /* @__PURE__ */ new Set([
  "auto",
  "gemini-native",
  "openai-compatible",
  "anthropic-compatible"
]);
function exactRecord(payload, keys) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return void 0;
  const record = payload;
  return Object.keys(record).some((key) => !keys.includes(key)) ? void 0 : record;
}
function normalizeBaseURL(raw) {
  if (typeof raw !== "string") return void 0;
  const baseURL = raw.trim().replace(/\/+$/u, "");
  if (baseURL.length === 0) return void 0;
  let url;
  try {
    url = new URL(baseURL);
  } catch {
    return void 0;
  }
  if (url.protocol !== "https:" || url.username.length > 0 || url.password.length > 0 || url.search.length > 0 || url.hash.length > 0) return void 0;
  return baseURL;
}
function apiFormatValue(raw) {
  return typeof raw === "string" && API_FORMATS.has(raw) ? raw : void 0;
}
function safeId(raw) {
  return typeof raw === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/u.test(raw) ? raw : void 0;
}
function parseConfigurationView(payload) {
  const record = exactRecord(payload, ["activeProviderId", "providers"]);
  if (record === void 0 || typeof record.activeProviderId !== "string" || !Array.isArray(record.providers) || record.providers.length > 100) return void 0;
  const providers = [];
  for (const item of record.providers) {
    const provider = exactRecord(item, [
      "id",
      "name",
      "apiFormat",
      "resolvedApiFormat",
      "baseURL",
      "model",
      "configured",
      "writable",
      "maskedApiKey"
    ]);
    if (provider === void 0) return void 0;
    const id = safeId(provider.id);
    const apiFormat = apiFormatValue(provider.apiFormat);
    const baseURL = normalizeBaseURL(provider.baseURL);
    if (id === void 0 || typeof provider.name !== "string" || provider.name.length === 0 || apiFormat === void 0 || baseURL === void 0 || typeof provider.model !== "string" || typeof provider.configured !== "boolean" || typeof provider.writable !== "boolean" || provider.maskedApiKey !== void 0 && typeof provider.maskedApiKey !== "string") return void 0;
    const resolvedApiFormat = provider.resolvedApiFormat;
    if (resolvedApiFormat !== "gemini-native" && resolvedApiFormat !== "openai-compatible" && resolvedApiFormat !== "anthropic-compatible") return void 0;
    providers.push({
      id,
      name: provider.name,
      apiFormat,
      resolvedApiFormat,
      baseURL,
      model: provider.model,
      configured: provider.configured,
      writable: provider.writable,
      ...provider.maskedApiKey === void 0 ? {} : { maskedApiKey: provider.maskedApiKey }
    });
  }
  return { activeProviderId: record.activeProviderId, providers };
}
function parseModelsView(payload) {
  const record = exactRecord(payload, ["models", "resolvedApiFormat"]);
  if (record === void 0 || !Array.isArray(record.models) || record.models.length > 1e3) return void 0;
  const models = [];
  for (const item of record.models) {
    const model = exactRecord(item, ["id", "name"]);
    if (model === void 0 || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0) return void 0;
    models.push({ id: model.id, name: model.name });
  }
  const resolvedApiFormat = record.resolvedApiFormat;
  if (resolvedApiFormat !== "gemini-native" && resolvedApiFormat !== "openai-compatible" && resolvedApiFormat !== "anthropic-compatible") return void 0;
  return { models, resolvedApiFormat };
}
function parseRoutingModels(payload, legacy = false) {
  if (!Array.isArray(payload) || payload.length > 1e3) return void 0;
  const models = [];
  for (const item of payload) {
    const model = exactRecord(item, legacy ? ["id", "nativeVision", "bridgeEnabled"] : ["id", "bridgeModelId", "nativeVision", "bridgeEnabled"]);
    if (model === void 0 || typeof model.id !== "string" || model.id.length === 0 || !legacy && (typeof model.bridgeModelId !== "string" || model.bridgeModelId.length === 0) || typeof model.bridgeEnabled !== "boolean" || model.nativeVision !== "native" && model.nativeVision !== "unsupported" && model.nativeVision !== "unknown") return void 0;
    models.push({
      id: model.id,
      bridgeModelId: legacy ? model.id : model.bridgeModelId,
      nativeVision: model.nativeVision,
      bridgeEnabled: model.bridgeEnabled
    });
  }
  return models;
}
function parseRoutingVisionProvider(payload) {
  if (payload === void 0) return void 0;
  const visionProvider = exactRecord(payload, ["name", "model"]);
  if (visionProvider === void 0 || typeof visionProvider.name !== "string" || visionProvider.name.length === 0 || visionProvider.name.length > 80 || typeof visionProvider.model !== "string" || visionProvider.model.length === 0 || visionProvider.model.length > 300) return false;
  return { name: visionProvider.name, model: visionProvider.model };
}
function parseBridgeRoutingView(payload) {
  const modern = exactRecord(payload, ["bridgeProvider", "visionProvider", "routes"]);
  if (modern !== void 0) {
    if (typeof modern.bridgeProvider !== "string" || modern.bridgeProvider.length === 0 || !Array.isArray(modern.routes) || modern.routes.length > 100) return void 0;
    const routes = [];
    const upstreams = /* @__PURE__ */ new Set();
    for (const item of modern.routes) {
      const route = exactRecord(item, ["upstreamProvider", "models"]);
      if (route === void 0 || typeof route.upstreamProvider !== "string" || route.upstreamProvider.length === 0 || upstreams.has(route.upstreamProvider)) return void 0;
      const models2 = parseRoutingModels(route.models);
      if (models2 === void 0) return void 0;
      upstreams.add(route.upstreamProvider);
      routes.push({ upstreamProvider: route.upstreamProvider, models: models2 });
    }
    const visionProvider2 = parseRoutingVisionProvider(modern.visionProvider);
    if (visionProvider2 === false) return void 0;
    return {
      bridgeProvider: modern.bridgeProvider,
      ...visionProvider2 === void 0 ? {} : { visionProvider: visionProvider2 },
      routes
    };
  }
  const legacy = exactRecord(payload, ["bridgeProvider", "upstreamProvider", "visionProvider", "models"]);
  if (legacy === void 0 || typeof legacy.bridgeProvider !== "string" || typeof legacy.upstreamProvider !== "string" || legacy.bridgeProvider.length === 0 || legacy.upstreamProvider.length === 0) return void 0;
  const models = parseRoutingModels(legacy.models, true);
  if (models === void 0) return void 0;
  const visionProvider = parseRoutingVisionProvider(legacy.visionProvider);
  if (visionProvider === false) return void 0;
  return {
    bridgeProvider: legacy.bridgeProvider,
    ...visionProvider === void 0 ? {} : { visionProvider },
    routes: [{ upstreamProvider: legacy.upstreamProvider, models }]
  };
}

// src/client.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var DEFAULT_GOOGLE_CREDENTIAL_REF = "GOOGLE_API_KEY";
var DEFAULT_BRIDGE_PROVIDER = "deepseek-vision-bridge";
var VISION_PROVIDER_CHANGED_EVENT = "dsh-vision-bridge:provider-changed";
var COPY = {
  zh: {
    title: "\u9700\u8981\u914D\u7F6E\u89C6\u89C9 Provider",
    description: "\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u7684\u89C6\u89C9\u670D\u52A1\u3002\u6DFB\u52A0\u4E00\u4E2A Provider \u540E\uFF0CVision Bridge \u624D\u80FD\u8BFB\u53D6\u548C\u5206\u6790\u4F1A\u8BDD\u4E2D\u7684\u56FE\u7247\u3002",
    keyLabel: "\u89C6\u89C9 API Key",
    keyPlaceholder: "\u89C6\u89C9 API Key",
    save: "\u9A8C\u8BC1\u5E76\u6DFB\u52A0",
    saving: "\u6B63\u5728\u9A8C\u8BC1\u2026",
    later: "\u7A0D\u540E\u914D\u7F6E",
    retry: "\u91CD\u8BD5",
    keyRequired: "\u8BF7\u8F93\u5165 API Key\u3002",
    keyInvalid: "API Key \u53EA\u80FD\u5305\u542B\u4E0D\u5E26\u7A7A\u683C\u7684\u53EF\u6253\u5370 ASCII \u5B57\u7B26\u3002",
    readOnly: "\u5F53\u524D\u51ED\u8BC1\u6765\u6E90\u4E0D\u53EF\u7531\u7F51\u9875\u4FEE\u6539\uFF0C\u8BF7\u5728\u542F\u52A8\u73AF\u5883\u4E2D\u914D\u7F6E GOOGLE_API_KEY\u3002",
    loadFailed: "\u65E0\u6CD5\u8BFB\u53D6\u51ED\u8BC1\u72B6\u6001\u3002",
    cardTitle: "\u56FE\u7247\u7406\u89E3",
    cardDescription: "\u7BA1\u7406\u591A\u4E2A\u89C6\u89C9 Provider\uFF0C\u5E76\u81EA\u52A8\u52A0\u8F7D\u5404\u81EA\u7684\u6A21\u578B\u3002",
    configured: "\u5DF2\u914D\u7F6E",
    unconfigured: "\u672A\u914D\u7F6E",
    loading: "\u8BFB\u53D6\u4E2D\u2026",
    secureStorage: "Key \u4FDD\u5B58\u5728 Harness \u51ED\u8BC1\u5E93\u4E2D\uFF0C\u5DF2\u4FDD\u5B58\u7684\u503C\u4E0D\u4F1A\u5728\u7F51\u9875\u4E0A\u56DE\u663E\u3002",
    configuredHint: "\u8F93\u5165\u65B0 Key \u5E76\u4FDD\u5B58\uFF0C\u5373\u53EF\u66FF\u6362\u5F53\u524D Key\u3002",
    unconfiguredHint: "\u8F93\u5165 Key \u540E\uFF0C\u4F1A\u8BDD\u4E2D\u7684\u56FE\u7247\u5C06\u53EF\u4EE5\u4EA4\u7ED9\u914D\u7F6E\u7684\u89C6\u89C9\u670D\u52A1\u5206\u6790\u3002",
    replacePlaceholder: "\u89C6\u89C9 API Key",
    replaceKey: "\u66FF\u6362 API Key",
    saveKey: "\u4FDD\u5B58 API Key",
    updated: "API Key \u5DF2\u66F4\u65B0\u3002",
    removeKey: "\u5220\u9664 Key",
    removeConfirm: "\u786E\u5B9A\u5220\u9664\u5417\uFF1F\u5220\u9664\u540E\uFF0C\u4E0B\u6B21\u5207\u6362\u5230 Vision Bridge \u6A21\u578B\u65F6\u4F1A\u518D\u6B21\u63D0\u793A\u914D\u7F6E\u3002",
    cancel: "\u53D6\u6D88",
    confirmRemove: "\u786E\u8BA4\u5220\u9664",
    removing: "\u6B63\u5728\u5220\u9664\u2026",
    removed: "API Key \u5DF2\u5220\u9664\u3002",
    currentKey: "\u5F53\u524D Key",
    maskUnavailable: "\u5DF2\u914D\u7F6E\uFF08\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u8131\u654F\u6807\u8BC6\uFF09",
    baseURLLabel: "Base URL",
    baseURLPlaceholder: "https://api.example.com/v1",
    modelLabel: "\u89C6\u89C9\u6A21\u578B",
    modelPlaceholder: "\u4F8B\u5982 gemini-2.5-flash",
    apiFormatLabel: "\u63A5\u53E3\u534F\u8BAE",
    apiFormatAuto: "\u81EA\u52A8\u8BC6\u522B",
    apiFormatGemini: "Gemini \u539F\u751F",
    apiFormatOpenAI: "OpenAI \u517C\u5BB9",
    apiFormatAnthropic: "Anthropic \u517C\u5BB9",
    detectedFormat: "\u5F53\u524D\u8BC6\u522B\u4E3A",
    baseURLRequired: "\u8BF7\u8F93\u5165 Base URL\u3002",
    baseURLInvalid: "Base URL \u5FC5\u987B\u662F\u6CA1\u6709\u51ED\u8BC1\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5\u7684 HTTPS \u5730\u5740\u3002",
    modelRequired: "\u8BF7\u8F93\u5165\u89C6\u89C9\u6A21\u578B\u540D\u79F0\u3002",
    saveSettings: "\u4FDD\u5B58\u8BBE\u7F6E",
    settingsUpdated: "\u89C6\u89C9\u670D\u52A1\u8BBE\u7F6E\u5DF2\u66F4\u65B0\u3002",
    keepCurrentKey: "\u7559\u7A7A\u5219\u4FDD\u6301\u5F53\u524D Key",
    providerLabel: "\u89C6\u89C9\u670D\u52A1\u5546",
    addProvider: "\u6DFB\u52A0 Provider",
    providerName: "\u4F9B\u5E94\u5546\u540D\u79F0",
    providerNamePlaceholder: "\u4F8B\u5982\uFF1A\u516C\u53F8\u4E2D\u8F6C\u7AD9",
    noProviders: "\u8FD8\u6CA1\u6709 Provider\uFF0C\u8BF7\u5148\u6DFB\u52A0\u3002",
    deleteProvider: "\u5220\u9664 Provider",
    modelsLoading: "\u6B63\u5728\u4ECE\u8BE5 Provider \u83B7\u53D6\u6A21\u578B\u2026",
    modelsFailed: "\u65E0\u6CD5\u83B7\u53D6\u6A21\u578B\u5217\u8868\u3002",
    noModels: "\u8BE5 Provider \u6CA1\u6709\u8FD4\u56DE\u53EF\u7528\u6A21\u578B\u3002",
    addingProvider: "\u9A8C\u8BC1\u5E76\u6DFB\u52A0\u2026",
    providerAdded: "Provider \u5DF2\u6DFB\u52A0\u5E76\u81EA\u52A8\u9009\u4E2D\u3002",
    providerDeleted: "Provider \u5DF2\u5220\u9664\u3002",
    chooseModel: "\u9009\u62E9\u89C6\u89C9\u6A21\u578B"
  },
  en: {
    title: "Set up a vision provider",
    description: "No vision service is available. Add a provider before Vision Bridge can inspect images in this conversation.",
    keyLabel: "Vision API key",
    keyPlaceholder: "Vision API key",
    save: "Verify and add",
    saving: "Verifying\u2026",
    later: "Configure later",
    retry: "Retry",
    keyRequired: "Enter an API key.",
    keyInvalid: "The API key may contain printable ASCII characters without spaces only.",
    readOnly: "This credential source cannot be changed from the web UI. Configure GOOGLE_API_KEY in the launch environment.",
    loadFailed: "Could not read credential status.",
    cardTitle: "Image understanding",
    cardDescription: "Manage multiple vision providers and load each model directory automatically.",
    configured: "Configured",
    unconfigured: "Not configured",
    loading: "Loading\u2026",
    secureStorage: "The key is kept in the Harness credential store. A saved value is never revealed in the web UI.",
    configuredHint: "Enter and save a new key to replace the current one.",
    unconfiguredHint: "Once configured, session images can be delegated to the configured vision service.",
    replacePlaceholder: "Vision API key",
    replaceKey: "Replace API key",
    saveKey: "Save API key",
    updated: "API key updated.",
    removeKey: "Remove key",
    removeConfirm: "Remove this key? The setup prompt will appear again the next time you select a Vision Bridge model.",
    cancel: "Cancel",
    confirmRemove: "Confirm removal",
    removing: "Removing\u2026",
    removed: "API key removed.",
    currentKey: "Current key",
    maskUnavailable: "Configured (masked identifier unavailable)",
    baseURLLabel: "Base URL",
    baseURLPlaceholder: "https://api.example.com/v1",
    modelLabel: "Vision model",
    modelPlaceholder: "For example, gemini-2.5-flash",
    apiFormatLabel: "API format",
    apiFormatAuto: "Auto detect",
    apiFormatGemini: "Gemini native",
    apiFormatOpenAI: "OpenAI compatible",
    apiFormatAnthropic: "Anthropic compatible",
    detectedFormat: "Currently detected as",
    baseURLRequired: "Enter a Base URL.",
    baseURLInvalid: "Base URL must be an HTTPS URL without credentials, a query, or a fragment.",
    modelRequired: "Enter a vision model name.",
    saveSettings: "Save settings",
    settingsUpdated: "Vision service settings updated.",
    keepCurrentKey: "Leave blank to keep the current key",
    providerLabel: "Vision provider",
    addProvider: "Add provider",
    providerName: "Provider name",
    providerNamePlaceholder: "For example, Team relay",
    noProviders: "No providers yet. Add one to continue.",
    deleteProvider: "Delete provider",
    modelsLoading: "Loading models from this provider\u2026",
    modelsFailed: "Could not load the model list.",
    noModels: "This provider returned no usable models.",
    addingProvider: "Verify and add\u2026",
    providerAdded: "Provider added and selected.",
    providerDeleted: "Provider deleted.",
    chooseModel: "Choose a vision model"
  }
};
var STYLES = `
.dsh-vb-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.44);backdrop-filter:blur(2px)}
.dsh-vb-dialog{box-sizing:border-box;width:min(480px,100%);border:1px solid rgba(148,163,184,.34);border-radius:20px;background:#fff;color:#172033;box-shadow:0 24px 80px rgba(15,23,42,.24);padding:28px}
.dsh-vb-title{margin:0;font-size:22px;line-height:1.35;font-weight:650;letter-spacing:-.015em}
.dsh-vb-description{margin:12px 0 22px;color:#5b6475;font-size:14px;line-height:1.65}
.dsh-vb-label{display:block;margin:0 0 8px;font-size:13px;font-weight:600;color:#30394a}
.dsh-vb-input{box-sizing:border-box;width:100%;height:42px;border:1px solid #cfd5df;border-radius:10px;background:#fff;color:#172033;padding:0 12px;font:inherit;outline:none}
.dsh-vb-input:focus{border-color:#316fea;box-shadow:0 0 0 3px rgba(49,111,234,.14)}
.dsh-vb-input[aria-invalid=true]{border-color:#dc3f4b}
.dsh-vb-dialog-field{margin-top:14px}
.dsh-vb-dialog>form>.dsh-vb-dialog-field:first-child{margin-top:0}
.dsh-vb-dialog-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.dsh-vb-status{min-height:20px;margin:8px 0 0;color:#c8323e;font-size:12px;line-height:1.5}
.dsh-vb-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
.dsh-vb-button{height:38px;border:0;border-radius:10px;padding:0 16px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.dsh-vb-button:disabled{cursor:not-allowed;opacity:.55}
.dsh-vb-secondary{background:#f1f3f7;color:#384152}
.dsh-vb-primary{background:#316fea;color:#fff}
.dsh-vb-card{list-style:none;border:1px solid var(--dsw-alias-border-l2,#e3e6eb);border-radius:12px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1f2329);transition:border-color .16s,background .16s}
.dsh-vb-card:hover,.dsh-vb-card[data-open=true]{border-color:var(--dsw-alias-label-dimmed,#a9afb8)}
.dsh-vb-card[data-open=true]{background:var(--dsw-alias-bg-layer-2,#f8f9fb)}
.dsh-vb-card-header{box-sizing:border-box;width:100%;appearance:none;border:0;border-radius:12px;background:none;color:inherit;padding:14px 16px;display:flex;align-items:center;gap:12px;text-align:left;font:inherit;cursor:pointer}
.dsh-vb-card-header:focus-visible,.dsh-vb-card button:focus-visible,.dsh-vb-card input:focus-visible,.dsh-vb-card select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#316fea);outline-offset:1px}
.dsh-vb-card-head-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dsh-vb-card-name{font-size:15px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary,#1f2329)}
.dsh-vb-card-description{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#7a828e)}
.dsh-vb-card-state{flex:none;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 8px;font-size:11px;line-height:17px;font-weight:500;white-space:nowrap;background:var(--dsw-alias-bg-module-platform,#f1f3f6);color:var(--dsw-alias-label-secondary,#515967)}
.dsh-vb-card-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary,#8a919d)}
.dsh-vb-card-state[data-configured=true] .dsh-vb-card-dot{background:#20a464}
.dsh-vb-chevron{flex:none;width:14px;height:14px;color:var(--dsw-alias-label-tertiary,#7a828e);transition:transform .16s}
.dsh-vb-chevron[data-open=true]{transform:rotate(180deg)}
.dsh-vb-card-body{border-top:1px solid var(--dsw-alias-border-l2,#e3e6eb);margin:0 16px;padding:14px 0 12px}
.dsh-vb-card-note,.dsh-vb-card-hint,.dsh-vb-card-message{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-tertiary,#707783)}
.dsh-vb-card-hint{margin-top:5px}
.dsh-vb-card-current{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:13px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l2,#e3e6eb);border-radius:8px;background:var(--dsw-alias-bg-layer-3,#fff)}
.dsh-vb-card-current-label{font-size:12px;color:var(--dsw-alias-label-tertiary,#707783)}
.dsh-vb-card-current-value{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-size:12px;font-weight:600;letter-spacing:.035em;color:var(--dsw-alias-label-primary,#1f2329);overflow-wrap:anywhere}
.dsh-vb-card-field{margin-top:14px}
.dsh-vb-card-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.dsh-vb-card-field-label{display:block;margin:0 0 7px;font-size:13px;font-weight:500;color:var(--dsw-alias-label-secondary,#454c58)}
.dsh-vb-card-input,.dsh-vb-card-select{box-sizing:border-box;width:100%;height:38px;border:1px solid var(--dsw-alias-border-l2,#d9dde4);border-radius:8px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1f2329);padding:0 11px;font:inherit;font-size:13px;outline:none}
.dsh-vb-card-select{appearance:auto}
.dsh-vb-card-input::placeholder{color:var(--dsw-alias-label-tertiary,#9097a2)}
.dsh-vb-card-input[aria-invalid=true]{border-color:var(--dsw-alias-label-error,#d43f4d)}
.dsh-vb-card-detection{display:flex;align-items:center;gap:7px;margin-top:9px;color:var(--dsw-alias-label-tertiary,#707783);font-size:12px;line-height:1.5}
.dsh-vb-card-detection-dot{width:6px;height:6px;border-radius:50%;background:#3d83f6;box-shadow:0 0 0 3px rgba(61,131,246,.12)}
.dsh-vb-card-key-section{margin-top:16px;padding-top:15px;border-top:1px solid var(--dsw-alias-border-l2,#e3e6eb)}
.dsh-vb-card-message{min-height:19px;margin-top:6px}
.dsh-vb-card-message[data-tone=error]{color:var(--dsw-alias-label-error,#c8323e)}
.dsh-vb-card-message[data-tone=success]{color:#168552}
.dsh-vb-card-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2,#e3e6eb)}
.dsh-vb-card-button{appearance:none;border:1px solid transparent;border-radius:8px;padding:5px 14px;background:none;color:var(--dsw-alias-label-secondary,#515967);font:inherit;font-size:13px;line-height:1.5;cursor:pointer}
.dsh-vb-card-button:disabled{opacity:.4;cursor:default}
.dsh-vb-card-button-secondary{border-color:var(--dsw-alias-border-l2,#d9dde4)}
.dsh-vb-card-button-primary{background:var(--dsw-alias-label-primary,#1f2329);color:var(--dsw-alias-bg-layer-3,#fff)}
.dsh-vb-card-button-danger{border-color:rgba(210,54,69,.3);color:var(--dsw-alias-label-error,#c8323e)}
.dsh-vb-card-button-remove{margin-right:auto}
.dsh-vb-card-confirm{margin-top:12px;padding:11px 12px;border:1px solid rgba(210,54,69,.22);border-radius:8px;background:rgba(210,54,69,.055)}
.dsh-vb-card-confirm p{margin:0;color:var(--dsw-alias-label-secondary,#515967);font-size:12px;line-height:1.55}
.dsh-vb-card-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
.dsh-vb-provider-picker{position:relative;margin-top:7px}
.dsh-vb-provider-trigger{box-sizing:border-box;width:100%;min-height:42px;border:1px solid var(--dsw-alias-border-l2,#d9dde4);border-radius:8px;background:var(--dsw-alias-bg-layer-3,#fff);color:inherit;padding:7px 11px;display:flex;align-items:center;gap:10px;text-align:left;font:inherit;cursor:pointer}
.dsh-vb-provider-trigger-text{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}
.dsh-vb-provider-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-vb-provider-key{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary,#707783)}
.dsh-vb-provider-menu{position:absolute;z-index:20;inset:auto 0 0;transform:translateY(calc(100% + 6px));max-height:240px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#d9dde4);border-radius:10px;background:var(--dsw-alias-bg-layer-3,#fff);box-shadow:0 12px 32px rgba(15,23,42,.14);padding:5px}
.dsh-vb-provider-option{display:flex;align-items:center;gap:6px;border-radius:7px}
.dsh-vb-provider-option[data-active=true]{background:var(--dsw-alias-bg-module-platform,#f1f3f6)}
.dsh-vb-provider-option-main{min-width:0;flex:1;border:0;background:none;color:inherit;padding:8px;text-align:left;font:inherit;cursor:pointer}
.dsh-vb-provider-delete{flex:none;width:30px;height:30px;border:0;border-radius:7px;background:none;color:var(--dsw-alias-label-error,#c8323e);display:grid;place-items:center;cursor:pointer;opacity:0;transition:opacity .14s,background .14s}
.dsh-vb-provider-delete svg{width:15px;height:15px}
.dsh-vb-provider-option:hover .dsh-vb-provider-delete,.dsh-vb-provider-delete:focus-visible{opacity:1}
.dsh-vb-provider-delete:hover{background:rgba(210,54,69,.09)}
.dsh-vb-provider-meta{display:flex;gap:8px;margin-top:8px;color:var(--dsw-alias-label-tertiary,#707783);font-size:11px;overflow-wrap:anywhere}
.dsh-vb-add-panel{margin-top:14px;padding:13px;border:1px solid var(--dsw-alias-border-l2,#e3e6eb);border-radius:10px;background:var(--dsw-alias-bg-layer-3,#fff)}
.dsh-vb-inline-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.dsh-vb-model-status{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:24px;margin-top:6px}
@media(max-width:560px){.dsh-vb-card-state{display:none}.dsh-vb-card-grid,.dsh-vb-dialog-grid{grid-template-columns:1fr}.dsh-vb-card-footer{align-items:stretch;flex-direction:column-reverse}.dsh-vb-card-button{width:100%}}
@media(prefers-color-scheme:dark){.dsh-vb-dialog{border-color:#3a4352;background:#20242c;color:#f4f6fa}.dsh-vb-description{color:#aeb6c5}.dsh-vb-label{color:#e2e7ef}.dsh-vb-input{border-color:#4b5565;background:#171a20;color:#f4f6fa}.dsh-vb-secondary{background:#343a45;color:#eef1f6}}
`;
var MODEL_SELECT_STYLES = `
.dsh-vb-model-root{min-width:0;position:relative}
.dsh-vb-model-trigger{min-width:0;max-width:240px;height:28px;color:var(--dsw-alias-label-secondary,#515967);cursor:pointer;background:none;border:0;border-radius:24px;outline:none;display:flex;align-items:center;gap:4px;padding:0 5px 0 8px;font:inherit;font-size:13px;font-weight:500;line-height:20px}
.dsh-vb-model-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#f1f3f6)}
.dsh-vb-model-trigger:focus-visible,.dsh-vb-vision-toggle:focus-visible,.dsh-vb-model-main:focus-visible,.dsh-vb-model-cell:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary,#3370ff);outline:none}
.dsh-vb-model-trigger:disabled{color:var(--dsw-alias-label-dimmed,#a9afb8);cursor:default}
.dsh-vb-model-trigger-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-vb-model-trigger-effort{color:var(--dsw-alias-label-caption,#8f959e);flex:none}
.dsh-vb-model-trigger-glasses{flex:none;color:#3370ff;display:grid;place-items:center}
.dsh-vb-model-chevron{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-caption,#8f959e);transition:transform .14s ease}
.dsh-vb-model-chevron[data-open=true]{transform:rotate(180deg)}
.dsh-vb-model-menu{position:absolute;z-index:40;right:0;bottom:calc(100% + 8px);width:min(268px,calc(100vw - 32px));max-height:min(410px,calc(100vh - 96px));overflow:hidden;display:flex;flex-direction:column;padding:4px;border:1px solid var(--dsw-alias-border-inverted,#d8dce3);border-radius:12px;background:var(--dsw-specific-menu,#fff);box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(15,23,42,.16));color:var(--dsw-alias-label-primary,#1f2329)}
.dsh-vb-model-scroll{min-height:0;overflow-y:auto}
.dsh-vb-model-group+.dsh-vb-model-group{margin-top:4px}
.dsh-vb-model-group-title{position:sticky;z-index:1;top:0;padding:5px 8px 3px;background:var(--dsw-specific-menu,#fff);color:var(--dsw-alias-label-tertiary,#7a828e);font-size:12px;font-weight:500;line-height:18px}
.dsh-vb-model-option{min-height:38px;border-radius:10px;display:flex;align-items:center;gap:2px;color:inherit}
.dsh-vb-model-option:hover,.dsh-vb-model-option:focus-within{background:var(--dsw-alias-interactive-bg-hover,#f1f3f6)}
.dsh-vb-model-main{min-width:0;min-height:38px;flex:1;display:flex;align-items:center;border:0;border-radius:10px;background:none;color:inherit;padding:6px 4px 6px 8px;text-align:left;font:inherit;cursor:pointer}
.dsh-vb-model-main:disabled{color:var(--dsw-alias-label-dimmed,#a9afb8);cursor:default}
.dsh-vb-model-copy{min-width:0;flex:1;display:flex;flex-direction:column}
.dsh-vb-model-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px}
.dsh-vb-model-description{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#7a828e);font-size:12px;line-height:18px}
.dsh-vb-model-check{width:18px;flex:0 0 18px;display:grid;place-items:center;color:var(--dsw-alias-label-primary,#1f2329)}
.dsh-vb-vision-toggle{width:30px;height:30px;flex:0 0 30px;display:grid;place-items:center;border:0;border-radius:8px;background:none;color:var(--dsw-alias-label-tertiary,#8f959e);cursor:pointer;transition:color .14s ease,background .14s ease,transform .14s ease}
.dsh-vb-vision-toggle:hover:not(:disabled){color:#3370ff;background:rgba(51,112,255,.1);transform:translateY(-1px)}
.dsh-vb-vision-toggle[data-active=true]{color:#3370ff}
.dsh-vb-vision-toggle[data-active=true]{background:rgba(51,112,255,.12)}
.dsh-vb-vision-toggle:disabled{cursor:default;opacity:.82}
.dsh-vb-directory-status{padding:10px;color:var(--dsw-alias-label-tertiary,#7a828e);font-size:13px;line-height:20px}
.dsh-vb-model-error{margin-bottom:4px;padding:7px 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger,#fff1f0);color:var(--dsw-alias-state-error-primary,#d54941);font-size:12px;line-height:18px}
.dsh-vb-model-cell{width:100%;height:40px;color:var(--dsw-alias-label-primary,#1f2329);cursor:pointer;text-align:left;background:none;border:0;border-radius:10px;display:flex;align-items:center;gap:8px;padding:0 10px;font:inherit;font-size:14px;line-height:22px}
.dsh-vb-model-cell:hover{background:var(--dsw-alias-interactive-bg-hover,#f1f3f6)}
.dsh-vb-model-cell-label{min-width:0;flex:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-vb-model-cell-value{min-width:0;flex:0 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#7a828e)}
.dsh-vb-model-cell-glasses{width:18px;height:18px;flex:none;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#8f959e)}
.dsh-vb-model-cell-glasses[data-active="true"]{color:#3370ff}
.dsh-vb-model-cell-chevron{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary,#7a828e)}
`;
function foldBridgeModelGroups(groups, routing) {
  if (routing === void 0) return groups.map((group) => ({ ...group, models: [...group.models] }));
  const bridgeModels = new Map(
    groups.find((group) => group.id === routing.bridgeProvider)?.models.map((model) => [model.id, model]) ?? []
  );
  const routes = new Map(routing.routes.map((route) => [route.upstreamProvider, route]));
  return groups.filter((group) => group.id !== routing.bridgeProvider).map((group) => ({
    ...group,
    models: group.models.map((model) => {
      const route = routes.get(group.id);
      if (route === void 0) return { ...model };
      const routingModel = route.models.find((item) => item.id === model.id);
      const bridgeModel = routingModel === void 0 ? void 0 : bridgeModels.get(routingModel.bridgeModelId);
      return {
        ...model,
        ...bridgeModel === void 0 ? {} : { bridgeModel },
        nativeVision: routingModel?.nativeVision ?? "unknown",
        bridgeEnabled: routingModel?.bridgeEnabled ?? false
      };
    })
  }));
}
function providerForModelPreference(groupProvider, model, routing) {
  return routing !== void 0 && routing.routes.some((route) => route.upstreamProvider === groupProvider) && model.bridgeModel !== void 0 && model.nativeVision !== "native" && model.bridgeEnabled === true ? routing.bridgeProvider : groupProvider;
}
function logicalModelSelection(selection, routing) {
  if (selection === null) return { bridge: false };
  if (routing === void 0 || selection.provider !== routing.bridgeProvider) {
    return { provider: selection.provider, model: selection.model, bridge: false };
  }
  for (const route of routing.routes) {
    const model = route.models.find((item) => item.bridgeModelId === selection.model);
    if (model !== void 0) return { provider: route.upstreamProvider, model: model.id, bridge: true };
  }
  return { bridge: true };
}
function GlassesIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2.15 7.45 3.1 4.7M15.85 7.45 14.9 4.7M7.15 8.1c.55-.35 3.15-.35 3.7 0", stroke: "currentColor", strokeWidth: "1.45", strokeLinecap: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "5.05", cy: "9.55", r: "2.65", stroke: "currentColor", strokeWidth: "1.45" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12.95", cy: "9.55", r: "2.65", stroke: "currentColor", strokeWidth: "1.45" })
  ] });
}
function CheckIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m3.25 8.2 3 3 6.5-6.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function modelCopy() {
  const zh = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh");
  return zh ? {
    select: "\u9009\u62E9\u6A21\u578B",
    model: "\u6A21\u578B",
    loading: "\u6B63\u5728\u5237\u65B0\u6A21\u578B\u5217\u8868\u2026",
    empty: "\u6CA1\u6709\u53EF\u7528\u6A21\u578B\u3002",
    effort: "\u63A8\u7406\u5F3A\u5EA6",
    providerDefault: "\u4F9B\u5E94\u5546\u9ED8\u8BA4",
    bridgeOn: "\u5173\u95ED\u89C6\u89C9\u6865\u63A5",
    bridgeOff: "\u5F00\u542F\u89C6\u89C9\u6865\u63A5",
    unknownVision: "\u56FE\u7247\u80FD\u529B\u672A\u77E5\uFF1B\u70B9\u51FB\u540E\u4F7F\u7528\u89C6\u89C9\u6865\u63A5",
    visionService: (provider, model) => `\u89C6\u89C9\u8BC6\u522B\uFF1A${provider} \xB7 ${model}`
  } : {
    select: "Select model",
    model: "Model",
    loading: "Refreshing model list\u2026",
    empty: "No models available.",
    effort: "Reasoning effort",
    providerDefault: "Provider default",
    bridgeOn: "Disable Vision Bridge",
    bridgeOff: "Enable Vision Bridge",
    unknownVision: "Image support unknown; click to use Vision Bridge",
    visionService: (provider, model) => `Vision service: ${provider} \xB7 ${model}`
  };
}
async function readBridgeRouting(rpc) {
  const response = await rpc.call(CONFIGURATION_CHANNEL, CONFIGURATION_ROUTING_ENDPOINT, {});
  if (!response.ok) throw new Error(response.error.message);
  const routing = parseBridgeRoutingView(response.value);
  if (routing === void 0) throw new Error("Vision Bridge returned invalid routing metadata.");
  return routing;
}
var BRIDGE_PREFERENCE_STORAGE_PREFIX = "dsh-vision-bridge.bridge-models.v1:";
function withBridgePreferences(routing, upstreamProvider, enabledModels) {
  const enabled = new Set(enabledModels);
  return {
    ...routing,
    routes: routing.routes.map((route) => route.upstreamProvider === upstreamProvider ? { ...route, models: route.models.map((model) => ({ ...model, bridgeEnabled: enabled.has(model.id) })) } : route)
  };
}
function preferenceStorageKey(upstreamProvider) {
  return `${BRIDGE_PREFERENCE_STORAGE_PREFIX}${upstreamProvider}`;
}
function readBridgePreferences(routing) {
  let next = routing;
  for (const route of routing.routes) {
    try {
      const raw = window.localStorage.getItem(preferenceStorageKey(route.upstreamProvider));
      if (raw === null) continue;
      const value = JSON.parse(raw);
      if (!Array.isArray(value) || value.length > 1e3 || value.some((model) => typeof model !== "string" || model.length === 0 || model.length > 300)) continue;
      next = withBridgePreferences(next, route.upstreamProvider, value);
    } catch {
    }
  }
  return next;
}
function writeBridgePreferences(routing, upstreamProvider) {
  try {
    const route = routing.routes.find((item) => item.upstreamProvider === upstreamProvider);
    if (route === void 0) return;
    const enabledModels = route.models.filter((model) => model.bridgeEnabled).map((model) => model.id);
    window.localStorage.setItem(preferenceStorageKey(upstreamProvider), JSON.stringify(enabledModels));
  } catch {
  }
}
function VisionBridgeModelSelect({
  locked,
  available,
  directory,
  load,
  select,
  rpc
}) {
  const state = (0, import_react.useSyncExternalStore)(
    (listener) => directory.subscribe(listener),
    () => directory.getSnapshot()
  );
  const [routing, setRouting] = (0, import_react.useState)();
  const [routingGeneration, setRoutingGeneration] = (0, import_react.useState)(0);
  const [open, setOpen] = (0, import_react.useState)(false);
  const [pane, setPane] = (0, import_react.useState)("root");
  const [localError, setLocalError] = (0, import_react.useState)();
  const rootRef = (0, import_react.useRef)(null);
  const triggerRef = (0, import_react.useRef)(null);
  const copy = modelCopy();
  const groups = (0, import_react.useMemo)(() => foldBridgeModelGroups(state.groups ?? [], routing), [routing, state.groups]);
  const logicalCurrent = logicalModelSelection(state.current, routing);
  const currentIsBridge = logicalCurrent.bridge;
  const logicalCurrentProvider = logicalCurrent.provider;
  const currentGroup = groups.find((group) => group.id === logicalCurrentProvider);
  const currentModel = currentGroup?.models.find((model) => model.id === logicalCurrent.model);
  const currentReasoning = currentIsBridge ? currentModel?.bridgeModel?.reasoning : currentModel?.reasoning;
  const effectiveEffort = state.current?.reasoningEffort ?? currentReasoning?.defaultEffort;
  const effortLabel = effectiveEffort === void 0 ? void 0 : currentReasoning?.efforts.find((effort) => effort.id === effectiveEffort)?.name ?? effectiveEffort;
  const busy = state.status === "selecting";
  const visionServiceTitle = routing?.visionProvider === void 0 ? void 0 : copy.visionService(routing.visionProvider.name, routing.visionProvider.model);
  const visionActionTitle = (action) => visionServiceTitle === void 0 ? action : `${visionServiceTitle}\uFF1B${action}`;
  (0, import_react.useEffect)(() => {
    if (!available) return;
    load();
  }, [available, load]);
  (0, import_react.useEffect)(() => {
    if (!available) return;
    let active = true;
    void readBridgeRouting(rpc).then(
      (value) => {
        if (active) setRouting(readBridgePreferences(value));
      },
      (error) => {
        if (active) setLocalError(error instanceof Error ? error.message : String(error));
      }
    );
    return () => {
      active = false;
    };
  }, [available, routingGeneration, rpc]);
  (0, import_react.useEffect)(() => {
    const refresh = () => {
      setRoutingGeneration((value) => value + 1);
    };
    window.addEventListener(VISION_PROVIDER_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(VISION_PROVIDER_CHANGED_EVENT, refresh);
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        setPane("root");
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
    };
  }, [open]);
  if (!available) return null;
  const choose = async (selection) => {
    setLocalError(void 0);
    const accepted = await select(selection);
    if (accepted) {
      setOpen(false);
      setPane("root");
      queueMicrotask(() => {
        triggerRef.current?.focus();
      });
      return true;
    }
    setLocalError(directory.getSnapshot().error ?? "Could not select this model.");
    return false;
  };
  const selectionFor = (groupProvider, provider, model, reasoning = model.reasoning) => {
    const sameLogicalModel = logicalCurrentProvider === groupProvider && logicalCurrent.model === model.id;
    const reasoningEffort = sameLogicalModel ? state.current?.reasoningEffort : reasoning?.defaultEffort;
    return {
      provider,
      model: provider === routing?.bridgeProvider ? model.bridgeModel?.id ?? model.id : model.id,
      ...reasoningEffort === void 0 ? {} : { reasoningEffort }
    };
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      if (pane !== "root") setPane("root");
      else {
        setOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }
    if (!open || event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = [...rootRef.current?.querySelectorAll("button:not(:disabled)") ?? []];
    const current = items.indexOf(document.activeElement);
    if (items.length < 2) return;
    event.preventDefault();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    items[(Math.max(current, 0) + offset + items.length) % items.length]?.focus();
  };
  const triggerLabel = currentModel?.name ?? copy.select;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-model-root", ref: rootRef, onKeyDown, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: MODEL_SELECT_STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: "dsh-vb-model-trigger",
        disabled: locked,
        "aria-label": `${copy.select}: ${triggerLabel}`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        title: triggerLabel,
        onClick: () => {
          if (!open) setRoutingGeneration((value) => value + 1);
          setOpen((value) => {
            if (!value) setPane("root");
            return !value;
          });
          load();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-trigger-label", children: triggerLabel }),
          currentIsBridge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-trigger-glasses", title: visionServiceTitle ?? copy.bridgeOn, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassesIcon, {}) }) : null,
          effortLabel !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-trigger-effort", children: effortLabel }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "dsh-vb-model-chevron", "data-open": open, viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m3.25 5.25 3.75 3.5 3.75-3.5", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "dsh-vb-model-menu",
        role: "menu",
        "aria-label": copy.select,
        "aria-busy": state.status === "loading" || busy,
        children: [
          localError !== void 0 || state.error != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-model-error", role: "status", children: localError ?? state.error }) : null,
          pane === "root" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", role: "menuitem", className: "dsh-vb-model-cell", onClick: () => {
              setPane("model");
            }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-cell-label", children: copy.model }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-cell-value", children: triggerLabel }),
              currentModel?.bridgeModel !== void 0 && currentModel.nativeVision !== "native" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "span",
                {
                  className: "dsh-vb-model-cell-glasses",
                  "data-active": currentModel.bridgeEnabled === true,
                  title: visionServiceTitle ?? (currentModel.bridgeEnabled === true ? copy.bridgeOn : copy.bridgeOff),
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassesIcon, {})
                }
              ) : null,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "dsh-vb-model-cell-chevron", viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m5.25 3.25 3.5 3.75-3.5 3.75", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) })
            ] }),
            currentReasoning !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                role: "menuitem",
                className: "dsh-vb-model-cell",
                onClick: () => {
                  setPane("effort");
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-cell-label", children: copy.effort }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-cell-value", children: effortLabel ?? copy.providerDefault }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "dsh-vb-model-cell-chevron", viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m5.25 3.25 3.5 3.75-3.5 3.75", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) })
                ]
              }
            ) : null
          ] }) : null,
          pane === "model" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            state.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-directory-status", children: copy.loading }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-model-scroll", children: [
              groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "section",
                {
                  className: "dsh-vb-model-group",
                  role: "group",
                  "aria-label": group.name,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-model-group-title", children: group.name }),
                    group.models.map((model) => {
                      const selected = logicalCurrentProvider === group.id && logicalCurrent.model === model.id;
                      const bridgeAvailable = model.bridgeModel !== void 0 && model.nativeVision !== "native";
                      const bridgeEnabled = bridgeAvailable && model.bridgeEnabled === true;
                      const glassesAction = bridgeEnabled ? copy.bridgeOn : model.nativeVision === "unknown" ? copy.unknownVision : copy.bridgeOff;
                      const glassesTitle = visionActionTitle(glassesAction);
                      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-model-option", "data-selected": selected, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "button",
                          {
                            type: "button",
                            role: "menuitemradio",
                            "aria-checked": selected,
                            className: "dsh-vb-model-main",
                            disabled: busy,
                            title: model.name,
                            onClick: () => {
                              const provider = providerForModelPreference(group.id, model, routing);
                              const reasoning = bridgeEnabled ? model.bridgeModel?.reasoning : model.reasoning;
                              void choose(selectionFor(group.id, provider, model, reasoning));
                            },
                            children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-model-copy", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-name", children: model.name }),
                              model.description !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-description", children: model.description }) : null
                            ] })
                          }
                        ),
                        bridgeAvailable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "dsh-vb-vision-toggle",
                            "data-active": bridgeEnabled,
                            disabled: busy,
                            "aria-label": `${model.name}: ${glassesTitle}`,
                            "aria-pressed": bridgeEnabled,
                            title: glassesTitle,
                            onClick: (event) => {
                              event.stopPropagation();
                              if (routing === void 0 || model.bridgeModel === void 0) return;
                              const enabled = !bridgeEnabled;
                              setLocalError(void 0);
                              const route = routing.routes.find((item) => item.upstreamProvider === group.id);
                              if (route === void 0) return;
                              const nextRouting = withBridgePreferences(routing, group.id, route.models.filter((item) => item.id === model.id ? enabled : item.bridgeEnabled).map((item) => item.id));
                              setRouting(nextRouting);
                              writeBridgePreferences(nextRouting, group.id);
                            },
                            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassesIcon, {})
                          }
                        ) : null,
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-check", children: selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckIcon, {}) : null })
                      ] }, model.id);
                    })
                  ]
                },
                group.id
              )),
              state.status === "ready" && groups.every((group) => group.models.length === 0) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-directory-status", children: copy.empty }) : null
            ] })
          ] }) : null,
          pane === "effort" && currentReasoning !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-model-scroll", children: [
            currentReasoning.defaultEffort === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-model-option", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                role: "menuitemradio",
                "aria-checked": state.current?.reasoningEffort === void 0,
                className: "dsh-vb-model-main",
                disabled: busy,
                onClick: () => {
                  if (state.current !== null) void choose({ provider: state.current.provider, model: state.current.model });
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-copy", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-name", children: copy.providerDefault }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-check", children: state.current?.reasoningEffort === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckIcon, {}) : null })
                ]
              }
            ) }) : null,
            currentReasoning.efforts.map((effort) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-model-option", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                role: "menuitemradio",
                "aria-checked": effectiveEffort === effort.id,
                className: "dsh-vb-model-main",
                disabled: busy,
                title: effort.description,
                onClick: () => {
                  if (state.current !== null) void choose({
                    provider: state.current.provider,
                    model: state.current.model,
                    reasoningEffort: effort.id
                  });
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-model-copy", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-name", children: effort.name }),
                    effort.description !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-description", children: effort.description }) : null
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-model-check", children: effectiveEffort === effort.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckIcon, {}) : null })
                ]
              }
            ) }, effort.id))
          ] }) : null
        ]
      }
    ) : null
  ] });
}
function copyForBrowser() {
  const language = document.documentElement.lang || navigator.language;
  return language.toLowerCase().startsWith("zh") ? COPY.zh : COPY.en;
}
function normalizeGoogleApiKey(raw) {
  const value = raw.trim();
  if (value.length === 0) return { error: "required" };
  if (!/^[\x21-\x7E]+$/.test(value)) return { error: "invalid" };
  return { value };
}
function isVisionBridgeModelChange(previous, next, bridgeProvider = DEFAULT_BRIDGE_PROVIDER) {
  if (next === null || next.provider !== bridgeProvider) return false;
  return previous === null || previous.provider !== next.provider || previous.model !== next.model;
}
function VisionBridgeRouteCredentialDialog(props) {
  const { bridgeProvider, modelDirectories, rpc, sessions } = props;
  const [phase, setPhase] = (0, import_react.useState)("idle");
  const [name, setName] = (0, import_react.useState)("");
  const [baseURL, setBaseURL] = (0, import_react.useState)("");
  const [apiFormat, setApiFormat] = (0, import_react.useState)("auto");
  const [key, setKey] = (0, import_react.useState)("");
  const [failure, setFailure] = (0, import_react.useState)();
  const [request, setRequest] = (0, import_react.useState)(0);
  const titleId = (0, import_react.useId)();
  const nameId = (0, import_react.useId)();
  const baseURLId = (0, import_react.useId)();
  const apiFormatId = (0, import_react.useId)();
  const keyId = (0, import_react.useId)();
  const inputRef = (0, import_react.useRef)(null);
  const copy = copyForBrowser();
  (0, import_react.useEffect)(() => {
    let activeSessionId;
    let stopDirectory;
    let retryTimer;
    const followCurrentSession = () => {
      const sessionId = sessions.list.getSnapshot().current;
      if (sessionId === activeSessionId && stopDirectory !== void 0) return;
      stopDirectory?.();
      stopDirectory = void 0;
      if (retryTimer !== void 0) window.clearTimeout(retryTimer);
      retryTimer = void 0;
      setPhase("idle");
      setFailure(void 0);
      if (sessionId === void 0) {
        activeSessionId = void 0;
        return;
      }
      let directory;
      try {
        directory = modelDirectories.directoryFor(sessionId);
      } catch {
        activeSessionId = void 0;
        retryTimer = window.setTimeout(followCurrentSession, 50);
        return;
      }
      activeSessionId = sessionId;
      let previous = directory.store.getSnapshot().current;
      if (isVisionBridgeModelChange(null, previous, bridgeProvider)) {
        setRequest((value) => value + 1);
      }
      stopDirectory = directory.store.subscribe(() => {
        const next = directory.store.getSnapshot().current;
        const shouldPrompt = isVisionBridgeModelChange(previous, next, bridgeProvider);
        previous = next;
        if (shouldPrompt) setRequest((value) => value + 1);
        else if (next?.provider !== bridgeProvider) setPhase("idle");
      });
    };
    followCurrentSession();
    const stopSessions = sessions.list.subscribe(followCurrentSession);
    return () => {
      stopSessions();
      stopDirectory?.();
      if (retryTimer !== void 0) window.clearTimeout(retryTimer);
    };
  }, [bridgeProvider, modelDirectories, sessions]);
  (0, import_react.useEffect)(() => {
    if (request === 0) return;
    let active = true;
    setPhase("checking");
    setFailure(void 0);
    void readConfiguration(rpc).then(
      (configuration) => {
        if (!active) return;
        const sessionId = sessions.list.getSnapshot().current;
        if (sessionId === void 0) {
          setPhase("idle");
          return;
        }
        try {
          if (modelDirectories.directoryFor(sessionId).store.getSnapshot().current?.provider !== bridgeProvider) {
            setPhase("idle");
            return;
          }
        } catch {
          setPhase("idle");
          return;
        }
        if (configuration.providers.length > 0) {
          setPhase("idle");
          return;
        }
        setPhase("missing");
      },
      (error) => {
        if (!active) return;
        setFailure(error instanceof Error ? error.message : String(error));
        setPhase("failed");
      }
    );
    return () => {
      active = false;
    };
  }, [bridgeProvider, modelDirectories, request, rpc, sessions]);
  (0, import_react.useEffect)(() => {
    if (phase !== "missing") return;
    inputRef.current?.focus();
  }, [phase]);
  (0, import_react.useEffect)(() => {
    if (phase === "idle" || phase === "checking") return;
    const root = document.getElementById("root");
    if (root === null) return;
    const previous = root.inert;
    root.inert = true;
    return () => {
      root.inert = previous;
    };
  }, [phase]);
  const save = async (event) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setFailure(copy.providerName);
      return;
    }
    const normalized = normalizeGoogleApiKey(key);
    if (normalized.error !== void 0) {
      setFailure(normalized.error === "required" ? copy.keyRequired : copy.keyInvalid);
      return;
    }
    setPhase("saving");
    setFailure(void 0);
    try {
      await configurationMutation(rpc, CONFIGURATION_ADD_ENDPOINT, {
        name,
        apiFormat,
        baseURL,
        apiKey: normalized.value
      });
      setName("");
      setBaseURL("");
      setApiFormat("auto");
      setKey("");
      setPhase("idle");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      setPhase("missing");
    }
  };
  const dismiss = () => {
    setPhase("idle");
    setFailure(void 0);
  };
  if (phase === "idle" || phase === "checking") return null;
  const message = phase === "failed" ? `${copy.loadFailed}${failure === void 0 ? "" : ` ${failure}`}` : failure;
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-overlay", role: "presentation", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: STYLES }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "section",
        {
          className: "dsh-vb-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleId,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "dsh-vb-title", id: titleId, children: copy.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-description", children: copy.description }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (event) => {
              void save(event);
            }, children: [
              phase === "missing" || phase === "saving" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-dialog-field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-label", htmlFor: nameId, children: copy.providerName }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "input",
                    {
                      ref: inputRef,
                      className: "dsh-vb-input",
                      id: nameId,
                      value: name,
                      placeholder: copy.providerNamePlaceholder,
                      disabled: phase === "saving",
                      onChange: (event) => {
                        setName(event.target.value);
                        setFailure(void 0);
                      }
                    },
                    request
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-dialog-field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-label", htmlFor: baseURLId, children: copy.baseURLLabel }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "input",
                    {
                      className: "dsh-vb-input",
                      id: baseURLId,
                      type: "url",
                      inputMode: "url",
                      spellCheck: false,
                      value: baseURL,
                      placeholder: copy.baseURLPlaceholder,
                      disabled: phase === "saving",
                      onChange: (event) => {
                        setBaseURL(event.target.value);
                        setFailure(void 0);
                      }
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-dialog-grid", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-dialog-field", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-label", htmlFor: apiFormatId, children: copy.apiFormatLabel }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                      "select",
                      {
                        className: "dsh-vb-input",
                        id: apiFormatId,
                        value: apiFormat,
                        disabled: phase === "saving",
                        onChange: (event) => {
                          setApiFormat(event.target.value);
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "auto", children: copy.apiFormatAuto }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "openai-compatible", children: copy.apiFormatOpenAI }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "gemini-native", children: copy.apiFormatGemini }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "anthropic-compatible", children: copy.apiFormatAnthropic })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-dialog-field", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-label", htmlFor: keyId, children: copy.keyLabel }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "input",
                      {
                        className: "dsh-vb-input",
                        id: keyId,
                        type: "password",
                        autoComplete: "new-password",
                        "data-1p-ignore": "true",
                        "data-bwignore": "true",
                        "data-lpignore": "true",
                        spellCheck: false,
                        value: key,
                        placeholder: copy.keyPlaceholder,
                        "aria-invalid": failure !== void 0,
                        disabled: phase === "saving",
                        onChange: (event) => {
                          setKey(event.target.value);
                          setFailure(void 0);
                        }
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-description", style: { margin: "12px 0 0" }, children: copy.secureStorage })
              ] }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-status", role: "status", children: message ?? "" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-actions", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dsh-vb-button dsh-vb-secondary", type: "button", onClick: dismiss, children: copy.later }),
                phase === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    className: "dsh-vb-button dsh-vb-primary",
                    type: "button",
                    onClick: () => {
                      setRequest((value) => value + 1);
                    },
                    children: copy.retry
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dsh-vb-button dsh-vb-primary", type: "submit", disabled: phase === "saving", children: phase === "saving" ? copy.saving : copy.save })
              ] })
            ] })
          ]
        }
      )
    ] }),
    document.body
  );
}
async function readConfiguration(rpc) {
  const response = await rpc.call(CONFIGURATION_CHANNEL, CONFIGURATION_GET_ENDPOINT, {});
  if (!response.ok) throw new Error(response.error.message);
  const view = parseConfigurationView(response.value);
  if (view === void 0) throw new Error("Vision Bridge returned an invalid provider directory.");
  return view;
}
async function configurationMutation(rpc, endpoint, payload) {
  const response = await rpc.call(CONFIGURATION_CHANNEL, endpoint, payload);
  if (!response.ok) throw new Error(response.error.message);
  const view = parseConfigurationView(response.value);
  if (view === void 0) throw new Error("Vision Bridge returned an invalid provider directory.");
  window.dispatchEvent(new Event(VISION_PROVIDER_CHANGED_EVENT));
  return view;
}
function VisionBridgeCredentialCard({ rpc }) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const [phase, setPhase] = (0, import_react.useState)("loading");
  const [busy, setBusy] = (0, import_react.useState)();
  const [configuration, setConfiguration] = (0, import_react.useState)({ activeProviderId: "", providers: [] });
  const [providerMenuOpen, setProviderMenuOpen] = (0, import_react.useState)(false);
  const [adding, setAdding] = (0, import_react.useState)(false);
  const [name, setName] = (0, import_react.useState)("");
  const [baseURL, setBaseURL] = (0, import_react.useState)("");
  const [apiFormat, setApiFormat] = (0, import_react.useState)("auto");
  const [key, setKey] = (0, import_react.useState)("");
  const [models, setModels] = (0, import_react.useState)([]);
  const [modelsProviderId, setModelsProviderId] = (0, import_react.useState)();
  const [modelsLoading, setModelsLoading] = (0, import_react.useState)(false);
  const [modelsFailure, setModelsFailure] = (0, import_react.useState)();
  const [modelGeneration, setModelGeneration] = (0, import_react.useState)(0);
  const [failure, setFailure] = (0, import_react.useState)();
  const [notice, setNotice] = (0, import_react.useState)();
  const [generation, setGeneration] = (0, import_react.useState)(0);
  const modelId = (0, import_react.useId)();
  const nameId = (0, import_react.useId)();
  const baseURLId = (0, import_react.useId)();
  const apiFormatId = (0, import_react.useId)();
  const inputId = (0, import_react.useId)();
  const copy = copyForBrowser();
  const activeProvider = configuration.providers.find((item) => item.id === configuration.activeProviderId);
  (0, import_react.useEffect)(() => {
    let active = true;
    setPhase("loading");
    setFailure(void 0);
    void readConfiguration(rpc).then(
      (view) => {
        if (!active) return;
        setConfiguration(view);
        setPhase("ready");
      },
      (error) => {
        if (!active) return;
        setFailure(error instanceof Error ? error.message : String(error));
        setPhase("failed");
      }
    );
    return () => {
      active = false;
    };
  }, [generation, rpc]);
  (0, import_react.useEffect)(() => {
    if (!open || phase !== "ready" || activeProvider === void 0) {
      setModels([]);
      setModelsProviderId(void 0);
      setModelsFailure(void 0);
      return;
    }
    let active = true;
    setModels([]);
    setModelsProviderId(void 0);
    setModelsLoading(true);
    setModelsFailure(void 0);
    void rpc.call(CONFIGURATION_CHANNEL, CONFIGURATION_MODELS_ENDPOINT, {
      providerId: activeProvider.id
    }).then(
      (response) => {
        if (!active) return;
        if (!response.ok) throw new Error(response.error.message);
        const view = parseModelsView(response.value);
        if (view === void 0) throw new Error(copy.modelsFailed);
        setModels(view.models);
        setModelsProviderId(activeProvider.id);
      },
      (error) => {
        if (active) setModelsFailure(error instanceof Error ? error.message : String(error));
      }
    ).catch((error) => {
      if (active) setModelsFailure(error instanceof Error ? error.message : String(error));
    }).finally(() => {
      if (active) setModelsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeProvider?.id, copy.modelsFailed, modelGeneration, open, phase, rpc]);
  const selectProvider = async (providerId) => {
    setBusy("selecting");
    setFailure(void 0);
    setNotice(void 0);
    setProviderMenuOpen(false);
    try {
      setConfiguration(await configurationMutation(rpc, CONFIGURATION_SELECT_ENDPOINT, { providerId }));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(void 0);
    }
  };
  const deleteProvider = async (providerId) => {
    setBusy("deleting");
    setFailure(void 0);
    setNotice(void 0);
    try {
      setConfiguration(await configurationMutation(rpc, CONFIGURATION_DELETE_ENDPOINT, { providerId }));
      setProviderMenuOpen(false);
      setNotice(copy.providerDeleted);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(void 0);
    }
  };
  const addProvider = async (event) => {
    event.preventDefault();
    const normalizedKey = normalizeGoogleApiKey(key);
    if (name.trim().length === 0) {
      setFailure(copy.providerName);
      return;
    }
    if (normalizedKey.value === void 0) {
      setFailure(normalizedKey.error === "invalid" ? copy.keyInvalid : copy.keyRequired);
      return;
    }
    setBusy("adding");
    setFailure(void 0);
    setNotice(void 0);
    try {
      const next = await configurationMutation(rpc, CONFIGURATION_ADD_ENDPOINT, {
        name,
        apiFormat,
        baseURL,
        apiKey: normalizedKey.value
      });
      setConfiguration(next);
      setName("");
      setBaseURL("");
      setApiFormat("auto");
      setKey("");
      setAdding(false);
      setNotice(copy.providerAdded);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(void 0);
    }
  };
  const setModel = async (model) => {
    if (activeProvider === void 0) return;
    setBusy("model");
    setFailure(void 0);
    setNotice(void 0);
    try {
      setConfiguration(await configurationMutation(rpc, CONFIGURATION_SET_MODEL_ENDPOINT, {
        providerId: activeProvider.id,
        model
      }));
      setNotice(copy.settingsUpdated);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(void 0);
    }
  };
  const status = phase === "loading" ? copy.loading : phase === "failed" ? copy.loadFailed : activeProvider?.configured === true ? copy.configured : copy.unconfigured;
  const directoryModels = activeProvider?.id === modelsProviderId ? models : [];
  const modelOptions = activeProvider !== void 0 && activeProvider.model.length > 0 && !directoryModels.some((item) => item.id === activeProvider.model) ? [{ id: activeProvider.model, name: activeProvider.model }, ...directoryModels] : directoryModels;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "dsh-vb-card", "data-open": open, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: "dsh-vb-card-header",
        "aria-expanded": open,
        "aria-label": `${copy.cardTitle}: ${status}`,
        onClick: () => {
          setOpen((value) => !value);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-card-head-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-card-name", children: copy.cardTitle }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-card-description", children: copy.cardDescription })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-card-state", "data-configured": activeProvider?.configured === true, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-card-dot", "aria-hidden": "true" }),
            status
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "dsh-vb-chevron", "data-open": open, viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m3.25 5.25 3.75 3.5 3.75-3.5", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-card-body", children: phase === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-vb-card-message", "data-tone": "error", role: "status", children: [
        copy.loadFailed,
        " ",
        failure
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-card-footer", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dsh-vb-card-button dsh-vb-card-button-primary",
          onClick: () => {
            setGeneration((value) => value + 1);
          },
          children: copy.retry
        }
      ) })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-card-field-label", style: { margin: 0 }, children: copy.providerLabel }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "dsh-vb-card-button",
              disabled: busy !== void 0,
              onClick: () => {
                setAdding((value) => !value);
                setProviderMenuOpen(false);
                setFailure(void 0);
              },
              children: [
                "\uFF0B ",
                copy.addProvider
              ]
            }
          )
        ] }),
        configuration.providers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-card-hint", children: copy.noProviders }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-provider-picker", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "dsh-vb-provider-trigger",
              disabled: busy !== void 0,
              "aria-haspopup": "listbox",
              "aria-expanded": providerMenuOpen,
              onClick: () => {
                setProviderMenuOpen((value) => !value);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-provider-trigger-text", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-provider-name", children: activeProvider?.name }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-provider-key", children: activeProvider?.maskedApiKey ?? copy.maskUnavailable })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "\u2304" })
              ]
            }
          ),
          providerMenuOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-provider-menu", role: "listbox", children: configuration.providers.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: "dsh-vb-provider-option",
              "data-active": provider.id === configuration.activeProviderId,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    role: "option",
                    "aria-selected": provider.id === configuration.activeProviderId,
                    className: "dsh-vb-provider-option-main",
                    onClick: () => {
                      void selectProvider(provider.id);
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-provider-trigger-text", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-provider-name", children: provider.name }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-provider-key", children: provider.maskedApiKey ?? copy.maskUnavailable })
                    ] })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "dsh-vb-provider-delete",
                    title: copy.deleteProvider,
                    "aria-label": `${copy.deleteProvider}: ${provider.name}`,
                    onClick: () => {
                      void deleteProvider(provider.id);
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.5 4.5h9M6.25 2.75h3.5l.5 1.75h-4.5l.5-1.75ZM5 6.25l.35 6.25h5.3L11 6.25M7 6.75v4M9 6.75v4", stroke: "currentColor", strokeWidth: "1.25", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                )
              ]
            },
            provider.id
          )) }) : null
        ] })
      ] }),
      adding ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "dsh-vb-add-panel", onSubmit: (event) => {
        void addProvider(event);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", style: { marginTop: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-card-field-label", htmlFor: nameId, children: copy.providerName }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: nameId,
              className: "dsh-vb-card-input",
              value: name,
              placeholder: copy.providerNamePlaceholder,
              disabled: busy !== void 0,
              onChange: (event) => {
                setName(event.target.value);
                setFailure(void 0);
              }
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-card-field-label", htmlFor: baseURLId, children: copy.baseURLLabel }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: baseURLId,
              className: "dsh-vb-card-input",
              type: "url",
              inputMode: "url",
              spellCheck: false,
              value: baseURL,
              placeholder: copy.baseURLPlaceholder,
              disabled: busy !== void 0,
              onChange: (event) => {
                setBaseURL(event.target.value);
                setFailure(void 0);
              }
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-card-field-label", htmlFor: apiFormatId, children: copy.apiFormatLabel }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "select",
              {
                id: apiFormatId,
                className: "dsh-vb-card-select",
                value: apiFormat,
                disabled: busy !== void 0,
                onChange: (event) => {
                  setApiFormat(event.target.value);
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "auto", children: copy.apiFormatAuto }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "openai-compatible", children: copy.apiFormatOpenAI }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "gemini-native", children: copy.apiFormatGemini }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "anthropic-compatible", children: copy.apiFormatAnthropic })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-card-field-label", htmlFor: inputId, children: copy.keyLabel }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: inputId,
                className: "dsh-vb-card-input",
                type: "password",
                autoComplete: "new-password",
                spellCheck: false,
                value: key,
                placeholder: copy.keyPlaceholder,
                disabled: busy !== void 0,
                onChange: (event) => {
                  setKey(event.target.value);
                  setFailure(void 0);
                }
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-card-hint", children: copy.secureStorage }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-inline-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh-vb-card-button dsh-vb-card-button-secondary",
              disabled: busy !== void 0,
              onClick: () => {
                setAdding(false);
                setFailure(void 0);
              },
              children: copy.cancel
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "dsh-vb-card-button dsh-vb-card-button-primary", disabled: busy !== void 0, children: busy === "adding" ? copy.addingProvider : copy.addProvider })
        ] })
      ] }) : null,
      activeProvider !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-provider-meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: activeProvider.baseURL }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: activeProvider.resolvedApiFormat === "gemini-native" ? copy.apiFormatGemini : activeProvider.resolvedApiFormat === "anthropic-compatible" ? copy.apiFormatAnthropic : copy.apiFormatOpenAI })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-card-field-label", htmlFor: modelId, children: copy.chooseModel }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "select",
            {
              id: modelId,
              className: "dsh-vb-card-select",
              value: activeProvider.model,
              disabled: busy !== void 0 || modelsLoading || modelOptions.length === 0,
              onChange: (event) => {
                void setModel(event.target.value);
              },
              children: modelOptions.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: option.id, children: option.name === option.id ? option.id : `${option.name} \xB7 ${option.id}` }, option.id))
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-model-status", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-card-hint", children: modelsLoading ? copy.modelsLoading : modelsFailure !== void 0 ? `${copy.modelsFailed} ${modelsFailure}` : modelOptions.length === 0 ? copy.noModels : `${modelOptions.length} models` }),
            modelsFailure !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "dsh-vb-card-button",
                onClick: () => {
                  setModelGeneration((value) => value + 1);
                },
                children: copy.retry
              }
            ) : null
          ] })
        ] })
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "p",
        {
          className: "dsh-vb-card-message",
          "data-tone": failure === void 0 ? notice === void 0 ? void 0 : "success" : "error",
          role: "status",
          children: failure ?? notice ?? ""
        }
      )
    ] }) }) : null
  ] });
}
var inject = ["slots", "connection", "sessions", "modelDirectories"];
function apply(ctx) {
  const client = ctx;
  const services = ctx;
  const connection = services.get("connection");
  const sessions = services.get("sessions");
  const modelDirectories = services.get("modelDirectories");
  client.slots.inject("conversation.input.model", () => client.slots.register({
    name: "conversation.input.model",
    priority: -10,
    inject: (sessionId) => {
      const directory = modelDirectories.directoryFor(sessionId);
      const available = sessions.subagentAddress?.(sessionId) === void 0;
      return {
        available,
        directory: directory.store,
        load: () => {
          if (available) void directory.load().catch(() => {
          });
        },
        select: (selection) => available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false),
        rpc: connection.rpc
      };
    }
  }, VisionBridgeModelSelect));
  client.slots.inject("shell.overlay", () => client.slots.register({
    name: "shell.overlay",
    id: "vision-bridge-provider-setup",
    order: 10,
    inject: () => ({
      bridgeProvider: DEFAULT_BRIDGE_PROVIDER,
      modelDirectories,
      rpc: connection.rpc,
      sessions
    })
  }, VisionBridgeRouteCredentialDialog));
  client.slots.inject("settings.plugin.item", () => client.slots.register({
    name: "settings.plugin.item",
    key: "vision-bridge",
    order: 30,
    inject: () => ({ rpc: connection.rpc })
  }, VisionBridgeCredentialCard));
}
return module.exports; } });
//# sourceMappingURL=client.cjs.map
