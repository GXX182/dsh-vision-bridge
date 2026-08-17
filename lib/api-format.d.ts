/** Pure URL-based vision API format detection shared by Host and browser. */
import type { ResolvedVisionApiFormat, VisionApiFormat } from './types.ts';
export declare function detectVisionApiFormat(baseURL: string): ResolvedVisionApiFormat;
export declare function resolveVisionApiFormat(apiFormat: VisionApiFormat, baseURL: string): ResolvedVisionApiFormat;
