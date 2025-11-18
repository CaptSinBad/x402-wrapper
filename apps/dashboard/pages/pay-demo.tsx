"use client";

import { useState, useEffect } from 'react';
import { usePrivy, useSignTypedData } from '@privy-io/react-auth';
import { payAndFetch, createSignedPaymentHeader } from '../../../apps/lib/payAndFetch';

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  icon: string;
  category: string;
}

interface Transaction {
  id: string;
  method: string;
  timestamp: string;
  amount: string;
  status: 'pending' | 'verifying' | 'confirmed' | 'settled';
  statusColor: string;
  icon: string;
}

const BOOKS: Book[] = [
  { id: '1', title: 'The Midnight Library', author: 'Matt Haig', price: 14.99, icon: '📚', category: 'Fiction' },
  { id: '2', title: 'Atomic Habits', author: 'James Clear', price: 18.99, icon: '📖', category: 'Self-Help' },
  { id: '3', title: 'Project Hail Mary', author: 'Andy Weir', price: 16.99, icon: '🚀', category: 'Sci-Fi' },
  { id: '4', title: 'The Lean Startup', author: 'Eric Ries', price: 17.99, icon: '💼', category: 'Business' },
  { id: '5', title: 'Dune', author: 'Frank Herbert', price: 15.99, icon: '🌍', category: 'Sci-Fi' },
  { id: '6', title: 'Sapiens', author: 'Yuval Noah Harari', price: 19.99, icon: '🧬', category: 'Non-Fiction' },
];

export default function BookstoreDemoPage() {
  const { user, authenticated, login } = usePrivy();
  const { signTypedData } = useSignTypedData();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [qrCode, setQrCode] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [txCounter, setTxCounter] = useState(0);

  // Initialize after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setTransactions([
      {
        id: '0',
        method: 'Wallet Connected',
        timestamp: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
        amount: 'Ready',
        status: 'confirmed',
        statusColor: '#28a745',
        icon: '✓'
      },
    ]);
    setTxCounter(1);
  }, []);

  const total = Object.keys(cart).reduce((sum, bookId) => {
    const book = BOOKS.find(b => b.id === bookId);
    return sum + (book?.price ?? 0) * cart[bookId];
  }, 0);

  const toggleBook = (bookId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[bookId]) {
        delete newCart[bookId];
      } else {
        newCart[bookId] = 1;
      }
      return newCart;
    });
  };

  const proceedToCheckout = () => {
    if (!authenticated) {
      login();
      return;
    }
    if (total > 0) {
      setPaymentError('');
      addTransaction('Checkout Initiated', 'wallet', 'pending', '#ffc107');
      setStep(2);
    }
  };

  const addTransaction = (method: string, type: string, status: 'pending' | 'verifying' | 'confirmed' | 'settled', statusColor: string) => {
    const icons: { [key: string]: string } = {
      'qr': '📱',
      'wallet': '👛',
      'verify': '✓',
      'success': '💳',
      'settlement': '✅',
    };

    const newId = `tx-${txCounter}-${Date.now()}-${Math.random()}`;
    setTransactions(prev => [
      ...prev,
      {
        id: newId,
        method,
        timestamp: new Date().toLocaleTimeString(),
        amount: type === 'settlement' ? `+${total.toFixed(2)} USDC` : 'Processing',
        status,
        statusColor,
        icon: icons[type] || '•',
      }
    ]);
    setTxCounter(prev => prev + 1);
  };

  const simulatePayment = async () => {
    if (!authenticated || !user?.wallet?.address) {
      setPaymentError('Please connect your wallet');
      return;
    }

    setIsProcessing(true);
    setPaymentError('');
    addTransaction('📱 Opening Wallet', 'wallet', 'pending', '#ffc107');

    try {
      // Build payment requirements directly (no session endpoint needed)
      const priceAtomic = (total * 1e6).toString(); // USDC is 6 decimals
      
      addTransaction('💳 Payment Requirements Ready', 'verify', 'verifying', '#17a2b8');

      // Create a custom payload creation function that uses Privy's signTypedData
      const createPrivyPayload = async ({
        requirement,
        priceAtomic: price,
        walletAddress,
      }: any) => {
        const chainId =
          requirement.network === 'base-mainnet'
            ? 8453
            : requirement.network === 'base-sepolia'
            ? 84532
            : 1;

        // Generate proper random nonce (32-byte hex string)
        const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        const now = Math.floor(Date.now() / 1000);
        const validBefore = now + (requirement.maxTimeoutSeconds || 300);
        const validAfter = 0;

        const domain = {
          name: 'x402 Payment',
          version: '1',
          chainId,
          verifyingContract: requirement.payTo || '',
        };

        const types = {
          Authorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint48' },
            { name: 'validBefore', type: 'uint48' },
            { name: 'nonce', type: 'uint256' },
          ],
        };

        const authorization = {
          from: walletAddress,
          to: requirement.payTo,
          value: price.toString(), // uint256 as string
          validAfter: validAfter.toString(), // uint48 as string
          validBefore: validBefore.toString(), // uint48 as string
          nonce: nonce.toString(), // uint256 as string
        };

        const typedData = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            ...types,
          },
          primaryType: 'Authorization',
          domain,
          message: authorization,
        };

        // Use Privy's signTypedData
        const signResult = await signTypedData(typedData);
        
        // Extract signature string (Privy returns either string or object with signature property)
        const signatureString = typeof signResult === 'string' 
          ? signResult 
          : (signResult?.signature || signResult?.data || JSON.stringify(signResult));

        const payload = {
          signature: signatureString,
          authorization,
        };

        return {
          x402Version: 1,
          scheme: requirement.scheme,
          network: requirement.network,
          payload,
        };
      };

      // Execute x402 payment flow with wallet signature
      const paymentRes = await payAndFetch(
        '/api/bookstore/confirm',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cart, total }),
        },
        {
          walletAddress: user.wallet.address,
          priceAtomicOverride: priceAtomic,
          createPayload: createPrivyPayload,
        }
      );

      if (!paymentRes.ok) {
        let errorDetail = paymentRes.statusText || 'Unknown error';
        try {
          const errorJson = await paymentRes.json();
          errorDetail = errorJson.error || errorJson.message || errorDetail;
        } catch (e) {
          // If response is not JSON, use statusText
        }
        throw new Error(`Payment verification failed (${paymentRes.status}): ${errorDetail}`);
      }

      // Parse successful response
      const responseData = await paymentRes.json();

      addTransaction('✓ Payment Verified', 'success', 'confirmed', '#28a745');

      setTimeout(() => {
        addTransaction(`💰 Settlement: ${total.toFixed(2)} USDC`, 'settlement', 'settled', '#28a745');
        setIsProcessing(false);
        setStep(3);
      }, 1500);
    } catch (err: any) {
      let errorMsg = 'Payment failed';
      
      // Extract error message from various error types
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (err && typeof err === 'object' && err.message) {
        errorMsg = err.message;
      } else if (err && typeof err === 'string') {
        errorMsg = err;
      } else if (err) {
        errorMsg = JSON.stringify(err) || 'Unknown error';
      }

      // Check for specific Privy/wallet errors
      if (errorMsg.includes('origin') || errorMsg.includes('Origin')) {
        errorMsg = 'Wallet connection error: Origin mismatch with Privy. Please configure your Codespaces URL in Privy dashboard.';
      } else if (errorMsg.includes('An error has occurred') || errorMsg.includes('Privy')) {
        errorMsg = `Wallet error: ${errorMsg} - Check that Privy is configured for this origin.`;
      } else if (errorMsg.includes('signature') || errorMsg.includes('sign')) {
        errorMsg = `Signature error: ${errorMsg} - Make sure your wallet is connected and unlocked.`;
      }

      console.error('Payment error:', err);
      console.error('Payment error message:', errorMsg);
      console.error('Payment error stack:', err instanceof Error ? err.stack : 'N/A');
      console.error('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'unknown');
      
      setPaymentError(errorMsg);
      addTransaction(`❌ ${errorMsg}`, 'wallet', 'pending', '#dc3545');
      setIsProcessing(false);
    }
  };

  const resetDemo = () => {
    setStep(1);
    setCart({});
    setQrCode('');
    setTransactions([transactions[0]]);
    setIsProcessing(false);
  };

  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      fontFamily: 'Inter, ui-sans-serif, system-ui',
      background: 'linear-gradient(135deg, #faf8f3 0%, #f5f2ed 100%)',
      minHeight: '100vh',
      padding: 0,
      display: 'flex'
    }}>
      {/* Main Content */}
      <div style={{ flex: 1, paddingLeft: 40, paddingRight: 60, paddingTop: 40, paddingBottom: 40, overflowY: 'auto', maxHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 12px 0', color: '#2c1810', letterSpacing: '-0.02em' }}>
            📚 Rare Books Store
          </h1>
          <p style={{ fontSize: 16, color: '#666', margin: 0 }}>
            Browse and purchase rare books - Pay with USDC on Base
          </p>
        </div>

        {/* Step 1: Book Selection */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px 0', color: '#2c1810' }}>
              Featured Books
            </h2>

            {/* Books Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 16, 
              marginBottom: 32 
            }}>
              {BOOKS.map(book => (
                <button
                  key={book.id}
                  onClick={() => toggleBook(book.id)}
                  style={{
                    padding: 20,
                    background: cart[book.id] ? '#fff8f0' : '#fff',
                    border: cart[book.id] ? '2px solid #8b6914' : '1px solid #e1e4e8',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: cart[book.id] ? '0 4px 12px rgba(139, 105, 20, 0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseOver={(e) => {
                    if (!cart[book.id]) {
                      e.currentTarget.style.background = '#faf8f3';
                      e.currentTarget.style.borderColor = '#bbb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!cart[book.id]) {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#e1e4e8';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <span style={{ fontSize: 32 }}>{book.icon}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#8b6914' }}>
                      ${book.price.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#2c1810', marginBottom: 4 }}>
                    {book.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    by {book.author}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                    {book.category}
                  </div>
                  {cart[book.id] && (
                    <div style={{ fontSize: 13, color: '#8b6914', fontWeight: 600 }}>
                      Qty: {cart[book.id]} ✓
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Shopping Cart Panel */}
            {itemCount > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e1e4e8',
                padding: 24,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
                marginTop: 32
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 16, color: '#666' }}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#8b6914' }}>
                    ${total.toFixed(2)} USDC
                  </span>
                </div>
                <button
                  onClick={proceedToCheckout}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: '#8b6914',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#6d5410'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#8b6914'; }}
                >
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Payment Confirmation */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 40,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              textAlign: 'center',
              maxWidth: 500
            }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px 0', color: '#2c1810' }}>
                Complete Your Purchase
              </h2>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px 0' }}>
                Your wallet will pop up to confirm the payment
              </p>

              {/* Connected Wallet Display */}
              <div style={{
                background: '#f0f8ff',
                border: '2px solid #0366d6',
                borderRadius: 12,
                padding: 20,
                margin: '0 0 32px 0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                minHeight: 180
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👛</div>
                <div style={{ fontSize: 14, color: '#0366d6', fontWeight: 600, marginBottom: 8 }}>
                  Wallet Connected
                </div>
                <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'Loading...'}
                </div>
              </div>

              {/* Order Summary */}
              <div style={{
                background: '#faf8f3',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                textAlign: 'left'
              }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12, fontWeight: 600 }}>📦 Order Summary</div>
                {Object.keys(cart).map(bookId => {
                  const book = BOOKS.find(b => b.id === bookId);
                  return (
                    <div key={bookId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                      <span>{book?.title} x {cart[bookId]}</span>
                      <span style={{ fontWeight: 600 }}>${(book!.price * cart[bookId]).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div style={{ borderTop: '1px solid #e1e4e8', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Total in USDC</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#8b6914' }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Error Message */}
              {paymentError && (
                <div style={{
                  background: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: '#721c24',
                  fontSize: 13
                }}>
                  {paymentError}
                </div>
              )}

              {/* Confirm Payment Button */}
              <button
                onClick={simulatePayment}
                disabled={isProcessing || !authenticated}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: isProcessing ? '#ccc' : authenticated ? '#28a745' : '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: isProcessing || !authenticated ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: 12
                }}
                onMouseOver={(e) => { if (!isProcessing && authenticated) e.currentTarget.style.background = '#218838'; }}
                onMouseOut={(e) => { if (!isProcessing && authenticated) e.currentTarget.style.background = '#28a745'; }}
              >
                {isProcessing ? '⏳ Processing Payment...' : '✓ Confirm & Pay with Wallet'}
              </button>

              <button
                onClick={() => setStep(1)}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#8b6914',
                  border: '1px solid #8b6914',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isProcessing ? 0.5 : 1
                }}
                onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.background = '#fff8f0'; }}
                onMouseOut={(e) => { if (!isProcessing) e.currentTarget.style.background = 'transparent'; }}
              >
                ← Back to Books
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Order Confirmation */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 40,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              textAlign: 'center',
              maxWidth: 500
            }}>
              {/* Success Checkmark */}
              <div style={{
                width: 80,
                height: 80,
                background: '#28a745',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 48,
                color: '#fff'
              }}>
                ✓
              </div>

              <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px 0', color: '#2c1810' }}>
                Order Complete!
              </h2>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px 0' }}>
                Thank you for your purchase. Your books are being prepared for delivery.
              </p>

              {/* Receipt */}
              <div style={{
                background: '#faf8f3',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e1e4e8' }}>
                  <span style={{ color: '#666' }}>Order ID</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2c1810', fontWeight: 600 }}>#{Math.random().toString(36).slice(2, 9).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e1e4e8' }}>
                  <span style={{ color: '#666' }}>Amount Paid</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#28a745' }}>${total.toFixed(2)} USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e1e4e8' }}>
                  <span style={{ color: '#666' }}>Items</span>
                  <span style={{ color: '#2c1810', fontWeight: 600 }}>{itemCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Network</span>
                  <span style={{ color: '#2c1810', fontWeight: 600 }}>Base Sepolia</span>
                </div>
              </div>

              <button
                onClick={resetDemo}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#8b6914',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: 12
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#6d5410'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#8b6914'; }}
              >
                ← Continue Shopping
              </button>

              <div style={{ fontSize: 12, color: '#999', paddingTop: 12, borderTop: '1px solid #e1e4e8', marginTop: 12 }}>
                Estimated delivery: 3-5 business days
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar: Transaction Events */}
      <div style={{
        width: 380,
        background: '#fff',
        borderLeft: '1px solid #e1e4e8',
        padding: 24,
        overflowY: 'auto',
        maxHeight: '100vh'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px 0', color: '#2c1810' }}>
          📊 Payment Status
        </h3>

        {/* Events List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              style={{
                padding: 12,
                background: '#faf8f3',
                borderRadius: 8,
                borderLeft: `4px solid ${tx.statusColor}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                <div style={{ fontSize: 20 }}>{tx.icon}</div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  background: tx.statusColor,
                  color: '#fff',
                  borderRadius: 3,
                  textTransform: 'uppercase'
                }}>
                  {tx.status}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c1810', marginBottom: 4 }}>
                {tx.method}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#999' }}>{tx.timestamp}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: tx.statusColor }}>{tx.amount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '2px solid #e1e4e8'
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px 0', color: '#666', textTransform: 'uppercase' }}>
            ℹ️ About This Demo
          </h4>
          <div style={{
            background: '#faf8f3',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            lineHeight: 1.6,
            color: '#666'
          }}>
            This bookstore demo showcases instant payments using the x402 protocol on Base Sepolia testnet.
            <br/><br/>
            <strong>No real books or funds are transferred.</strong> This is a demonstration of the payment flow.
          </div>
        </div>
      </div>
    </div>
  );
}
