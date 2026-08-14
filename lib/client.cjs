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
  VisionBridgeRouteCredentialDialog: () => VisionBridgeRouteCredentialDialog,
  apply: () => apply,
  inject: () => inject,
  isVisionBridgeModelChange: () => isVisionBridgeModelChange,
  normalizeGoogleApiKey: () => normalizeGoogleApiKey
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_react_dom = require("react-dom");

// src/credential-mask.ts
var CREDENTIAL_MASK_CHANNEL = "/vision-bridge";
var CREDENTIAL_MASK_ENDPOINT = "credential-mask";
function parseCredentialMaskView(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record = value;
  const keys = Object.keys(record);
  if (record.configured === false && keys.length === 1) return { configured: false };
  if (record.configured !== true || keys.length !== 2 || typeof record.masked !== "string") return void 0;
  if (!/^.{4}\*{4}.{4}$/u.test(record.masked)) return void 0;
  return { configured: true, masked: record.masked };
}

// src/client.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var DEFAULT_GOOGLE_CREDENTIAL_REF = "GOOGLE_API_KEY";
var DEFAULT_BRIDGE_PROVIDER = "deepseek-vision-bridge";
var COPY = {
  zh: {
    title: "\u914D\u7F6E\u56FE\u7247\u7406\u89E3 API Key",
    description: "Vision Bridge \u4F7F\u7528 Google Gemini \u5206\u6790\u4F1A\u8BDD\u4E2D\u7684\u56FE\u7247\u3002API Key \u4F1A\u4FDD\u5B58\u5230 Harness \u51ED\u8BC1\u5E93\uFF0C\u4E0D\u4F1A\u5199\u5165\u804A\u5929\u8BB0\u5F55\u6216\u63D2\u4EF6\u914D\u7F6E\u3002",
    keyLabel: "Google API Key",
    keyPlaceholder: "Google API Key",
    save: "\u4FDD\u5B58\u5E76\u7EE7\u7EED",
    saving: "\u6B63\u5728\u4FDD\u5B58\u2026",
    later: "\u7A0D\u540E\u914D\u7F6E",
    retry: "\u91CD\u8BD5",
    keyRequired: "\u8BF7\u8F93\u5165 API Key\u3002",
    keyInvalid: "API Key \u53EA\u80FD\u5305\u542B\u4E0D\u5E26\u7A7A\u683C\u7684\u53EF\u6253\u5370 ASCII \u5B57\u7B26\u3002",
    readOnly: "\u5F53\u524D\u51ED\u8BC1\u6765\u6E90\u4E0D\u53EF\u7531\u7F51\u9875\u4FEE\u6539\uFF0C\u8BF7\u5728\u542F\u52A8\u73AF\u5883\u4E2D\u914D\u7F6E GOOGLE_API_KEY\u3002",
    loadFailed: "\u65E0\u6CD5\u8BFB\u53D6\u51ED\u8BC1\u72B6\u6001\u3002",
    cardTitle: "\u56FE\u7247\u7406\u89E3",
    cardDescription: "\u914D\u7F6E Vision Bridge \u4F7F\u7528\u7684 Google Gemini API Key\u3002",
    configured: "\u5DF2\u914D\u7F6E",
    unconfigured: "\u672A\u914D\u7F6E",
    loading: "\u8BFB\u53D6\u4E2D\u2026",
    secureStorage: "Key \u4FDD\u5B58\u5728 Harness \u51ED\u8BC1\u5E93\u4E2D\uFF0C\u5DF2\u4FDD\u5B58\u7684\u503C\u4E0D\u4F1A\u5728\u7F51\u9875\u4E0A\u56DE\u663E\u3002",
    configuredHint: "\u8F93\u5165\u65B0 Key \u5E76\u4FDD\u5B58\uFF0C\u5373\u53EF\u66FF\u6362\u5F53\u524D Key\u3002",
    unconfiguredHint: "\u8F93\u5165 Key \u540E\uFF0C\u4F1A\u8BDD\u4E2D\u7684\u56FE\u7247\u5C06\u53EF\u4EE5\u4EA4\u7ED9 Gemini \u5206\u6790\u3002",
    replacePlaceholder: "Google API Key",
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
    maskUnavailable: "\u5DF2\u914D\u7F6E\uFF08\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u8131\u654F\u6807\u8BC6\uFF09"
  },
  en: {
    title: "Configure the vision API key",
    description: "Vision Bridge uses Google Gemini to analyze images in the current session. The key is stored in the Harness credential store, never in chat history or plugin configuration.",
    keyLabel: "Google API Key",
    keyPlaceholder: "Google API Key",
    save: "Save and continue",
    saving: "Saving\u2026",
    later: "Configure later",
    retry: "Retry",
    keyRequired: "Enter an API key.",
    keyInvalid: "The API key may contain printable ASCII characters without spaces only.",
    readOnly: "This credential source cannot be changed from the web UI. Configure GOOGLE_API_KEY in the launch environment.",
    loadFailed: "Could not read credential status.",
    cardTitle: "Image understanding",
    cardDescription: "Configure the Google Gemini API key used by Vision Bridge.",
    configured: "Configured",
    unconfigured: "Not configured",
    loading: "Loading\u2026",
    secureStorage: "The key is kept in the Harness credential store. A saved value is never revealed in the web UI.",
    configuredHint: "Enter and save a new key to replace the current one.",
    unconfiguredHint: "Once configured, session images can be delegated to Gemini for analysis.",
    replacePlaceholder: "Google API Key",
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
    maskUnavailable: "Configured (masked identifier unavailable)"
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
.dsh-vb-card-header:focus-visible,.dsh-vb-card button:focus-visible,.dsh-vb-card input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#316fea);outline-offset:1px}
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
.dsh-vb-card-field-label{display:block;margin:0 0 7px;font-size:13px;font-weight:500;color:var(--dsw-alias-label-secondary,#454c58)}
.dsh-vb-card-input{box-sizing:border-box;width:100%;height:38px;border:1px solid var(--dsw-alias-border-l2,#d9dde4);border-radius:8px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1f2329);padding:0 11px;font:inherit;font-size:13px;outline:none}
.dsh-vb-card-input::placeholder{color:var(--dsw-alias-label-tertiary,#9097a2)}
.dsh-vb-card-input[aria-invalid=true]{border-color:var(--dsw-alias-label-error,#d43f4d)}
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
@media(max-width:560px){.dsh-vb-card-state{display:none}.dsh-vb-card-footer{align-items:stretch;flex-direction:column-reverse}.dsh-vb-card-button{width:100%}}
@media(prefers-color-scheme:dark){.dsh-vb-dialog{border-color:#3a4352;background:#20242c;color:#f4f6fa}.dsh-vb-description{color:#aeb6c5}.dsh-vb-label{color:#e2e7ef}.dsh-vb-input{border-color:#4b5565;background:#171a20;color:#f4f6fa}.dsh-vb-secondary{background:#343a45;color:#eef1f6}}
`;
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
  if (previous === null || next === null || next.provider !== bridgeProvider) return false;
  return previous.provider !== next.provider || previous.model !== next.model;
}
function VisionBridgeRouteCredentialDialog(props) {
  const { api, bridgeProvider, credentialRef, modelDirectories, sessions } = props;
  const [phase, setPhase] = (0, import_react.useState)("idle");
  const [key, setKey] = (0, import_react.useState)("");
  const [failure, setFailure] = (0, import_react.useState)();
  const [request, setRequest] = (0, import_react.useState)(0);
  const titleId = (0, import_react.useId)();
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
      setKey("");
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
      let hasBaseline = previous !== null;
      stopDirectory = directory.store.subscribe(() => {
        const next = directory.store.getSnapshot().current;
        if (next === null) {
          previous = null;
          hasBaseline = false;
          return;
        }
        if (!hasBaseline) {
          previous = next;
          hasBaseline = true;
          return;
        }
        const shouldPrompt = isVisionBridgeModelChange(previous, next, bridgeProvider);
        previous = next;
        if (shouldPrompt) setRequest((value) => value + 1);
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
    setKey("");
    setPhase("checking");
    setFailure(void 0);
    void api.credentials.describe({ refs: [credentialRef] }).then(
      (response) => {
        if (!active) return;
        if (!response.result.ok) {
          setFailure(response.result.error.message);
          setPhase("failed");
          return;
        }
        const credential = response.result.value.credentials[credentialRef];
        if (credential?.configured === true) {
          setPhase("idle");
          return;
        }
        setPhase(credential?.writable === false ? "read-only" : "missing");
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
  }, [api.credentials, credentialRef, request]);
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
    const normalized = normalizeGoogleApiKey(key);
    if (normalized.error !== void 0) {
      setFailure(normalized.error === "required" ? copy.keyRequired : copy.keyInvalid);
      return;
    }
    setPhase("saving");
    setFailure(void 0);
    try {
      const response = await api.credentials.set({ ref: credentialRef, value: normalized.value });
      if (!response.result.ok) {
        setFailure(response.result.error.message);
        setPhase("missing");
        return;
      }
      setKey("");
      setPhase("idle");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      setPhase("missing");
    }
  };
  const dismiss = () => {
    setPhase("idle");
    setKey("");
    setFailure(void 0);
  };
  if (phase === "idle" || phase === "checking") return null;
  const message = phase === "read-only" ? copy.readOnly : phase === "failed" ? `${copy.loadFailed}${failure === void 0 ? "" : ` ${failure}`}` : failure;
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
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-vb-label", htmlFor: "dsh-vb-api-key", children: copy.keyLabel }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    ref: inputRef,
                    className: "dsh-vb-input",
                    id: "dsh-vb-api-key",
                    name: "dsh-vision-bridge-new-google-api-key",
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
                    }
                  },
                  request
                )
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
                ) : phase === "read-only" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    className: "dsh-vb-button dsh-vb-primary",
                    type: "submit",
                    disabled: phase === "saving",
                    children: phase === "saving" ? copy.saving : copy.save
                  }
                )
              ] })
            ] })
          ]
        }
      )
    ] }),
    document.body
  );
}
async function readCredentialMask(rpc) {
  const response = await rpc.call(CREDENTIAL_MASK_CHANNEL, CREDENTIAL_MASK_ENDPOINT, {});
  if (!response.ok) return void 0;
  const view = parseCredentialMaskView(response.value);
  return view?.configured === true ? view.masked : void 0;
}
function VisionBridgeCredentialCard(props) {
  const { api, credentialRef, rpc } = props;
  const [open, setOpen] = (0, import_react.useState)(false);
  const [phase, setPhase] = (0, import_react.useState)("loading");
  const [busy, setBusy] = (0, import_react.useState)();
  const [configured, setConfigured] = (0, import_react.useState)(false);
  const [writable, setWritable] = (0, import_react.useState)(true);
  const [maskedKey, setMaskedKey] = (0, import_react.useState)();
  const [key, setKey] = (0, import_react.useState)("");
  const [failure, setFailure] = (0, import_react.useState)();
  const [notice, setNotice] = (0, import_react.useState)();
  const [confirmRemove, setConfirmRemove] = (0, import_react.useState)(false);
  const [generation, setGeneration] = (0, import_react.useState)(0);
  const inputId = (0, import_react.useId)();
  const copy = copyForBrowser();
  (0, import_react.useEffect)(() => {
    let active = true;
    setPhase("loading");
    setFailure(void 0);
    setMaskedKey(void 0);
    void (async () => {
      try {
        const response = await api.credentials.describe({ refs: [credentialRef] });
        if (!active) return;
        if (!response.result.ok) {
          setFailure(response.result.error.message);
          setPhase("failed");
          return;
        }
        const credential = response.result.value.credentials[credentialRef];
        const isConfigured = credential?.configured === true;
        let mask;
        if (isConfigured) {
          try {
            mask = await readCredentialMask(rpc);
          } catch {
          }
        }
        if (!active) return;
        setConfigured(isConfigured);
        setWritable(credential?.writable !== false);
        setMaskedKey(mask);
        setPhase("ready");
      } catch (error) {
        if (!active) return;
        setFailure(error instanceof Error ? error.message : String(error));
        setPhase("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, [api.credentials, credentialRef, generation, rpc]);
  const save = async (event) => {
    event.preventDefault();
    const normalized = normalizeGoogleApiKey(key);
    if (normalized.error !== void 0 || normalized.value === void 0) {
      setFailure(normalized.error === "required" ? copy.keyRequired : copy.keyInvalid);
      setNotice(void 0);
      return;
    }
    setBusy("saving");
    setFailure(void 0);
    setNotice(void 0);
    try {
      const response = await api.credentials.set({ ref: credentialRef, value: normalized.value });
      if (!response.result.ok) {
        setFailure(response.result.error.message);
        return;
      }
      setKey("");
      setConfigured(true);
      try {
        setMaskedKey(await readCredentialMask(rpc));
      } catch {
        setMaskedKey(void 0);
      }
      setNotice(copy.updated);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(void 0);
    }
  };
  const remove = async () => {
    setBusy("removing");
    setFailure(void 0);
    setNotice(void 0);
    try {
      const response = await api.credentials.unset({ ref: credentialRef });
      if (!response.result.ok) {
        setFailure(response.result.error.message);
        return;
      }
      setKey("");
      setConfigured(false);
      setMaskedKey(void 0);
      setConfirmRemove(false);
      setNotice(copy.removed);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(void 0);
    }
  };
  const status = phase === "loading" ? copy.loading : phase === "failed" ? copy.loadFailed : configured ? copy.configured : copy.unconfigured;
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-vb-card-state", "data-configured": phase === "ready" && configured, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-card-dot", "aria-hidden": "true" }),
            status
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "svg",
            {
              className: "dsh-vb-chevron",
              "data-open": open,
              viewBox: "0 0 14 14",
              fill: "none",
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m3.25 5.25 3.75 3.5 3.75-3.5", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" })
            }
          )
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-vb-card-body", children: phase === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-vb-card-message", "data-tone": "error", role: "status", children: [
        copy.loadFailed,
        failure === void 0 ? "" : ` ${failure}`
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
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (event) => {
      void save(event);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-card-note", children: copy.secureStorage }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-card-hint", children: configured ? copy.configuredHint : copy.unconfiguredHint }),
      configured ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-current", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-vb-card-current-label", children: copy.currentKey }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "dsh-vb-card-current-value", children: maskedKey ?? copy.maskUnavailable })
      ] }) : null,
      !writable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-vb-card-message", role: "status", children: copy.readOnly }) : null,
      writable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-field", children: [
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
            placeholder: copy.replacePlaceholder,
            "aria-invalid": failure !== void 0,
            disabled: busy !== void 0,
            onChange: (event) => {
              setKey(event.target.value);
              setFailure(void 0);
              setNotice(void 0);
            }
          }
        )
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "p",
        {
          className: "dsh-vb-card-message",
          "data-tone": failure === void 0 ? notice === void 0 ? void 0 : "success" : "error",
          role: "status",
          children: failure ?? notice ?? ""
        }
      ),
      confirmRemove ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-confirm", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: copy.removeConfirm }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-confirm-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh-vb-card-button dsh-vb-card-button-secondary",
              disabled: busy !== void 0,
              onClick: () => {
                setConfirmRemove(false);
              },
              children: copy.cancel
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh-vb-card-button dsh-vb-card-button-danger",
              disabled: busy !== void 0,
              onClick: () => {
                void remove();
              },
              children: busy === "removing" ? copy.removing : copy.confirmRemove
            }
          )
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-vb-card-footer", children: [
        configured && writable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh-vb-card-button dsh-vb-card-button-danger dsh-vb-card-button-remove",
            disabled: busy !== void 0,
            onClick: () => {
              setConfirmRemove(true);
              setFailure(void 0);
              setNotice(void 0);
            },
            children: copy.removeKey
          }
        ) : null,
        writable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "submit",
            className: "dsh-vb-card-button dsh-vb-card-button-primary",
            disabled: busy !== void 0 || key.trim().length === 0,
            children: busy === "saving" ? copy.saving : configured ? copy.replaceKey : copy.saveKey
          }
        ) : null
      ] })
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
  const credentials = () => ({
    api: connection.api,
    credentialRef: DEFAULT_GOOGLE_CREDENTIAL_REF,
    rpc: connection.rpc
  });
  client.slots.inject("shell.overlay", () => client.slots.register({
    name: "shell.overlay",
    id: "vision-bridge-google-api-key",
    order: 10,
    inject: () => ({
      ...credentials(),
      bridgeProvider: DEFAULT_BRIDGE_PROVIDER,
      modelDirectories,
      sessions
    })
  }, VisionBridgeRouteCredentialDialog));
  client.slots.inject("settings.plugin.item", () => client.slots.register({
    name: "settings.plugin.item",
    id: "vision-bridge-google-api-key",
    order: 30,
    inject: credentials
  }, VisionBridgeCredentialCard));
}
return module.exports; } });
//# sourceMappingURL=client.cjs.map
