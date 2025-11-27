import { SignJWT, importJWK } from 'jose';
import axios from 'axios';
import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

// --- Library Code (Manually Transpiled) ---

async function generateCDPJWT(apiKeyName, apiKeySecret, requestMethod, requestHost, requestPath) {
    const now = Math.floor(Date.now() / 1000);
    const uri = `${requestMethod} ${requestHost}${requestPath}`;

    const decoded = Buffer.from(apiKeySecret, 'base64');
    if (decoded.length !== 64) {
        throw new Error(`Invalid Ed25519 key length: ${decoded.length}, expected 64`);
    }

    const seed = decoded.subarray(0, 32);
    const publicKey = decoded.subarray(32, 64);

    const privateKey = await importJWK(
        {
            kty: 'OKP',
            crv: 'Ed25519',
            d: seed.toString('base64url'),
            x: publicKey.toString('base64url'),
        },
        'EdDSA'
    );

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

async function settleCDPPayment({
    paymentPayload,
    paymentRequirements,
    apiKeyName,
    apiKeySecret,
    facilitatorUrl,
}) {
    try {
        const urlObj = new URL(facilitatorUrl);
        const host = urlObj.host;
        const path = `${urlObj.pathname}/v2/x402/settle`.replace('//', '/');

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
                timeout: 30000,
            }
        );

        return {
            success: true,
            transaction: response.data.transaction_hash || response.data.transactionHash,
            network: response.data.network || 'base-sepolia',
            payer: paymentPayload.payload.authorization.from,
        };
    } catch (error) {
        console.error('[CDP] Settlement failed:', error.message);
        console.error('[CDP] Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

        if (error.response) {
            console.error('[CDP] Response status:', error.response.status);
            console.error('[CDP] Response data:', JSON.stringify(error.response.data, null, 2));
            return {
                success: false,
                errorReason: error.response.data.message || error.response.data.error || 'CDP settle failed',
            };
        }
        return {
            success: false,
            errorReason: error.message || 'Network error during settlement',
        };
    }
}

// --- Test Runner ---

async function run() {
    console.log('Starting verification...');

    const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const TEST_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const account = privateKeyToAccount(TEST_PK);

    const client = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http()
    });

    const now = Math.floor(Date.now() / 1000);
    const validBefore = now + 3600;
    const validAfter = 0;
    const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const value = parseUnits('0.01', 6);
    const priceAtomic = value.toString();

    const domain = {
        name: 'USDC',
        version: '2',
        chainId: 84532,
        verifyingContract: USDC_ADDRESS,
    };

    const types = {
        TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
        ],
    };

    const authorization = {
        from: account.address,
        to: '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408',
        value,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce: nonce,
    };

    const signature = await client.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: authorization,
    });

    const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base-sepolia',
        payload: {
            signature,
            authorization: {
                from: account.address,
                to: '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408',
                value: priceAtomic,
                validAfter: validAfter.toString(),
                validBefore: validBefore.toString(),
                nonce,
            }
        }
    };

    const paymentRequirements = {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: priceAtomic,
        resource: 'http://localhost:3000/bookstore-demo',
        description: 'Debug Payment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 300,
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        payTo: authorization.to,
        extra: {
            name: 'USDC',
            version: '2',
        },
    };

    const apiKeyName = env.CDP_API_KEY_ID;
    const apiKeySecret = env.CDP_API_KEY_SECRET;
    const facilitatorUrl = env.NEXT_PUBLIC_FACILITATOR_URL || 'https://api.cdp.coinbase.com/platform';

    if (!apiKeyName || !apiKeySecret) {
        throw new Error('Missing CDP API keys in environment');
    }

    console.log('Calling settleCDPPayment...');
    const result = await settleCDPPayment({
        paymentPayload,
        paymentRequirements,
        apiKeyName,
        apiKeySecret,
        facilitatorUrl,
    });

    console.log('Result:', JSON.stringify(result, null, 2));
}

run().catch(console.error);
