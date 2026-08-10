import { Outlet, NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  CheckCircle,
  History,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  LogOut,
  Menu,
  X,
  Receipt,
  UserCheck,
  Hotel,
  Truck
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import AuthGuard from '../AuthGuard';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/cash-approval', label: 'Cash Approval', icon: CheckCircle },
  { to: '/admin/cash-history', label: 'Cash History', icon: History },
  { to: '/admin/suppliers', label: 'Supplier Management', icon: TrendingUp },
  { to: '/admin/supplier-deliveries', label: 'Supplier Deliveries', icon: Truck },
  { to: '/admin/creditors', label: 'Creditors', icon: Users },
  { to: '/admin/expenses', label: 'Expenses', icon: Receipt },
  { to: '/admin/bar', label: 'Bar Department', icon: BarChart3 },
  { to: '/admin/kitchen', label: 'Kitchen Department', icon: PieChart },
  { to: '/admin/lodge', label: 'Lodge Department', icon: Hotel },
  { to: '/admin/staff', label: 'Staff Management', icon: UserCheck },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <AuthGuard allowedRoles={['admin', 'super_admin', 'superadmin']}>
    <div className="h-screen bg-neutral-50 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-neutral-200">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-xl font-bold text-neutral-900">Admin Portal</h1>
          <p className="text-sm text-neutral-600 mt-1">Bar & Lodge Mgmt</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-neutral-50 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Switch Role</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-200">
              <h1 className="text-xl font-bold text-neutral-900">Admin Portal</h1>
              <p className="text-sm text-neutral-600 mt-1">Bar & Lodge Mgmt</p>
            </div>

            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-700'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-neutral-50 w-full transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Switch Role</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
