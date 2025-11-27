'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';

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

interface EmbeddedCheckoutProps {
    sessionId: string;
    onSuccess?: (session: CheckoutSession, txHash: string) => void;
    onCancel?: () => void;
    onError?: (error: string) => void;
    style?: React.CSSProperties;
}

export function EmbeddedCheckout({
    sessionId,
    onSuccess,
    onCancel,
    onError,
    style
}: EmbeddedCheckoutProps) {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const [email, setEmail] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [txHash, setTxHash] = useState('');

    useEffect(() => {
        if (!sessionId) return;
        fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/checkout/sessions/${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error === 'session_expired'
                    ? 'Checkout session has expired'
                    : 'Session not found';
                setError(errorMsg);
                onError?.(errorMsg);
                setLoading(false);
                return;
            }

            setSession(data);
        } catch (err) {
            const errorMsg = 'Failed to load checkout session';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!walletClient || !address || !session) return;

        setPaying(true);
        setError('');

        try {
            // Generate x402 payment (same as hosted checkout)
            const now = Math.floor(Date.now() / 1000);
            const validBefore = now + 300;
            const validAfter = now - 60;

            const nonceBytes = new Uint8Array(32);
            window.crypto.getRandomValues(nonceBytes);
            const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            const usdcAddress = session.network === 'base-sepolia'
                ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

            const sellerAddress = process.env.NEXT_PUBLIC_SELLER_ADDRESS || '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408';

            const domain = {
                name: 'USDC',
                version: '2',
                chainId: session.network === 'base-sepolia' ? 84532 : 8453,
                verifyingContract: usdcAddress as `0x${string}`,
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

            const priceAtomic = parseUnits(session.total, 6).toString();

            const authorization = {
                from: address,
                to: sellerAddress as `0x${string}`,
                value: BigInt(priceAtomic),
                validAfter: BigInt(validAfter),
                validBefore: BigInt(validBefore),
                nonce: nonce as `0x${string}`,
            };

            const signature = await walletClient.signTypedData({
                account: address,
                domain,
                types,
                primaryType: 'TransferWithAuthorization',
                message: authorization,
            });

            const paymentPayload = {
                x402Version: 1,
                scheme: 'exact',
                network: session.network,
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

            const paymentHeader = Buffer.from(JSON.stringify({
                scheme: 'exact',
                network: session.network,
                payload: paymentPayload.payload
            })).toString('base64');

            const payResponse = await fetch(`/api/checkout/sessions/${sessionId}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-PAYMENT': paymentHeader
                },
                body: JSON.stringify({
                    customer_email: email || undefined
                })
            });

            const payResult = await payResponse.json();

            if (!payResponse.ok) {
                throw new Error(payResult.error || 'Payment failed');
            }

            setTxHash(payResult.transaction_hash);
            setPaymentSuccess(true);
            onSuccess?.(session, payResult.transaction_hash);
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
            <div style={{ padding: '40px', textAlign: 'center', ...style }}>
                <p style={{ color: '#718096' }}>Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', background: '#FED7D7', border: '1px solid #FC8181', borderRadius: '8px', ...style }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
                <p style={{ color: '#742A2A', fontWeight: '600' }}>{error}</p>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', ...style }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Payment Successful!</h2>
                <p style={{ color: '#718096', marginBottom: '16px' }}>Your order has been confirmed</p>
                {txHash && (
                    <a
                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '13px', color: '#0366D6', textDecoration: 'underline' }}
                    >
                        View Transaction
                    </a>
                )}
            </div>
        );
    }

    if (!session) return null;

    return (
        <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            overflow: 'hidden',
            ...style
        }}>
            {/* Order Items */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {session.line_items.map((item, i) => (
                    <div
                        key={i}
                        style={{
                            padding: '16px',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            gap: '12px'
                        }}
                    >
                        {item.images.length > 0 && (
                            <img
                                src={item.images[0]}
                                alt={item.name}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '6px'
                                }}
                            />
                        )}
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{item.name}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#718096' }}>
                                <span>Qty: {item.quantity}</span>
                                <span>${(item.total_cents / 100).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div style={{ padding: '16px', background: '#F7FAFC', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: '#2B5FA5' }}>
                    ${session.total} {session.currency}
                </span>
            </div>

            {/* Payment Section */}
            <div style={{ padding: '20px' }}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    style={{
                        width: '100%',
                        padding: '10px',
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
                            {paying ? 'Processing...' : `Pay $${session.total} ${session.currency}`}
                        </button>

                        {onCancel && (
                            <button
                                onClick={onCancel}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'transparent',
                                    color: '#718096',
                                    border: 'none',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
