import { Outlet, NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Hotel,
  Receipt,
  Wallet,
  LogOut,
  Menu,
  X,
  Book
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/kitchen-staff', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/kitchen-staff/inventory', label: 'Inventory', icon: Package },
  { to: '/kitchen-staff/creditors', label: 'Creditors', icon: Users },
  { to: '/kitchen-staff/expenses', label: 'Expenses', icon: Receipt },
  { to: '/kitchen-staff/cash-submission', label: 'Cash Submission', icon: Wallet },
];

export default function KitchenLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen bg-neutral-50 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-neutral-200">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-xl font-bold text-neutral-900">Kitchen Portal</h1>
          <p className="text-sm text-neutral-600 mt-1">Kitchen Management</p>
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
                    ? 'bg-green-50 text-green-700'
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
            onClick={() => navigate('/')}
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
              <h1 className="text-xl font-bold text-neutral-900">Kitchen Portal</h1>
              <p className="text-sm text-neutral-600 mt-1">Kitchen Management</p>
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
                        ? 'bg-green-50 text-green-700'
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
                onClick={() => navigate('/')}
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
  );
}
