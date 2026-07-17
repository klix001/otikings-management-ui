import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Loader2, AlertCircle, Phone } from 'lucide-react';
import { useLocation } from 'react-router';
import { supabase } from '../../lib/supabase';

interface Creditor {
  id: number;
  name: string;
  amount: number;
  reason: string;
  itemBought: string;
  phoneNumber: string;
  status: 'PAID' | 'UNPAID';
  date: string;
  paymentDate?: string;
}

interface CreditorsProps {
  department?: 'bar' | 'kitchen';
}

export default function Creditors({ department: propDepartment }: CreditorsProps) {
  const location = useLocation();
  const department = propDepartment || (location.pathname.includes('kitchen') ? 'kitchen' : 'bar');

  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formReason, setFormReason] = useState('');
  const [formItemBought, setFormItemBought] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormReason('');
    setFormItemBought('');
    setFormPhoneNumber('');
  };

  // ─── Data Fetching ─────────────────────────────────────────────────
  const fetchCreditors = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('creditors')
        .select('*')
        .eq('department', department)
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;

      if (data) {
        setCreditors(data.map((c: any) => ({
          id: Number(c.id),
          name: c.name,
          amount: Number(c.amount),
          reason: c.reason || '',
          itemBought: c.item_bought || '',
          phoneNumber: c.phone_number || '',
          status: c.status,
          date: c.date,
          paymentDate: c.payment_date || undefined,
        })));
      }
    } catch (err: any) {
      console.error('Error fetching creditors:', err);
      setError(err.message || 'Failed to fetch creditors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditors();
  }, [department]);

  // ─── Add Creditor ──────────────────────────────────────────────────
  const handleAddCreditor = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(formAmount) || 0;

    if (!formName || parsedAmount <= 0) {
      alert('Please fill in the name and a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertErr } = await supabase
        .from('creditors')
        .insert([{
          name: formName,
          amount: parsedAmount,
          reason: formReason || null,
          item_bought: formItemBought || null,
          phone_number: formPhoneNumber || null,
          status: 'UNPAID',
          date: new Date().toISOString().split('T')[0],
          department,
        }]);

      if (insertErr) throw insertErr;

      setShowAddModal(false);
      resetForm();
      await fetchCreditors();
    } catch (err: any) {
      console.error('Error adding creditor:', err);
      alert(err.message || 'Failed to add creditor.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Mark as Paid ──────────────────────────────────────────────────
  const handleMarkPaid = async (id: number) => {
    if (!window.confirm('Mark this creditor as PAID?')) return;
    try {
      const { error: updateErr } = await supabase
        .from('creditors')
        .update({
          status: 'PAID',
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);

      if (updateErr) throw updateErr;
      await fetchCreditors();
    } catch (err: any) {
      console.error('Error updating creditor:', err);
      alert(err.message || 'Failed to update creditor.');
    }
  };

  // ─── Computed Values ───────────────────────────────────────────────
  const totalOutstanding = creditors
    .filter(c => c.status === 'UNPAID')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPaid = creditors
    .filter(c => c.status === 'PAID')
    .reduce((sum, c) => sum + c.amount, 0);

  const unpaidCount = creditors.filter(c => c.status === 'UNPAID').length;

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Creditors</h1>
          <p className="text-neutral-600">Track credit transactions and payments</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Creditor</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-orange-600">
            ₦ {totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">
            ₦ {totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Unpaid Count</p>
          <p className="text-2xl font-bold text-neutral-900">
            {unpaidCount}
          </p>
        </div>
      </div>

      {/* Loading & Error */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-neutral-200">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
          <p className="text-neutral-600 font-medium">Loading creditors...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50 rounded-xl border border-red-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mb-3" />
          <p className="text-red-800 font-semibold mb-2">Error Connecting to Database</p>
          <p className="text-red-600 text-sm max-w-md mb-4">{error}</p>
          <button
            onClick={fetchCreditors}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        /* Creditors Table */
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Date</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Customer</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Details</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Amount</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Phone</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Status</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Payment Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {creditors.map((creditor) => (
                  <tr key={creditor.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-neutral-600">{creditor.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-neutral-900">{creditor.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      <div className="max-w-[200px]">
                        {creditor.itemBought && <div>{creditor.itemBought}</div>}
                        {creditor.reason && <div className="text-xs text-neutral-500 mt-1">{creditor.reason}</div>}
                        {!creditor.itemBought && !creditor.reason && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-neutral-900 text-right">
                      ₦ {creditor.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {creditor.phoneNumber ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-neutral-400" />
                          {creditor.phoneNumber}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {creditor.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          <AlertCircle className="w-4 h-4" />
                          UNPAID
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {creditor.paymentDate || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {creditor.status === 'UNPAID' && (
                        <button
                          onClick={() => handleMarkPaid(creditor.id)}
                          className="px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {creditors.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-neutral-500">
                      No creditors recorded. Click "Add Creditor" to track a new credit transaction.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Add Creditor</h2>
            <form onSubmit={handleAddCreditor} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Name</label>
                <input
                  type="text" required
                  value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., John Kamau"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formPhoneNumber} onChange={(e) => setFormPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 0712 345 678"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Item Bought</label>
                <input
                  type="text"
                  value={formItemBought} onChange={(e) => setFormItemBought(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 3x Tusker Beer, 1x Whiskey"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Amount Owed (₦)</label>
                <input
                  type="number" min="0" required
                  value={formAmount} onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Reason / Notes</label>
                <textarea
                  value={formReason} onChange={(e) => setFormReason(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="e.g., Bar tab for Friday night"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Creditor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
