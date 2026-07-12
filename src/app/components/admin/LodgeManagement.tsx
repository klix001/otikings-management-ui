import { useState, useEffect, useMemo } from 'react';
import { Loader2, Users, DollarSign, Receipt, TrendingUp, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Lodge from '../staff/Lodge';

interface LodgeEntry {
  id: number;
  date: string;
  customer_name: string;
  customers?: number;
  revenue: number;
  room_number?: string;
  days_paid?: number;
  discount_applied?: number;
}

interface LodgeExpense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

interface DailySummary {
  date: string;
  guests: number;
  bookings: number;
  revenue: number;
  expenses: number;
  discount: number;
  net: number;
}

type Tab = 'daily' | 'entries';

export default function LodgeManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LodgeEntry[]>([]);
  const [expenses, setExpenses] = useState<LodgeExpense[]>([]);

  // Month navigation
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [lodgeRes, expRes] = await Promise.all([
        supabase.from('lodge_entries').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('department', 'lodge').order('date', { ascending: false }),
      ]);
      setEntries(lodgeRes.data || []);
      setExpenses(expRes.data || []);
    } catch (err) {
      console.error('Error loading lodge data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Build daily summaries for the selected month
  const dailySummaries: DailySummary[] = useMemo(() => {
    const { month, year } = viewMonth;

    const monthEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const dateMap: Record<string, DailySummary> = {};

    monthEntries.forEach((e) => {
      if (!dateMap[e.date]) {
        dateMap[e.date] = { date: e.date, guests: 0, bookings: 0, revenue: 0, expenses: 0, discount: 0, net: 0 };
      }
      dateMap[e.date].guests += Number(e.customers || 1);
      dateMap[e.date].bookings += 1;
      dateMap[e.date].revenue += Number(e.revenue);
      dateMap[e.date].discount += Number(e.discount_applied || 0);
    });

    monthExpenses.forEach((ex) => {
      if (!dateMap[ex.date]) {
        dateMap[ex.date] = { date: ex.date, guests: 0, bookings: 0, revenue: 0, expenses: 0, discount: 0, net: 0 };
      }
      dateMap[ex.date].expenses += Number(ex.amount);
    });

    // Calculate net
    Object.values(dateMap).forEach((d) => {
      d.net = d.revenue - d.expenses;
    });

    return Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, expenses, viewMonth]);

  // Monthly totals
  const monthTotals = useMemo(() => {
    return dailySummaries.reduce(
      (acc, d) => ({
        guests: acc.guests + d.guests,
        bookings: acc.bookings + d.bookings,
        revenue: acc.revenue + d.revenue,
        expenses: acc.expenses + d.expenses,
        discount: acc.discount + d.discount,
        net: acc.net + d.net,
      }),
      { guests: 0, bookings: 0, revenue: 0, expenses: 0, discount: 0, net: 0 }
    );
  }, [dailySummaries]);

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    setViewMonth((prev) => {
      const m = prev.month === 0 ? 11 : prev.month - 1;
      const y = prev.month === 0 ? prev.year - 1 : prev.year;
      return { month: m, year: y };
    });
  };

  const nextMonth = () => {
    setViewMonth((prev) => {
      const m = prev.month === 11 ? 0 : prev.month + 1;
      const y = prev.month === 11 ? prev.year + 1 : prev.year;
      return { month: m, year: y };
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Lodge Department</h1>
        <p className="text-neutral-600">Comprehensive view of lodge operations and daily performance</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('daily')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'daily'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Daily Reports
          </button>
          <button
            onClick={() => setActiveTab('entries')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'entries'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Bookings & Expenses
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'entries' && <Lodge />}
        {activeTab === 'daily' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
                <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-3" />
                <p>Loading lodge data...</p>
              </div>
            ) : (
              <>
                {/* Month Selector */}
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
                    <ChevronLeft className="w-5 h-5 text-neutral-700" />
                  </button>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-semibold text-neutral-900">{monthLabel}</h2>
                  </div>
                  <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
                    <ChevronRight className="w-5 h-5 text-neutral-700" />
                  </button>
                </div>

                {/* Monthly Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Bookings</p>
                    <p className="text-xl font-bold text-neutral-900">{monthTotals.bookings}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Total Guests</p>
                    <p className="text-xl font-bold text-blue-600">{monthTotals.guests}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Revenue</p>
                    <p className="text-xl font-bold text-green-600">₦{monthTotals.revenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Expenses</p>
                    <p className="text-xl font-bold text-red-600">₦{monthTotals.expenses.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Discounts</p>
                    <p className="text-xl font-bold text-orange-600">₦{monthTotals.discount.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Net Profit</p>
                    <p className={`text-xl font-bold ${monthTotals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₦{monthTotals.net.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Daily Summary Cards */}
                {dailySummaries.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                    <p className="text-lg font-medium">No lodge activity for {monthLabel}</p>
                    <p className="text-sm mt-1">Check a different month or add lodge entries.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailySummaries.map((day) => (
                      <div
                        key={day.date}
                        className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-5 hover:shadow-md transition-shadow"
                      >
                        {/* Date header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                              <CalendarDays className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 text-sm">{formatDate(day.date)}</p>
                              <p className="text-xs text-neutral-500">{day.bookings} booking{day.bookings !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            day.net >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            Net: ₦{day.net.toLocaleString()}
                          </div>
                        </div>

                        {/* Metrics grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="flex items-center gap-2 bg-blue-50/50 rounded-lg px-3 py-2">
                            <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Guests</p>
                              <p className="text-sm font-bold text-neutral-900">{day.guests}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-green-50/50 rounded-lg px-3 py-2">
                            <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Revenue</p>
                              <p className="text-sm font-bold text-green-700">₦{day.revenue.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-red-50/50 rounded-lg px-3 py-2">
                            <Receipt className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Expenses</p>
                              <p className="text-sm font-bold text-red-700">₦{day.expenses.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-orange-50/50 rounded-lg px-3 py-2">
                            <DollarSign className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Discount</p>
                              <p className="text-sm font-bold text-orange-700">₦{day.discount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
