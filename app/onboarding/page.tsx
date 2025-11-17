"use client";

import Wizard from '../../apps/dashboard/components/onboarding/Wizard';

export default function OnboardingPage() {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ maxWidth: 1200 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Seller Onboarding</h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          This wizard will walk you through the essential steps: connect a wallet, register an endpoint, and test the endpoint using the Pay Demo.
        </p>

        <div style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e1e4e8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Wizard />
        </div>
      </div>
    </div>
  );
}
