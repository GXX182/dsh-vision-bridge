/** Local-image loading and validation through the Harness filesystem service. */
import type { Context } from '@deepseek-ai/cordis';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { PreparedImage } from './types.ts';
/** Limits applied before image data leaves the Harness filesystem service. */
export interface ImageLimits {
    /** Maximum number of paths in one call. */
    maxImages: number;
    /** Inclusive byte cap for one file. */
    maxImageBytes: number;
    /** Inclusive combined byte cap for all files. */
    maxTotalImageBytes: number;
}
/**
 * Detect one supported image format from its bytes.
 * @param data - complete image bytes.
 * @returns the MIME type, or undefined for an unsupported or malformed header.
 */
export declare function detectImageMediaType(data: Uint8Array): PreparedImage['mediaType'] | undefined;
/**
 * Validate tool image paths, read them with complete-result bounds, and persist
 * them through the Harness filesystem service before the external request.
 * @param ctx - plugin context carrying the filesystem service.
 * @param paths - model-supplied image paths.
 * @param exec - current tool execution and session workspace.
 * @param limits - configured per-call bounds.
 * @returns validated inline image payloads.
 */
export declare function loadImages(ctx: Context, paths: readonly string[], exec: ToolRunContext, limits: ImageLimits): Promise<PreparedImage[]>;
