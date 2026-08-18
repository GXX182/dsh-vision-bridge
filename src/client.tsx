/** Browser controls for the bridge-owned vision API credential. */

import type { Context } from '@deepseek-ai/cordis'
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CONFIGURATION_CHANNEL,
  CONFIGURATION_ADD_ENDPOINT,
  CONFIGURATION_DELETE_ENDPOINT,
  CONFIGURATION_GET_ENDPOINT,
  CONFIGURATION_MODELS_ENDPOINT,
  CONFIGURATION_ROUTING_ENDPOINT,
  CONFIGURATION_SELECT_ENDPOINT,
  CONFIGURATION_SET_MODEL_ENDPOINT,
  parseConfigurationView,
  parseBridgeRoutingView,
  parseModelsView,
} from './configuration.ts'
import type {
  NativeVisionCapability,
  VisionBridgeRoutingView,
  VisionConfigurationView,
  VisionModelOptionView,
} from './configuration.ts'
import type { VisionApiFormat } from './types.ts'

/** Credential reference shared with the Host plugin's default configuration. */
export const DEFAULT_GOOGLE_CREDENTIAL_REF = 'GOOGLE_API_KEY'

/** Provider route contributed by the default Host plugin configuration. */
export const DEFAULT_BRIDGE_PROVIDER = 'deepseek-vision-bridge'
const VISION_PROVIDER_CHANGED_EVENT = 'dsh-vision-bridge:provider-changed'

type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { message: string } }

interface ConnectionHandle {
  rpc: {
    call(channel: string, endpoint: string, payload: unknown): Promise<RpcResult<unknown>>
  }
}

interface ObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

interface SessionListState {
  current?: string
}

interface SessionsHandle {
  list: ObservableSnapshot<SessionListState>
  subagentAddress?(sessionId: string): unknown
}

interface ModelReasoningEffortView {
  id: string
  name: string
  description?: string
}

interface ModelReasoningView {
  efforts: ModelReasoningEffortView[]
  defaultEffort?: string
}

export interface ModelCatalogModelView {
  id: string
  name: string
  description?: string
  reasoning?: ModelReasoningView
}

export interface ModelProviderGroupView {
  id: string
  name: string
  models: ModelCatalogModelView[]
}

interface ModelSelectionView {
  provider: string
  model: string
  reasoningEffort?: string
}

export interface ModelDirectorySnapshot {
  current: ModelSelectionView | null
  routable?: boolean | null
  groups?: readonly ModelProviderGroupView[]
  failures?: ReadonlyArray<{ id: string; name: string; message: string }>
  status?: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
  error?: string | null
}

interface ModelDirectoryHandle {
  store: ObservableSnapshot<ModelDirectorySnapshot>
  load(): Promise<unknown>
  select(selection: ModelSelectionView): Promise<void>
}

interface ModelDirectoriesHandle {
  directoryFor(sessionId: string): ModelDirectoryHandle
}

interface RoutePromptInjected {
  bridgeProvider: string
  modelDirectories: ModelDirectoriesHandle
  rpc: ConnectionHandle['rpc']
  sessions: SessionsHandle
}

interface CredentialCardProps {
  rpc: ConnectionHandle['rpc']
}

interface SlotRegistration<T> {
  name: string
  id?: string
  key?: string
  order?: number
  priority?: number
  inject: (() => T) | ((sessionId: string) => T)
}

interface SlotsService {
  inject(name: string, register: () => void): void
  register<TInjected, TProps extends TInjected>(
    options: SlotRegistration<TInjected>,
    component: (props: TProps) => ReactNode,
  ): () => void
}

interface ClientContext {
  slots: SlotsService
}

type Copy = {
  title: string
  description: string
  keyLabel: string
  keyPlaceholder: string
  save: string
  saving: string
  later: string
  retry: string
  keyRequired: string
  keyInvalid: string
  readOnly: string
  loadFailed: string
  cardTitle: string
  cardDescription: string
  configured: string
  unconfigured: string
  loading: string
  secureStorage: string
  configuredHint: string
  unconfiguredHint: string
  replacePlaceholder: string
  replaceKey: string
  saveKey: string
  updated: string
  removeKey: string
  removeConfirm: string
  cancel: string
  confirmRemove: string
  removing: string
  removed: string
  currentKey: string
  maskUnavailable: string
  baseURLLabel: string
  baseURLPlaceholder: string
  modelLabel: string
  modelPlaceholder: string
  apiFormatLabel: string
  apiFormatAuto: string
  apiFormatGemini: string
  apiFormatOpenAI: string
  apiFormatAnthropic: string
  detectedFormat: string
  baseURLRequired: string
  baseURLInvalid: string
  modelRequired: string
  saveSettings: string
  settingsUpdated: string
  keepCurrentKey: string
  providerLabel: string
  addProvider: string
  providerName: string
  providerNamePlaceholder: string
  noProviders: string
  deleteProvider: string
  modelsLoading: string
  modelsFailed: string
  noModels: string
  addingProvider: string
  providerAdded: string
  providerDeleted: string
  chooseModel: string
}

const COPY: { zh: Copy; en: Copy } = {
  zh: {
    title: '需要配置视觉 Provider',
    description: '当前没有可用的视觉服务。添加一个 Provider 后，Vision Bridge 才能读取和分析会话中的图片。',
    keyLabel: '视觉 API Key',
    keyPlaceholder: '视觉 API Key',
    save: '验证并添加',
    saving: '正在验证…',
    later: '稍后配置',
    retry: '重试',
    keyRequired: '请输入 API Key。',
    keyInvalid: 'API Key 只能包含不带空格的可打印 ASCII 字符。',
    readOnly: '当前凭证来源不可由网页修改，请在启动环境中配置 GOOGLE_API_KEY。',
    loadFailed: '无法读取凭证状态。',
    cardTitle: '图片理解',
    cardDescription: '管理多个视觉 Provider，并自动加载各自的模型。',
    configured: '已配置',
    unconfigured: '未配置',
    loading: '读取中…',
    secureStorage: 'Key 保存在 Harness 凭证库中，已保存的值不会在网页上回显。',
    configuredHint: '输入新 Key 并保存，即可替换当前 Key。',
    unconfiguredHint: '输入 Key 后，会话中的图片将可以交给配置的视觉服务分析。',
    replacePlaceholder: '视觉 API Key',
    replaceKey: '替换 API Key',
    saveKey: '保存 API Key',
    updated: 'API Key 已更新。',
    removeKey: '删除 Key',
    removeConfirm: '确定删除吗？删除后，下次切换到 Vision Bridge 模型时会再次提示配置。',
    cancel: '取消',
    confirmRemove: '确认删除',
    removing: '正在删除…',
    removed: 'API Key 已删除。',
    currentKey: '当前 Key',
    maskUnavailable: '已配置（暂时无法读取脱敏标识）',
    baseURLLabel: 'Base URL',
    baseURLPlaceholder: 'https://api.example.com/v1',
    modelLabel: '视觉模型',
    modelPlaceholder: '例如 gemini-2.5-flash',
    apiFormatLabel: '接口协议',
    apiFormatAuto: '自动识别',
    apiFormatGemini: 'Gemini 原生',
    apiFormatOpenAI: 'OpenAI 兼容',
    apiFormatAnthropic: 'Anthropic 兼容',
    detectedFormat: '当前识别为',
    baseURLRequired: '请输入 Base URL。',
    baseURLInvalid: 'Base URL 必须是没有凭证、查询参数或片段的 HTTPS 地址。',
    modelRequired: '请输入视觉模型名称。',
    saveSettings: '保存设置',
    settingsUpdated: '视觉服务设置已更新。',
    keepCurrentKey: '留空则保持当前 Key',
    providerLabel: '视觉服务商',
    addProvider: '添加 Provider',
    providerName: '供应商名称',
    providerNamePlaceholder: '例如：公司中转站',
    noProviders: '还没有 Provider，请先添加。',
    deleteProvider: '删除 Provider',
    modelsLoading: '正在从该 Provider 获取模型…',
    modelsFailed: '无法获取模型列表。',
    noModels: '该 Provider 没有返回可用模型。',
    addingProvider: '验证并添加…',
    providerAdded: 'Provider 已添加并自动选中。',
    providerDeleted: 'Provider 已删除。',
    chooseModel: '选择视觉模型',
  },
  en: {
    title: 'Set up a vision provider',
    description: 'No vision service is available. Add a provider before Vision Bridge can inspect images in this conversation.',
    keyLabel: 'Vision API key',
    keyPlaceholder: 'Vision API key',
    save: 'Verify and add',
    saving: 'Verifying…',
    later: 'Configure later',
    retry: 'Retry',
    keyRequired: 'Enter an API key.',
    keyInvalid: 'The API key may contain printable ASCII characters without spaces only.',
    readOnly: 'This credential source cannot be changed from the web UI. Configure GOOGLE_API_KEY in the launch environment.',
    loadFailed: 'Could not read credential status.',
    cardTitle: 'Image understanding',
    cardDescription: 'Manage multiple vision providers and load each model directory automatically.',
    configured: 'Configured',
    unconfigured: 'Not configured',
    loading: 'Loading…',
    secureStorage: 'The key is kept in the Harness credential store. A saved value is never revealed in the web UI.',
    configuredHint: 'Enter and save a new key to replace the current one.',
    unconfiguredHint: 'Once configured, session images can be delegated to the configured vision service.',
    replacePlaceholder: 'Vision API key',
    replaceKey: 'Replace API key',
    saveKey: 'Save API key',
    updated: 'API key updated.',
    removeKey: 'Remove key',
    removeConfirm: 'Remove this key? The setup prompt will appear again the next time you select a Vision Bridge model.',
    cancel: 'Cancel',
    confirmRemove: 'Confirm removal',
    removing: 'Removing…',
    removed: 'API key removed.',
    currentKey: 'Current key',
    maskUnavailable: 'Configured (masked identifier unavailable)',
    baseURLLabel: 'Base URL',
    baseURLPlaceholder: 'https://api.example.com/v1',
    modelLabel: 'Vision model',
    modelPlaceholder: 'For example, gemini-2.5-flash',
    apiFormatLabel: 'API format',
    apiFormatAuto: 'Auto detect',
    apiFormatGemini: 'Gemini native',
    apiFormatOpenAI: 'OpenAI compatible',
    apiFormatAnthropic: 'Anthropic compatible',
    detectedFormat: 'Currently detected as',
    baseURLRequired: 'Enter a Base URL.',
    baseURLInvalid: 'Base URL must be an HTTPS URL without credentials, a query, or a fragment.',
    modelRequired: 'Enter a vision model name.',
    saveSettings: 'Save settings',
    settingsUpdated: 'Vision service settings updated.',
    keepCurrentKey: 'Leave blank to keep the current key',
    providerLabel: 'Vision provider',
    addProvider: 'Add provider',
    providerName: 'Provider name',
    providerNamePlaceholder: 'For example, Team relay',
    noProviders: 'No providers yet. Add one to continue.',
    deleteProvider: 'Delete provider',
    modelsLoading: 'Loading models from this provider…',
    modelsFailed: 'Could not load the model list.',
    noModels: 'This provider returned no usable models.',
    addingProvider: 'Verify and add…',
    providerAdded: 'Provider added and selected.',
    providerDeleted: 'Provider deleted.',
    chooseModel: 'Choose a vision model',
  },
}

const STYLES = `
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
`

const MODEL_SELECT_STYLES = `
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
`

export interface BridgeDisplayModel extends ModelCatalogModelView {
  bridgeModel?: ModelCatalogModelView
  nativeVision?: NativeVisionCapability
  bridgeEnabled?: boolean
}

export interface BridgeDisplayGroup extends Omit<ModelProviderGroupView, 'models'> {
  models: BridgeDisplayModel[]
}

/** Hide the shared bridge group and decorate every matching upstream model row instead. */
export function foldBridgeModelGroups(
  groups: readonly ModelProviderGroupView[],
  routing: VisionBridgeRoutingView | undefined,
): BridgeDisplayGroup[] {
  if (routing === undefined) return groups.map(group => ({ ...group, models: [...group.models] }))
  const bridgeModels = new Map(
    groups.find(group => group.id === routing.bridgeProvider)?.models.map(model => [model.id, model]) ?? [],
  )
  const routes = new Map(routing.routes.map(route => [route.upstreamProvider, route]))
  return groups
    .filter(group => group.id !== routing.bridgeProvider)
    .map(group => ({
      ...group,
      models: group.models.map(model => {
        const route = routes.get(group.id)
        if (route === undefined) return { ...model }
        const routingModel = route.models.find(item => item.id === model.id)
        const bridgeModel = routingModel === undefined ? undefined : bridgeModels.get(routingModel.bridgeModelId)
        return {
          ...model,
          ...(bridgeModel === undefined ? {} : { bridgeModel }),
          nativeVision: routingModel?.nativeVision ?? 'unknown',
          bridgeEnabled: routingModel?.bridgeEnabled ?? false,
        }
      }),
    }))
}

/** Resolve a model-name click through its persisted glasses preference. */
export function providerForModelPreference(
  groupProvider: string,
  model: BridgeDisplayModel,
  routing: VisionBridgeRoutingView | undefined,
): string {
  return routing !== undefined && routing.routes.some(route => route.upstreamProvider === groupProvider)
    && model.bridgeModel !== undefined && model.nativeVision !== 'native' && model.bridgeEnabled === true
    ? routing.bridgeProvider
    : groupProvider
}

interface LogicalModelSelection {
  provider?: string
  model?: string
  bridge: boolean
}

/** Project an opaque bridge selection back onto the provider/model row shown to the user. */
export function logicalModelSelection(
  selection: ModelDirectorySnapshot['current'],
  routing: VisionBridgeRoutingView | undefined,
): LogicalModelSelection {
  if (selection === null) return { bridge: false }
  if (routing === undefined || selection.provider !== routing.bridgeProvider) {
    return { provider: selection.provider, model: selection.model, bridge: false }
  }
  for (const route of routing.routes) {
    const model = route.models.find(item => item.bridgeModelId === selection.model)
    if (model !== undefined) return { provider: route.upstreamProvider, model: model.id, bridge: true }
  }
  return { bridge: true }
}

function GlassesIcon(): ReactNode {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.15 7.45 3.1 4.7M15.85 7.45 14.9 4.7M7.15 8.1c.55-.35 3.15-.35 3.7 0" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    <circle cx="5.05" cy="9.55" r="2.65" stroke="currentColor" strokeWidth="1.45" />
    <circle cx="12.95" cy="9.55" r="2.65" stroke="currentColor" strokeWidth="1.45" />
  </svg>
}

function CheckIcon(): ReactNode {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="m3.25 8.2 3 3 6.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

interface VisionModelSelectProps {
  locked: boolean
  available: boolean
  directory: ObservableSnapshot<ModelDirectorySnapshot>
  load: () => void
  select: (selection: ModelSelectionView) => Promise<boolean>
  rpc: ConnectionHandle['rpc']
}

function modelCopy(): {
  select: string
  model: string
  loading: string
  empty: string
  effort: string
  providerDefault: string
  bridgeOn: string
  bridgeOff: string
  unknownVision: string
  visionService: (provider: string, model: string) => string
} {
  const zh = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
  return zh
    ? {
        select: '选择模型', model: '模型', loading: '正在刷新模型列表…', empty: '没有可用模型。', effort: '推理强度',
        providerDefault: '供应商默认', bridgeOn: '关闭视觉桥接', bridgeOff: '开启视觉桥接',
        unknownVision: '图片能力未知；点击后使用视觉桥接',
        visionService: (provider, model) => `视觉识别：${provider} · ${model}`,
      }
    : {
        select: 'Select model', model: 'Model', loading: 'Refreshing model list…', empty: 'No models available.',
        effort: 'Reasoning effort', providerDefault: 'Provider default', bridgeOn: 'Disable Vision Bridge',
        bridgeOff: 'Enable Vision Bridge', unknownVision: 'Image support unknown; click to use Vision Bridge',
        visionService: (provider, model) => `Vision service: ${provider} · ${model}`,
      }
}

async function readBridgeRouting(rpc: ConnectionHandle['rpc']): Promise<VisionBridgeRoutingView> {
  const response = await rpc.call(CONFIGURATION_CHANNEL, CONFIGURATION_ROUTING_ENDPOINT, {})
  if (!response.ok) throw new Error(response.error.message)
  const routing = parseBridgeRoutingView(response.value)
  if (routing === undefined) throw new Error('Vision Bridge returned invalid routing metadata.')
  return routing
}

const BRIDGE_PREFERENCE_STORAGE_PREFIX = 'dsh-vision-bridge.bridge-models.v1:'

/** Overlay browser-local glasses preferences without touching the Host model configuration. */
export function withBridgePreferences(
  routing: VisionBridgeRoutingView,
  upstreamProvider: string,
  enabledModels: readonly string[],
): VisionBridgeRoutingView {
  const enabled = new Set(enabledModels)
  return {
    ...routing,
    routes: routing.routes.map(route => route.upstreamProvider === upstreamProvider
      ? { ...route, models: route.models.map(model => ({ ...model, bridgeEnabled: enabled.has(model.id) })) }
      : route),
  }
}

function preferenceStorageKey(upstreamProvider: string): string {
  return `${BRIDGE_PREFERENCE_STORAGE_PREFIX}${upstreamProvider}`
}

function readBridgePreferences(routing: VisionBridgeRoutingView): VisionBridgeRoutingView {
  let next = routing
  for (const route of routing.routes) {
    try {
      const raw = window.localStorage.getItem(preferenceStorageKey(route.upstreamProvider))
      if (raw === null) continue
      const value: unknown = JSON.parse(raw)
      if (!Array.isArray(value) || value.length > 1_000
        || value.some(model => typeof model !== 'string' || model.length === 0 || model.length > 300)) continue
      next = withBridgePreferences(next, route.upstreamProvider, value as string[])
    } catch {
      // Keep this provider's server preference when browser storage is unavailable.
    }
  }
  return next
}

function writeBridgePreferences(routing: VisionBridgeRoutingView, upstreamProvider: string): void {
  try {
    const route = routing.routes.find(item => item.upstreamProvider === upstreamProvider)
    if (route === undefined) return
    const enabledModels = route.models.filter(model => model.bridgeEnabled).map(model => model.id)
    window.localStorage.setItem(preferenceStorageKey(upstreamProvider), JSON.stringify(enabledModels))
  } catch {
    // Keep the in-memory preference when browser storage is unavailable.
  }
}

/** Composer selector that folds the bridge catalog into a glasses toggle on each upstream row. */
export function VisionBridgeModelSelect({
  locked,
  available,
  directory,
  load,
  select,
  rpc,
}: VisionModelSelectProps): ReactNode {
  const state = useSyncExternalStore(
    listener => directory.subscribe(listener),
    () => directory.getSnapshot(),
  )
  const [routing, setRouting] = useState<VisionBridgeRoutingView>()
  const [routingGeneration, setRoutingGeneration] = useState(0)
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<'root' | 'model' | 'effort'>('root')
  const [localError, setLocalError] = useState<string>()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const copy = modelCopy()
  const groups = useMemo(() => foldBridgeModelGroups(state.groups ?? [], routing), [routing, state.groups])
  const logicalCurrent = logicalModelSelection(state.current, routing)
  const currentIsBridge = logicalCurrent.bridge
  const logicalCurrentProvider = logicalCurrent.provider
  const currentGroup = groups.find(group => group.id === logicalCurrentProvider)
  const currentModel = currentGroup?.models.find(model => model.id === logicalCurrent.model)
  const currentReasoning = currentIsBridge ? currentModel?.bridgeModel?.reasoning : currentModel?.reasoning
  const effectiveEffort = state.current?.reasoningEffort ?? currentReasoning?.defaultEffort
  const effortLabel = effectiveEffort === undefined
    ? undefined
    : currentReasoning?.efforts.find(effort => effort.id === effectiveEffort)?.name ?? effectiveEffort
  const busy = state.status === 'selecting'
  const visionServiceTitle = routing?.visionProvider === undefined
    ? undefined
    : copy.visionService(routing.visionProvider.name, routing.visionProvider.model)
  const visionActionTitle = (action: string): string => visionServiceTitle === undefined
    ? action
    : `${visionServiceTitle}；${action}`

  useEffect(() => {
    if (!available) return
    load()
  }, [available, load])

  useEffect(() => {
    if (!available) return
    let active = true
    void readBridgeRouting(rpc).then(
      value => { if (active) setRouting(readBridgePreferences(value)) },
      error => { if (active) setLocalError(error instanceof Error ? error.message : String(error)) },
    )
    return () => { active = false }
  }, [available, routingGeneration, rpc])

  useEffect(() => {
    const refresh = (): void => { setRoutingGeneration(value => value + 1) }
    window.addEventListener(VISION_PROVIDER_CHANGED_EVENT, refresh)
    return () => { window.removeEventListener(VISION_PROVIDER_CHANGED_EVENT, refresh) }
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false)
        setPane('root')
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('mousedown', closeOutside) }
  }, [open])

  if (!available) return null

  const choose = async (selection: ModelSelectionView): Promise<boolean> => {
    setLocalError(undefined)
    const accepted = await select(selection)
    if (accepted) {
      setOpen(false)
      setPane('root')
      queueMicrotask(() => { triggerRef.current?.focus() })
      return true
    }
    setLocalError(directory.getSnapshot().error ?? 'Could not select this model.')
    return false
  }

  const selectionFor = (
    groupProvider: string,
    provider: string,
    model: BridgeDisplayModel,
    reasoning = model.reasoning,
  ): ModelSelectionView => {
    const sameLogicalModel = logicalCurrentProvider === groupProvider && logicalCurrent.model === model.id
    const reasoningEffort = sameLogicalModel
      ? state.current?.reasoningEffort
      : reasoning?.defaultEffort
    return {
      provider,
      model: provider === routing?.bridgeProvider ? model.bridgeModel?.id ?? model.id : model.id,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      if (pane !== 'root') setPane('root')
      else {
        setOpen(false)
        triggerRef.current?.focus()
      }
      return
    }
    if (!open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    const items = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    if (items.length < 2) return
    event.preventDefault()
    const offset = event.key === 'ArrowDown' ? 1 : -1
    items[(Math.max(current, 0) + offset + items.length) % items.length]?.focus()
  }

  const triggerLabel = currentModel?.name ?? copy.select
  return <div className="dsh-vb-model-root" ref={rootRef} onKeyDown={onKeyDown}>
    <style>{MODEL_SELECT_STYLES}</style>
    <button ref={triggerRef} type="button" className="dsh-vb-model-trigger" disabled={locked}
      aria-label={`${copy.select}: ${triggerLabel}`} aria-haspopup="menu" aria-expanded={open}
      title={triggerLabel} onClick={() => {
        if (!open) setRoutingGeneration(value => value + 1)
        setOpen(value => {
          if (!value) setPane('root')
          return !value
        })
        load()
      }}>
      <span className="dsh-vb-model-trigger-label">{triggerLabel}</span>
      {currentIsBridge
        ? <span className="dsh-vb-model-trigger-glasses" title={visionServiceTitle ?? copy.bridgeOn}><GlassesIcon /></span>
        : null}
      {effortLabel !== undefined
        ? <span className="dsh-vb-model-trigger-effort">{effortLabel}</span>
        : null}
      <svg className="dsh-vb-model-chevron" data-open={open} viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="m3.25 5.25 3.75 3.5 3.75-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    {open ? <div className="dsh-vb-model-menu" role="menu" aria-label={copy.select}
      aria-busy={state.status === 'loading' || busy}>
      {localError !== undefined || state.error != null
        ? <div className="dsh-vb-model-error" role="status">{localError ?? state.error}</div>
        : null}
      {pane === 'root' ? <>
        <button type="button" role="menuitem" className="dsh-vb-model-cell" onClick={() => { setPane('model') }}>
          <span className="dsh-vb-model-cell-label">{copy.model}</span>
          <span className="dsh-vb-model-cell-value">{triggerLabel}</span>
          {currentModel?.bridgeModel !== undefined && currentModel.nativeVision !== 'native' ? (
            <span
              className="dsh-vb-model-cell-glasses"
              data-active={currentModel.bridgeEnabled === true}
              title={visionServiceTitle ?? (currentModel.bridgeEnabled === true ? copy.bridgeOn : copy.bridgeOff)}
            >
              <GlassesIcon />
            </span>
          ) : null}
          <svg className="dsh-vb-model-cell-chevron" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="m5.25 3.25 3.5 3.75-3.5 3.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {currentReasoning !== undefined ? <button type="button" role="menuitem" className="dsh-vb-model-cell"
          onClick={() => { setPane('effort') }}>
          <span className="dsh-vb-model-cell-label">{copy.effort}</span>
          <span className="dsh-vb-model-cell-value">{effortLabel ?? copy.providerDefault}</span>
          <svg className="dsh-vb-model-cell-chevron" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="m5.25 3.25 3.5 3.75-3.5 3.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button> : null}
      </> : null}
      {pane === 'model' ? <>
        {state.status === 'loading' ? <div className="dsh-vb-directory-status">{copy.loading}</div> : null}
        <div className="dsh-vb-model-scroll">
          {groups.map(group => <section className="dsh-vb-model-group" key={group.id} role="group"
            aria-label={group.name}>
            <div className="dsh-vb-model-group-title">{group.name}</div>
            {group.models.map(model => {
              const selected = logicalCurrentProvider === group.id && logicalCurrent.model === model.id
              const bridgeAvailable = model.bridgeModel !== undefined && model.nativeVision !== 'native'
              const bridgeEnabled = bridgeAvailable && model.bridgeEnabled === true
              const glassesAction = bridgeEnabled
                ? copy.bridgeOn
                : model.nativeVision === 'unknown'
                ? copy.unknownVision
                : copy.bridgeOff
              const glassesTitle = visionActionTitle(glassesAction)
              return <div className="dsh-vb-model-option" key={model.id} data-selected={selected}>
                <button type="button" role="menuitemradio" aria-checked={selected}
                  className="dsh-vb-model-main" disabled={busy} title={model.name}
                  onClick={() => {
                    const provider = providerForModelPreference(group.id, model, routing)
                    const reasoning = bridgeEnabled ? model.bridgeModel?.reasoning : model.reasoning
                    void choose(selectionFor(group.id, provider, model, reasoning))
                  }}>
                  <span className="dsh-vb-model-copy">
                    <span className="dsh-vb-model-name">{model.name}</span>
                    {model.description !== undefined
                      ? <span className="dsh-vb-model-description">{model.description}</span>
                      : null}
                  </span>
                </button>
                {bridgeAvailable ? <button type="button" className="dsh-vb-vision-toggle"
                  data-active={bridgeEnabled} disabled={busy}
                  aria-label={`${model.name}: ${glassesTitle}`} aria-pressed={bridgeEnabled}
                  title={glassesTitle} onClick={(event) => {
                    event.stopPropagation()
                    if (routing === undefined || model.bridgeModel === undefined) return
                    const enabled = !bridgeEnabled
                    setLocalError(undefined)
                    const route = routing.routes.find(item => item.upstreamProvider === group.id)
                    if (route === undefined) return
                    const nextRouting = withBridgePreferences(routing, group.id, route.models
                      .filter(item => item.id === model.id ? enabled : item.bridgeEnabled)
                      .map(item => item.id))
                    setRouting(nextRouting)
                    writeBridgePreferences(nextRouting, group.id)
                  }}><GlassesIcon /></button> : null}
                <span className="dsh-vb-model-check">{selected ? <CheckIcon /> : null}</span>
              </div>
            })}
          </section>)}
          {state.status === 'ready' && groups.every(group => group.models.length === 0)
            ? <div className="dsh-vb-directory-status">{copy.empty}</div>
            : null}
        </div>
      </> : null}
      {pane === 'effort' && currentReasoning !== undefined ? <div className="dsh-vb-model-scroll">
        {currentReasoning.defaultEffort === undefined ? <div className="dsh-vb-model-option">
          <button type="button" role="menuitemradio" aria-checked={state.current?.reasoningEffort === undefined}
            className="dsh-vb-model-main" disabled={busy} onClick={() => {
              if (state.current !== null) void choose({ provider: state.current.provider, model: state.current.model })
            }}>
            <span className="dsh-vb-model-copy"><span className="dsh-vb-model-name">{copy.providerDefault}</span></span>
            <span className="dsh-vb-model-check">{state.current?.reasoningEffort === undefined ? <CheckIcon /> : null}</span>
          </button>
        </div> : null}
        {currentReasoning.efforts.map(effort => <div className="dsh-vb-model-option" key={effort.id}>
          <button type="button" role="menuitemradio" aria-checked={effectiveEffort === effort.id}
            className="dsh-vb-model-main" disabled={busy} title={effort.description} onClick={() => {
              if (state.current !== null) void choose({
                provider: state.current.provider,
                model: state.current.model,
                reasoningEffort: effort.id,
              })
            }}>
            <span className="dsh-vb-model-copy">
              <span className="dsh-vb-model-name">{effort.name}</span>
              {effort.description !== undefined
                ? <span className="dsh-vb-model-description">{effort.description}</span>
                : null}
            </span>
            <span className="dsh-vb-model-check">{effectiveEffort === effort.id ? <CheckIcon /> : null}</span>
          </button>
        </div>)}
      </div> : null}
    </div> : null}
  </div>
}

function copyForBrowser(): Copy {
  const language = document.documentElement.lang || navigator.language
  return language.toLowerCase().startsWith('zh') ? COPY.zh : COPY.en
}

/** Normalize one browser-entered key without ever logging or reflecting it. */
export function normalizeGoogleApiKey(raw: string): { value?: string; error?: 'required' | 'invalid' } {
  const value = raw.trim()
  if (value.length === 0) return { error: 'required' }
  if (!/^[\x21-\x7E]+$/.test(value)) return { error: 'invalid' }
  return { value }
}

type Phase = 'idle' | 'checking' | 'missing' | 'saving' | 'failed'

/** True when a bridge selection appears initially or changes from another selection. */
export function isVisionBridgeModelChange(
  previous: ModelDirectorySnapshot['current'],
  next: ModelDirectorySnapshot['current'],
  bridgeProvider = DEFAULT_BRIDGE_PROVIDER,
): boolean {
  if (next === null || next.provider !== bridgeProvider) return false
  return previous === null || previous.provider !== next.provider || previous.model !== next.model
}

/** Prompt after an initial or changed Vision Bridge selection when no provider exists. */
export function VisionBridgeRouteCredentialDialog(props: RoutePromptInjected): ReactNode {
  const { bridgeProvider, modelDirectories, rpc, sessions } = props
  const [phase, setPhase] = useState<Phase>('idle')
  const [name, setName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [apiFormat, setApiFormat] = useState<VisionApiFormat>('auto')
  const [key, setKey] = useState('')
  const [failure, setFailure] = useState<string>()
  const [request, setRequest] = useState(0)
  const titleId = useId()
  const nameId = useId()
  const baseURLId = useId()
  const apiFormatId = useId()
  const keyId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const copy = copyForBrowser()

  useEffect(() => {
    let activeSessionId: string | undefined
    let stopDirectory: (() => void) | undefined
    let retryTimer: number | undefined

    const followCurrentSession = (): void => {
      const sessionId = sessions.list.getSnapshot().current
      if (sessionId === activeSessionId && stopDirectory !== undefined) return
      stopDirectory?.()
      stopDirectory = undefined
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      retryTimer = undefined
      setPhase('idle')
      setFailure(undefined)
      if (sessionId === undefined) {
        activeSessionId = undefined
        return
      }

      let directory: ModelDirectoryHandle
      try {
        directory = modelDirectories.directoryFor(sessionId)
      } catch {
        activeSessionId = undefined
        retryTimer = window.setTimeout(followCurrentSession, 50)
        return
      }
      activeSessionId = sessionId
      let previous = directory.store.getSnapshot().current
      if (isVisionBridgeModelChange(null, previous, bridgeProvider)) {
        setRequest(value => value + 1)
      }
      stopDirectory = directory.store.subscribe(() => {
        const next = directory.store.getSnapshot().current
        const shouldPrompt = isVisionBridgeModelChange(previous, next, bridgeProvider)
        previous = next
        if (shouldPrompt) setRequest(value => value + 1)
        else if (next?.provider !== bridgeProvider) setPhase('idle')
      })
    }

    followCurrentSession()
    const stopSessions = sessions.list.subscribe(followCurrentSession)
    return () => {
      stopSessions()
      stopDirectory?.()
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [bridgeProvider, modelDirectories, sessions])

  useEffect(() => {
    if (request === 0) return
    let active = true
    setPhase('checking')
    setFailure(undefined)
    void readConfiguration(rpc).then(
      (configuration) => {
        if (!active) return
        const sessionId = sessions.list.getSnapshot().current
        if (sessionId === undefined) {
          setPhase('idle')
          return
        }
        try {
          if (modelDirectories.directoryFor(sessionId).store.getSnapshot().current?.provider !== bridgeProvider) {
            setPhase('idle')
            return
          }
        } catch {
          setPhase('idle')
          return
        }
        if (configuration.providers.length > 0) {
          setPhase('idle')
          return
        }
        setPhase('missing')
      },
      (error: unknown) => {
        if (!active) return
        setFailure(error instanceof Error ? error.message : String(error))
        setPhase('failed')
      },
    )
    return () => { active = false }
  }, [bridgeProvider, modelDirectories, request, rpc, sessions])

  useEffect(() => {
    if (phase !== 'missing') return
    inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase === 'idle' || phase === 'checking') return
    const root = document.getElementById('root')
    if (root === null) return
    const previous = root.inert
    root.inert = true
    return () => { root.inert = previous }
  }, [phase])

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (name.trim().length === 0) {
      setFailure(copy.providerName)
      return
    }
    const normalized = normalizeGoogleApiKey(key)
    if (normalized.error !== undefined) {
      setFailure(normalized.error === 'required' ? copy.keyRequired : copy.keyInvalid)
      return
    }
    setPhase('saving')
    setFailure(undefined)
    try {
      await configurationMutation(rpc, CONFIGURATION_ADD_ENDPOINT, {
        name,
        apiFormat,
        baseURL,
        apiKey: normalized.value!,
      })
      setName('')
      setBaseURL('')
      setApiFormat('auto')
      setKey('')
      setPhase('idle')
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
      setPhase('missing')
    }
  }

  const dismiss = (): void => {
    setPhase('idle')
    setFailure(undefined)
  }

  if (phase === 'idle' || phase === 'checking') return null

  const message = phase === 'failed'
    ? `${copy.loadFailed}${failure === undefined ? '' : ` ${failure}`}`
    : failure

  return createPortal(
    <div className="dsh-vb-overlay" role="presentation">
      <style>{STYLES}</style>
      <section
        className="dsh-vb-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 className="dsh-vb-title" id={titleId}>{copy.title}</h2>
        <p className="dsh-vb-description">{copy.description}</p>
        <form onSubmit={(event) => { void save(event) }}>
          {phase === 'missing' || phase === 'saving'
            ? <>
                <div className="dsh-vb-dialog-field">
                  <label className="dsh-vb-label" htmlFor={nameId}>{copy.providerName}</label>
                  <input key={request} ref={inputRef} className="dsh-vb-input" id={nameId}
                    value={name} placeholder={copy.providerNamePlaceholder} disabled={phase === 'saving'}
                    onChange={(event) => { setName(event.target.value); setFailure(undefined) }} />
                </div>
                <div className="dsh-vb-dialog-field">
                  <label className="dsh-vb-label" htmlFor={baseURLId}>{copy.baseURLLabel}</label>
                  <input className="dsh-vb-input" id={baseURLId} type="url" inputMode="url"
                    spellCheck={false} value={baseURL} placeholder={copy.baseURLPlaceholder}
                    disabled={phase === 'saving'} onChange={(event) => { setBaseURL(event.target.value); setFailure(undefined) }} />
                </div>
                <div className="dsh-vb-dialog-grid">
                  <div className="dsh-vb-dialog-field">
                    <label className="dsh-vb-label" htmlFor={apiFormatId}>{copy.apiFormatLabel}</label>
                    <select className="dsh-vb-input" id={apiFormatId} value={apiFormat} disabled={phase === 'saving'}
                      onChange={(event) => { setApiFormat(event.target.value as VisionApiFormat) }}>
                      <option value="auto">{copy.apiFormatAuto}</option>
                      <option value="openai-compatible">{copy.apiFormatOpenAI}</option>
                      <option value="gemini-native">{copy.apiFormatGemini}</option>
                      <option value="anthropic-compatible">{copy.apiFormatAnthropic}</option>
                    </select>
                  </div>
                  <div className="dsh-vb-dialog-field">
                    <label className="dsh-vb-label" htmlFor={keyId}>{copy.keyLabel}</label>
                    <input className="dsh-vb-input" id={keyId} type="password" autoComplete="new-password"
                      data-1p-ignore="true" data-bwignore="true" data-lpignore="true" spellCheck={false}
                      value={key} placeholder={copy.keyPlaceholder} aria-invalid={failure !== undefined}
                      disabled={phase === 'saving'} onChange={(event) => { setKey(event.target.value); setFailure(undefined) }} />
                  </div>
                </div>
                <p className="dsh-vb-description" style={{ margin: '12px 0 0' }}>{copy.secureStorage}</p>
              </>
            : null}
          <p className="dsh-vb-status" role="status">{message ?? ''}</p>
          <div className="dsh-vb-actions">
            <button className="dsh-vb-button dsh-vb-secondary" type="button" onClick={dismiss}>
              {copy.later}
            </button>
            {phase === 'failed'
              ? <button
                  className="dsh-vb-button dsh-vb-primary"
                  type="button"
                  onClick={() => { setRequest(value => value + 1) }}
                >
                  {copy.retry}
                </button>
              : <button className="dsh-vb-button dsh-vb-primary" type="submit" disabled={phase === 'saving'}>
                  {phase === 'saving' ? copy.saving : copy.save}
                </button>}
          </div>
        </form>
      </section>
    </div>,
    document.body,
  )
}

type CardPhase = 'loading' | 'ready' | 'failed'
type CardBusy = 'adding' | 'selecting' | 'deleting' | 'model'

async function readConfiguration(rpc: ConnectionHandle['rpc']): Promise<VisionConfigurationView> {
  const response = await rpc.call(CONFIGURATION_CHANNEL, CONFIGURATION_GET_ENDPOINT, {})
  if (!response.ok) throw new Error(response.error.message)
  const view = parseConfigurationView(response.value)
  if (view === undefined) throw new Error('Vision Bridge returned an invalid provider directory.')
  return view
}

async function configurationMutation(
  rpc: ConnectionHandle['rpc'],
  endpoint: string,
  payload: unknown,
): Promise<VisionConfigurationView> {
  const response = await rpc.call(CONFIGURATION_CHANNEL, endpoint, payload)
  if (!response.ok) throw new Error(response.error.message)
  const view = parseConfigurationView(response.value)
  if (view === undefined) throw new Error('Vision Bridge returned an invalid provider directory.')
  window.dispatchEvent(new Event(VISION_PROVIDER_CHANGED_EVENT))
  return view
}

/** Multi-provider controls rendered in Settings > Plugins. */
export function VisionBridgeCredentialCard({ rpc }: CredentialCardProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<CardPhase>('loading')
  const [busy, setBusy] = useState<CardBusy>()
  const [configuration, setConfiguration] = useState<VisionConfigurationView>({ activeProviderId: '', providers: [] })
  const [providerMenuOpen, setProviderMenuOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [apiFormat, setApiFormat] = useState<VisionApiFormat>('auto')
  const [key, setKey] = useState('')
  const [models, setModels] = useState<VisionModelOptionView[]>([])
  const [modelsProviderId, setModelsProviderId] = useState<string>()
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsFailure, setModelsFailure] = useState<string>()
  const [modelGeneration, setModelGeneration] = useState(0)
  const [failure, setFailure] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [generation, setGeneration] = useState(0)
  const modelId = useId()
  const nameId = useId()
  const baseURLId = useId()
  const apiFormatId = useId()
  const inputId = useId()
  const copy = copyForBrowser()
  const activeProvider = configuration.providers.find(item => item.id === configuration.activeProviderId)

  useEffect(() => {
    let active = true
    setPhase('loading')
    setFailure(undefined)
    void readConfiguration(rpc).then(
      (view) => {
        if (!active) return
        setConfiguration(view)
        setPhase('ready')
      },
      (error: unknown) => {
        if (!active) return
        setFailure(error instanceof Error ? error.message : String(error))
        setPhase('failed')
      },
    )
    return () => { active = false }
  }, [generation, rpc])

  useEffect(() => {
    if (!open || phase !== 'ready' || activeProvider === undefined) {
      setModels([])
      setModelsProviderId(undefined)
      setModelsFailure(undefined)
      return
    }
    let active = true
    setModels([])
    setModelsProviderId(undefined)
    setModelsLoading(true)
    setModelsFailure(undefined)
    void rpc.call(CONFIGURATION_CHANNEL, CONFIGURATION_MODELS_ENDPOINT, {
      providerId: activeProvider.id,
    }).then(
      (response) => {
        if (!active) return
        if (!response.ok) throw new Error(response.error.message)
        const view = parseModelsView(response.value)
        if (view === undefined) throw new Error(copy.modelsFailed)
        setModels(view.models)
        setModelsProviderId(activeProvider.id)
      },
      (error: unknown) => {
        if (active) setModelsFailure(error instanceof Error ? error.message : String(error))
      },
    ).catch((error: unknown) => {
      if (active) setModelsFailure(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (active) setModelsLoading(false)
    })
    return () => { active = false }
  }, [activeProvider?.id, copy.modelsFailed, modelGeneration, open, phase, rpc])

  const selectProvider = async (providerId: string): Promise<void> => {
    setBusy('selecting')
    setFailure(undefined)
    setNotice(undefined)
    setProviderMenuOpen(false)
    try {
      setConfiguration(await configurationMutation(rpc, CONFIGURATION_SELECT_ENDPOINT, { providerId }))
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(undefined)
    }
  }

  const deleteProvider = async (providerId: string): Promise<void> => {
    setBusy('deleting')
    setFailure(undefined)
    setNotice(undefined)
    try {
      setConfiguration(await configurationMutation(rpc, CONFIGURATION_DELETE_ENDPOINT, { providerId }))
      setProviderMenuOpen(false)
      setNotice(copy.providerDeleted)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(undefined)
    }
  }

  const addProvider = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const normalizedKey = normalizeGoogleApiKey(key)
    if (name.trim().length === 0) {
      setFailure(copy.providerName)
      return
    }
    if (normalizedKey.value === undefined) {
      setFailure(normalizedKey.error === 'invalid' ? copy.keyInvalid : copy.keyRequired)
      return
    }
    setBusy('adding')
    setFailure(undefined)
    setNotice(undefined)
    try {
      const next = await configurationMutation(rpc, CONFIGURATION_ADD_ENDPOINT, {
        name,
        apiFormat,
        baseURL,
        apiKey: normalizedKey.value,
      })
      setConfiguration(next)
      setName('')
      setBaseURL('')
      setApiFormat('auto')
      setKey('')
      setAdding(false)
      setNotice(copy.providerAdded)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(undefined)
    }
  }

  const setModel = async (model: string): Promise<void> => {
    if (activeProvider === undefined) return
    setBusy('model')
    setFailure(undefined)
    setNotice(undefined)
    try {
      setConfiguration(await configurationMutation(rpc, CONFIGURATION_SET_MODEL_ENDPOINT, {
        providerId: activeProvider.id,
        model,
      }))
      setNotice(copy.settingsUpdated)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(undefined)
    }
  }

  const status = phase === 'loading'
    ? copy.loading
    : phase === 'failed'
      ? copy.loadFailed
      : activeProvider?.configured === true
        ? copy.configured
        : copy.unconfigured
  const directoryModels = activeProvider?.id === modelsProviderId ? models : []
  const modelOptions = activeProvider !== undefined && activeProvider.model.length > 0
    && !directoryModels.some(item => item.id === activeProvider.model)
    ? [{ id: activeProvider.model, name: activeProvider.model }, ...directoryModels]
    : directoryModels

  return (
    <li className="dsh-vb-card" data-open={open}>
      <style>{STYLES}</style>
      <button type="button" className="dsh-vb-card-header" aria-expanded={open}
        aria-label={`${copy.cardTitle}: ${status}`} onClick={() => { setOpen(value => !value) }}>
        <span className="dsh-vb-card-head-text">
          <span className="dsh-vb-card-name">{copy.cardTitle}</span>
          <span className="dsh-vb-card-description">{copy.cardDescription}</span>
        </span>
        <span className="dsh-vb-card-state" data-configured={activeProvider?.configured === true}>
          <span className="dsh-vb-card-dot" aria-hidden="true" />{status}
        </span>
        <svg className="dsh-vb-chevron" data-open={open} viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="m3.25 5.25 3.75 3.5 3.75-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="dsh-vb-card-body">
        {phase === 'failed' ? <>
          <p className="dsh-vb-card-message" data-tone="error" role="status">{copy.loadFailed} {failure}</p>
          <div className="dsh-vb-card-footer"><button type="button" className="dsh-vb-card-button dsh-vb-card-button-primary"
            onClick={() => { setGeneration(value => value + 1) }}>{copy.retry}</button></div>
        </> : <>
          <div className="dsh-vb-card-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="dsh-vb-card-field-label" style={{ margin: 0 }}>{copy.providerLabel}</span>
              <button type="button" className="dsh-vb-card-button" disabled={busy !== undefined}
                onClick={() => { setAdding(value => !value); setProviderMenuOpen(false); setFailure(undefined) }}>
                ＋ {copy.addProvider}
              </button>
            </div>
            {configuration.providers.length === 0
              ? <p className="dsh-vb-card-hint">{copy.noProviders}</p>
              : <div className="dsh-vb-provider-picker">
                  <button type="button" className="dsh-vb-provider-trigger" disabled={busy !== undefined}
                    aria-haspopup="listbox" aria-expanded={providerMenuOpen}
                    onClick={() => { setProviderMenuOpen(value => !value) }}>
                    <span className="dsh-vb-provider-trigger-text">
                      <span className="dsh-vb-provider-name">{activeProvider?.name}</span>
                      <span className="dsh-vb-provider-key">{activeProvider?.maskedApiKey ?? copy.maskUnavailable}</span>
                    </span>
                    <span aria-hidden="true">⌄</span>
                  </button>
                  {providerMenuOpen ? <div className="dsh-vb-provider-menu" role="listbox">
                    {configuration.providers.map(provider => <div key={provider.id} className="dsh-vb-provider-option"
                      data-active={provider.id === configuration.activeProviderId}>
                      <button type="button" role="option" aria-selected={provider.id === configuration.activeProviderId}
                        className="dsh-vb-provider-option-main" onClick={() => { void selectProvider(provider.id) }}>
                        <span className="dsh-vb-provider-trigger-text">
                          <span className="dsh-vb-provider-name">{provider.name}</span>
                          <span className="dsh-vb-provider-key">{provider.maskedApiKey ?? copy.maskUnavailable}</span>
                        </span>
                      </button>
                      <button type="button" className="dsh-vb-provider-delete" title={copy.deleteProvider}
                        aria-label={`${copy.deleteProvider}: ${provider.name}`} onClick={() => { void deleteProvider(provider.id) }}>
                        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3.5 4.5h9M6.25 2.75h3.5l.5 1.75h-4.5l.5-1.75ZM5 6.25l.35 6.25h5.3L11 6.25M7 6.75v4M9 6.75v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>)}
                  </div> : null}
                </div>}
          </div>

          {adding ? <form className="dsh-vb-add-panel" onSubmit={(event) => { void addProvider(event) }}>
            <div className="dsh-vb-card-field" style={{ marginTop: 0 }}>
              <label className="dsh-vb-card-field-label" htmlFor={nameId}>{copy.providerName}</label>
              <input id={nameId} className="dsh-vb-card-input" value={name} placeholder={copy.providerNamePlaceholder}
                disabled={busy !== undefined} onChange={(event) => { setName(event.target.value); setFailure(undefined) }} />
            </div>
            <div className="dsh-vb-card-field">
              <label className="dsh-vb-card-field-label" htmlFor={baseURLId}>{copy.baseURLLabel}</label>
              <input id={baseURLId} className="dsh-vb-card-input" type="url" inputMode="url" spellCheck={false}
                value={baseURL} placeholder={copy.baseURLPlaceholder} disabled={busy !== undefined}
                onChange={(event) => { setBaseURL(event.target.value); setFailure(undefined) }} />
            </div>
            <div className="dsh-vb-card-grid">
              <div className="dsh-vb-card-field">
                <label className="dsh-vb-card-field-label" htmlFor={apiFormatId}>{copy.apiFormatLabel}</label>
                <select id={apiFormatId} className="dsh-vb-card-select" value={apiFormat} disabled={busy !== undefined}
                  onChange={(event) => { setApiFormat(event.target.value as VisionApiFormat) }}>
                  <option value="auto">{copy.apiFormatAuto}</option>
                  <option value="openai-compatible">{copy.apiFormatOpenAI}</option>
                  <option value="gemini-native">{copy.apiFormatGemini}</option>
                  <option value="anthropic-compatible">{copy.apiFormatAnthropic}</option>
                </select>
              </div>
              <div className="dsh-vb-card-field">
                <label className="dsh-vb-card-field-label" htmlFor={inputId}>{copy.keyLabel}</label>
                <input id={inputId} className="dsh-vb-card-input" type="password" autoComplete="new-password"
                  spellCheck={false} value={key} placeholder={copy.keyPlaceholder} disabled={busy !== undefined}
                  onChange={(event) => { setKey(event.target.value); setFailure(undefined) }} />
              </div>
            </div>
            <p className="dsh-vb-card-hint">{copy.secureStorage}</p>
            <div className="dsh-vb-inline-actions">
              <button type="button" className="dsh-vb-card-button dsh-vb-card-button-secondary" disabled={busy !== undefined}
                onClick={() => { setAdding(false); setFailure(undefined) }}>{copy.cancel}</button>
              <button type="submit" className="dsh-vb-card-button dsh-vb-card-button-primary" disabled={busy !== undefined}>
                {busy === 'adding' ? copy.addingProvider : copy.addProvider}
              </button>
            </div>
          </form> : null}

          {activeProvider !== undefined ? <>
            <div className="dsh-vb-provider-meta"><span>{activeProvider.baseURL}</span><span>·</span>
              <span>{activeProvider.resolvedApiFormat === 'gemini-native' ? copy.apiFormatGemini
                : activeProvider.resolvedApiFormat === 'anthropic-compatible' ? copy.apiFormatAnthropic : copy.apiFormatOpenAI}</span></div>
            <div className="dsh-vb-card-field">
              <label className="dsh-vb-card-field-label" htmlFor={modelId}>{copy.chooseModel}</label>
              <select id={modelId} className="dsh-vb-card-select" value={activeProvider.model}
                disabled={busy !== undefined || modelsLoading || modelOptions.length === 0}
                onChange={(event) => { void setModel(event.target.value) }}>
                {modelOptions.map(option => <option key={option.id} value={option.id}>
                  {option.name === option.id ? option.id : `${option.name} · ${option.id}`}
                </option>)}
              </select>
              <div className="dsh-vb-model-status">
                <p className="dsh-vb-card-hint">{modelsLoading ? copy.modelsLoading
                  : modelsFailure !== undefined ? `${copy.modelsFailed} ${modelsFailure}`
                    : modelOptions.length === 0 ? copy.noModels : `${modelOptions.length} models`}</p>
                {modelsFailure !== undefined ? <button type="button" className="dsh-vb-card-button"
                  onClick={() => { setModelGeneration(value => value + 1) }}>{copy.retry}</button> : null}
              </div>
            </div>
          </> : null}
          <p className="dsh-vb-card-message" data-tone={failure === undefined ? (notice === undefined ? undefined : 'success') : 'error'}
            role="status">{failure ?? notice ?? ''}</p>
        </>}
      </div> : null}
    </li>
  )
}

/** Required Cordis client services. */
export const inject = ['slots', 'connection', 'sessions', 'modelDirectories']

/** Register route-aware credential prompting and persistent settings controls. */
export function apply(ctx: Context): void {
  const client = ctx as unknown as ClientContext
  const services = ctx as unknown as { get(name: string): unknown }
  const connection = services.get('connection') as ConnectionHandle
  const sessions = services.get('sessions') as SessionsHandle
  const modelDirectories = services.get('modelDirectories') as ModelDirectoriesHandle
  client.slots.inject('conversation.input.model', () => client.slots.register({
    name: 'conversation.input.model',
    priority: -10,
    inject: (sessionId: string): Omit<VisionModelSelectProps, 'locked'> => {
      const directory = modelDirectories.directoryFor(sessionId)
      const available = sessions.subagentAddress?.(sessionId) === undefined
      return {
        available,
        directory: directory.store,
        load: () => { if (available) void directory.load().catch(() => {}) },
        select: selection => available
          ? directory.select(selection).then(() => true, () => false)
          : Promise.resolve(false),
        rpc: connection.rpc,
      }
    },
  }, VisionBridgeModelSelect))
  client.slots.inject('shell.overlay', () => client.slots.register({
      name: 'shell.overlay',
      id: 'vision-bridge-provider-setup',
      order: 10,
      inject: (): RoutePromptInjected => ({
        bridgeProvider: DEFAULT_BRIDGE_PROVIDER,
        modelDirectories,
        rpc: connection.rpc,
        sessions,
      }),
    }, VisionBridgeRouteCredentialDialog))
  client.slots.inject('settings.plugin.item', () => client.slots.register({
      name: 'settings.plugin.item',
      key: 'vision-bridge',
      order: 30,
      inject: (): CredentialCardProps => ({ rpc: connection.rpc }),
    }, VisionBridgeCredentialCard))
}
