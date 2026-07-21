import { useNavigate } from 'react-router';
import {
  ShoppingCart,
  PackagePlus,
  Truck,
  Receipt,
  Users,
  Hotel,
  Wallet,
  TrendingUp,
  Package,
  DollarSign,
  MessageSquare,
  X,
} from 'lucide-react';

const quickActions = [
  {
    title: 'Record Sales',
    description: 'Add new sales transaction',
    icon: ShoppingCart,
    color: 'bg-green-500',
    route: '/staff/inventory',
  },
  {
    title: 'Add Stock Entry',
    description: 'Update inventory stock',
    icon: PackagePlus,
    color: 'bg-blue-500',
    route: '/staff/inventory',
  },
  {
    title: 'Supplier Delivery',
    description: 'Record supplier delivery',
    icon: Truck,
    color: 'bg-purple-500',
    route: '/staff/suppliers',
  },
  {
    title: 'Add Expense',
    description: 'Record an expense',
    icon: Receipt,
    color: 'bg-orange-500',
    route: '/staff/expenses',
  },
  {
    title: 'Add Creditor',
    description: 'Record credit transaction',
    icon: Users,
    color: 'bg-pink-500',
    route: '/staff/creditors',
  },
  {
    title: 'Lodge Entry',
    description: 'Daily lodge record',
    icon: Hotel,
    color: 'bg-indigo-500',
    route: '/staff/lodge',
  },
  {
    title: 'Submit Cash',
    description: 'Submit cash to admin',
    icon: Wallet,
    color: 'bg-emerald-500',
    route: '/staff/cash-submission',
  },
  {
    title: 'Shift Notes',
    description: 'Leave handover comments',
    icon: MessageSquare,
    color: 'bg-cyan-500',
    route: 'notes',
  },
];

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from 'react-router';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const department = location.pathname.includes('kitchen') ? 'kitchen' : 'bar';
  
  const [recentNotes, setRecentNotes] = useState<any[]>([]);

  const [stats, setStats] = useState({
    todaySales: 0,
    itemsInStock: 0,
    pendingCreditors: 0,
    cashAtHand: 0,
  });
  const [dailyCashBreakdown, setDailyCashBreakdown] = useState<{date: string, amount: number}[]>([]);
  const [showCashModal, setShowCashModal] = useState(false);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('shift_notes')
          .select('*')
          .eq('department', department)
          .order('created_at', { ascending: false })
          .limit(2);
        
        if (!error && data) {
          setRecentNotes(data);
        }
      } catch (err) {
        console.error('Error fetching recent notes:', err);
      }
    };

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const [invRes, credRes, salesRes] = await Promise.all([
          supabase.from('inventory_items').select('closing, sold, unit_price').eq('department', department).eq('date', today),
          supabase.from('creditors').select('id', { count: 'exact' }).eq('department', department).eq('status', 'UNPAID'),
          supabase.from('sales_reports').select('date, cash_at_hand').eq('department', department)
        ]);

        let todaySales = 0;
        let itemsInStock = 0;
        if (invRes.data) {
          invRes.data.forEach(item => {
            todaySales += (Number(item.sold) || 0) * (Number(item.unit_price) || 0);
            itemsInStock += (Number(item.closing) || 0);
          });
        }

        const pendingCreditors = credRes.count || 0;
        
        let cashAtHand = 0;
        const dailyCash: {date: string, amount: number}[] = [];
        if (salesRes.data) {
          salesRes.data.forEach((report: any) => {
            const amt = Number(report.cash_at_hand) || 0;
            cashAtHand += amt;
            if (amt > 0) {
              dailyCash.push({ date: report.date, amount: amt });
            }
          });
        }
        dailyCash.sort((a, b) => b.date.localeCompare(a.date));
        setDailyCashBreakdown(dailyCash);

        setStats({
          todaySales,
          itemsInStock,
          pendingCreditors,
          cashAtHand
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };
    
    fetchRecentNotes();
    fetchStats();
  }, [department]);

  const dynamicStatsCards = [
    { label: 'Today\'s Sales', value: `₦ ${stats.todaySales.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Items in Stock', value: stats.itemsInStock.toLocaleString(), icon: Package, color: 'text-blue-600' },
    { label: 'Pending Creditors', value: stats.pendingCreditors.toString(), icon: Users, color: 'text-orange-600' },
    { label: 'Total Cash at Hand', value: `₦ ${stats.cashAtHand.toLocaleString()}`, icon: DollarSign, color: 'text-purple-600' },
  ];

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Staff Dashboard</h1>
        <p className="text-neutral-600">Quick actions and daily overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dynamicStatsCards.map((stat) => {
          const isCashCard = stat.label === 'Total Cash at Hand';
          return (
            <div
              key={stat.label}
              onClick={isCashCard ? () => setShowCashModal(true) : undefined}
              className={`bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 ${
                isCashCard ? 'cursor-pointer hover:shadow-md hover:border-purple-300 transition-all group' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-600">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xl md:text-2xl font-bold text-neutral-900">{stat.value}</p>
              {isCashCard && (
                <p className="text-xs text-purple-500 mt-1 group-hover:text-purple-700 transition-colors">Click for daily breakdown →</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.route)}
              className="group bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md hover:border-green-300 transition-all text-left"
            >
              <div
                className={`w-10 h-10 md:w-12 md:h-12 ${action.color} rounded-lg flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform`}
              >
                <action.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">{action.title}</h3>
              <p className="text-xs md:text-sm text-neutral-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Notes Widget */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900">Recent Shift Notes</h2>
          <button 
            onClick={() => navigate('notes')}
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700 cursor-pointer"
          >
            View All
          </button>
        </div>
        
        {recentNotes.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 border-dashed rounded-xl p-6 text-center text-neutral-500">
            No recent notes.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentNotes.map((note) => (
              <div 
                key={note.id} 
                className={`p-4 rounded-xl border ${note.is_important ? 'border-red-200 bg-red-50/50' : 'border-neutral-200 bg-white'} shadow-sm`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-neutral-900 text-sm">{note.author_name}</span>
                  {note.is_important && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                      Urgent
                    </span>
                  )}
                  <span className="text-xs text-neutral-400 ml-auto">
                    {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 line-clamp-2">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cash at Hand Breakdown Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Daily Cash at Hand</h2>
                <p className="text-sm text-neutral-500 mt-0.5">Breakdown from sales reports</p>
              </div>
              <button
                onClick={() => setShowCashModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {dailyCashBreakdown.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">No cash at hand records found.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-neutral-700 rounded-tl-lg">Date</th>
                      <th className="px-4 py-3 text-sm font-semibold text-neutral-700 text-right rounded-tr-lg">Cash at Hand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {dailyCashBreakdown.map((entry, i) => (
                      <tr key={i} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-700">{entry.date}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right">₦ {entry.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-neutral-300">
                    <tr className="bg-purple-50">
                      <td className="px-4 py-3 text-sm font-bold text-purple-800">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-purple-800 text-right">
                        ₦ {dailyCashBreakdown.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
