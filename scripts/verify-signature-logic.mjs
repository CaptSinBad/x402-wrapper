import { createWalletClient, http, parseUnits, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// USDC Address on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Mock private key for testing (do not use real funds)
// This is just to verify the signature structure matches what the contract expects
const TEST_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil default #0
const account = privateKeyToAccount(TEST_PK);

const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
});

async function testSignature() {
    console.log('Testing EIP-712 Signature Generation...');

    const now = Math.floor(Date.now() / 1000);
    const validBefore = now + 3600;
    const validAfter = 0;
    const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const value = parseUnits('1.0', 6); // 1 USDC

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

    const message = {
        from: account.address,
        to: '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408', // Seller
        value,
        validAfter,
        validBefore,
        nonce,
    };

    console.log('Domain:', domain);
    console.log('Message:', message);

    try {
        const signature = await client.signTypedData({
            domain,
            types,
            primaryType: 'TransferWithAuthorization',
            message,
        });

        console.log('Signature generated successfully:', signature);
        console.log('Length:', signature.length);

        // Verify recovery
        // In a real scenario, we would call the contract's authorizationState or similar
        // But here we just want to ensure viem can sign it without error

    } catch (error) {
        console.error('Signature generation failed:', error);
    }
}

testSignature();
