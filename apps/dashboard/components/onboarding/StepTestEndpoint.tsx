"use client";

import React from 'react';
import Link from 'next/link';

type Props = {
  onBack: () => void;
};

export default function StepTestEndpoint({ onBack }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Test your endpoint</h2>
      <p className="text-sm text-gray-600 mb-4">Use the Pay Demo to simulate a buyer and confirm your endpoint responds after payment.</p>

      <div className="space-y-3">
        <Link href="/pay-demo" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">Open Pay Demo</Link>
        <div className="text-xs text-gray-500">The Pay Demo supports a fake-mode to test without backend credentials.</div>
      </div>

      <div className="mt-6 flex justify-start">
        <button onClick={onBack} className="px-4 py-2 bg-gray-100 rounded">Back</button>
      </div>
    </div>
  );
}
