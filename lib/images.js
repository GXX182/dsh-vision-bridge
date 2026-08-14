/** Local-image loading and validation through the Harness filesystem service. */
import { Buffer } from 'node:buffer';
import { FsError } from '@deepseek-ai/dsh-fs';
import { VisionBridgeError } from "./errors.js";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function startsWith(data, signature) {
    return signature.every((byte, index) => data[index] === byte);
}
/**
 * Detect one supported image format from its bytes.
 * @param data - complete image bytes.
 * @returns the MIME type, or undefined for an unsupported or malformed header.
 */
export function detectImageMediaType(data) {
    if (startsWith(data, PNG_SIGNATURE))
        return 'image/png';
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
        return 'image/jpeg';
    const ascii = (start, length) => String.fromCharCode(...data.subarray(start, start + length));
    const gif = ascii(0, 6);
    if (gif === 'GIF87a' || gif === 'GIF89a')
        return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP')
        return 'image/webp';
    return undefined;
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
export async function loadImages(ctx, paths, exec, limits) {
    if (paths.length === 0) {
        throw new VisionBridgeError('VISION_INPUT', 'image_paths must contain at least one path');
    }
    if (paths.length > limits.maxImages) {
        throw new VisionBridgeError('VISION_INPUT', `image_paths accepts at most ${limits.maxImages} images`);
    }
    const seen = new Set();
    const loaded = [];
    let totalBytes = 0;
    for (const rawPath of paths) {
        const requestedPath = rawPath.trim();
        if (requestedPath.length === 0) {
            throw new VisionBridgeError('VISION_INPUT', 'image_paths must not contain blank paths');
        }
        if (seen.has(requestedPath)) {
            throw new VisionBridgeError('VISION_INPUT', `image_paths contains duplicate path ${JSON.stringify(requestedPath)}`);
        }
        seen.add(requestedPath);
        const cwd = exec.agent?.session.header.cwd;
        const target = await ctx.fs.resolve(requestedPath, {
            ...cwd === undefined ? {} : { cwd },
            signal: exec.signal,
        });
        const info = await ctx.fs.stat(target, exec.signal);
        if (info === undefined) {
            ctx.emit('fs/observed', target, { kind: 'absent' }, exec);
            throw new FsError(`cannot read ${JSON.stringify(target.displayPath)}: not found`, 'FS_NOT_FOUND');
        }
        if (info.type !== 'file') {
            throw new FsError(`cannot read ${JSON.stringify(target.displayPath)}: not a regular file`, 'FS_NOT_REGULAR_FILE');
        }
        if (info.size !== undefined && info.size > limits.maxImageBytes) {
            throw new VisionBridgeError('VISION_INPUT', `${target.displayPath} exceeds the ${limits.maxImageBytes}-byte per-image limit`);
        }
        if (info.size !== undefined && totalBytes + info.size > limits.maxTotalImageBytes) {
            throw new VisionBridgeError('VISION_INPUT', `images exceed the ${limits.maxTotalImageBytes}-byte combined limit`);
        }
        const remaining = limits.maxTotalImageBytes - totalBytes;
        const data = await ctx.fs.readBytes(target, exec.signal, Math.min(limits.maxImageBytes, remaining));
        const mediaType = detectImageMediaType(data);
        if (mediaType === undefined) {
            throw new VisionBridgeError('VISION_INPUT', `${target.displayPath} is not a supported PNG, JPEG, WebP, or GIF image`);
        }
        totalBytes += data.byteLength;
        loaded.push({
            path: target.displayPath,
            mediaType,
            bytes: data.byteLength,
            dataBase64: Buffer.from(data).toString('base64'),
        });
        ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
    }
    return loaded;
}
