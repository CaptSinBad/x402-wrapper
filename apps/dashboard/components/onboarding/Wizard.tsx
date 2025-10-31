import { useState } from 'react';
import StepConnectWallet from './StepConnectWallet';
import StepRegisterEndpoint from './StepRegisterEndpoint';
import StepTestEndpoint from './StepTestEndpoint';

const steps = [
  { id: 'connect', title: 'Connect Wallet' },
  { id: 'register', title: 'Register Endpoint' },
  { id: 'test', title: 'Test Endpoint' },
];

export default function Wizard() {
  const [index, setIndex] = useState(0);

  const goNext = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div>
      <div className="mb-4">
        <ol className="flex gap-4">
          {steps.map((s, i) => (
            <li key={s.id} className={i === index ? 'font-semibold' : 'text-gray-500'}>
              {i + 1}. {s.title}
            </li>
          ))}
        </ol>
      </div>

      <div className="min-h-[220px]">
        {index === 0 && <StepConnectWallet onNext={goNext} />}
        {index === 1 && <StepRegisterEndpoint onNext={goNext} onBack={goBack} />}
        {index === 2 && <StepTestEndpoint onBack={goBack} />}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={goBack} className="px-4 py-2 bg-gray-100 rounded" disabled={index===0}>
          Back
        </button>
        {index < steps.length - 1 ? (
          <button onClick={goNext} className="px-4 py-2 bg-blue-600 text-white rounded">
            Next
          </button>
        ) : (
          <div className="text-sm text-gray-600">You're done — try testing your endpoint or registering another.</div>
        )}
      </div>
    </div>
  );
}
