/** Browser controls for the bridge-owned Google credential. */

import type { Context } from '@deepseek-ai/cordis'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CREDENTIAL_MASK_CHANNEL,
  CREDENTIAL_MASK_ENDPOINT,
  parseCredentialMaskView,
} from './credential-mask.ts'

/** Credential reference shared with the Host plugin's default configuration. */
export const DEFAULT_GOOGLE_CREDENTIAL_REF = 'GOOGLE_API_KEY'

/** Provider route contributed by the default Host plugin configuration. */
export const DEFAULT_BRIDGE_PROVIDER = 'deepseek-vision-bridge'

type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { message: string } }

interface CredentialView {
  configured: boolean
  writable: boolean
  source?: string
}

interface CredentialsApi {
  describe(payload: { refs: string[] }): Promise<{
    result: RpcResult<{ credentials: Record<string, CredentialView> }>
  }>
  set(payload: { ref: string; value: string }): Promise<{
    result: RpcResult<Record<string, never>>
  }>
  unset(payload: { ref: string }): Promise<{
    result: RpcResult<Record<string, never>>
  }>
}

interface ConnectionHandle {
  api: { credentials: CredentialsApi }
  rpc: {
    call(channel: string, endpoint: string, payload: unknown): Promise<RpcResult<unknown>>
  }
}

interface CredentialInjected {
  api: ConnectionHandle['api']
  credentialRef: string
  rpc: ConnectionHandle['rpc']
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
}

export interface ModelDirectorySnapshot {
  current: { provider: string; model: string } | null
}

interface ModelDirectoryHandle {
  store: ObservableSnapshot<ModelDirectorySnapshot>
}

interface ModelDirectoriesHandle {
  directoryFor(sessionId: string): ModelDirectoryHandle
}

interface RoutePromptInjected extends CredentialInjected {
  bridgeProvider: string
  modelDirectories: ModelDirectoriesHandle
  sessions: SessionsHandle
}

type CredentialCardProps = CredentialInjected

interface SlotRegistration<T> {
  name: string
  id: string
  order: number
  inject: () => T
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
}

const COPY: { zh: Copy; en: Copy } = {
  zh: {
    title: '配置图片理解 API Key',
    description: 'Vision Bridge 使用 Google Gemini 分析会话中的图片。API Key 会保存到 Harness 凭证库，不会写入聊天记录或插件配置。',
    keyLabel: 'Google API Key',
    keyPlaceholder: 'Google API Key',
    save: '保存并继续',
    saving: '正在保存…',
    later: '稍后配置',
    retry: '重试',
    keyRequired: '请输入 API Key。',
    keyInvalid: 'API Key 只能包含不带空格的可打印 ASCII 字符。',
    readOnly: '当前凭证来源不可由网页修改，请在启动环境中配置 GOOGLE_API_KEY。',
    loadFailed: '无法读取凭证状态。',
    cardTitle: '图片理解',
    cardDescription: '配置 Vision Bridge 使用的 Google Gemini API Key。',
    configured: '已配置',
    unconfigured: '未配置',
    loading: '读取中…',
    secureStorage: 'Key 保存在 Harness 凭证库中，已保存的值不会在网页上回显。',
    configuredHint: '输入新 Key 并保存，即可替换当前 Key。',
    unconfiguredHint: '输入 Key 后，会话中的图片将可以交给 Gemini 分析。',
    replacePlaceholder: 'Google API Key',
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
  },
  en: {
    title: 'Configure the vision API key',
    description: 'Vision Bridge uses Google Gemini to analyze images in the current session. The key is stored in the Harness credential store, never in chat history or plugin configuration.',
    keyLabel: 'Google API Key',
    keyPlaceholder: 'Google API Key',
    save: 'Save and continue',
    saving: 'Saving…',
    later: 'Configure later',
    retry: 'Retry',
    keyRequired: 'Enter an API key.',
    keyInvalid: 'The API key may contain printable ASCII characters without spaces only.',
    readOnly: 'This credential source cannot be changed from the web UI. Configure GOOGLE_API_KEY in the launch environment.',
    loadFailed: 'Could not read credential status.',
    cardTitle: 'Image understanding',
    cardDescription: 'Configure the Google Gemini API key used by Vision Bridge.',
    configured: 'Configured',
    unconfigured: 'Not configured',
    loading: 'Loading…',
    secureStorage: 'The key is kept in the Harness credential store. A saved value is never revealed in the web UI.',
    configuredHint: 'Enter and save a new key to replace the current one.',
    unconfiguredHint: 'Once configured, session images can be delegated to Gemini for analysis.',
    replacePlaceholder: 'Google API Key',
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
`

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

type Phase = 'idle' | 'checking' | 'missing' | 'saving' | 'read-only' | 'failed'

/** True only when an established model selection changes into the bridge route. */
export function isVisionBridgeModelChange(
  previous: ModelDirectorySnapshot['current'],
  next: ModelDirectorySnapshot['current'],
  bridgeProvider = DEFAULT_BRIDGE_PROVIDER,
): boolean {
  if (previous === null || next === null || next.provider !== bridgeProvider) return false
  return previous.provider !== next.provider || previous.model !== next.model
}

/** Prompt only after the user switches to a Vision Bridge model without a key. */
export function VisionBridgeRouteCredentialDialog(props: RoutePromptInjected): ReactNode {
  const { api, bridgeProvider, credentialRef, modelDirectories, sessions } = props
  const [phase, setPhase] = useState<Phase>('idle')
  const [key, setKey] = useState('')
  const [failure, setFailure] = useState<string>()
  const [request, setRequest] = useState(0)
  const titleId = useId()
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
      setKey('')
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
      let hasBaseline = previous !== null
      stopDirectory = directory.store.subscribe(() => {
        const next = directory.store.getSnapshot().current
        if (next === null) {
          previous = null
          hasBaseline = false
          return
        }
        if (!hasBaseline) {
          previous = next
          hasBaseline = true
          return
        }
        const shouldPrompt = isVisionBridgeModelChange(previous, next, bridgeProvider)
        previous = next
        if (shouldPrompt) setRequest(value => value + 1)
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
    setKey('')
    setPhase('checking')
    setFailure(undefined)
    void api.credentials.describe({ refs: [credentialRef] }).then(
      (response) => {
        if (!active) return
        if (!response.result.ok) {
          setFailure(response.result.error.message)
          setPhase('failed')
          return
        }
        const credential = response.result.value.credentials[credentialRef]
        if (credential?.configured === true) {
          setPhase('idle')
          return
        }
        setPhase(credential?.writable === false ? 'read-only' : 'missing')
      },
      (error: unknown) => {
        if (!active) return
        setFailure(error instanceof Error ? error.message : String(error))
        setPhase('failed')
      },
    )
    return () => { active = false }
  }, [api.credentials, credentialRef, request])

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
    const normalized = normalizeGoogleApiKey(key)
    if (normalized.error !== undefined) {
      setFailure(normalized.error === 'required' ? copy.keyRequired : copy.keyInvalid)
      return
    }
    setPhase('saving')
    setFailure(undefined)
    try {
      const response = await api.credentials.set({ ref: credentialRef, value: normalized.value! })
      if (!response.result.ok) {
        setFailure(response.result.error.message)
        setPhase('missing')
        return
      }
      setKey('')
      setPhase('idle')
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
      setPhase('missing')
    }
  }

  const dismiss = (): void => {
    setPhase('idle')
    setKey('')
    setFailure(undefined)
  }

  if (phase === 'idle' || phase === 'checking') return null

  const message = phase === 'read-only'
    ? copy.readOnly
    : phase === 'failed'
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
                <label className="dsh-vb-label" htmlFor="dsh-vb-api-key">{copy.keyLabel}</label>
                <input
                  key={request}
                  ref={inputRef}
                  className="dsh-vb-input"
                  id="dsh-vb-api-key"
                  name="dsh-vision-bridge-new-google-api-key"
                  type="password"
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-lpignore="true"
                  spellCheck={false}
                  value={key}
                  placeholder={copy.keyPlaceholder}
                  aria-invalid={failure !== undefined}
                  disabled={phase === 'saving'}
                  onChange={(event) => { setKey(event.target.value) }}
                />
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
              : phase === 'read-only'
                ? null
                : <button
                    className="dsh-vb-button dsh-vb-primary"
                    type="submit"
                    disabled={phase === 'saving'}
                  >
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
type CardBusy = 'saving' | 'removing'

async function readCredentialMask(rpc: ConnectionHandle['rpc']): Promise<string | undefined> {
  const response = await rpc.call(CREDENTIAL_MASK_CHANNEL, CREDENTIAL_MASK_ENDPOINT, {})
  if (!response.ok) return undefined
  const view = parseCredentialMaskView(response.value)
  return view?.configured === true ? view.masked : undefined
}

/** Persistent credential controls rendered in Settings > Plugins. */
export function VisionBridgeCredentialCard(props: CredentialCardProps): ReactNode {
  const { api, credentialRef, rpc } = props
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<CardPhase>('loading')
  const [busy, setBusy] = useState<CardBusy>()
  const [configured, setConfigured] = useState(false)
  const [writable, setWritable] = useState(true)
  const [maskedKey, setMaskedKey] = useState<string>()
  const [key, setKey] = useState('')
  const [failure, setFailure] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [generation, setGeneration] = useState(0)
  const inputId = useId()
  const copy = copyForBrowser()

  useEffect(() => {
    let active = true
    setPhase('loading')
    setFailure(undefined)
    setMaskedKey(undefined)
    void (async () => {
      try {
        const response = await api.credentials.describe({ refs: [credentialRef] })
        if (!active) return
        if (!response.result.ok) {
          setFailure(response.result.error.message)
          setPhase('failed')
          return
        }
        const credential = response.result.value.credentials[credentialRef]
        const isConfigured = credential?.configured === true
        let mask: string | undefined
        if (isConfigured) {
          try {
            mask = await readCredentialMask(rpc)
          } catch {
            // The status API remains useful if an older Host lacks the mask channel.
          }
        }
        if (!active) return
        setConfigured(isConfigured)
        setWritable(credential?.writable !== false)
        setMaskedKey(mask)
        setPhase('ready')
      } catch (error) {
        if (!active) return
        setFailure(error instanceof Error ? error.message : String(error))
        setPhase('failed')
      }
    })()
    return () => { active = false }
  }, [api.credentials, credentialRef, generation, rpc])

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const normalized = normalizeGoogleApiKey(key)
    if (normalized.error !== undefined || normalized.value === undefined) {
      setFailure(normalized.error === 'required' ? copy.keyRequired : copy.keyInvalid)
      setNotice(undefined)
      return
    }
    setBusy('saving')
    setFailure(undefined)
    setNotice(undefined)
    try {
      const response = await api.credentials.set({ ref: credentialRef, value: normalized.value })
      if (!response.result.ok) {
        setFailure(response.result.error.message)
        return
      }
      setKey('')
      setConfigured(true)
      try {
        setMaskedKey(await readCredentialMask(rpc))
      } catch {
        setMaskedKey(undefined)
      }
      setNotice(copy.updated)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(undefined)
    }
  }

  const remove = async (): Promise<void> => {
    setBusy('removing')
    setFailure(undefined)
    setNotice(undefined)
    try {
      const response = await api.credentials.unset({ ref: credentialRef })
      if (!response.result.ok) {
        setFailure(response.result.error.message)
        return
      }
      setKey('')
      setConfigured(false)
      setMaskedKey(undefined)
      setConfirmRemove(false)
      setNotice(copy.removed)
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
      : configured
        ? copy.configured
        : copy.unconfigured

  return (
    <li className="dsh-vb-card" data-open={open}>
      <style>{STYLES}</style>
      <button
        type="button"
        className="dsh-vb-card-header"
        aria-expanded={open}
        aria-label={`${copy.cardTitle}: ${status}`}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className="dsh-vb-card-head-text">
          <span className="dsh-vb-card-name">{copy.cardTitle}</span>
          <span className="dsh-vb-card-description">{copy.cardDescription}</span>
        </span>
        <span className="dsh-vb-card-state" data-configured={phase === 'ready' && configured}>
          <span className="dsh-vb-card-dot" aria-hidden="true" />
          {status}
        </span>
        <svg
          className="dsh-vb-chevron"
          data-open={open}
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="m3.25 5.25 3.75 3.5 3.75-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open
        ? <div className="dsh-vb-card-body">
            {phase === 'failed'
              ? <>
                  <p className="dsh-vb-card-message" data-tone="error" role="status">
                    {copy.loadFailed}{failure === undefined ? '' : ` ${failure}`}
                  </p>
                  <div className="dsh-vb-card-footer">
                    <button
                      type="button"
                      className="dsh-vb-card-button dsh-vb-card-button-primary"
                      onClick={() => { setGeneration(value => value + 1) }}
                    >
                      {copy.retry}
                    </button>
                  </div>
                </>
              : <form onSubmit={(event) => { void save(event) }}>
                  <p className="dsh-vb-card-note">{copy.secureStorage}</p>
                  <p className="dsh-vb-card-hint">
                    {configured ? copy.configuredHint : copy.unconfiguredHint}
                  </p>
                  {configured
                    ? <div className="dsh-vb-card-current">
                        <span className="dsh-vb-card-current-label">{copy.currentKey}</span>
                        <code className="dsh-vb-card-current-value">{maskedKey ?? copy.maskUnavailable}</code>
                      </div>
                    : null}
                  {!writable ? <p className="dsh-vb-card-message" role="status">{copy.readOnly}</p> : null}
                  {writable
                    ? <div className="dsh-vb-card-field">
                        <label className="dsh-vb-card-field-label" htmlFor={inputId}>{copy.keyLabel}</label>
                        <input
                          id={inputId}
                          className="dsh-vb-card-input"
                          type="password"
                          autoComplete="new-password"
                          spellCheck={false}
                          value={key}
                          placeholder={copy.replacePlaceholder}
                          aria-invalid={failure !== undefined}
                          disabled={busy !== undefined}
                          onChange={(event) => {
                            setKey(event.target.value)
                            setFailure(undefined)
                            setNotice(undefined)
                          }}
                        />
                      </div>
                    : null}
                  <p
                    className="dsh-vb-card-message"
                    data-tone={failure === undefined ? (notice === undefined ? undefined : 'success') : 'error'}
                    role="status"
                  >
                    {failure ?? notice ?? ''}
                  </p>
                  {confirmRemove
                    ? <div className="dsh-vb-card-confirm">
                        <p>{copy.removeConfirm}</p>
                        <div className="dsh-vb-card-confirm-actions">
                          <button
                            type="button"
                            className="dsh-vb-card-button dsh-vb-card-button-secondary"
                            disabled={busy !== undefined}
                            onClick={() => { setConfirmRemove(false) }}
                          >
                            {copy.cancel}
                          </button>
                          <button
                            type="button"
                            className="dsh-vb-card-button dsh-vb-card-button-danger"
                            disabled={busy !== undefined}
                            onClick={() => { void remove() }}
                          >
                            {busy === 'removing' ? copy.removing : copy.confirmRemove}
                          </button>
                        </div>
                      </div>
                    : <div className="dsh-vb-card-footer">
                        {configured && writable
                          ? <button
                              type="button"
                              className="dsh-vb-card-button dsh-vb-card-button-danger dsh-vb-card-button-remove"
                              disabled={busy !== undefined}
                              onClick={() => {
                                setConfirmRemove(true)
                                setFailure(undefined)
                                setNotice(undefined)
                              }}
                            >
                              {copy.removeKey}
                            </button>
                          : null}
                        {writable
                          ? <button
                              type="submit"
                              className="dsh-vb-card-button dsh-vb-card-button-primary"
                              disabled={busy !== undefined || key.trim().length === 0}
                            >
                              {busy === 'saving' ? copy.saving : configured ? copy.replaceKey : copy.saveKey}
                            </button>
                          : null}
                      </div>}
                </form>}
          </div>
        : null}
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
  const credentials = (): CredentialInjected => ({
    api: connection.api,
    credentialRef: DEFAULT_GOOGLE_CREDENTIAL_REF,
    rpc: connection.rpc,
  })
  client.slots.inject('shell.overlay', () => client.slots.register({
      name: 'shell.overlay',
      id: 'vision-bridge-google-api-key',
      order: 10,
      inject: (): RoutePromptInjected => ({
        ...credentials(),
        bridgeProvider: DEFAULT_BRIDGE_PROVIDER,
        modelDirectories,
        sessions,
      }),
    }, VisionBridgeRouteCredentialDialog))
  client.slots.inject('settings.plugin.item', () => client.slots.register({
      name: 'settings.plugin.item',
      id: 'vision-bridge-google-api-key',
      order: 30,
      inject: credentials,
    }, VisionBridgeCredentialCard))
}
