import { useState, useEffect } from 'react';
import { CheckCircle, Filter, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CashTransaction {
  id: number;
  staff_name: string | null;
  date: string;
  total_cash: number;
  status: string;
  department: string;
  created_at: string;
}

export default function CashHistory() {
  const [history, setHistory] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('cash_submissions')
        .select('*')
        .in('status', ['Approved', 'Rejected'])
        .order('date', { ascending: false });

      if (deptFilter !== 'all') {
        query = query.eq('department', deptFilter);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) throw fetchErr;
      setHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching cash history:', err);
      setError(err.message || 'Failed to load cash history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [deptFilter]);

  const approvedHistory = history.filter((h) => h.status === 'Approved');
  const totalCollected = approvedHistory.reduce((sum, h) => sum + Number(h.total_cash), 0);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Cash History</h1>
          <p className="text-neutral-600">View all processed cash transactions</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <Filter className="w-5 h-5" />
            Filter
          </button>
          {showFilter && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 z-10 py-2">
              {['all', 'bar', 'kitchen'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => { setDeptFilter(dept); setShowFilter(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 capitalize cursor-pointer ${deptFilter === dept ? 'font-semibold text-orange-600' : 'text-neutral-700'}`}
                >
                  {dept === 'all' ? 'All Departments' : `${dept} Department`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 mb-6">
        <p className="text-sm text-neutral-600 mb-1">Total Cash Collected (Approved)</p>
        <p className="text-3xl font-bold text-green-600">₦ {totalCollected.toLocaleString()}</p>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
            <p>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg font-medium">No processed submissions yet</p>
            <p className="text-sm">Approved or rejected submissions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Staff Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Submission Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Amount</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {history.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                      {transaction.staff_name || 'Unknown Staff'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 capitalize">
                        {transaction.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{transaction.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                      ₦ {Number(transaction.total_cash).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {transaction.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
