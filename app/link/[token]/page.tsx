'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
// import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

export default function PaymentLinkPage() {
  const params = useParams();
  const token = params?.token as string;

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const [link, setLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Fetch payment link details
  useEffect(() => {
    if (!token) return;

    console.log('[PaymentLink] Fetching link for token:', token);
    fetch(`/api/link/${token}`)
      .then(res => {
        console.log('[PaymentLink] Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('[PaymentLink] Response data:', data);
        if (data.error) {
          console.error('[PaymentLink] Error from API:', data.error);
          setError(data.error === 'not_found' ? 'Payment link not found' : 'Failed to load payment link');
        } else {
          console.log('[PaymentLink] Link loaded successfully:', data.link);
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

  const handlePayment = async () => {
    if (!walletClient || !address || !link) return;

    setPaying(true);
    setError('');

    try {
      // Get metadata
      const metadata = typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata;
      const sellerWallet = metadata?.sellerWallet || process.env.NEXT_PUBLIC_SELLER_ADDRESS;
      const priceUSDC = (link.price_cents / 100).toFixed(2);

      // Generate EIP-712 signature
      const now = Math.floor(Date.now() / 1000);
      const validBefore = now + 3600;
      const validAfter = 0;

      // Generate nonce using browser's crypto API
      const nonceBytes = new Uint8Array(32);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(nonceBytes);
      } else {
        // Fallback for non-browser environments (shouldn't happen in client component)
        for (let i = 0; i < 32; i++) {
          nonceBytes[i] = Math.floor(Math.random() * 256);
        }
      }
      const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const value = parseUnits(priceUSDC, 6);
      const priceAtomic = value.toString();

      const domain = {
        name: 'USDC',
        version: '2',
        chainId: 84532,
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

      console.log('[PaymentLink] Signing payment authorization...');
      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: authorization,
      });

      // Create payment payload
      const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base-sepolia',
        payload: {
          signature,
          authorization: {
            from: address,
            to: sellerWallet,
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
        resource: `${window.location.origin}/link/${token}`,
        description: metadata?.productName || 'Payment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 300,
        asset: USDC_ADDRESS,
        payTo: sellerWallet,
        extra: {
          name: 'USDC',
          version: '2',
        },
      };

      console.log('[PaymentLink] Submitting payment...');

      // Call payment confirmation API
      const response = await fetch('/api/link/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          paymentPayload,
          paymentRequirements
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.errorReason || result.error || 'Payment failed');
      }

      console.log('[PaymentLink] Payment successful!', result);
      setTxHash(result.txHash);
      setSuccess(true);
    } catch (err: any) {
      console.error('[PaymentLink] Payment error:', err);
      setError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: '#666' }}>Loading payment link...</div>
        </div>
      </div>
    );
  }

  if (error && !link) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
        <div style={{ maxWidth: 400, padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e1e4e8', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#24292f', marginBottom: 8 }}>Link Not Found</h2>
          <p style={{ color: '#666', marginBottom: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
        <div style={{ maxWidth: 500, padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e1e4e8', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#28a745', marginBottom: 12 }}>Payment Successful!</h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Your payment has been confirmed on the blockchain.
          </p>

          {txHash && (
            <div style={{ background: '#F0F9FF', border: '1px solid #74C0FC', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#1971C2', fontWeight: 600, marginBottom: 6 }}>Transaction Hash:</div>
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#0366D6', wordBreak: 'break-all', textDecoration: 'underline' }}
              >
                {txHash}
              </a>
            </div>
          )}

          <div style={{ fontSize: 14, color: '#666' }}>
            Thank you for your purchase! ✨
          </div>
        </div>
      </div>
    );
  }

  const metadata = typeof link?.metadata === 'string' ? JSON.parse(link.metadata) : link?.metadata || {};
  const priceUSDC = link?.price_cents ? (link.price_cents / 100).toFixed(2) : '0.00';
  const brandColor = metadata?.brandColor || '#2B5FA5';
  const productName = metadata?.name || 'Payment Required';
  const productDescription = metadata?.description || '';
  const productImage = metadata?.imageUrl;
  const currency = link?.currency || 'USDC';
  const network = link?.network || 'base-sepolia';

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC', padding: '40px 20px' }}>
      <div style={{ maxWidth: 550, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>

        {/* Product Image */}
        {productImage && (
          <img
            src={productImage}
            alt={productName}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'cover'
            }}
          />
        )}

        {/* Header */}
        <div style={{ padding: 40, textAlign: 'center' }}>
          {!productImage && <div style={{ fontSize: 64, marginBottom: 20 }}>💳</div>}
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2D3748', marginBottom: 12, lineHeight: '1.2' }}>
            {productName}
          </h1>
          {productDescription && (
            <p style={{ fontSize: 16, color: '#718096', marginBottom: 0, lineHeight: '1.6' }}>
              {productDescription}
            </p>
          )}
        </div>

        {/* Price */}
        <div style={{ padding: 40, textAlign: 'center', background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)`, color: '#fff' }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: '500' }}>Total Amount</div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-1px' }}>${priceUSDC}</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>≈ {priceUSDC} {currency} on {network}</div>
        </div>

        {/* Payment Section */}
        <div style={{ padding: 40 }}>
          {error && (
            <div style={{ background: '#FEE', border: '1px solid #F77', borderRadius: 10, padding: 16, marginBottom: 20, color: '#C33', fontSize: 14 }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {!isConnected ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: '#718096', marginBottom: 20, lineHeight: '1.6' }}>
                Connect your wallet to complete payment
              </p>
              <appkit-button />
            </div>
          ) : (
            <div>
              <div style={{ background: '#F0F9FF', border: '1px solid #74C0FC', borderRadius: 10, padding: 18, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: '#1971C2', lineHeight: 1.6 }}>
                    <strong>✓ Wallet Connected</strong>
                    <br />
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    style={{
                      padding: '8px 16px',
                      background: 'white',
                      border: '1px solid #74C0FC',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1971C2',
                      cursor: 'pointer'
                    }}
                  >
                    Change Wallet
                  </button>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={paying}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: paying ? '#CBD5E0' : brandColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 17,
                  fontWeight: 600,
                  cursor: paying ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: paying ? 'none' : `0 4px 12px ${brandColor}40`
                }}
                onMouseEnter={(e) => {
                  if (!paying) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {paying ? 'Processing Payment...' : `Pay $${priceUSDC} with ${currency}`}
              </button>

              <div style={{ fontSize: 13, color: '#A0AEC0', textAlign: 'center', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>🔒</span>
                <span>Secured by x402 • Powered by BinahPay</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
