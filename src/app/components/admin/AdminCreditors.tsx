import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, Phone } from 'lucide-react';
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

export default function AdminCreditors() {
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditors = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('creditors')
        .select('*')
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
  }, []);

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

  const filteredCreditors = creditors.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  const totalOutstanding = creditors
    .filter((c) => c.status === 'UNPAID')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPaid = creditors
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Creditor Management</h1>
        <p className="text-neutral-600">Monitor all creditor accounts and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-neutral-600 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-orange-600">₦ {totalOutstanding.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-neutral-600 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">₦ {totalPaid.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Active Creditors</p>
          <p className="text-2xl font-bold text-neutral-900">
            {creditors.filter((c) => c.status === 'UNPAID').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-6">
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setFilter('ALL')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              filter === 'ALL'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({creditors.length})
          </button>
          <button
            onClick={() => setFilter('UNPAID')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              filter === 'UNPAID'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Unpaid ({creditors.filter((c) => c.status === 'UNPAID').length})
          </button>
          <button
            onClick={() => setFilter('PAID')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              filter === 'PAID'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Paid ({creditors.filter((c) => c.status === 'PAID').length})
          </button>
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
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Name</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Item Bought</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Reason</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Amount</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Phone</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Status</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Date</th>
                  <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Payment Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredCreditors.map((creditor) => (
                  <tr key={creditor.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-neutral-900">{creditor.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{creditor.itemBought || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{creditor.reason || '-'}</td>
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
                    <td className="px-6 py-4 text-sm text-neutral-600">{creditor.date}</td>
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
                {filteredCreditors.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-neutral-500">
                      No creditors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
