import Wizard from '../components/onboarding/Wizard';

export default function OnboardingPage() {
  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Seller Onboarding</h1>
        <p className="text-sm text-gray-600 mb-6">
          This wizard will walk a seller through the essential steps: connect a wallet, register an endpoint, and test the endpoint using the Pay Demo.
        </p>

        <div className="bg-white p-6 rounded shadow">
          <Wizard />
        </div>
      </div>
    </div>
  );
}
