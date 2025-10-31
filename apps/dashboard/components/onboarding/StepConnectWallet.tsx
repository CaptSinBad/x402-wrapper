import React from 'react';

type Props = {
  onNext: () => void;
};

export default function StepConnectWallet({ onNext }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Connect your wallet</h2>
      <p className="text-sm text-gray-600 mb-4">
        To receive payments you must connect a wallet. We support EVM-compatible wallets (Base) and Solana wallets where applicable.
      </p>

      <div className="mb-4">
        {/* Placeholder: the dashboard already wraps pages with PrivyProvider. Wire the actual connect action to Privy in this component or the parent. */}
        <div id="privy-connect-placeholder" className="mb-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded">Connect Wallet (wire me)</button>
        </div>

        <div className="text-xs text-gray-500">
          Tip: The Connect button above is a scaffold. You can import Privy hooks (e.g. usePrivy) and replace the button to call the client login method.
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded">
          Continue
        </button>
      </div>
    </div>
  );
}
