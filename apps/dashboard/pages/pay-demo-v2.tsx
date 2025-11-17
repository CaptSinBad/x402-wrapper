"use client";

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { usePrivy } from '@privy-io/react-auth';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  icon: string;
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

const MENU_ITEMS: MenuItem[] = [
  { id: '1', name: 'Espresso', price: 2.50, icon: '☕' },
  { id: '2', name: 'Latte', price: 3.50, icon: '🥛' },
  { id: '3', name: 'Cappuccino', price: 3.50, icon: '☕' },
  { id: '4', name: 'Macchiato', price: 4.00, icon: '☕' },
  { id: '5', name: 'Americano', price: 2.50, icon: '☕' },
  { id: '6', name: 'Cold Brew', price: 3.00, icon: '🧊' },
];

export default function PayDemoV2Page() {
  const { user } = usePrivy();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [qrCode, setQrCode] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      method: 'Wallet Connection',
      timestamp: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
      amount: 'Connected',
      status: 'confirmed',
      statusColor: '#28a745',
      icon: '✓'
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const total = Object.keys(selectedItems).reduce((sum, itemId) => {
    const item = MENU_ITEMS.find(m => m.id === itemId);
    return sum + (item?.price ?? 0) * selectedItems[itemId];
  }, 0);

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newState = { ...prev };
      if (newState[itemId]) {
        delete newState[itemId];
      } else {
        newState[itemId] = 1;
      }
      return newState;
    });
  };

  const generateQRCode = async () => {
    try {
      const paymentUrl = `https://x402.org/pay?amount=${total}&currency=USDC&reference=demo-${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(paymentUrl, { width: 300, color: { dark: '#000', light: '#fff' } });
      setQrCode(qrDataUrl);
      
      addTransaction('QR Code Generated', 'qr', 'pending', '#ffc107');
      
      setStep(2);
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  const proceedToPayment = () => {
    if (total > 0) {
      generateQRCode();
    }
  };

  const addTransaction = (method: string, type: string, status: 'pending' | 'verifying' | 'confirmed' | 'settled', statusColor: string) => {
    const icons: { [key: string]: string } = {
      'qr': '📱',
      'wallet': '👛',
      'verify': '🔍',
      'success': '✓',
      'settlement': '💰',
    };

    setTransactions(prev => [
      ...prev,
      {
        id: `tx-${Date.now()}`,
        method,
        timestamp: new Date().toLocaleTimeString(),
        amount: type === 'settlement' ? `+${total} USDC` : 'In Progress',
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
      addTransaction('Signature Verified', 'verify', 'verifying', '#17a2b8');
      
      setTimeout(() => {
        addTransaction('Payment Confirmed', 'success', 'confirmed', '#28a745');
        
        setTimeout(() => {
          addTransaction(`Settlement: ${total} USDC`, 'settlement', 'settled', '#28a745');
          setIsProcessing(false);
          setStep(3);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const resetDemo = () => {
    setStep(1);
    setSelectedItems({});
    setQrCode('');
    setTransactions([transactions[0]]);
    setIsProcessing(false);
  };

  return (
    <div style={{
      fontFamily: 'Inter, ui-sans-serif, system-ui',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #f9f9fb 100%)',
      minHeight: '100vh',
      padding: 0,
      display: 'flex'
    }}>
      {/* Main Content */}
      <div style={{ flex: 1, paddingLeft: 40, paddingRight: 60, paddingTop: 40, paddingBottom: 40, overflowY: 'auto', maxHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 12px 0', color: '#1a202c', letterSpacing: '-0.02em' }}>
            ☕ Coffee Shop
          </h1>
          <p style={{ fontSize: 16, color: '#666', margin: 0 }}>
            Pay with USDC on Base - Instant Settlement
          </p>
        </div>

        {/* Step 1: Product Selection */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px 0', color: '#24292f' }}>
              Select Items
            </h2>

            {/* Menu Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 16, 
              marginBottom: 32 
            }}>
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    padding: 20,
                    background: selectedItems[item.id] ? '#e3f2fd' : '#fff',
                    border: selectedItems[item.id] ? '2px solid #0366d6' : '1px solid #e1e4e8',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: selectedItems[item.id] ? '0 4px 12px rgba(3, 102, 214, 0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseOver={(e) => {
                    if (!selectedItems[item.id]) {
                      e.currentTarget.style.background = '#f9f9fb';
                      e.currentTarget.style.borderColor = '#bbb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!selectedItems[item.id]) {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#e1e4e8';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <span style={{ fontSize: 32 }}>{item.icon}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#0366d6' }}>
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#24292f', marginBottom: 6 }}>
                    {item.name}
                  </div>
                  {selectedItems[item.id] && (
                    <div style={{ fontSize: 13, color: '#0366d6', fontWeight: 600 }}>
                      Qty: {selectedItems[item.id]}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Checkout Panel */}
            {Object.keys(selectedItems).length > 0 && (
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
                  <span style={{ fontSize: 16, color: '#666' }}>Order Total</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#0366d6' }}>
                    ${total.toFixed(2)} USDC
                  </span>
                </div>
                <button
                  onClick={proceedToPayment}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: '#0366d6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#0256c7'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#0366d6'; }}
                >
                  Continue to Payment →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: QR Code Payment */}
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
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px 0', color: '#24292f' }}>
                Scan to Pay
              </h2>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px 0' }}>
                Use your wallet to scan this QR code
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

              {/* Amount Info */}
              <div style={{
                background: '#f9f9fb',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24
              }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total Amount</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0366d6' }}>
                  {total.toFixed(2)} USDC
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>on Base Sepolia</div>
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
                {isProcessing ? '⏳ Processing...' : '✓ Payment Confirmed'}
              </button>

              <button
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#0366d6',
                  border: '1px solid #0366d6',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e3f2fd'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
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

              <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px 0', color: '#24292f' }}>
                Payment Successful
              </h2>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px 0' }}>
                Your payment has been received and settled
              </p>

              {/* Receipt Info */}
              <div style={{
                background: '#f9f9fb',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e1e4e8' }}>
                  <span style={{ color: '#666' }}>Transaction ID</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#24292f', fontWeight: 600 }}>0x{Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e1e4e8' }}>
                  <span style={{ color: '#666' }}>Amount</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#28a745' }}>{total.toFixed(2)} USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Network</span>
                  <span style={{ color: '#24292f', fontWeight: 600 }}>Base Sepolia</span>
                </div>
              </div>

              <button
                onClick={resetDemo}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#0366d6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: 12
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#0256c7'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#0366d6'; }}
              >
                ← Start New Order
              </button>

              <div style={{ fontSize: 12, color: '#999', paddingTop: 12, borderTop: '1px solid #e1e4e8', marginTop: 12 }}>
                Order #{Math.random().toString(36).slice(2, 9).toUpperCase()}
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
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px 0', color: '#24292f' }}>
          📊 Transaction Events
        </h3>

        {/* Events List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {transactions.map((tx, idx) => (
            <div
              key={tx.id}
              style={{
                padding: 12,
                background: '#f9f9fb',
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
              <div style={{ fontSize: 13, fontWeight: 600, color: '#24292f', marginBottom: 4 }}>
                {tx.method}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#999' }}>{tx.timestamp}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: tx.statusColor }}>{tx.amount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Dev Section */}
        <div style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '2px solid #e1e4e8'
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px 0', color: '#666', textTransform: 'uppercase' }}>
            👨‍💻 Developer Info
          </h4>
          <div style={{
            background: '#f9f9fb',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12
          }}>
            <code style={{
              fontSize: 11,
              color: '#24292f',
              lineHeight: 1.6,
              fontFamily: 'monospace'
            }}>
              POST /api/pay<br/>
              {"{"}<br/>
              &nbsp;&nbsp;"amount": {total.toFixed(2)},<br/>
              &nbsp;&nbsp;"currency": "USDC",<br/>
              &nbsp;&nbsp;"network": "base"<br/>
              {"}"}
            </code>
          </div>

          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffecb5',
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            color: '#856404'
          }}>
            ⚠️ This is a demo. Payments use testnet USDC.
          </div>
        </div>
      </div>
    </div>
  );
}
