import { useNavigate } from 'react-router';
import { Users, Shield, ChefHat } from 'lucide-react';

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-6xl w-full p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">
            Bar, Kitchen & Lodge Management
          </h1>
          <p className="text-neutral-600">Select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/staff')}
            className="group p-5 md:p-8 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all border border-neutral-200 hover:border-green-500"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-green-500 transition-colors">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-green-600 group-hover:text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-2">Bar Staff</h2>
            <p className="text-sm md:text-base text-neutral-600">
              Record bar sales, manage bar inventory, track expenses, and submit cash
            </p>
          </button>

          <button
            onClick={() => navigate('/kitchen-staff')}
            className="group p-5 md:p-8 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all border border-neutral-200 hover:border-blue-500"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-blue-500 transition-colors">
              <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-blue-600 group-hover:text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-2">Kitchen Staff</h2>
            <p className="text-sm md:text-base text-neutral-600">
              Record kitchen sales, manage kitchen inventory, track expenses, and submit cash
            </p>
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="group p-5 md:p-8 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all border border-neutral-200 hover:border-orange-500"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-orange-500 transition-colors">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-orange-600 group-hover:text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-2">Admin</h2>
            <p className="text-sm md:text-base text-neutral-600">
              View analytics, approve cash, compare suppliers, and manage creditors
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
