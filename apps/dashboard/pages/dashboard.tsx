import RegisterEndpointForm from '../components/RegisterEndpointForm';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Register a New Endpoint</h1>
      <RegisterEndpointForm />
    </div>
  );
}
