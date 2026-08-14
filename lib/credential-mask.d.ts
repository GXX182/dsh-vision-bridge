/** Loopback-only RPC channel used to project a display-safe credential hint. */
export declare const CREDENTIAL_MASK_CHANNEL = "/vision-bridge";
/** Endpoint that returns only whether the bridge credential exists and its mask. */
export declare const CREDENTIAL_MASK_ENDPOINT = "credential-mask";
/** Browser-safe view of the bridge credential. */
export interface CredentialMaskView {
    configured: boolean;
    masked?: string;
}
/**
 * Reduce one secret to the four leading and four trailing characters.
 * Short values reveal no literal characters.
 */
export declare function maskCredentialValue(value: string): string;
/** Validate an untrusted RPC result without accepting any extra secret-shaped fields. */
export declare function parseCredentialMaskView(value: unknown): CredentialMaskView | undefined;
