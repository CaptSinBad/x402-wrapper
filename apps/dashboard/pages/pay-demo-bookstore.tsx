"use client";

import { useState } from 'react';
import QRCode from 'qrcode';
import { usePrivy } from '@privy-io/react-auth';

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
  const { user } = usePrivy();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [qrCode, setQrCode] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      method: 'Wallet Connected',
      timestamp: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
      amount: 'Ready',
      status: 'confirmed',
      statusColor: '#28a745',
      icon: '✓'
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const generateQRCode = async () => {
    try {
      const paymentUrl = `https://x402.org/pay?amount=${total}&currency=USDC&reference=bookstore-${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(paymentUrl, { width: 300, color: { dark: '#000', light: '#fff' } });
      setQrCode(qrDataUrl);
      addTransaction('QR Generated', 'qr', 'pending', '#ffc107');
      setStep(2);
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  const proceedToCheckout = () => {
    if (total > 0) {
      generateQRCode();
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

    setTransactions(prev => [
      ...prev,
      {
        id: `tx-${Date.now()}`,
        method,
        timestamp: new Date().toLocaleTimeString(),
        amount: type === 'settlement' ? `+${total.toFixed(2)} USDC` : 'Processing',
        status,
        statusColor,
        icon: icons[type] || '•',
      }
    ]);
  };

  const simulatePayment = async () => {
    setIsProcessing(true);
    addTransaction('Scanning QR', 'wallet', 'pending', '#ffc107');
    
    setTimeout(() => {
      addTransaction('Verifying', 'verify', 'verifying', '#17a2b8');
      
      setTimeout(() => {
        addTransaction('Payment Confirmed', 'success', 'confirmed', '#28a745');
        
        setTimeout(() => {
          addTransaction(`Settlement: ${total.toFixed(2)} USDC`, 'settlement', 'settled', '#28a745');
          setIsProcessing(false);
          setStep(3);
        }, 1500);
      }, 1500);
    }, 1500);
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

        {/* Step 2: QR Code Checkout */}
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
                Scan with your wallet to approve payment
              </p>

              {/* QR Code Display */}
              <div style={{
                background: '#fff',
                border: '2px solid #e1e4e8',
                borderRadius: 12,
                padding: 20,
                margin: '0 0 32px 0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 340
              }}>
                {qrCode && (
                  <img src={qrCode} alt="Payment QR Code" style={{ width: 300, height: 300 }} />
                )}
              </div>

              {/* Order Summary */}
              <div style={{
                background: '#faf8f3',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                textAlign: 'left'
              }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>Order Summary</div>
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
                  <span style={{ fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#8b6914' }}>${total.toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Simulate Payment Button */}
              <button
                onClick={simulatePayment}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: isProcessing ? '#ccc' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: 12
                }}
                onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.background = '#218838'; }}
                onMouseOut={(e) => { if (!isProcessing) e.currentTarget.style.background = '#28a745'; }}
              >
                {isProcessing ? '⏳ Processing...' : '✓ Confirm Payment'}
              </button>

              <button
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#8b6914',
                  border: '1px solid #8b6914',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#fff8f0'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
