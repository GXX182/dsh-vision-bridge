/** Safe Host/browser contract for multi-provider vision settings. */
import type { ResolvedVisionApiFormat, VisionApiFormat } from './types.ts';
export declare const CONFIGURATION_CHANNEL = "/vision-bridge-configuration";
export declare const CONFIGURATION_GET_ENDPOINT = "get";
export declare const CONFIGURATION_ADD_ENDPOINT = "add";
export declare const CONFIGURATION_SELECT_ENDPOINT = "select";
export declare const CONFIGURATION_DELETE_ENDPOINT = "delete";
export declare const CONFIGURATION_SET_MODEL_ENDPOINT = "set-model";
export declare const CONFIGURATION_MODELS_ENDPOINT = "models";
export declare const CONFIGURATION_ROUTING_ENDPOINT = "routing";
export declare const CONFIGURATION_SET_BRIDGE_ENDPOINT = "set-bridge";
export interface VisionProviderProfile {
    id: string;
    name: string;
    apiFormat: VisionApiFormat;
    baseURL: string;
    model: string;
    apiKeyEnv: string;
}
export interface VisionProviderSettings {
    activeProviderId: string;
    providers: VisionProviderProfile[];
    /** Upstream model ids whose glasses toggle is persistently enabled. */
    bridgeModels: string[];
}
export interface VisionProviderProfileView {
    id: string;
    name: string;
    apiFormat: VisionApiFormat;
    resolvedApiFormat: ResolvedVisionApiFormat;
    baseURL: string;
    model: string;
    configured: boolean;
    writable: boolean;
    maskedApiKey?: string;
}
export interface VisionConfigurationView {
    activeProviderId: string;
    providers: VisionProviderProfileView[];
}
export interface VisionAddProviderValue {
    name: string;
    apiFormat: VisionApiFormat;
    baseURL: string;
    apiKey: string;
}
export interface VisionModelOptionView {
    id: string;
    name: string;
}
export interface VisionModelsView {
    models: VisionModelOptionView[];
    resolvedApiFormat: ResolvedVisionApiFormat;
}
export type NativeVisionCapability = 'native' | 'unsupported' | 'unknown';
export interface VisionBridgeRoutingModelView {
    id: string;
    /** Opaque model id exposed by the shared bridge provider route. */
    bridgeModelId: string;
    nativeVision: NativeVisionCapability;
    bridgeEnabled: boolean;
}
export interface VisionBridgeProviderRouteView {
    upstreamProvider: string;
    models: VisionBridgeRoutingModelView[];
}
/** Browser-safe projection used to fold the bridge catalog into every upstream group. */
export interface VisionBridgeRoutingView {
    bridgeProvider: string;
    visionProvider?: {
        name: string;
        model: string;
    };
    routes: VisionBridgeProviderRouteView[];
}
export declare function isEmptyPayload(payload: unknown): boolean;
export declare function parseAddProviderValue(payload: unknown): VisionAddProviderValue | undefined;
export declare function parseProviderId(payload: unknown): string | undefined;
export declare function parseSetModelValue(payload: unknown): {
    providerId: string;
    model: string;
} | undefined;
export declare function parseSetBridgeValue(payload: unknown): {
    model: string;
    enabled: boolean;
} | undefined;
export declare function profileView(profile: VisionProviderProfile, credential: {
    configured: boolean;
    writable: boolean;
    maskedApiKey?: string;
}): VisionProviderProfileView;
/** Strictly validate the redacted provider directory crossing into the browser. */
export declare function parseConfigurationView(payload: unknown): VisionConfigurationView | undefined;
export declare function parseModelsView(payload: unknown): VisionModelsView | undefined;
/** Strictly validate bridge routing metadata crossing into the browser. */
export declare function parseBridgeRoutingView(payload: unknown): VisionBridgeRoutingView | undefined;
