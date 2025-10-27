import RegisterEndpointForm from '../components/RegisterEndpointForm';
import SellerEndpointsList from '../components/SellerEndpointsList';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Register a New Endpoint</h1>

      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mb-6">
        <RegisterEndpointForm />
      </div>

      <SellerEndpointsList />
    </div>
  );
}
