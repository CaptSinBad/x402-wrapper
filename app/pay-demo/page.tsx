'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';

// USDC on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

export default function PayDemoPage() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [txHash, setTxHash] = useState('');

    const handlePayment = async () => {
        if (!walletClient || !address) return;

        setLoading(true);
        setStatus('Preparing payment...');
        setTxHash('');

        try {
            // 1. Create payment intent
            const total = 5.00; // $5.00
            const priceAtomic = parseUnits(total.toString(), 6).toString();

            // Generate EIP-712 signature
            const now = Math.floor(Date.now() / 1000);
            const validBefore = now + 3600;
            const validAfter = 0;

            // Generate nonce
            const nonceBytes = new Uint8Array(32);
            window.crypto.getRandomValues(nonceBytes);
            const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            const domain = {
                name: 'USDC',
                version: '2',
                chainId: 84532, // Base Sepolia
                verifyingContract: USDC_ADDRESS as `0x${string}`,
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

            // Seller address (from env or hardcoded for demo)
            const sellerAddress = '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408';

            const authorization = {
                from: address,
                to: sellerAddress as `0x${string}`,
                value: BigInt(priceAtomic),
                validAfter: BigInt(validAfter),
                validBefore: BigInt(validBefore),
                nonce: nonce as `0x${string}`,
            };

            setStatus('Please sign the payment in your wallet...');

            const signature = await walletClient.signTypedData({
                account: address,
                domain,
                types,
                primaryType: 'TransferWithAuthorization',
                message: authorization,
            });

            setStatus('Processing payment...');

            // 2. Submit to backend
            const paymentPayload = {
                x402Version: 1,
                scheme: 'exact',
                network: 'base-sepolia',
                payload: {
                    signature,
                    authorization: {
                        from: address,
                        to: sellerAddress,
                        value: priceAtomic,
                        validAfter: validAfter.toString(),
                        validBefore: validBefore.toString(),
                        nonce,
                    }
                }
            };

            // For this demo, we'll use the bookstore confirm endpoint as it handles generic payments
            const response = await fetch('/api/bookstore/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-payment': Buffer.from(JSON.stringify({
                        scheme: 'exact',
                        network: 'base-sepolia',
                        payload: paymentPayload.payload
                    })).toString('base64')
                },
                body: JSON.stringify({ total: total })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Payment failed');
            }

            setStatus('Payment successful!');
            setTxHash(result.txHash);
        } catch (err: any) {
            console.error(err);
            setStatus(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>Pay Demo</h1>
            <p style={{ color: '#666', marginBottom: '40px' }}>
                This is a demo of the x402 payment flow.
            </p>

            <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Demo Product</div>
                <div style={{ fontSize: '36px', color: '#2B5FA5', fontWeight: 'bold', marginBottom: '24px' }}>$5.00 USDC</div>

                {!isConnected ? (
                    <div style={{ textAlign: 'center' }}>
                        <appkit-button />
                    </div>
                ) : (
                    <div>
                        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                            Connected: {address}
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: '#2B5FA5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Processing...' : 'Pay $5.00'}
                        </button>
                    </div>
                )}

                {status && (
                    <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: status.includes('Error') ? '#fee' : '#f0f9ff', color: status.includes('Error') ? '#c00' : '#0066cc' }}>
                        {status}
                    </div>
                )}

                {txHash && (
                    <div style={{ marginTop: '20px' }}>
                        <a
                            href={`https://sepolia.basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2B5FA5', textDecoration: 'underline' }}
                        >
                            View Transaction on Basescan
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
