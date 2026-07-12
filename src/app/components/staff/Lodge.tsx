import { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, Receipt } from 'lucide-react';
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

  useEffect(() => {
    fetchData();
    fetchExpenses();
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

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Lodge Management</h1>
          <p className="text-neutral-600">Track daily lodge entries and revenue</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Entry</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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

      {/* Add Modal */}
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
    </div>
  );
}

