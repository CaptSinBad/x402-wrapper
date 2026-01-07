'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useSwitchChain, useChainId } from 'wagmi';
import { parseUnits } from 'viem';

/// <reference path="../../app/components/web-components.d.ts" />

interface LineItem {
    product_id: string;
    name: string;
    description: string;
    price_cents: number;
    quantity: number;
    total_cents: number;
    images: string[];
}

interface CheckoutSession {
    id: string;
    status: string;
    payment_status: string;
    line_items: LineItem[];
    total_cents: number;
    total: string;
    currency: string;
    network: string;
    mode: string;
    success_url?: string;
    cancel_url?: string;
    expires_at: string;
}

export interface BinahPayCheckoutProps {
    /** Checkout session ID from BinahPay.checkout.sessions.create() */
    session: string;
    /** API base URL (defaults to production) */
    apiBase?: string;
    /** Called when payment succeeds */
    onSuccess?: (session: CheckoutSession, txHash: string) => void;
    /** Called when user cancels */
    onCancel?: () => void;
    /** Called on error */
    onError?: (error: string) => void;
    /** Custom styles */
    style?: React.CSSProperties;
}

/**
 * BinahPay Checkout Component
 * 
 * Drop-in component for accepting crypto payments.
 * 
 * @example
 * ```tsx
 * import { BinahPayCheckout } from '@binahpay/checkout';
 * 
 * function MyPage() {
 *   return (
 *     <BinahPayCheckout 
 *       session="cs_abc123..."
 *       onSuccess={(session, txHash) => {
 *         console.log('Payment successful!', txHash);
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function BinahPayCheckout({
    session: sessionId,
    apiBase = 'https://x402-wrapper-nld7.vercel.app',
    onSuccess,
    onCancel,
    onError,
    style
}: BinahPayCheckoutProps) {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const [email, setEmail] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [switchingChain, setSwitchingChain] = useState(false);
    const [chainSwitchError, setChainSwitchError] = useState('');

    const { switchChain } = useSwitchChain();
    const chainId = useChainId();

    useEffect(() => {
        if (!sessionId) return;
        fetchSession();
    }, [sessionId]);

    // Auto-switch chain when session is loaded
    useEffect(() => {
        const autoSwitchChain = async () => {
            if (session && session.network && isConnected) {
                const targetChainId = session.network === 'base-sepolia' ? 84532 : 8453;
                if (chainId !== targetChainId) {
                    try {
                        setSwitchingChain(true);
                        setChainSwitchError('');
                        await switchChain({ chainId: targetChainId });
                    } catch (err: any) {
                        console.error('Auto chain switch failed:', err);
                        setChainSwitchError('Please switch your wallet to ' + session.network);
                    } finally {
                        setSwitchingChain(false);
                    }
                }
            }
        };
        autoSwitchChain();
    }, [session, isConnected, chainId, switchChain]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`${apiBase}/api/checkout/sessions/${sessionId}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
                onError?.(data.error);
                setLoading(false);
                return;
            }

            setSession(data);
            setLoading(false);
        } catch (err) {
            const errorMsg = 'Failed to load checkout session';
            setError(errorMsg);
            onError?.(errorMsg);
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!session || !walletClient || !address) return;

        // Check chain before payment
        const targetChainId = session.network === 'base-sepolia' ? 84532 : 8453;
        if (chainId !== targetChainId) {
            setError(`Please switch to ${session.network} network`);
            return;
        }

        setPaying(true);
        setError('');

        try {
            // Sign payment
            const atomicAmount = (session.total_cents * 10000).toString();
            const nonce = Date.now();
            const expiry = Math.floor(Date.now() / 1000) + 300;

            const domain = {
                name: 'x402 Payment',
                version: '1',
                chainId: session.network === 'base-sepolia' ? 84532 : 8453,
                verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            };

            const types = {
                Payment: [
                    { name: 'resource', type: 'string' },
                    { name: 'amount', type: 'uint256' },
                    { name: 'payTo', type: 'address' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'expiry', type: 'uint256' },
                ],
            };

            const message = {
                resource: `checkout_session_${sessionId}`,
                amount: BigInt(atomicAmount),
                payTo: '0x0000000000000000000000000000000000000000' as `0x${string}`,
                nonce: BigInt(nonce),
                expiry: BigInt(expiry),
            };

            const signature = await walletClient.signTypedData({
                account: address,
                domain,
                types,
                primaryType: 'Payment',
                message,
            });

            const paymentData = {
                scheme: 'exact',
                network: session.network,
                payload: {
                    signer: address,
                    signature,
                    typedData: {
                        types: { EIP712Domain: [], ...types },
                        primaryType: 'Payment',
                        domain,
                        message,
                    },
                },
            };

            // Submit payment
            const paymentHeader = btoa(JSON.stringify({
                x402Version: 1,
                scheme: 'exact',
                network: session.network,
                payload: paymentData.payload,
            }));

            const payResponse = await fetch(
                `${apiBase}/api/checkout/sessions/${sessionId}/pay`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-PAYMENT': paymentHeader,
                    },
                    body: JSON.stringify({ customer_email: email }),
                }
            );

            const payResult = await payResponse.json();

            if (!payResponse.ok) {
                throw new Error(payResult.error || 'Payment failed');
            }

            setTxHash(payResult.transaction_hash);
            setPaymentSuccess(true);
            onSuccess?.(session, payResult.transaction_hash);

            // Redirect if success_url is set
            if (session.success_url) {
                setTimeout(() => {
                    window.location.href = session.success_url!;
                }, 2000);
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Payment failed';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '48px', ...style }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <p style={{ color: '#4B5563' }}>Loading checkout...</p>
            </div>
        );
    }

    if (error && !session) {
        return (
            <div style={{ textAlign: 'center', padding: '48px', ...style }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                <h3 style={{ marginBottom: '8px' }}>Failed to Load</h3>
                <p style={{ color: '#4B5563' }}>{error}</p>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div style={{ textAlign: 'center', padding: '48px', ...style }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ marginBottom: '8px' }}>Payment Successful!</h2>
                <p style={{ color: '#4B5563', marginBottom: '16px' }}>
                    Your payment has been processed.
                </p>
                {txHash && (
                    <p style={{ fontSize: '13px', color: '#A0AEC0', fontFamily: 'monospace' }}>
                        Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </p>
                )}
            </div>
        );
    }

    if (!session) return null;

    return (
        <div style={{
            maxWidth: '500px',
            margin: '0 auto',
            padding: '24px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            ...style
        }}>
            <h2 style={{ marginBottom: '24px', fontSize: '24px' }}>Checkout</h2>

            {/* Items */}
            <div style={{ marginBottom: '24px' }}>
                {session.line_items.map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        padding: '12px',
                        background: '#F7FAFC',
                        borderRadius: '8px'
                    }}>
                        <div>
                            <div style={{ fontWeight: '600' }}>{item.name}</div>
                            <div style={{ fontSize: '13px', color: '#4B5563' }}>
                                Qty: {item.quantity}
                            </div>
                        </div>
                        <div style={{ fontWeight: '600' }}>
                            ${(item.total_cents / 100).toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px',
                background: '#F7FAFC',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '18px',
                fontWeight: '700'
            }}>
                <span>Total</span>
                <span>${(session.total_cents / 100).toFixed(2)} {session.currency}</span>
            </div>

            {/* Email */}
            <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '14px'
                }}
            />

            {!isConnected ? (
                <div style={{ textAlign: 'center' }}>
                    <appkit-button />
                </div>
            ) : (
                <div>
                    {error && (
                        <div style={{
                            background: '#FED7D7',
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            fontSize: '13px',
                            color: '#742A2A'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={paying}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: paying ? '#CBD5E0' : '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: paying ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {paying ? 'Processing...' : `Pay $${(session.total_cents / 100).toFixed(2)}`}
                    </button>
                </div>
            )}
        </div>
    );
}
