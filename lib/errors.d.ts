/** Stable failure codes surfaced by Vision Bridge. */
export type VisionBridgeErrorCode = 'VISION_CONFIG' | 'VISION_INPUT' | 'VISION_AUTH' | 'VISION_RATE_LIMIT' | 'VISION_TIMEOUT' | 'VISION_PROVIDER_UNAVAILABLE' | 'VISION_PROVIDER_RESPONSE';
/** Error carrying a stable code and retryability without provider secrets. */
export declare class VisionBridgeError extends Error {
    /** Machine-readable failure category. */
    readonly code: VisionBridgeErrorCode;
    /** Whether retrying the unchanged call may succeed. */
    readonly retryable: boolean;
    /**
     * Create a Vision Bridge failure.
     * @param code - stable failure category.
     * @param message - safe model-facing diagnostic.
     * @param retryable - whether an unchanged retry may succeed.
     * @param options - optional native error cause.
     */
    constructor(code: VisionBridgeErrorCode, message: string, retryable?: boolean, options?: ErrorOptions);
}
