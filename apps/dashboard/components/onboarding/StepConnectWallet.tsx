"use client";

import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Props = {
  onNext: () => void;
};

export default function StepConnectWallet({ onNext }: Props) {
  const privy = usePrivy();
  const { user, authenticated } = privy as any;
  const login = (privy as any).login as (() => Promise<void>) | undefined;
  const logout = (privy as any).logout as (() => Promise<void>) | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    if (!login) {
      setError('Login not available (Privy not initialized)');
      return;
    }
    try {
      setLoading(true);
      await login();
    } catch (err: any) {
      console.error('Privy login error', err);
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!logout) return;
    try {
      setLoading(true);
      await logout();
    } catch (err) {
      console.error('Privy logout error', err);
    } finally {
      setLoading(false);
    }
  };

  const address = user?.wallet?.address as string | undefined;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Connect your wallet</h2>
      <p className="text-sm text-gray-600 mb-4">
        To receive payments you must connect a wallet. We support EVM-compatible wallets (Base) and Solana wallets where applicable.
      </p>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="mb-4">
        {authenticated ? (
          <div className="flex items-center gap-4">
            <div className="text-sm">Connected: <strong>{address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'unknown'}</strong></div>
            <button onClick={handleDisconnect} disabled={loading} className="px-3 py-1 bg-gray-100 rounded">
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <button onClick={handleConnect} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <div className="text-xs text-gray-500 mt-2">Tip: This uses Privy wallet connect. You’ll be prompted to authenticate via the wallet provider.</div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded">
          Continue
        </button>
      </div>
    </div>
  );
}
