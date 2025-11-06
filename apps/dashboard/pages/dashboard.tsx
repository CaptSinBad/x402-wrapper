import RegisterEndpointForm from '../components/RegisterEndpointForm';
import SellerEndpointsList from '../components/SellerEndpointsList';
import SalesList from '../components/SalesList';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Register a New Endpoint</h1>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Register a New Endpoint</h1>
        <Link
          href="/onboarding"
          className="text-sm text-blue-600 hover:underline"
        >
          Seller Onboarding →
        </Link>
      </div>

      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mb-6">
        <RegisterEndpointForm />
      </div>

      <SellerEndpointsList />
      <SalesList />
    </div>
  );
}
