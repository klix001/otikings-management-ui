import { useState, useEffect } from 'react';
import { Plus, Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router';
import { supabase } from '../../lib/supabase';

interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  receipt_url?: string;
  department: string;
}

const categories = ['Utilities', 'Supplies', 'Maintenance', 'Salaries', 'Transport', 'Marketing', 'Other'];

export default function Expenses() {
  const location = useLocation();
  const department = location.pathname.includes('kitchen') ? 'kitchen' : 'bar';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');

  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('department', department)
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setExpenses(data || []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      alert('Please select a category.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let receiptUrl: string | null = null;

      // Upload receipt if provided
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${department}_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        receiptUrl = urlData.publicUrl;
      }

      const { error: insertErr } = await supabase
        .from('expenses')
        .insert([
          {
            date,
            category,
            description: description.trim(),
            amount: Number(amount),
            receipt_url: receiptUrl,
            department,
          },
        ]);

      if (insertErr) throw insertErr;

      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('');
      setDescription('');
      setAmount('');
      setReceiptFile(null);
      setShowAddModal(false);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Error adding expense:', err);
      alert(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Expenses</h1>
          <p className="text-neutral-600">Track all {department} expenses</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Expense</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 mb-6">
        <p className="text-sm text-neutral-600 mb-1">Total Expenses (All Time)</p>
        <p className="text-3xl font-bold text-red-600">₦ {totalExpenses.toLocaleString()}</p>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
            <p>Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg font-medium">No expenses found</p>
            <p className="text-sm">Click "Add Expense" to log an expense.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Description</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Amount</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-600">{expense.date}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{expense.description}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600 text-right">
                      ₦ {Number(expense.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {expense.receipt_url ? (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          View
                        </a>
                      ) : (
                        <span className="text-sm text-neutral-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  placeholder="e.g., Electricity bill"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Upload Receipt</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-lg hover:border-green-500 transition-colors cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                    <div className="flex text-sm text-neutral-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          accept="image/*,.pdf"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-neutral-500">PNG, JPG, PDF up to 10MB</p>
                    {receiptFile && (
                      <p className="text-sm font-medium text-green-600 mt-2">
                        Selected: {receiptFile.name}
                      </p>
                    )}
                  </div>
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
                  <span>{submitting ? 'Saving...' : 'Add Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
