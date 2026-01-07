'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    customer_email?: string;
    success_url?: string;
    cancel_url?: string;
    expires_at: string;
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const [email, setEmail] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [txHash, setTxHash] = useState('');

    const sessionId = params.session_id as string;

    useEffect(() => {
        if (!sessionId) return;
        fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/checkout/sessions/${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error === 'session_expired'
                    ? 'This checkout session has expired'
                    : 'Checkout session not found');
                setLoading(false);
                return;
            }

            setSession(data);
            setEmail(data.customer_email || '');
        } catch (err) {
            console.error('Failed to fetch session:', err);
            setError('Failed to load checkout session');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!walletClient || !address || !session) return;

        setPaying(true);
        setError('');

        try {
            // Generate x402 payment
            const now = Math.floor(Date.now() / 1000);
            const validBefore = now + 300; // 5 minutes
            const validAfter = now - 60;

            const nonceBytes = new Uint8Array(32);
            window.crypto.getRandomValues(nonceBytes);
            const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            const usdcAddress = session.network === 'base-sepolia'
                ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

            // Get seller wallet
            const sellerResponse = await fetch(`/api/checkout/sessions/${sessionId}`);
            const sessionData = await sellerResponse.json();

            // For now, use a placeholder - in production, get from session
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

            // Submit payment
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

            // Redirect to success URL if provided
            if (session.success_url) {
                setTimeout(() => {
                    window.location.href = session.success_url!.replace('{CHECKOUT_SESSION_ID}', sessionId);
                }, 2000);
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'Payment failed');
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAFC' }}>
                <p style={{ color: '#4B5563' }}>Loading checkout...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAFC', padding: '20px' }}>
                <div style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{error}</h1>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            marginTop: '24px',
                            padding: '12px 24px',
                            background: '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAFC', padding: '20px' }}>
                <div style={{ maxWidth: '500px', background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', color: '#2D3748' }}>
                        Payment Successful!
                    </h1>
                    <p style={{ fontSize: '16px', color: '#4B5563', marginBottom: '24px' }}>
                        Your order has been confirmed
                    </p>

                    {txHash && (
                        <div style={{ background: '#F0F9FF', border: '1px solid #74C0FC', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', color: '#1971C2', fontWeight: '600', marginBottom: '6px' }}>Transaction Hash:</div>
                            <a
                                href={`https://sepolia.basescan.org/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '13px', color: '#0366D6', wordBreak: 'break-all', textDecoration: 'underline' }}
                            >
                                {txHash}
                            </a>
                        </div>
                    )}

                    {session?.success_url && (
                        <p style={{ fontSize: '14px', color: '#A0AEC0' }}>
                            Redirecting you shortly...
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#F7FAFC', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Checkout</h1>
                    <p style={{ color: '#4B5563' }}>Powered by BinahPay</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
                    {/* Order Summary */}
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Order Summary</h2>
                        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                            {session.line_items.map((item, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '20px',
                                        borderBottom: i < session.line_items.length - 1 ? '1px solid #E2E8F0' : 'none',
                                        display: 'flex',
                                        gap: '16px'
                                    }}
                                >
                                    {item.images.length > 0 && (
                                        <img
                                            src={item.images[0]}
                                            alt={item.name}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '1px solid #E2E8F0'
                                            }}
                                        />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{item.name}</h3>
                                        {item.description && (
                                            <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '8px' }}>{item.description}</p>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#4B5563' }}>Quantity: {item.quantity}</span>
                                            <span style={{ fontSize: '16px', fontWeight: '600' }}>${(item.total_cents / 100).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ padding: '20px', background: '#F7FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '18px', fontWeight: '700' }}>Total</span>
                                <span style={{ fontSize: '24px', fontWeight: '700', color: '#2B5FA5' }}>
                                    ${session.total} {session.currency}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Payment</h2>
                        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px' }}>
                            {/* Email */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        fontSize: '15px'
                                    }}
                                />
                            </div>

                            {/* Wallet */}
                            {!isConnected ? (
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '16px' }}>
                                        Connect your wallet to pay
                                    </p>
                                    <appkit-button />
                                </div>
                            ) : (
                                <div>
                                    <div style={{ background: '#F0F9FF', border: '1px solid #74C0FC', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#1971C2', fontWeight: '600' }}>✓ Wallet Connected</div>
                                            <div style={{ fontSize: '13px', color: '#1971C2', fontFamily: 'monospace' }}>
                                                {address?.slice(0, 6)}...{address?.slice(-4)}
                                            </div>
                                        </div>
                                        <appkit-button />
                                    </div>

                                    {error && (
                                        <div style={{ background: '#FED7D7', border: '1px solid #FC8181', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#742A2A', fontSize: '14px' }}>
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={handlePayment}
                                        disabled={paying}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: paying ? '#CBD5E0' : '#2B5FA5',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            cursor: paying ? 'not-allowed' : 'pointer',
                                            marginBottom: '16px'
                                        }}
                                    >
                                        {paying ? 'Processing...' : `Pay $${session.total} ${session.currency}`}
                                    </button>

                                    <div style={{ fontSize: '12px', color: '#A0AEC0', textAlign: 'center' }}>
                                        🔒 Secured by x402 Protocol
                                    </div>
                                </div>
                            )}

                            {session.cancel_url && (
                                <button
                                    onClick={() => window.location.href = session.cancel_url!}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'transparent',
                                        color: '#4B5563',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        marginTop: '16px'
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
