import fs from 'fs';
import path from 'path';
import { SignJWT, importJWK } from 'jose';
import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import https from 'https';
import axios from 'axios';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

const apiKeyName = env.CDP_API_KEY_ID;
const apiKeySecret = env.CDP_API_KEY_SECRET;

if (!apiKeyName || !apiKeySecret) {
    console.error('Missing CDP_API_KEY_ID or CDP_API_KEY_SECRET in .env.local');
    process.exit(1);
}

// Generate JWT
// Generate JWT
async function generateCDPJWT(method, host, path) {
    const now = Math.floor(Date.now() / 1000);
    const uri = `${method} ${host}${path}`;

    const decoded = Buffer.from(apiKeySecret, 'base64');
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

    return new SignJWT({
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

// Generate Payment Signature
async function generatePaymentSignature() {
    const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const TEST_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil default #0
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

    const value = parseUnits('0.01', 6); // 0.01 USDC
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
        to: '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408', // Seller
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

    return {
        signature,
        authorization: {
            from: account.address,
            to: '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408',
            value: priceAtomic,
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
        }
    };
}

async function run() {
    console.log('Generating payment signature...');
    const { signature, authorization } = await generatePaymentSignature();

    const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base-sepolia',
        payload: {
            signature,
            authorization
        }
    };

    const paymentRequirements = {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: authorization.value,
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

    console.log('Settling with CDP...');
    const endpoint = 'https://api.cdp.coinbase.com/platform/v2/x402/settle';
    const urlObj = new URL(endpoint);

    // Using Method + Host + Path as verified earlier
    const jwt = await generateCDPJWT('POST', urlObj.host, urlObj.pathname);

    try {
        const res = await axios.post(endpoint, {
            x402Version: 1,
            paymentPayload,
            paymentRequirements,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`,
            },
            timeout: 30000,
        });

        console.log(`Status: ${res.status}`);
        console.log('Response:', JSON.stringify(res.data, null, 2));

    } catch (err) {
        if (err.response) {
            console.log(`Status: ${err.response.status}`);
            console.log('Response:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error:', err.message);
            console.error('Full Error:', err);
        }
    }
}

run();
