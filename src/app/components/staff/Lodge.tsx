import { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, Receipt, Edit2, Trash2, Calendar, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LodgeEntry {
  id: number;
  date: string;
  customer_name: string;
  customers?: number;
  price_per_customer?: number;
  revenue: number;
  room_number?: string;
  days_paid?: number;
  phone_number?: string;
  discount_applied?: number;
}

interface LodgeExpense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

interface DailyCreditorEntry {
  name: string;
  amount: number | '';
  item?: string;
  phone?: string;
}

interface SalesReport {
  id: number;
  date: string;
  totalSales: number;
  cashAtHand: number;
  posTransfer: number;
  notPaid: number;
  dailyCreditors?: DailyCreditorEntry[];
  stockbookSales: number;
}

const expenseCategories = ['Fuel', 'Utilities', 'Supplies', 'Maintenance', 'Cleaning', 'Transport', 'Other'];

export default function Lodge() {
  const [entries, setEntries] = useState<LodgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [daysPaid, setDaysPaid] = useState<number | ''>(1);
  const [guests, setGuests] = useState<number | ''>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [discountApplied, setDiscountApplied] = useState<number | ''>(0);

  // Lodge Expenses State
  const [lodgeExpenses, setLodgeExpenses] = useState<LodgeExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');

  // Tab Control
  const [activeTab, setActiveTab] = useState<'bookings' | 'sales_reports'>('bookings');

  // Sales Reports states
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Sales Report Form fields
  const [editingReport, setEditingReport] = useState<SalesReport | null>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashAtHand, setCashAtHand] = useState<number | ''>('');
  const [posTransfer, setPosTransfer] = useState<number | ''>('');
  const [dailyCreditors, setDailyCreditors] = useState<DailyCreditorEntry[]>([]);
  const [existingCreditors, setExistingCreditors] = useState<{ name: string; phone: string; amount: number }[]>([]);
  const [posBreakdowns, setPosBreakdowns] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('lodge_entries')
        .select('*')
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setEntries(data || []);
    } catch (err: any) {
      console.error('Error fetching lodge entries:', err);
      setError(err.message || 'Failed to load lodge entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('department', 'lodge')
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setLodgeExpenses(data || []);
    } catch (err: any) {
      console.error('Error fetching lodge expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error: err } = await supabase
        .from('sales_reports')
        .select('*')
        .eq('department', 'lodge')
        .order('date', { ascending: false });

      if (err) throw err;
      if (data) {
        setSalesReports(data.map((r: any) => ({
          id: Number(r.id),
          date: r.date,
          totalSales: Number(r.total_sales),
          cashAtHand: Number(r.cash_at_hand),
          posTransfer: Number(r.pos_transfer),
          notPaid: Number(r.not_paid),
          dailyCreditors: Array.isArray(r.daily_creditors) ? r.daily_creditors : [],
          stockbookSales: Number(r.stockbook_sales || 0),
        })));
      }
    } catch (e: any) {
      console.error('Error fetching sales reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const { data: posData } = await supabase
        .from('pos_breakdowns')
        .select('date, lodge')
        .order('date', { ascending: false });
      if (posData) {
        setPosBreakdowns(posData);
      }

      const { data: credData } = await supabase
        .from('creditors')
        .select('name, phone_number, amount')
        .eq('department', 'lodge')
        .eq('status', 'UNPAID');
      if (credData) {
        setExistingCreditors(credData.map((c: any) => ({
          name: c.name,
          phone: c.phone_number || '',
          amount: Number(c.amount),
        })));
      }
    } catch (e) {
      console.error('Error fetching auxiliary data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchExpenses();
    fetchReports();
    fetchAuxiliaryData();
  }, []);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(expAmount);
    if (!expCategory || finalAmount <= 0) {
      alert('Please select a category and enter a valid amount.');
      return;
    }

    setSubmittingExpense(true);
    try {
      const { error: insertErr } = await supabase
        .from('expenses')
        .insert([{
          date: expDate,
          category: expCategory,
          description: expDescription,
          amount: finalAmount,
          department: 'lodge',
        }]);

      if (insertErr) throw insertErr;

      setExpDate(new Date().toISOString().split('T')[0]);
      setExpCategory('');
      setExpDescription('');
      setExpAmount('');
      setShowExpenseModal(false);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Error adding lodge expense:', err);
      alert(err.message || 'Failed to save expense.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrice = Number(price);

    if (!customerName || !roomNumber || !guests || finalPrice < 0) {
      alert('Please enter customer name, room number, guests, and a valid price.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: insertErr } = await supabase
        .from('lodge_entries')
        .insert([
          {
            date,
            customer_name: customerName,
            room_number: roomNumber,
            days_paid: Number(daysPaid) || 1,
            customers: Number(guests) || 1,
            phone_number: phoneNumber,
            discount_applied: Number(discountApplied) || 0,
            revenue: finalPrice,
            price_per_customer: null,
          },
        ]);

      if (insertErr) throw insertErr;

      // Reset form and reload
      setCustomerName('');
      setRoomNumber('');
      setDaysPaid(1);
      setGuests(1);
      setPhoneNumber('');
      setPrice('');
      setDiscountApplied(0);
      setDate(new Date().toISOString().split('T')[0]);
      setShowAddModal(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error adding lodge entry:', err);
      alert(err.message || 'Failed to save lodge entry');
    } finally {
      setSubmitting(false);
    }
  };

  const resetReportForm = (targetDate: string) => {
    setReportDate(targetDate);
    setCashAtHand('');
    setDailyCreditors([]);
    setEditingReport(null);

    const matchingPos = posBreakdowns.find(p => p.date === targetDate);
    if (matchingPos) {
      setPosTransfer(Number(matchingPos.lodge) || '');
    } else {
      setPosTransfer('');
    }
  };

  const handleReportDateChange = (newDate: string) => {
    setReportDate(newDate);
    const matchingPos = posBreakdowns.find(p => p.date === newDate);
    if (matchingPos) {
      setPosTransfer(Number(matchingPos.lodge) || '');
    } else {
      setPosTransfer('');
    }
  };

  const getBookingRevenueForDate = (targetDate: string) => {
    return entries
      .filter(e => e.date === targetDate)
      .reduce((sum, e) => sum + Number(e.revenue), 0);
  };

  const addCreditor = () => {
    setDailyCreditors([...dailyCreditors, { name: '', amount: '', item: '', phone: '' }]);
  };

  const removeCreditor = (index: number) => {
    const updated = [...dailyCreditors];
    updated.splice(index, 1);
    setDailyCreditors(updated);
  };

  const updateCreditor = (index: number, field: keyof DailyCreditorEntry, value: any) => {
    const updated = [...dailyCreditors];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'name') {
      const match = existingCreditors.find(ec => ec.name.toLowerCase() === value.toLowerCase());
      if (match) {
        updated[index].phone = match.phone;
      }
    }
    setDailyCreditors(updated);
  };

  const calcDailyDebt = dailyCreditors.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);

    const parsedCash = Number(cashAtHand) || 0;
    const parsedPos = Number(posTransfer) || 0;
    const parsedNotPaid = calcDailyDebt;
    const totalSales = parsedCash + parsedPos + parsedNotPaid;
    const targetBookingSales = getBookingRevenueForDate(reportDate);

    const cleanedCreditors = dailyCreditors.filter(c => c.name.trim() && (Number(c.amount) || 0) > 0);

    const reportPayload = {
      date: reportDate,
      total_sales: totalSales,
      cash_at_hand: parsedCash,
      pos_transfer: parsedPos,
      not_paid: parsedNotPaid,
      stockbook_sales: targetBookingSales,
      daily_creditors: cleanedCreditors,
      department: 'lodge',
    };

    try {
      if (editingReport) {
        const { error: updateErr } = await supabase
          .from('sales_reports')
          .update(reportPayload)
          .eq('id', editingReport.id);

        if (updateErr) throw updateErr;

        if (editingReport.dailyCreditors && editingReport.dailyCreditors.length > 0) {
          for (const oldCreditor of editingReport.dailyCreditors) {
            const { data: existingCred } = await supabase
              .from('creditors')
              .select('id, amount')
              .ilike('name', oldCreditor.name.trim())
              .eq('department', 'lodge')
              .eq('status', 'UNPAID')
              .maybeSingle();

            if (existingCred) {
              const revertedAmount = Math.max(0, Number(existingCred.amount) - (Number(oldCreditor.amount) || 0));
              if (revertedAmount <= 0) {
                await supabase.from('creditors').delete().eq('id', existingCred.id);
              } else {
                await supabase.from('creditors')
                  .update({ amount: revertedAmount })
                  .eq('id', existingCred.id);
              }
            }
          }
        }
      } else {
        const { error: insertErr } = await supabase
          .from('sales_reports')
          .insert([reportPayload]);

        if (insertErr) throw insertErr;
      }

      for (const creditor of cleanedCreditors) {
        const creditorName = creditor.name.trim();
        const creditorAmount = Number(creditor.amount) || 0;
        if (!creditorName || creditorAmount <= 0) continue;

        const { data: existingCred } = await supabase
          .from('creditors')
          .select('id, amount, reason')
          .ilike('name', creditorName)
          .eq('department', 'lodge')
          .eq('status', 'UNPAID')
          .maybeSingle();

        if (existingCred) {
          const newAmount = Number(existingCred.amount) + creditorAmount;
          const syncNote = `[Added ₦${creditorAmount.toLocaleString()} lodge debt on ${reportDate}]`;
          const newReason = existingCred.reason
            ? `${existingCred.reason}\n${syncNote}`
            : syncNote;

          await supabase
            .from('creditors')
            .update({
              amount: newAmount,
              reason: newReason,
              item_bought: creditor.item || null,
              phone_number: creditor.phone || null,
            })
            .eq('id', existingCred.id);
        } else {
          await supabase
            .from('creditors')
            .insert([{
              name: creditorName,
              amount: creditorAmount,
              reason: creditor.item ? `Room/Booking: ${creditor.item}` : null,
              item_bought: creditor.item || null,
              phone_number: creditor.phone || null,
              status: 'UNPAID',
              date: reportDate,
              department: 'lodge',
            }]);
        }
      }

      setShowAddReportModal(false);
      setEditingReport(null);
      await fetchReports();
      await fetchAuxiliaryData();
    } catch (err: any) {
      console.error('Error saving report:', err);
      alert(err.message || 'Failed to save sales report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this sales report? This will also revert any synced creditors.')) return;
    
    try {
      const report = salesReports.find(r => r.id === reportId);
      if (!report) return;

      if (report.dailyCreditors && report.dailyCreditors.length > 0) {
        for (const oldCreditor of report.dailyCreditors) {
          const { data: existingCred } = await supabase
            .from('creditors')
            .select('id, amount')
            .ilike('name', oldCreditor.name.trim())
            .eq('department', 'lodge')
            .eq('status', 'UNPAID')
            .maybeSingle();

          if (existingCred) {
            const revertedAmount = Math.max(0, Number(existingCred.amount) - (Number(oldCreditor.amount) || 0));
            if (revertedAmount <= 0) {
              await supabase.from('creditors').delete().eq('id', existingCred.id);
            } else {
              await supabase.from('creditors')
                .update({ amount: revertedAmount })
                .eq('id', existingCred.id);
            }
          }
        }
      }

      const { error } = await supabase
        .from('sales_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (e: any) {
      console.error('Error deleting report:', e);
      alert(e.message || 'Failed to delete sales report.');
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Lodge Management</h1>
          <p className="text-neutral-600">Track daily lodge entries and revenue</p>
        </div>
        {activeTab === 'bookings' ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Entry</span>
          </button>
        ) : (
          <button
            onClick={() => {
              resetReportForm(new Date().toISOString().split('T')[0]);
              setShowAddReportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Submit Sales Report</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-4 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${
              activeTab === 'bookings'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Bookings & Expenses
          </button>
          <button
            onClick={() => setActiveTab('sales_reports')}
            className={`pb-4 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${
              activeTab === 'sales_reports'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Sales Reports
          </button>
        </nav>
      </div>

      {activeTab === 'bookings' && (
        <>
          {/* Summary Cards — Current Month */}
          {(() => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthEntries = entries.filter((e) => {
              const d = new Date(e.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

            const monthExpenses = lodgeExpenses.filter((ex) => {
              const d = new Date(ex.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-1">Revenue ({monthLabel})</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₦ {monthEntries.reduce((sum, e) => sum + Number(e.revenue), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-1">Bookings ({monthLabel})</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {monthEntries.length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-1">Expenses ({monthLabel})</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₦ {monthExpenses.reduce((sum, ex) => sum + Number(ex.amount), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-1">Discount ({monthLabel})</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₦ {monthEntries.reduce((sum, e) => sum + Number(e.discount_applied || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Lodge Entries Table */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                <p>Loading entries...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p className="text-lg font-medium">No lodge entries found</p>
                <p className="text-sm">Click "Add Entry" to create a daily record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Room</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900">Guests</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900">Days</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Disc. (₦)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-4 text-sm text-neutral-600">{entry.date}</td>
                        <td className="px-4 py-4 text-sm text-neutral-900">
                          {entry.customer_name || 'N/A'}
                          {entry.phone_number && <div className="text-xs text-neutral-500 mt-0.5">{entry.phone_number}</div>}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-neutral-900">{entry.room_number || '-'}</td>
                        <td className="px-4 py-4 text-sm text-center text-neutral-600">{entry.customers || 1}</td>
                        <td className="px-4 py-4 text-sm text-center text-neutral-600">{entry.days_paid || 1}</td>
                        <td className="px-4 py-4 text-sm text-right text-orange-600 font-medium">
                          {entry.discount_applied ? `₦ ${Number(entry.discount_applied).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-green-600 text-right">
                          ₦ {Number(entry.revenue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lodge Expenses Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                <h2 className="text-xl font-semibold text-neutral-900">Lodge Expenses</h2>
              </div>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Expense</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              {loadingExpenses ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
                  <p>Loading expenses...</p>
                </div>
              ) : lodgeExpenses.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <p className="text-lg font-medium">No lodge expenses found</p>
                  <p className="text-sm">Click "Log Expense" to record a lodge-related expense.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Description</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {lodgeExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-4 text-sm text-neutral-600">{exp.date}</td>
                          <td className="px-4 py-4 text-sm text-neutral-900">
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">{exp.category}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-neutral-600">{exp.description || '-'}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-red-600 text-right">
                            ₦ {Number(exp.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'sales_reports' && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {loadingReports ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p>Loading sales reports...</p>
            </div>
          ) : salesReports.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-lg font-medium">No sales reports found</p>
              <p className="text-sm">Click "Submit Sales Report" to create a daily record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Date</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Booking Revenue (₦)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Submitted Sales (₦)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Cash (₦)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">POS / Transfer (₦)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Debt (₦)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Creditors</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {salesReports.map((report) => {
                    const diff = report.totalSales - report.stockbookSales;
                    const isMatch = Math.abs(diff) < 1;
                    return (
                      <tr key={report.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-4 text-sm text-neutral-600 font-medium">{report.date}</td>
                        <td className="px-4 py-4 text-sm text-right text-neutral-900 font-semibold">
                          ₦ {report.stockbookSales.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold">
                          <span className={isMatch ? 'text-green-600' : 'text-red-600'}>
                            ₦ {report.totalSales.toLocaleString()}
                          </span>
                          {!isMatch && (
                            <span className="block text-[10px] font-normal">
                              {diff > 0 ? `+₦${diff.toLocaleString()} over` : `-₦${Math.abs(diff).toLocaleString()} short`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-neutral-600">
                          ₦ {report.cashAtHand.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-neutral-600">
                          ₦ {report.posTransfer.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-red-600 font-medium">
                          ₦ {report.notPaid.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-500 max-w-xs truncate">
                          {report.dailyCreditors && report.dailyCreditors.length > 0 ? (
                            report.dailyCreditors.map((c, i) => (
                              <span key={i} className="inline-block bg-neutral-100 text-neutral-800 text-xs px-1.5 py-0.5 rounded mr-1 mb-1">
                                {c.name}: ₦{Number(c.amount).toLocaleString()}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingReport(report);
                                setReportDate(report.date);
                                setCashAtHand(report.cashAtHand);
                                setPosTransfer(report.posTransfer);
                                setDailyCreditors(report.dailyCreditors || []);
                                setShowAddReportModal(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit Report"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete Report"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Log Lodge Expense</h2>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                  <select
                    required
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-neutral-900 bg-white"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-neutral-900"
                  placeholder="e.g. Generator fuel for weekend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expAmount === '' ? '' : expAmount}
                  onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-neutral-900"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  disabled={submittingExpense}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingExpense && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submittingExpense ? 'Saving...' : 'Log Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Add Lodge Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                    placeholder="e.g. 08012345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                    placeholder="e.g. 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Number of Guests</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={guests === '' ? '' : guests}
                    onChange={(e) => setGuests(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Days Paid For</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={daysPaid === '' ? '' : daysPaid}
                    onChange={(e) => setDaysPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Discount Applied (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountApplied === '' ? '' : discountApplied}
                    onChange={(e) => setDiscountApplied(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Final Total Price (₦)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price === '' ? '' : price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                    placeholder="e.g. 15000"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Enter the final amount collected after discount.</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Adding...' : 'Add Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit/Edit Daily Sales Report Modal */}
      {showAddReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              {editingReport ? 'Edit Daily Sales Report' : 'Submit Daily Sales Report'}
            </h2>
            <form onSubmit={handleSaveReport} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => handleReportDateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Cash at Hand (₦)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cashAtHand}
                    onChange={(e) => setCashAtHand(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">POS / Transfer (₦)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={posTransfer}
                    onChange={(e) => setPosTransfer(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 bg-white"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Auto-fills from today's POS breakdown for lodge if available, but can be overridden.
                  </p>
                </div>
              </div>

              {/* Daily Creditors Mini-Form */}
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-neutral-800">Daily Creditors Breakdown</h3>
                  <button
                    type="button"
                    onClick={addCreditor}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Creditor
                  </button>
                </div>

                <datalist id="existing-creditors-list">
                  {existingCreditors.map((ec, idx) => (
                    <option key={idx} value={ec.name} />
                  ))}
                </datalist>

                {dailyCreditors.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {dailyCreditors.map((cred, idx) => (
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-neutral-50 p-2 rounded-lg border border-neutral-200" key={idx}>
                        <div className="w-full sm:flex-1">
                          <label className="block text-[10px] text-neutral-500 sm:hidden">Name</label>
                          <input
                            type="text"
                            placeholder="Creditor Name"
                            required
                            value={cred.name}
                            onChange={(e) => updateCreditor(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-900"
                            list="existing-creditors-list"
                          />
                        </div>
                        <div className="w-full sm:w-28">
                          <label className="block text-[10px] text-neutral-500 sm:hidden">Amount (₦)</label>
                          <input
                            type="number"
                            placeholder="Amount"
                            required
                            min="1"
                            value={cred.amount || ''}
                            onChange={(e) => updateCreditor(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-900"
                          />
                        </div>
                        <div className="w-full sm:flex-1">
                          <label className="block text-[10px] text-neutral-500 sm:hidden">Room / Booking</label>
                          <input
                            type="text"
                            placeholder="e.g. Room 101 Booking"
                            value={cred.item || ''}
                            onChange={(e) => updateCreditor(idx, 'item', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-900"
                          />
                        </div>
                        <div className="w-full sm:flex-1">
                          <label className="block text-[10px] text-neutral-500 sm:hidden">Phone</label>
                          <input
                            type="text"
                            placeholder="Phone Number"
                            value={cred.phone || ''}
                            onChange={(e) => updateCreditor(idx, 'phone', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCreditor(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors self-end sm:self-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg text-xs text-neutral-500">
                    No creditors added for today.
                  </div>
                )}

                <div className="flex justify-between items-center bg-neutral-100 p-2.5 rounded-lg border border-neutral-200 mt-2 text-sm font-semibold">
                  <span className="text-neutral-700">Calculated Debt (Not Paid) Total:</span>
                  <span className="text-red-700 text-base">₦ {calcDailyDebt.toLocaleString()}</span>
                </div>
              </div>

              {/* Target booking revenue reference */}
              {(() => {
                const targetRev = getBookingRevenueForDate(reportDate);
                return (
                  <div className="bg-purple-50 p-3.5 rounded-lg border border-purple-200 flex items-center justify-between text-sm font-medium">
                    <div>
                      <span className="text-purple-800 font-semibold">Booking Calculated Sales</span>
                      <p className="text-xs text-purple-600 mt-0.5">Sum of bookings logged for {reportDate}</p>
                    </div>
                    <span className="text-purple-900 font-extrabold text-lg">₦ {targetRev.toLocaleString()}</span>
                  </div>
                );
              })()}

              {/* Reconciliation preview */}
              {(() => {
                const received = (Number(cashAtHand) || 0) + (Number(posTransfer) || 0) + calcDailyDebt;
                const targetRev = getBookingRevenueForDate(reportDate);
                const diff = received - targetRev;
                const isMatch = Math.abs(diff) < 1;
                return (
                  <div className={`p-3.5 rounded-lg border flex items-center justify-between text-sm font-medium ${
                    isMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <span className={isMatch ? 'text-green-800' : 'text-red-800'}>
                      {isMatch ? '✓ Cash + POS + Debt matches bookings' : 'Cash + POS + Debt total:'}
                    </span>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${isMatch ? 'text-green-900' : 'text-red-900'}`}>
                        ₦ {received.toLocaleString()}
                      </span>
                      {!isMatch && (
                        <p className="text-xs text-red-600">
                          {diff > 0 ? `+₦${diff.toLocaleString()} over` : `-₦${Math.abs(diff).toLocaleString()} short`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddReportModal(false);
                    setEditingReport(null);
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
                >
                  {submittingReport && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingReport ? 'Save Changes' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

