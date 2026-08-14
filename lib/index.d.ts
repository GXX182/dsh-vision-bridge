/**
 * DeepSeek Harness plugin that delegates local-image understanding to Gemini
 * and returns a text-only result to the active agent.
 * @module dsh-vision-bridge
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Config as VisionBridgeConfig } from './types.ts';
export type { VisionAnalysis, VisionUsage } from './types.ts';
/** Public configuration type paired with the exported Schemastery value. */
export type Config = VisionBridgeConfig;
export { VisionBridgeError } from './errors.ts';
export { TOOL_NAME } from './tool.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "vision-bridge";
/** Harness services required by the plugin. */
export declare const inject: string[];
/** Schemastery configuration with deployment-safe defaults. */
export declare const Config: z<VisionBridgeConfig>;
/**
 * Register the Vision Bridge system guidance and tool.
 * @param ctx - Cordis context carrying the required Harness services.
 * @param config - plugin configuration after Schemastery validation.
 */
export declare function apply(ctx: Context, config: VisionBridgeConfig): void;
