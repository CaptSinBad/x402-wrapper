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

      // Generate EIP-712 signature (simplified for brevity)
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
      <div className="flex h-dvh items-center justify-center bg-gray-50/50 p-6">
        <Card className="max-w-md w-full border-border">
          <div className="flex flex-col items-center p-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error State
  if (error && !link) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50/50 p-6">
        <Card className="max-w-md w-full border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full mb-4 w-fit">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Link Not Found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50/50 p-6">
        <Card className="max-w-[500px] w-full border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 p-3 rounded-full mb-4 w-fit">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your payment has been confirmed on the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {txHash && (
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Transaction Hash
                </div>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-primary hover:underline break-all flex items-center gap-2"
                >
                  {txHash}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}
            <div className="bg-blue-50/50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Thank you for your purchase! ✨</p>
            </div>
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
    <div className="min-h-dvh flex items-center justify-center bg-gray-50/50 p-6">
      <Card className="max-w-[550px] w-full border-border shadow-xl overflow-hidden">
        {/* Product Image */}
        {productImage && (
          <div className="w-full h-64 bg-muted/30 flex items-center justify-center p-6 border-b border-border">
            <img
              src={productImage}
              alt={productName}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        )}

        <CardHeader className="text-center pb-2">
          {!productImage && (
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
              <CreditCard className="h-10 w-10 text-primary" />
            </div>
          )}
          <CardTitle className="text-3xl font-bold text-balance leading-tight">{productName}</CardTitle>
          {productDescription && (
            <CardDescription className="text-balance text-base mt-2">
              {productDescription}
            </CardDescription>
          )}
        </CardHeader>

        {/* Price Section */}
        <div className="px-6 py-8 text-center bg-primary text-primary-foreground mx-6 rounded-xl my-4">
          <div className="text-sm font-medium opacity-90 mb-1">Total Amount</div>
          <div className="text-5xl font-bold tracking-tight">${priceUSDC}</div>
          <div className="text-sm opacity-90 mt-2">
            ≈ {priceUSDC} {currency} on {network}
          </div>
        </div>

        <CardContent className="space-y-6 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Connect your wallet to complete payment</p>
              <Button
                size="lg"
                className="w-full max-w-sm"
                onClick={() => open()}
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-foreground">Wallet Connected</div>
                    <div className="font-mono text-muted-foreground text-xs">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => disconnect()}>
                  Change
                </Button>
              </div>

              <Button
                size="lg"
                className="w-full py-6 text-lg"
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

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Secured by x402 • Powered by BinahPay</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
