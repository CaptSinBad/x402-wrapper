'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { parseUnits } from 'viem';
import { useAccount, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

import { CheckoutProgress } from '../components/CheckoutProgress';
import { TrustBadges } from '../components/TrustBadges';
import { OrderSummaryCard } from '../components/OrderSummaryCard';
import { PaymentCard } from '../components/PaymentCard';
import { CheckoutSuccess } from '../components/CheckoutSuccess';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';

interface LineItem {
    product_id: string;
    name: string;
    description?: string;
    price_cents: number;
    quantity: number;
    total_cents: number;
    images?: string[];
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
    seller_wallet_address?: string;
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { open } = useAppKit();

    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [paying, setPaying] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [txHash, setTxHash] = useState('');

    const sessionId = params?.session_id as string;

    useEffect(() => {
        fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/checkout/sessions/${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load checkout session');
            }

            setSession(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            await open();
        } finally {
            setConnecting(false);
        }
    };

    const handlePay = async () => {
        if (!session || !address || !walletClient) return;

        setPaying(true);
        setPaymentError('');

        try {
            const now = Math.floor(Date.now() / 1000);
            const validBefore = now + 300;
            const validAfter = now - 60;

            const nonceBytes = new Uint8Array(32);
            window.crypto.getRandomValues(nonceBytes);
            const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            const usdcAddress = session.network === 'base-sepolia'
                ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

            // Get fresh session data with seller wallet
            const sellerResponse = await fetch(`/api/checkout/sessions/${sessionId}`);
            const sessionData = await sellerResponse.json();

            const sellerAddress = sessionData.seller_wallet_address;
            if (!sellerAddress) {
                throw new Error('Merchant wallet address not found');
            }

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

            setTxHash(payResult.transaction_hash || payResult.txHash || '');
            setSuccess(true);
        } catch (err: any) {
            console.error('Payment error:', err);
            setPaymentError(err.message || 'Payment failed. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    const handleReturn = () => {
        if (session?.success_url) {
            window.location.href = session.success_url;
        } else {
            router.push('/');
        }
    };

    const handleCancel = () => {
        if (session?.cancel_url) {
            window.location.href = session.cancel_url;
        } else {
            router.back();
        }
    };

    // Calculate pricing
    const subtotalCents = session?.line_items?.reduce((sum, item) => sum + item.total_cents, 0) || 0;
    const feeCents = Math.ceil(subtotalCents * 0.01);
    const currentStep = success ? 3 : (isConnected ? 2 : 1);

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white">
                <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600" />
                            <span className="text-xl font-bold">BinahPay</span>
                        </div>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
                    <Skeleton className="h-10 w-64 mx-auto mb-8 bg-zinc-800" />
                    <div className="grid md:grid-cols-2 gap-8">
                        <Skeleton className="h-80 rounded-2xl bg-zinc-800" />
                        <Skeleton className="h-96 rounded-2xl bg-zinc-800" />
                    </div>
                </main>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Checkout Error</h1>
                    <p className="text-zinc-400 mb-6">{error}</p>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    // Success State
    if (success && session) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white">
                <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600" />
                            <span className="text-xl font-bold">BinahPay</span>
                        </div>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
                    <CheckoutProgress currentStep={3} className="mb-12" />
                    <CheckoutSuccess
                        txHash={txHash}
                        amount={session.total}
                        currency={session.currency}
                        network={session.network}
                        productName={session.line_items?.[0]?.name}
                        onReturn={handleReturn}
                    />
                </main>
            </div>
        );
    }

    // Main Checkout
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600" />
                        <span className="text-xl font-bold">BinahPay</span>
                    </div>
                    <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">
                        Dashboard
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Progress */}
                <CheckoutProgress currentStep={currentStep as 1 | 2 | 3} className="mb-8 sm:mb-12" />

                {/* Two Column Layout */}
                {session && (
                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-start">
                        {/* Left: Order Summary */}
                        <OrderSummaryCard
                            lineItems={session.line_items || []}
                            subtotalCents={subtotalCents}
                            feeCents={feeCents}
                            totalCents={session.total_cents}
                            currency={session.currency}
                        />

                        {/* Right: Payment */}
                        <div className="space-y-6">
                            <PaymentCard
                                email={email}
                                onEmailChange={setEmail}
                                isConnected={isConnected}
                                isConnecting={connecting}
                                isPaying={paying}
                                walletAddress={address}
                                onConnect={handleConnect}
                                onPay={handlePay}
                                error={paymentError}
                            />

                            {/* Cancel Button */}
                            <button
                                onClick={handleCancel}
                                className="w-full py-3 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                            >
                                Cancel and return to store
                            </button>
                        </div>
                    </div>
                )}

                {/* Trust Badges */}
                <div className="mt-12 pt-8 border-t border-zinc-800">
                    <TrustBadges network={session?.network} />
                </div>
            </main>
        </div>
    );
}
