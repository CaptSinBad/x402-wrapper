import { settleCDPPayment } from '../lib/cdp-facilitator';
import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    console.log('Starting verification...');

    // 1. Generate Signature
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

    // 2. Call settleCDPPayment
    const apiKeyName = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;
    const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://api.cdp.coinbase.com/platform';

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
