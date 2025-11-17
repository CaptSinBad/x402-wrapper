"use client";

import { useState } from 'react';
import RegisterEndpointForm from '../components/RegisterEndpointForm';
import SellerEndpointsList from '../components/SellerEndpointsList';
import SalesList from '../components/SalesList';
import DevSettleButton from '../components/DevSettleButton';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'settings'>('overview');

  return (
    <div style={{ 
      fontFamily: 'Inter, ui-sans-serif, system-ui', 
      background: '#fafbfc', 
      minHeight: '100vh',
      paddingTop: 0
    }}>
      {/* Header */}
      <div style={{ 
        background: '#fff',
        borderBottom: '1px solid #e1e4e8',
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: 32,
        paddingBottom: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 8px 0', color: '#24292f' }}>
            💰 Seller Dashboard
          </h1>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
            Manage endpoints, monitor sales, and receive USDC payments
          </p>
        </div>
        <a
          href="/onboarding"
          style={{ 
            fontSize: 14, 
            color: '#fff', 
            textDecoration: 'none', 
            fontWeight: 600, 
            padding: '10px 18px', 
            borderRadius: 6, 
            background: '#0366d6', 
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#0256c7'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#0366d6'; }}
        >
          + Register Endpoint
        </a>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #e1e4e8',
        paddingLeft: 40,
        paddingRight: 40,
        background: '#fff'
      }}>
        {['overview', 'transactions', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '16px 24px',
              background: activeTab === tab ? '#fff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #0366d6' : '2px solid transparent',
              color: activeTab === tab ? '#0366d6' : '#666',
              fontWeight: activeTab === tab ? 600 : 500,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'transactions' && '💳 Transactions'}
            {tab === 'settings' && '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ padding: '40px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
              {/* Total Revenue Card */}
              <div style={{
                background: 'linear-gradient(135deg, #0366d6 0%, #0256c7 100%)',
                borderRadius: 12,
                padding: 24,
                color: '#fff',
                boxShadow: '0 4px 12px rgba(3, 102, 214, 0.15)'
              }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  Total Revenue
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                  0 USDC
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  Across all endpoints
                </div>
              </div>

              {/* Active Endpoints Card */}
              <div style={{
                background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                borderRadius: 12,
                padding: 24,
                color: '#fff',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.15)'
              }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  Active Endpoints
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                  0
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  Accepting payments
                </div>
              </div>

              {/* Total Payments Card */}
              <div style={{
                background: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
                borderRadius: 12,
                padding: 24,
                color: '#fff',
                boxShadow: '0 4px 12px rgba(111, 66, 193, 0.15)'
              }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  Total Payments
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                  0
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  Received this month
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
              {/* Register Endpoint */}
              <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e1e4e8',
                padding: 24,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px 0', color: '#24292f' }}>
                  📝 Register New Endpoint
                </h2>
                <RegisterEndpointForm />
              </div>

              {/* Quick Info */}
              <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e1e4e8',
                padding: 24,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px 0', color: '#24292f' }}>
                  🎯 Getting Started
                </h2>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: '#24292f' }}>1. Register an Endpoint</strong><br/>
                    Add your API path and set the price in USDC
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: '#24292f' }}>2. Share Payment Link</strong><br/>
                    Buyers scan QR or use payment link
                  </div>
                  <div>
                    <strong style={{ color: '#24292f' }}>3. Receive USDC</strong><br/>
                    Instant settlement to your wallet
                  </div>
                </div>
              </div>
            </div>

            {/* Endpoints Section */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e1e4e8',
              padding: 24,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              marginBottom: 20
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px 0', color: '#24292f' }}>
                🔗 Your Endpoints
              </h2>
              <SellerEndpointsList />
            </div>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            <div style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e1e4e8',
              padding: 24,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#24292f' }}>
                  💳 Transaction History
                </h2>
                <button style={{
                  fontSize: 13,
                  padding: '8px 14px',
                  background: '#f0f4f8',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#0366d6'
                }}>
                  📥 Export CSV
                </button>
              </div>
              <SalesList />
            </div>

            {/* Dev Settlement Tool */}
            <div style={{
              background: '#fff3cd',
              borderRadius: 12,
              border: '1px solid #ffecb5',
              padding: 24,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px 0', color: '#856404' }}>
                ⚙️ Dev Tools
              </h2>
              <DevSettleButton />
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e1e4e8',
            padding: 40,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚙️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0', color: '#24292f' }}>
              Settings
            </h2>
            <p style={{ fontSize: 14, color: '#666' }}>
              Settings panel coming soon. Connect your wallet in the top navigation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
