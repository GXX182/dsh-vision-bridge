/** Error carrying a stable code and retryability without provider secrets. */
export class VisionBridgeError extends Error {
    /** Machine-readable failure category. */
    code;
    /** Whether retrying the unchanged call may succeed. */
    retryable;
    /**
     * Create a Vision Bridge failure.
     * @param code - stable failure category.
     * @param message - safe model-facing diagnostic.
     * @param retryable - whether an unchanged retry may succeed.
     * @param options - optional native error cause.
     */
    constructor(code, message, retryable = false, options) {
        super(message, options);
        this.name = 'VisionBridgeError';
        this.code = code;
        this.retryable = retryable;
    }
}
