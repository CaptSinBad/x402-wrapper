import { SiweMessage } from 'siwe';

/**
 * Generate a SIWE message for the user to sign
 * 
 * @param address User's wallet address
 * @param domain The domain requesting the signature
 * @param uri The URI of the requesting service
 * @param nonce Random nonce for this session
 * @returns SIWE message string to be signed
 */
export function generateSiweMessage(
    address: string,
    domain: string,
    uri: string,
    nonce: string
): string {
    const message = new SiweMessage({
        domain,
        address,
        statement: 'Sign in to BinahPay with your wallet',
        uri,
        version: '1',
        chainId: 1, // Ethereum mainnet
        nonce,
        expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    return message.prepareMessage();
}

/**
 * Verify a signed SIWE message
 * 
 * @param message The SIWE message that was signed
 * @param signature The signature from the wallet
 * @returns Object with success status and recovered address
 */
export async function verifySiweSignature(
    message: string,
    signature: string
): Promise<{ success: boolean; address?: string; error?: string }> {
    try {
        const siweMessage = new SiweMessage(message);
        const result = await siweMessage.verify({ signature });

        if (result.success) {
            return {
                success: true,
                address: siweMessage.address.toLowerCase(),
            };
        } else {
            return {
                success: false,
                error: 'Signature verification failed',
            };
        }
    } catch (error: any) {
        console.error('[SIWE] Verification error:', error);
        return {
            success: false,
            error: error.message || 'Verification failed',
        };
    }
}

/**
 * Generate a random nonce for SIWE
 */
export function generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
