import { Context } from '@deepseek-ai/cordis'
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
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as VisionBridge from '../src/index.ts'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

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

const contexts: Context[] = []

async function setup(): Promise<Context> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(MemoryFileSystem)
  await ctx.plugin(MemoryCredentials)
  return ctx
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

describe('Vision Bridge Cordis plugin', () => {
  it('fails load before registration for an insecure provider URL', async () => {
    const ctx = await setup()
    const fiber = ctx.plugin(VisionBridge, { baseURL: 'http://example.test/v1beta' })
    await expect(Promise.resolve(fiber)).rejects.toThrow('baseURL must use HTTPS')
    expect(ctx.tools.get('vision_bridge')).toBeUndefined()
  })

  it('registers through Harness services, executes, and disposes cleanly', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'A compact settings window.' }] } }],
    }), { status: 200 })))
    const ctx = await setup()
    const fiber = ctx.plugin(VisionBridge)
    await fiber

    expect(ctx.tools.schemas().map(tool => tool.name)).toContain('vision_bridge')
    const prompt = renderPrompt(await ctx.systemPrompt.assemble())
    expect(prompt).toContain('call vision_bridge')

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

    await fiber.dispose()
    expect(ctx.tools.get('vision_bridge')).toBeUndefined()
    expect(renderPrompt(await ctx.systemPrompt.assemble())).not.toContain('call vision_bridge')
  })
})
