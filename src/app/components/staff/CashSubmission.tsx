import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router';
import { supabase } from '../../lib/supabase';

interface CashSubmissionRow {
  id: number;
  date: string;
  cash_at_hand: number;
  creditor_payments: number;
  total_cash: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  department: string;
  staff_name: string | null;
}

export default function CashSubmission() {
  const location = useLocation();
  const department = location.pathname.includes('kitchen') ? 'kitchen' : 'bar';

  const [submissions, setSubmissions] = useState<CashSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [cashAtHand, setCashAtHand] = useState<number | ''>('');
  const [creditorPayments, setCreditorPayments] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const totalCash = (Number(cashAtHand) || 0) + (Number(creditorPayments) || 0);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('cash_submissions')
        .select('*')
        .eq('department', department)
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Error fetching cash submissions:', err);
      setError(err.message || 'Failed to load cash submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashVal = Number(cashAtHand) || 0;
    const creditorVal = Number(creditorPayments) || 0;

    if (cashVal <= 0 && creditorVal <= 0) {
      alert('Please enter a valid cash amount.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Get current user's profile name
      let staffName = 'Unknown Staff';
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profile) {
          staffName = profile.full_name || profile.email || 'Unknown Staff';
        }
      }

      const { error: insertErr } = await supabase
        .from('cash_submissions')
        .insert([
          {
            date,
            cash_at_hand: cashVal,
            creditor_payments: creditorVal,
            total_cash: cashVal + creditorVal,
            status: 'Pending',
            department,
            staff_name: staffName,
          },
        ]);

      if (insertErr) throw insertErr;

      // Reset form
      setCashAtHand('');
      setCreditorPayments('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowAddModal(false);
      await fetchSubmissions();
    } catch (err: any) {
      console.error('Error submitting cash:', err);
      alert(err.message || 'Failed to submit cash');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Cash Submission</h1>
          <p className="text-neutral-600">Submit cash collections to admin</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Submit Cash</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-600">
            {submissions.filter((s) => s.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {submissions.filter((s) => s.status === 'Approved').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600 mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">
            {submissions.filter((s) => s.status === 'Rejected').length}
          </p>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
            <p>Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg font-medium">No cash submissions yet</p>
            <p className="text-sm">Click "Submit Cash" to record your daily collection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Cash at Hand</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Creditor Payments</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Total Cash</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-600">{submission.date}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900 text-right">
                      ₦ {Number(submission.cash_at_hand).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900 text-right">
                      ₦ {Number(submission.creditor_payments).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-neutral-900 text-right">
                      ₦ {Number(submission.total_cash).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {submission.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                      {submission.status === 'Approved' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Approved
                        </span>
                      )}
                      {submission.status === 'Rejected' && (
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Submit Cash</h2>
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
                <label className="block text-sm font-medium text-neutral-700 mb-1">Cash at Hand (₦)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={cashAtHand}
                  onChange={(e) => setCashAtHand(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Creditor Payments Received (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  value={creditorPayments}
                  onChange={(e) => setCreditorPayments(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-neutral-900"
                  placeholder="0"
                />
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-700">Total Cash to Submit:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₦ {totalCash.toLocaleString()}
                  </span>
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
                  <span>{submitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
