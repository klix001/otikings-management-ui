import { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function KitchenAnalytics({ hideHeader = false }: { hideHeader?: boolean }) {
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  
  const [rawRevenue, setRawRevenue] = useState<{date: string, amount: number}[]>([]);
  const [rawExpenses, setRawExpenses] = useState<{date: string, category: string, amount: number}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, expRes] = await Promise.all([
          supabase.from('inventory_items').select('date, sold, unit_price').eq('department', 'kitchen'),
          supabase.from('expenses').select('date, category, amount').eq('department', 'kitchen'),
        ]);

        const revMap: Record<string, number> = {};
        (invRes.data || []).forEach(item => {
          if (!revMap[item.date]) revMap[item.date] = 0;
          revMap[item.date] += (Number(item.sold) || 0) * (Number(item.unit_price) || 0);
        });
        
        setRawRevenue(Object.entries(revMap).map(([date, amount]) => ({ date, amount })));
        setRawExpenses((expRes.data || []).map(e => ({
          date: e.date,
          category: e.category,
          amount: Number(e.amount)
        })));
      } catch (err) {
        console.error('Error fetching kitchen analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { filteredRevenue, filteredExpenses, totalRevenue, totalExpenses, netProfit, profitMargin, revenueData, categoryExpenses, profitTrends } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    
    let start = new Date(today);
    if (dateRange === '7days') start.setDate(start.getDate() - 7);
    else if (dateRange === '30days') start.setDate(start.getDate() - 30);
    else if (dateRange === '90days') start.setDate(start.getDate() - 90);
    else if (dateRange === '1year') start.setFullYear(start.getFullYear() - 1);
    else if (dateRange === 'all') start = new Date(2000, 0, 1);

    const fRev = rawRevenue.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return d >= start && d < end;
    });
    
    const fExp = rawExpenses.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d >= start && d < end;
    });

    const totRev = fRev.reduce((s, r) => s + r.amount, 0);
    const totExp = fExp.reduce((s, e) => s + e.amount, 0);
    const net = totRev - totExp;
    const margin = totRev > 0 ? ((net / totRev) * 100).toFixed(1) : '0.0';

    // Chart 1: Revenue, Expenses & Profit Trends (Daily)
    const dateMap: Record<string, { revenue: number, expenses: number }> = {};
    fRev.forEach(r => {
      if (!dateMap[r.date]) dateMap[r.date] = { revenue: 0, expenses: 0 };
      dateMap[r.date].revenue += r.amount;
    });
    fExp.forEach(e => {
      if (!dateMap[e.date]) dateMap[e.date] = { revenue: 0, expenses: 0 };
      dateMap[e.date].expenses += e.amount;
    });
    const revData = Object.keys(dateMap).sort().map(d => ({
      date: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: dateMap[d].revenue,
      expenses: dateMap[d].expenses,
      profit: dateMap[d].revenue - dateMap[d].expenses
    }));

    // Chart 2: Category Expenses
    const catMap: Record<string, number> = {};
    fExp.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const catExp = Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a,b) => b.amount - a.amount);

    // Chart 3: Monthly Profit Trends
    const monthMap: Record<string, { revenue: number, expenses: number }> = {};
    fRev.forEach(r => {
      const m = r.date.substring(0, 7); // YYYY-MM
      if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
      monthMap[m].revenue += r.amount;
    });
    fExp.forEach(e => {
      const m = e.date.substring(0, 7); // YYYY-MM
      if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
      monthMap[m].expenses += e.amount;
    });
    const profTrends = Object.keys(monthMap).sort().map(m => {
      const d = new Date(m + '-01T00:00:00');
      return {
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        profit: monthMap[m].revenue - monthMap[m].expenses
      };
    });

    return {
      filteredRevenue: fRev,
      filteredExpenses: fExp,
      totalRevenue: totRev,
      totalExpenses: totExp,
      netProfit: net,
      profitMargin: margin,
      revenueData: revData,
      categoryExpenses: catExp,
      profitTrends: profTrends
    };
  }, [rawRevenue, rawExpenses, dateRange]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className={hideHeader ? "" : "max-w-7xl"}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {!hideHeader ? (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Kitchen Analytics</h1>
            <p className="text-neutral-600">Kitchen insights and performance trends</p>
          </div>
        ) : (
          <div /> /* Empty div to push filters to the right if needed, or just let flex-end work */
        )}
        <div className={`flex gap-3 ${hideHeader ? 'w-full justify-end' : ''}`}>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg">
            <Calendar className="w-5 h-5 text-neutral-600" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent outline-none text-sm font-medium text-neutral-900"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="1year">Last year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">₦ {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">₦ {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            ₦ {netProfit.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Profit Margin</p>
          <p className={`text-2xl font-bold ${Number(profitMargin) >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
            {profitMargin}%
          </p>
        </div>
      </div>

      {/* Revenue, Expenses, Profit Trends */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Revenue, Expenses & Profit Trends</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorExpenses)"
              name="Expenses"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorProfit)"
              name="Profit"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Expense Breakdown by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryExpenses} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="category" type="category" stroke="#6b7280" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="amount" fill="#f97316" name="Amount (₦)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Trends */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Monthly Profit Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={profitTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#10b981"
                strokeWidth={3}
                name="Profit (₦)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
