import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AttachmentStore from '@deepseek-ai/dsh-attachment'
import type {
  ImageAttachmentLimits,
  ImageAttachmentRef,
  SaveImageAttachment,
  StoredImageAttachment,
} from '@deepseek-ai/dsh-attachment'
import { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { CredentialInfo, CredentialRef, ResolvedCredential } from '@deepseek-ai/dsh-credentials'
import { FileSystem, FsError, FsTargetKey, FsVersion } from '@deepseek-ai/dsh-fs'
import type {
  FsDirEntry,
  FsEditOutcome,
  FsEditRequest,
  FsInfo,
  FsPathInfo,
  FsTarget,
  FsWriteIntent,
  FsWriteOutcome,
} from '@deepseek-ai/dsh-fs'
import LlmRuntime, {
  CallId,
  createUserMessage,
  LlmAdapter,
} from '@deepseek-ai/dsh-llm'
import type {
  GenerateOptions,
  LlmModelInfo,
  LlmResolvedModelInfo,
  StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as VisionBridge from '../src/index.ts'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const ATTACHMENT = {
  attachmentId: 'session-image-1',
  mediaType: 'image/png',
  bytes: PNG.byteLength,
  width: 1,
  height: 1,
  name: 'clipboard.png',
} as ImageAttachmentRef

class MemoryCredentials extends CredentialProvider {
  override resolve(_ref: CredentialRef): Promise<ResolvedCredential | undefined> {
    return Promise.resolve({ value: 'test-key', source: 'memory' })
  }

  override describe(_ref: CredentialRef): Promise<CredentialInfo> {
    return Promise.resolve({ configured: true, source: 'memory', writable: false })
  }

  override set(_ref: CredentialRef, _value: string): Promise<void> {
    return Promise.reject(new Error('read-only test credential provider'))
  }

  override unset(_ref: CredentialRef): Promise<void> {
    return Promise.reject(new Error('read-only test credential provider'))
  }
}

class MemoryFileSystem extends FileSystem {
  override resolve(path: string, opts?: { cwd?: string }): Promise<FsTarget> {
    const displayPath = opts?.cwd === undefined ? path : `${opts.cwd}/${path}`
    return Promise.resolve({ targetKey: FsTargetKey(displayPath), displayPath })
  }

  override processPath(target: FsTarget): string { return target.displayPath }
  override fileUrl(target: FsTarget): string { return `file://${target.displayPath}` }
  override contains(parent: FsTarget, child: FsTarget): boolean {
    return child.displayPath === parent.displayPath || child.displayPath.startsWith(`${parent.displayPath}/`)
  }
  override stat(_target: FsTarget): Promise<FsInfo | undefined> {
    return Promise.resolve({ type: 'file', size: PNG.byteLength, version: FsVersion('v1') })
  }
  override lstat(_path: string): Promise<FsPathInfo | undefined> {
    return Promise.resolve({ type: 'file', size: PNG.byteLength, version: FsVersion('v1') })
  }
  override readText(_target: FsTarget): Promise<string> { return Promise.resolve('') }
  override streamText(_target: FsTarget): Promise<AsyncIterable<string>> {
    return Promise.resolve((async function* () { yield '' })())
  }
  override readBytes(_target: FsTarget, _signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array> {
    if (PNG.byteLength > maxBytes) return Promise.reject(new FsError('too large', 'FS_TOO_LARGE'))
    return Promise.resolve(PNG)
  }
  override listDir(_target: FsTarget): Promise<FsDirEntry[]> { return Promise.resolve([]) }
  override writeText(_target: FsTarget, _content: string, _expected?: FsWriteIntent): Promise<FsWriteOutcome> {
    return Promise.reject(new Error('not implemented by test filesystem'))
  }
  override editText(_target: FsTarget, _edit: FsEditRequest, _expected?: { version: FsVersion }): Promise<FsEditOutcome> {
    return Promise.reject(new Error('not implemented by test filesystem'))
  }
}

class MemoryAttachments extends AttachmentStore {
  readonly imageLimits: ImageAttachmentLimits = {
    maxImageBytes: 1024,
    maxImagesPerMessage: 8,
    maxMessageImageBytes: 4096,
    maxImagePixels: 1024,
    mediaTypes: ['image/png'],
  }

  override validateImage(_input: SaveImageAttachment): Promise<void> { return Promise.resolve() }
  override saveImage(_input: SaveImageAttachment): Promise<ImageAttachmentRef> { return Promise.resolve(ATTACHMENT) }
  override readImage(ref: ImageAttachmentRef): Promise<StoredImageAttachment> {
    if (String(ref.attachmentId) !== String(ATTACHMENT.attachmentId)) {
      return Promise.reject(new Error('unknown attachment'))
    }
    return Promise.resolve({ ref: ATTACHMENT, data: PNG })
  }
}

class MemoryUpstreamAdapter extends LlmAdapter {
  readonly calls: GenerateOptions[] = []

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([{
      provider,
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      inputModalities: ['text'],
    }])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({
      provider,
      id: model,
      name: 'DeepSeek V4 Flash',
      inputModalities: ['text'],
      context: { contextWindow: 128_000 },
    })
  }

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.calls.push(options)
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

const contexts: Context[] = []

async function setup(): Promise<{ ctx: Context; upstream: MemoryUpstreamAdapter }> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(LlmRuntime)
  const upstream = new MemoryUpstreamAdapter()
  ctx.llm.registerAdapter(['deepseek-official'], upstream)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(MemoryFileSystem)
  await ctx.plugin(MemoryCredentials)
  await ctx.plugin(MemoryAttachments)
  return { ctx, upstream }
}

function fakeAgent(ctx: Context): Agent {
  const session = Session.create(SessionId('vision-session'))
  session.append('user/message', createUserMessage({
    content: [
      { type: 'text', text: 'What is in this screenshot?' },
      { type: 'image', attachment: ATTACHMENT },
    ],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  return {
    id: session.id,
    options: { provider: VisionBridge.DEFAULT_BRIDGE_PROVIDER, model: 'deepseek-v4-flash' },
    session,
    inbox: {} as Agent['inbox'],
    status: 'running',
    ctx,
    cancel() {},
    whenIdle: () => Promise.resolve(),
    runMaintenance: task => task(new AbortController().signal),
    send() {},
    followup() {},
    steer() {},
    inject() {},
  }
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

describe('Vision Bridge Cordis plugin', () => {
  it('fails load before registration for an insecure provider URL', async () => {
    const { ctx } = await setup()
    const fiber = ctx.plugin(VisionBridge, { baseURL: 'http://example.test/v1beta' })
    await expect(Promise.resolve(fiber)).rejects.toThrow('baseURL must use HTTPS')
    expect(ctx.tools.get('vision_bridge')).toBeUndefined()
  })

  it('registers through Harness services, executes, and disposes cleanly', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'A compact settings window.' }] } }],
    }), { status: 200 }))))
    const { ctx, upstream } = await setup()
    const fiber = ctx.plugin(VisionBridge)
    await fiber

    expect(ctx.tools.schemas().map(tool => tool.name)).toContain('vision_bridge')
    expect(ctx.llm.listProviders()).toContainEqual({
      id: VisionBridge.DEFAULT_BRIDGE_PROVIDER,
      name: 'DeepSeek + Vision Bridge',
    })
    await expect(ctx.llm.resolveModelInfo(
      VisionBridge.DEFAULT_BRIDGE_PROVIDER,
      'deepseek-v4-flash',
    )).resolves.toMatchObject({
      provider: VisionBridge.DEFAULT_BRIDGE_PROVIDER,
      inputModalities: ['text', 'image'],
    })
    const prompt = renderPrompt(await ctx.systemPrompt.assemble())
    expect(prompt).toContain('Call vision_bridge')

    const message = createUserMessage({
      content: [{ type: 'image', attachment: ATTACHMENT }],
      source: { kind: 'user' },
    })
    for await (const _chunk of ctx.llm.stream({
      provider: VisionBridge.DEFAULT_BRIDGE_PROVIDER,
      model: 'deepseek-v4-flash',
      messages: [message],
      signal: new AbortController().signal,
    })) {
      // Consume the complete forwarded request.
    }
    expect(upstream.calls).toHaveLength(1)
    expect(upstream.calls[0]?.provider).toBe('deepseek-official')
    expect(upstream.calls[0]?.messages[0]?.content).toEqual([{
      type: 'text',
      text: expect.stringContaining('attachment_id="session-image-1"'),
    }])
    expect(message.content[0]).toMatchObject({ type: 'image', attachment: ATTACHMENT })

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('vision-1'),
      name: 'vision_bridge',
      arguments: { question: 'What is visible?', image_paths: ['screen.png'] },
    })
    expect(result).toMatchObject({
      isError: false,
      value: {
        answer: 'A compact settings window.',
        model: 'gemini-3.6-flash',
        provider: 'google',
      },
    })
    expect(result.content[0]).toMatchObject({ type: 'text' })

    const sessionResult = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('vision-session'),
      name: 'vision_bridge',
      arguments: { question: 'What is visible?' },
      agent: fakeAgent(ctx),
    })
    if (sessionResult.isError) throw new Error(JSON.stringify(sessionResult.error))
    expect(sessionResult).toMatchObject({
      isError: false,
      value: {
        images: [{ source: 'clipboard.png', mediaType: 'image/png', bytes: PNG.byteLength }],
      },
    })

    await fiber.dispose()
    expect(ctx.tools.get('vision_bridge')).toBeUndefined()
    expect(ctx.llm.listProviders().map(provider => provider.id)).not.toContain(VisionBridge.DEFAULT_BRIDGE_PROVIDER)
    expect(renderPrompt(await ctx.systemPrompt.assemble())).not.toContain('Call vision_bridge')
  })
})
