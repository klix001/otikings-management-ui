import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CashSubmissionRow {
  id: number;
  staff_name: string | null;
  date: string;
  cash_at_hand: number;
  creditor_payments: number;
  total_cash: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  department: string;
}

export default function CashApproval() {
  const [submissions, setSubmissions] = useState<CashSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('cash_submissions')
        .select('*')
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Error fetching cash submissions:', err);
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const { error: updateErr } = await supabase
        .from('cash_submissions')
        .update({ status: 'Approved' })
        .eq('id', id);

      if (updateErr) throw updateErr;
      await fetchSubmissions();
    } catch (err: any) {
      console.error('Error approving submission:', err);
      alert(err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      const { error: updateErr } = await supabase
        .from('cash_submissions')
        .update({ status: 'Rejected' })
        .eq('id', id);

      if (updateErr) throw updateErr;
      await fetchSubmissions();
    } catch (err: any) {
      console.error('Error rejecting submission:', err);
      alert(err.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === 'Pending');

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Cash Approval</h1>
        <p className="text-neutral-600">Review and approve staff cash submissions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-600" />
          <div>
            <p className="font-semibold text-neutral-900">
              {pendingSubmissions.length} Pending Submission{pendingSubmissions.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-neutral-600">
              Total: ₦{' '}
              {pendingSubmissions.reduce((sum, s) => sum + Number(s.total_cash), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p>Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 text-center py-16 text-neutral-500">
          <p className="text-lg font-medium">No cash submissions found</p>
          <p className="text-sm">Submissions from staff will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {submission.staff_name || 'Unknown Staff'}
                    </h3>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 capitalize">
                      {submission.department}
                    </span>
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
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-neutral-600">Date</p>
                      <p className="font-medium text-neutral-900">{submission.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Cash at Hand</p>
                      <p className="font-medium text-neutral-900">
                        ₦ {Number(submission.cash_at_hand).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Creditor Payments</p>
                      <p className="font-medium text-neutral-900">
                        ₦ {Number(submission.creditor_payments).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <p className="text-sm text-neutral-600">Total Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₦ {Number(submission.total_cash).toLocaleString()}
                    </p>
                  </div>
                </div>

                {submission.status === 'Pending' && (
                  <div className="flex flex-col gap-2 lg:w-40">
                    <button
                      onClick={() => handleApprove(submission.id)}
                      disabled={actionLoading === submission.id}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === submission.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(submission.id)}
                      disabled={actionLoading === submission.id}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === submission.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
