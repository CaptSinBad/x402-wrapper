"use client";

import { useState } from 'react';
import StepConnectWallet from './StepConnectWallet';
import StepRegisterEndpoint from './StepRegisterEndpoint';
import StepTestEndpoint from './StepTestEndpoint';

const steps = [
  { id: 'connect', title: 'Connect Wallet', icon: '🔐' },
  { id: 'register', title: 'Register Endpoint', icon: '📝' },
  { id: 'test', title: 'Test Payment', icon: '✨' },
];

export default function Wizard() {
  const [index, setIndex] = useState(0);

  const goNext = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Step Indicator - Professional Design */}
      <div style={{ marginBottom: 40, padding: '24px 0' }}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', position: 'relative' }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              {/* Connection line */}
              {i > 0 && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '100%',
                  height: 2,
                  background: i <= index ? '#0366d6' : '#e1e4e8',
                  zIndex: 0,
                  pointerEvents: 'none'
                }}></div>
              )}
              
              {/* Step circle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: i <= index ? '#0366d6' : '#f0f4f8',
                color: i <= index ? '#fff' : '#999',
                fontWeight: 700,
                fontSize: 20,
                zIndex: 1,
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: i === index ? '0 4px 12px rgba(3, 102, 214, 0.3)' : 'none'
              }}>
                {i < index ? '✓' : s.icon}
              </div>

              {/* Step label */}
              <div style={{ position: 'absolute', top: 60, left: 0, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: i === index ? '#0366d6' : '#24292f' }}>
                  {s.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        background: '#fff',
        border: '1px solid #e1e4e8',
        borderRadius: 12,
        padding: 32,
        marginBottom: 32,
        minHeight: 280,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ flex: 1 }}>
          {index === 0 && <StepConnectWallet onNext={goNext} />}
          {index === 1 && <StepRegisterEndpoint onNext={goNext} onBack={goBack} />}
          {index === 2 && <StepTestEndpoint onBack={goBack} />}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button 
          onClick={goBack} 
          disabled={index === 0}
          style={{
            padding: '10px 20px',
            background: index === 0 ? '#f0f4f8' : '#fff',
            color: index === 0 ? '#999' : '#24292f',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            cursor: index === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { if (index > 0) { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#bbb'; } }}
          onMouseOut={(e) => { if (index > 0) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ddd'; } }}
        >
          ← Back
        </button>

        {index < steps.length - 1 ? (
          <button 
            onClick={goNext}
            style={{
              padding: '10px 24px',
              background: '#0366d6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#0256c7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(3, 102, 214, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#0366d6'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            Next →
          </button>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 500, color: '#28a745', textAlign: 'right', padding: '10px 0' }}>
            ✓ Onboarding complete! You're all set.
          </div>
        )}
      </div>
    </div>
  );
}
