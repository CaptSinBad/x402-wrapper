"use client";

import React from 'react';

type Props = {
  onNext: () => void;
  onBack: () => void;
};

export default function StepRegisterEndpoint({ onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Register your first endpoint</h2>
      <p className="text-sm text-gray-600 mb-4">Provide basic metadata and a price so buyers can discover and pay for access.</p>

      <form className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600">Endpoint slug</label>
          <input className="w-full border rounded px-3 py-2" placeholder="/weather" />
        </div>

        <div>
          <label className="block text-xs text-gray-600">Price (USD or token)</label>
          <input className="w-full border rounded px-3 py-2" placeholder="$0.01" />
        </div>

        <div>
          <label className="block text-xs text-gray-600">Short description</label>
          <input className="w-full border rounded px-3 py-2" placeholder="Returns real-time weather data" />
        </div>
      </form>

      <div className="mt-4 flex justify-between">
        <button onClick={onBack} className="px-4 py-2 bg-gray-100 rounded">Back</button>
        <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded">Register & Continue</button>
      </div>
    </div>
  );
}
