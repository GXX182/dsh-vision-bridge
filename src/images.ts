/** Local-image loading and validation through the Harness filesystem service. */

import { Buffer } from 'node:buffer'
import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { FsError } from '@deepseek-ai/dsh-fs'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { VisionBridgeError } from './errors.ts'
import type { PreparedImage } from './types.ts'

/** Limits applied before image data leaves the Harness filesystem service. */
export interface ImageLimits {
  /** Maximum number of paths in one call. */
  maxImages: number
  /** Inclusive byte cap for one file. */
  maxImageBytes: number
  /** Inclusive combined byte cap for all files. */
  maxTotalImageBytes: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

function startsWith(data: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => data[index] === byte)
}

/**
 * Detect one supported image format from its bytes.
 * @param data - complete image bytes.
 * @returns the MIME type, or undefined for an unsupported or malformed header.
 */
export function detectImageMediaType(data: Uint8Array): PreparedImage['mediaType'] | undefined {
  if (startsWith(data, PNG_SIGNATURE)) return 'image/png'
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  const ascii = (start: number, length: number): string =>
    String.fromCharCode(...data.subarray(start, start + length))
  const gif = ascii(0, 6)
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp'
  return undefined
}

/**
 * Validate tool image paths, read them with complete-result bounds, and persist
 * them through the Harness filesystem service before the external request.
 * @param ctx - plugin context carrying the filesystem service.
 * @param paths - model-supplied image paths.
 * @param exec - current tool execution and session workspace.
 * @param limits - configured per-call bounds.
 * @returns validated inline image payloads.
 */
export async function loadImages(
  ctx: Context,
  paths: readonly string[],
  exec: ToolRunContext,
  limits: ImageLimits,
): Promise<PreparedImage[]> {
  if (paths.length === 0) {
    throw new VisionBridgeError('VISION_INPUT', 'image_paths must contain at least one path')
  }
  if (paths.length > limits.maxImages) {
    throw new VisionBridgeError('VISION_INPUT', `image_paths accepts at most ${limits.maxImages} images`)
  }

  const seen = new Set<string>()
  const loaded: PreparedImage[] = []
  let totalBytes = 0
  for (const rawPath of paths) {
    const requestedPath = rawPath.trim()
    if (requestedPath.length === 0) {
      throw new VisionBridgeError('VISION_INPUT', 'image_paths must not contain blank paths')
    }
    if (seen.has(requestedPath)) {
      throw new VisionBridgeError('VISION_INPUT', `image_paths contains duplicate path ${JSON.stringify(requestedPath)}`)
    }
    seen.add(requestedPath)

    const cwd = exec.agent?.session.header.cwd
    const target = await ctx.fs.resolve(requestedPath, {
      ...cwd === undefined ? {} : { cwd },
      signal: exec.signal,
    })
    const info = await ctx.fs.stat(target, exec.signal)
    if (info === undefined) {
      ctx.emit('fs/observed', target, { kind: 'absent' }, exec)
      throw new FsError(`cannot read ${JSON.stringify(target.displayPath)}: not found`, 'FS_NOT_FOUND')
    }
    if (info.type !== 'file') {
      throw new FsError(`cannot read ${JSON.stringify(target.displayPath)}: not a regular file`, 'FS_NOT_REGULAR_FILE')
    }
    if (info.size !== undefined && info.size > limits.maxImageBytes) {
      throw new VisionBridgeError('VISION_INPUT', `${target.displayPath} exceeds the ${limits.maxImageBytes}-byte per-image limit`)
    }
    if (info.size !== undefined && totalBytes + info.size > limits.maxTotalImageBytes) {
      throw new VisionBridgeError('VISION_INPUT', `images exceed the ${limits.maxTotalImageBytes}-byte combined limit`)
    }

    const remaining = limits.maxTotalImageBytes - totalBytes
    const data = await ctx.fs.readBytes(target, exec.signal, Math.min(limits.maxImageBytes, remaining))
    const mediaType = detectImageMediaType(data)
    if (mediaType === undefined) {
      throw new VisionBridgeError('VISION_INPUT', `${target.displayPath} is not a supported PNG, JPEG, WebP, or GIF image`)
    }

    totalBytes += data.byteLength
    loaded.push({
      source: target.displayPath,
      mediaType,
      bytes: data.byteLength,
      dataBase64: Buffer.from(data).toString('base64'),
    })
    ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec)
  }
  return loaded
}

function directImageRefs(content: readonly { type: string }[]): ImageAttachmentRef[] {
  return content.flatMap(block => block.type === 'image'
    ? [(block as { type: 'image'; attachment: ImageAttachmentRef }).attachment]
    : [])
}

function sessionImageRefs(exec: ToolRunContext, attachmentIds: readonly string[] | undefined): ImageAttachmentRef[] {
  const session = exec.agent?.session
  if (session === undefined) {
    throw new VisionBridgeError(
      'VISION_INPUT',
      'no agent session is available; provide image_paths for an agentless tool call',
    )
  }

  const requested = attachmentIds === undefined ? undefined : new Set(attachmentIds)
  const found = new Map<string, ImageAttachmentRef>()
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index]
    if (event?.type !== 'user/message') continue
    const refs = directImageRefs(event.data.content)
    if (requested === undefined && refs.length > 0) return refs
    for (const ref of refs) {
      const id = String(ref.attachmentId)
      if (requested?.has(id) === true && !found.has(id)) found.set(id, ref)
    }
    if (requested !== undefined && found.size === requested.size) break
  }

  if (requested === undefined) {
    throw new VisionBridgeError('VISION_INPUT', 'the current session contains no user image attachment')
  }
  const missing = attachmentIds?.filter(id => !found.has(id)) ?? []
  if (missing.length > 0) {
    throw new VisionBridgeError(
      'VISION_INPUT',
      `attachment_ids contains images not referenced by the current session: ${missing.map(id => JSON.stringify(id)).join(', ')}`,
    )
  }
  return attachmentIds?.map(id => found.get(id)!) ?? []
}

/**
 * Resolve image references from the current Agent session and read their
 * verified bytes through the Harness attachment service.
 */
export async function loadSessionImages(
  ctx: Context,
  attachmentIds: readonly string[] | undefined,
  exec: ToolRunContext,
  limits: ImageLimits,
): Promise<PreparedImage[]> {
  if (attachmentIds !== undefined) {
    if (attachmentIds.length === 0) {
      throw new VisionBridgeError('VISION_INPUT', 'attachment_ids must contain at least one id when provided')
    }
    if (attachmentIds.length > limits.maxImages) {
      throw new VisionBridgeError('VISION_INPUT', `attachment_ids accepts at most ${limits.maxImages} images`)
    }
    const seen = new Set<string>()
    for (const rawId of attachmentIds) {
      const id = rawId.trim()
      if (id.length === 0) throw new VisionBridgeError('VISION_INPUT', 'attachment_ids must not contain blank ids')
      if (id !== rawId) throw new VisionBridgeError('VISION_INPUT', 'attachment_ids must not contain surrounding whitespace')
      if (seen.has(id)) {
        throw new VisionBridgeError('VISION_INPUT', `attachment_ids contains duplicate id ${JSON.stringify(id)}`)
      }
      seen.add(id)
    }
  }

  const refs = sessionImageRefs(exec, attachmentIds)
  if (refs.length > limits.maxImages) {
    throw new VisionBridgeError('VISION_INPUT', `the selected session message contains more than ${limits.maxImages} images`)
  }

  let totalBytes = 0
  const loaded: PreparedImage[] = []
  for (const ref of refs) {
    if (ref.bytes > limits.maxImageBytes) {
      throw new VisionBridgeError(
        'VISION_INPUT',
        `session attachment ${String(ref.attachmentId)} exceeds the ${limits.maxImageBytes}-byte per-image limit`,
      )
    }
    if (totalBytes + ref.bytes > limits.maxTotalImageBytes) {
      throw new VisionBridgeError('VISION_INPUT', `session images exceed the ${limits.maxTotalImageBytes}-byte combined limit`)
    }
    const stored = await ctx.attachments.readImage(ref, exec.signal)
    const mediaType = detectImageMediaType(stored.data)
    if (mediaType === undefined || mediaType !== stored.ref.mediaType) {
      throw new VisionBridgeError(
        'VISION_INPUT',
        `session attachment ${String(ref.attachmentId)} is not a supported or internally consistent image`,
      )
    }
    totalBytes += stored.data.byteLength
    if (stored.data.byteLength > limits.maxImageBytes || totalBytes > limits.maxTotalImageBytes) {
      throw new VisionBridgeError('VISION_INPUT', 'stored session image bytes exceed the configured limits')
    }
    loaded.push({
      source: stored.ref.name ?? `attachment:${String(stored.ref.attachmentId)}`,
      mediaType,
      bytes: stored.data.byteLength,
      dataBase64: Buffer.from(stored.data).toString('base64'),
    })
  }
  return loaded
}
