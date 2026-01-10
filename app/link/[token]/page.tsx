'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useWalletClient, useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { parseUnits } from 'viem';
import { Loader2, CreditCard, Wallet, AlertCircle, CheckCircle, ExternalLink, Lock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const REQUIRED_CHAIN_ID = 84532; // Base Sepolia

export default function PaymentLinkPage() {
  const params = useParams();
  const token = params?.token as string;

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const [link, setLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [switchingChain, setSwitchingChain] = useState(false);

  // Fetch payment link details
  useEffect(() => {
    if (!token) return;

    fetch(`/api/link/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('[PaymentLink] Error from API:', data.error);
          setError(data.error === 'not_found' ? 'Payment link not found' : 'Failed to load payment link');
        } else {
          setLink(data.link);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[PaymentLink] Failed to fetch link:', err);
        setError('Failed to load payment link');
        setLoading(false);
      });
  }, [token]);

  // Auto-switch to Base Sepolia
  useEffect(() => {
    const autoSwitchChain = async () => {
      if (link && isConnected && chainId !== REQUIRED_CHAIN_ID) {
        try {
          setSwitchingChain(true);
          await switchChain({ chainId: REQUIRED_CHAIN_ID });
        } catch (err: any) {
          console.error('Auto chain switch failed:', err);
          setError('Please switch your wallet to Base Sepolia network');
        } finally {
          setSwitchingChain(false);
        }
      }
    };
    autoSwitchChain();
  }, [link, isConnected, chainId, switchChain]);

  const handlePayment = async () => {
    if (!walletClient || !address || !link) return;

    if (chainId !== REQUIRED_CHAIN_ID) {
      setError('Please switch your wallet to Base Sepolia network');
      return;
    }

    setPaying(true);
    setError('');

    try {
      const metadata = typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata;
      const sellerWallet = metadata?.sellerWallet || process.env.NEXT_PUBLIC_SELLER_ADDRESS;
      const priceUSDC = (link.price_cents / 100).toFixed(2);

      // Generate EIP-712 signature
      const now = Math.floor(Date.now() / 1000);
      const validBefore = now + 3600;
      const validAfter = 0;
      const nonceBytes = new Uint8Array(32);
      window.crypto.getRandomValues(nonceBytes);
      const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const value = parseUnits(priceUSDC, 6);
      const priceAtomic = value.toString();

      const domain = {
        name: 'USDC',
        version: '2',
        chainId: REQUIRED_CHAIN_ID,
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

      const authorization = {
        from: address,
        to: sellerWallet as `0x${string}`,
        value,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce: nonce as `0x${string}`,
      };

      const signature = await walletClient.signTypedData({
        account: address, domain, types, primaryType: 'TransferWithAuthorization', message: authorization,
      });

      const paymentPayload = {
        x402Version: 1, scheme: 'exact', network: 'base-sepolia',
        payload: { signature, authorization: { from: address, to: sellerWallet, value: priceAtomic, validAfter: validAfter.toString(), validBefore: validBefore.toString(), nonce } }
      };

      const paymentRequirements = {
        scheme: 'exact', network: 'base-sepolia', maxAmountRequired: priceAtomic,
        resource: `${window.location.origin}/link/${token}`, description: metadata?.productName || 'Payment',
        mimeType: 'application/json', maxTimeoutSeconds: 300, asset: USDC_ADDRESS, payTo: sellerWallet,
        extra: { name: 'USDC', version: '2' },
      };

      const response = await fetch('/api/link/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, paymentPayload, paymentRequirements })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.message || result.errorReason || result.error || 'Payment failed';
        const isRetryable = result.retryable !== false;
        throw new Error(JSON.stringify({ message: errorMessage, retryable: isRetryable }));
      }

      setTxHash(result.txHash);
      setSuccess(true);
    } catch (err: any) {
      console.error('[PaymentLink] Payment error:', err);
      try {
        const parsedError = JSON.parse(err.message);
        setError(parsedError.message);
      } catch {
        setError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setPaying(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 p-6">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <div className="flex flex-col items-center p-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-3/4 mx-auto bg-zinc-800" />
              <Skeleton className="h-4 w-1/2 mx-auto bg-zinc-800" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error State
  if (error && !link) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 p-6">
        <Card className="max-w-md w-full bg-zinc-900 border-red-900/50">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-900/20 p-3 rounded-full mb-4 w-fit">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-zinc-100">Link Not Found</CardTitle>
            <CardDescription className="text-zinc-400">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 p-6">
        <Card className="max-w-[500px] w-full bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-500/10 p-3 rounded-full mb-4 w-fit">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-zinc-100">Payment Successful!</CardTitle>
            <CardDescription className="text-lg text-zinc-400">
              Your payment has been confirmed on the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {txHash && (
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                  Transaction Hash
                </div>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-blue-400 hover:text-blue-300 hover:underline break-all flex items-center gap-2"
                >
                  {txHash}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}
            <div className="bg-blue-900/20 p-4 rounded-lg text-center border border-blue-900/30">
              <p className="text-sm text-blue-200 font-medium">Thank you for your purchase! ✨</p>
            </div>

            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => window.location.reload()}
            >
              Make Another Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = typeof link?.metadata === 'string' ? JSON.parse(link.metadata) : link?.metadata || {};
  const priceUSDC = link?.price_cents ? (link.price_cents / 100).toFixed(2) : '0.00';
  const productName = metadata?.name || 'Payment Required';
  const productDescription = metadata?.description || '';
  const productImage = metadata?.imageUrl;
  const currency = link?.currency || 'USDC';
  const network = link?.network || 'base-sepolia';

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-950 p-6 selection:bg-blue-500/30">
      {/* Background Gradient Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <Card className="max-w-[500px] w-full bg-zinc-900/80 border-zinc-800 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

        {/* Product Image */}
        {productImage && (
          <div className="w-full h-64 bg-zinc-950/50 flex items-center justify-center p-6 border-b border-zinc-800/50">
            <img
              src={productImage}
              alt={productName}
              className="w-full h-full object-contain rounded-lg shadow-sm"
            />
          </div>
        )}

        <CardHeader className="text-center pb-4 pt-8">
          {!productImage && (
            <div className="mx-auto bg-zinc-800/80 p-4 rounded-2xl mb-6 w-fit ring-1 ring-inset ring-white/5">
              <CreditCard className="h-8 w-8 text-zinc-100" />
            </div>
          )}
          <CardTitle className="text-3xl font-bold text-white text-balance tracking-tight">{productName}</CardTitle>
          {productDescription && (
            <CardDescription className="text-zinc-400 text-balance text-base mt-3 leading-relaxed">
              {productDescription}
            </CardDescription>
          )}
        </CardHeader>

        {/* Price Section */}
        <div className="px-6 pb-8">
          <div className="py-6 text-center bg-zinc-950/50 border border-zinc-800 rounded-xl">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Total Amount</div>
            <div className="text-5xl font-bold tracking-tighter text-white tabular-nums">${priceUSDC}</div>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {priceUSDC} {currency} on {network}
            </div>
          </div>
        </div>

        <CardContent className="space-y-6 pt-0">
          {error && (
            <Alert variant="destructive" className="bg-red-900/10 border-red-900/30 text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Payment Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <div className="text-center space-y-4">
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02]"
                onClick={() => open()}
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
              <p className="text-xs text-zinc-500">Connect your crypto wallet to securely complete this payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 flex items-center justify-between group hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 p-2 rounded-full ring-1 ring-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-zinc-200">Wallet Connected</div>
                    <div className="font-mono text-zinc-500 text-xs">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect()}
                  className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                >
                  Change
                </Button>
              </div>

              <Button
                size="lg"
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.01]"
                onClick={handlePayment}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${priceUSDC} with ${currency}`
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600 uppercase tracking-widest pt-2">
                <Lock className="h-3 w-3" />
                <span>Secured by x402</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
