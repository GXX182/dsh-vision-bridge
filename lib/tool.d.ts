/** Model-facing `vision_bridge` tool registration. */
import type { Context } from '@deepseek-ai/cordis';
import type { ResolvedConfig } from './types.ts';
/** Stable tool name presented to native and Code Mode agents. */
export declare const TOOL_NAME = "vision_bridge";
/**
 * Register the text-only visual-analysis bridge.
 * @param ctx - plugin context carrying tool, filesystem, and credential services.
 * @param config - validated configuration with defaults applied.
 */
export declare function registerVisionBridgeTool(ctx: Context, config: ResolvedConfig): void;
