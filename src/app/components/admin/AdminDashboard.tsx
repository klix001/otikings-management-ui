import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Wallet, Loader2, CalendarDays, Building2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

type TimeFilter = 'today' | 'week' | 'month' | 'quarter' | 'all';

interface RawRow {
  date: string;
  amount: number;
}

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'all', label: 'All Time' },
];

/** Return a Date set to midnight in local timezone for a given date string */
function toLocal(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  return d;
}

function getFilterRange(filter: TimeFilter): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today);
  end.setDate(end.getDate() + 1); // exclusive upper bound

  switch (filter) {
    case 'today':
      return { start: today, end };
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Sunday
      return { start: weekStart, end };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end };
    }
    case 'quarter': {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      const quarterStart = new Date(today.getFullYear(), qMonth, 1);
      return { start: quarterStart, end };
    }
    case 'all':
      return { start: new Date(2000, 0, 1), end };
  }
}

function filterByRange(rows: RawRow[], start: Date, end: Date): RawRow[] {
  return rows.filter((r) => {
    const d = toLocal(r.date);
    return d >= start && d < end;
  });
}

function getFilterLabel(filter: TimeFilter): string {
  switch (filter) {
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': {
      const now = new Date();
      return now.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    case 'quarter': {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3) + 1;
      return `Q${q} ${now.getFullYear()}`;
    }
    case 'all': return 'All Time';
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // Raw data from Supabase
  const [rawRevenue, setRawRevenue] = useState<RawRow[]>([]);
  const [rawExpenses, setRawExpenses] = useState<RawRow[]>([]);
  const [rawCash, setRawCash] = useState<{ status: string; total_cash: number; date: string }[]>([]);

  // Department-level raw data
  const [rawBarRevenue, setRawBarRevenue] = useState<RawRow[]>([]);
  const [rawKitchenRevenue, setRawKitchenRevenue] = useState<RawRow[]>([]);
  const [rawLodgeRevenue, setRawLodgeRevenue] = useState<RawRow[]>([]);
  const [rawBarExpenses, setRawBarExpenses] = useState<RawRow[]>([]);
  const [rawKitchenExpenses, setRawKitchenExpenses] = useState<RawRow[]>([]);
  const [rawLodgeExpenses, setRawLodgeExpenses] = useState<RawRow[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [lodgeRes, expenseRes, cashRes, barSalesRes, kitchenSalesRes, barExpRes, kitchenExpRes, lodgeExpRes, salesReportsRes] = await Promise.all([
        supabase.from('lodge_entries').select('date, revenue').order('date', { ascending: true }),
        supabase.from('expenses').select('date, amount').order('date', { ascending: true }),
        supabase.from('cash_submissions').select('status, total_cash, date'),
        supabase.from('inventory_items').select('date, sold, unit_price').eq('department', 'bar'),
        supabase.from('inventory_items').select('date, sold, unit_price').eq('department', 'kitchen'),
        supabase.from('expenses').select('date, amount').eq('department', 'bar'),
        supabase.from('expenses').select('date, amount').eq('department', 'kitchen'),
        supabase.from('expenses').select('date, amount').eq('department', 'lodge'),
        supabase.from('sales_reports').select('date, total_sales, department'),
      ]);

      const lodgeRevenueMapped = (lodgeRes.data || []).map((r: any) => ({ date: r.date, amount: Number(r.revenue) }));
      // Helper to aggregate inventory items into daily revenue
      const aggregateInventoryRevenue = (data: any[], salesData: any[]) => {
        const revMap: Record<string, number> = {};
        
        // 1. Calculate from real-time inventory
        data.forEach(item => {
          if (!revMap[item.date]) revMap[item.date] = 0;
          revMap[item.date] += (Number(item.sold) || 0) * (Number(item.unit_price) || 0);
        });
        
        // 2. Override with finalized formal sales reports if available
        salesData.forEach(report => {
          if (report.total_sales !== null && report.total_sales !== undefined) {
            revMap[report.date] = Number(report.total_sales);
          }
        });
        
        return Object.entries(revMap).map(([date, amount]) => ({ date, amount }));
      };

      const barSalesReports = (salesReportsRes.data || []).filter((r: any) => r.department === 'bar');
      const kitchenSalesReports = (salesReportsRes.data || []).filter((r: any) => r.department === 'kitchen');

      const barRevenueMapped = aggregateInventoryRevenue(barSalesRes.data || [], barSalesReports);
      const kitchenRevenueMapped = aggregateInventoryRevenue(kitchenSalesRes.data || [], kitchenSalesReports);

      setRawRevenue([...lodgeRevenueMapped, ...barRevenueMapped, ...kitchenRevenueMapped]);
      setRawExpenses((expenseRes.data || []).map((e: any) => ({ date: e.date, amount: Number(e.amount) })));
      setRawCash(cashRes.data || []);

      // Department data
      setRawBarRevenue(barRevenueMapped);
      setRawKitchenRevenue(kitchenRevenueMapped);
      setRawLodgeRevenue((lodgeRes.data || []).map((r: any) => ({ date: r.date, amount: Number(r.revenue) })));
      setRawBarExpenses((barExpRes.data || []).map((e: any) => ({ date: e.date, amount: Number(e.amount) })));
      setRawKitchenExpenses((kitchenExpRes.data || []).map((e: any) => ({ date: e.date, amount: Number(e.amount) })));
      setRawLodgeExpenses((lodgeExpRes.data || []).map((e: any) => ({ date: e.date, amount: Number(e.amount) })));
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered data based on the selected time filter
  const { start, end } = useMemo(() => getFilterRange(timeFilter), [timeFilter]);
  const filteredRevenue = useMemo(() => filterByRange(rawRevenue, start, end), [rawRevenue, start, end]);
  const filteredExpenses = useMemo(() => filterByRange(rawExpenses, start, end), [rawExpenses, start, end]);
  const filteredCash = useMemo(() => {
    return rawCash.filter((c) => {
      const d = toLocal(c.date);
      return d >= start && d < end;
    });
  }, [rawCash, start, end]);

  const totalRevenue = useMemo(() => filteredRevenue.reduce((s, r) => s + r.amount, 0), [filteredRevenue]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const netProfit = totalRevenue - totalExpenses;
  const cashCollected = useMemo(() => filteredCash.filter((c) => c.status === 'Approved').reduce((s, c) => s + Number(c.total_cash), 0), [filteredCash]);
  const pendingCount = useMemo(() => filteredCash.filter((c) => c.status === 'Pending').length, [filteredCash]);
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Chart data: aggregate by date for the selected period
  const chartData = useMemo(() => {
    const dateMap: Record<string, { revenue: number; expenses: number }> = {};

    filteredRevenue.forEach((r) => {
      if (!dateMap[r.date]) dateMap[r.date] = { revenue: 0, expenses: 0 };
      dateMap[r.date].revenue += r.amount;
    });

    filteredExpenses.forEach((e) => {
      if (!dateMap[e.date]) dateMap[e.date] = { revenue: 0, expenses: 0 };
      dateMap[e.date].expenses += e.amount;
    });

    return Object.keys(dateMap)
      .sort()
      .map((date) => ({
        name: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dateMap[date].revenue,
        expenses: dateMap[date].expenses,
      }));
  }, [filteredRevenue, filteredExpenses]);

  // Weekly aggregation for the line chart
  const weeklyData = useMemo(() => {
    const weekMap: Record<string, { revenue: number; expenses: number }> = {};

    filteredRevenue.forEach((r) => {
      const d = new Date(r.date + 'T00:00:00');
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = { revenue: 0, expenses: 0 };
      weekMap[key].revenue += r.amount;
    });

    filteredExpenses.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = { revenue: 0, expenses: 0 };
      weekMap[key].expenses += e.amount;
    });

    return Object.keys(weekMap)
      .sort()
      .map((key) => ({
        name: `Wk ${new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        revenue: weekMap[key].revenue,
        expenses: weekMap[key].expenses,
      }));
  }, [filteredRevenue, filteredExpenses]);

  // Department comparison data
  const deptComparison = useMemo(() => {
    const barRev = filterByRange(rawBarRevenue, start, end).reduce((s, r) => s + r.amount, 0);
    const kitRev = filterByRange(rawKitchenRevenue, start, end).reduce((s, r) => s + r.amount, 0);
    const lodgeRev = filterByRange(rawLodgeRevenue, start, end).reduce((s, r) => s + r.amount, 0);
    const barExp = filterByRange(rawBarExpenses, start, end).reduce((s, e) => s + e.amount, 0);
    const kitExp = filterByRange(rawKitchenExpenses, start, end).reduce((s, e) => s + e.amount, 0);
    const lodgeExp = filterByRange(rawLodgeExpenses, start, end).reduce((s, e) => s + e.amount, 0);

    return [
      { name: 'Bar', revenue: barRev, expenses: barExp, net: barRev - barExp },
      { name: 'Kitchen', revenue: kitRev, expenses: kitExp, net: kitRev - kitExp },
      { name: 'Lodge', revenue: lodgeRev, expenses: lodgeExp, net: lodgeRev - lodgeExp },
    ];
  }, [rawBarRevenue, rawKitchenRevenue, rawLodgeRevenue, rawBarExpenses, rawKitchenExpenses, rawLodgeExpenses, start, end]);

  const filterLabel = getFilterLabel(timeFilter);

  if (loading) {
    return (
      <div className="max-w-7xl flex flex-col items-center justify-center py-24 text-neutral-500">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-3" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Admin Dashboard</h1>
          <p className="text-neutral-600">Business performance — <strong>{filterLabel}</strong></p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-1 shadow-sm overflow-x-auto">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                timeFilter === f.value
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Revenue',
            value: `₦ ${totalRevenue.toLocaleString()}`,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50',
          },
          {
            label: 'Total Expenses',
            value: `₦ ${totalExpenses.toLocaleString()}`,
            icon: TrendingDown,
            color: 'text-red-600',
            bg: 'bg-red-50',
          },
          {
            label: 'Net Profit',
            value: `₦ ${netProfit.toLocaleString()}`,
            icon: DollarSign,
            color: netProfit >= 0 ? 'text-blue-600' : 'text-red-600',
            bg: netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50',
          },
          {
            label: 'Cash Collected',
            value: `₦ ${cashCollected.toLocaleString()}`,
            icon: Wallet,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 md:w-6 md:h-6 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-1">{kpi.label}</p>
            <p className="text-xl md:text-2xl font-bold text-neutral-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        {/* Revenue vs Expenses (Daily) */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-900">Revenue vs Expenses (Daily)</h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`₦ ${value.toLocaleString()}`, undefined]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-neutral-400 text-sm">
              No data available for {filterLabel}
            </div>
          )}
        </div>

        {/* Weekly Revenue & Expenses Trends */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-900">Weekly Trends</h2>
          </div>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`₦ ${value.toLocaleString()}`, undefined]}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} name="Expenses" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-neutral-400 text-sm">
              No data available for {filterLabel}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-neutral-900">Pending Approvals</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-xs md:text-sm text-neutral-600 mt-1">Cash submissions awaiting review</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-neutral-900">Cash Collected</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-green-600">₦ {cashCollected.toLocaleString()}</p>
          <p className="text-xs md:text-sm text-neutral-600 mt-1">Approved cash submissions ({filterLabel})</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-neutral-900">Profit Margin</h3>
          </div>
          <p className={`text-2xl md:text-3xl font-bold ${Number(profitMargin) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {profitMargin}%
          </p>
          <p className="text-xs md:text-sm text-neutral-600 mt-1">Based on {filterLabel.toLowerCase()} data</p>
        </div>
      </div>

      {/* Department Performance Comparison */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-5">
          <Building2 className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-neutral-900">Department Performance ({filterLabel})</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Comparison Bar Chart */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-700 mb-4">Revenue vs Expenses by Department</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptComparison} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 13 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`₦ ${value.toLocaleString()}`, undefined]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Department Cards */}
          <div className="space-y-3">
            {deptComparison.map((dept) => {
              const isProfit = dept.net >= 0;
              const margin = dept.revenue > 0 ? ((dept.net / dept.revenue) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={dept.name}
                  className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                    isProfit ? 'border-l-green-500 border border-neutral-200' : 'border-l-red-500 border border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-neutral-900">{dept.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                        <span className="text-green-600">Rev: ₦{dept.revenue.toLocaleString()}</span>
                        <span className="text-red-600">Exp: ₦{dept.expenses.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfit ? '+' : ''}₦{dept.net.toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-500">{margin}% margin</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
