import { SignJWT, importJWK } from 'jose';
import axios from 'axios';

/**
 * Generate a JWT token for Coinbase CDP API authentication
 * Uses EdDSA (Ed25519) as per CDP documentation
 */
export async function generateCDPJWT(
    apiKeyName: string,
    apiKeySecret: string,
    requestMethod: string,
    requestHost: string,
    requestPath: string
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const uri = `${requestMethod} ${requestHost}${requestPath}`;

    // Decode the Ed25519 private key from base64
    const decoded = Buffer.from(apiKeySecret, 'base64');

    // Ed25519 keys are 64 bytes (32 bytes seed + 32 bytes public key)
    if (decoded.length !== 64) {
        throw new Error(`Invalid Ed25519 key length: ${decoded.length}, expected 64`);
    }

    // Extract the seed (first 32 bytes) and public key (last 32 bytes)
    const seed = decoded.subarray(0, 32);
    const publicKey = decoded.subarray(32, 64);

    // Create JWK for Ed25519
    const privateKey = await importJWK(
        {
            kty: 'OKP',
            crv: 'Ed25519',
            d: seed.toString('base64url'),
            x: publicKey.toString('base64url'),
        },
        'EdDSA'
    );

    // Generate nonce
    const nonce = () => {
        const range = "0123456789";
        let result = "";
        for (let i = 0; i < 16; i++) {
            result += range.charAt(Math.floor(Math.random() * range.length));
        }
        return result;
    };

    return await new SignJWT({
        sub: apiKeyName,
        iss: 'cdp',
        aud: ['cdp_service'],
        uris: [uri],
        nbf: now,
        exp: now + 120,
    })
        .setProtectedHeader({
            alg: 'EdDSA',
            typ: 'JWT',
            kid: apiKeyName,
            nonce: nonce(),
        })
        .sign(privateKey);
}

/**
 * Settle a payment using Coinbase CDP facilitator
 */
export async function settleCDPPayment({
    paymentPayload,
    paymentRequirements,
    apiKeyName,
    apiKeySecret,
    facilitatorUrl,
}: {
    paymentPayload: any;
    paymentRequirements: any;
    apiKeyName: string;
    apiKeySecret: string;
    facilitatorUrl: string;
}) {
    try {
        const urlObj = new URL(facilitatorUrl);
        const host = urlObj.host;
        const path = `${urlObj.pathname}/v2/x402/settle`.replace('//', '/'); // Ensure single slash

        // Generate JWT with correct claims
        const jwt = await generateCDPJWT(apiKeyName, apiKeySecret, 'POST', host, path);

        const endpoint = `https://${host}${path}`;
        console.log(`[CDP] Settling payment at ${endpoint}`);
        console.log(`[CDP] JWT URI claim: POST ${host}${path}`);

        const response = await axios.post(
            endpoint,
            {
                x402Version: 1,
                paymentPayload,
                paymentRequirements,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
                timeout: 30000, // 30s timeout
            }
        );

        // Check for application-level success flag even if HTTP status is 200
        if (response.data && response.data.success === false) {
            console.error('[CDP] Settlement returned success: false');
            console.error('[CDP] Reason:', response.data.errorReason);
            return {
                success: false,
                errorReason: response.data.errorReason || 'CDP settlement failed (unknown reason)',
            };
        }

        return {
            success: true,
            transaction: response.data.transaction_hash || response.data.transactionHash || response.data.transaction, // Handle potential casing
            network: response.data.network || 'base-sepolia',
            payer: paymentPayload.payload.authorization.from,
        };
    } catch (error: any) {
        console.error('[CDP] Settlement failed:', error.message);
        console.error('[CDP] Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

        if (error.response) {
            console.error('[CDP] Response status:', error.response.status);
            console.error('[CDP] Response data:', JSON.stringify(error.response.data, null, 2));
            return {
                success: false,
                // Check all possible error fields based on docs and observation
                errorReason: error.response.data.errorReason || error.response.data.message || error.response.data.error || 'CDP settle failed',
            };
        }
        return {
            success: false,
            errorReason: error.message || 'Network error during settlement',
        };
    }
}
