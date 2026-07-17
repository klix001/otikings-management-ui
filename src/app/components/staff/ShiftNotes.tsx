import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, MessageSquare, Plus, AlertCircle, Clock, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

interface ShiftNote {
  id: string;
  created_at: string;
  content: string;
  author_id: string;
  author_name: string;
  department: string;
  is_important: boolean;
}

export default function ShiftNotes() {
  const navigate = useNavigate();
  const location = useLocation();
  const department = location.pathname.includes('kitchen') ? 'kitchen' : 'bar';

  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('shift_notes')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setNotes(data || []);
    } catch (err: any) {
      console.error('Error fetching shift notes:', err);
      setError(err.message || 'Failed to load shift notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser({ id: user.id, name: profile.full_name || 'Unknown Staff' });
        }
      }
    } catch (err) {
      console.error('Error getting user details:', err);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchNotes();
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    if (!currentUser) {
      setError("Unable to identify current user. Please log in again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase
        .from('shift_notes')
        .insert([{
          content: newContent.trim(),
          author_id: currentUser.id,
          author_name: currentUser.name,
          department: department,
          is_important: isImportant
        }]);

      if (insertErr) throw insertErr;

      setNewContent('');
      setIsImportant(false);
      setShowAddModal(false);
      await fetchNotes();
    } catch (err: any) {
      console.error('Error submitting note:', err);
      setError(err.message || 'Failed to save note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const userInput = window.prompt('Type "delete" to confirm:');
    if (userInput?.toLowerCase() !== 'delete') {
      return;
    }
    try {
      const { error: delErr } = await supabase
        .from('shift_notes')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      await fetchNotes();
    } catch (err: any) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. You may not have permission.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <button 
            onClick={() => navigate('/staff')} 
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1 capitalize">Shift Notes ({department})</h1>
          <p className="text-neutral-600">Leave messages for your shift partners or team members.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Note</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notes Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p>Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-neutral-700">No shift notes yet</p>
            <p className="text-sm mt-1">Be the first to leave a message for your team.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const isMine = currentUser && note.author_id === currentUser.id;
              
              return (
                <div 
                  key={note.id} 
                  className={`p-4 rounded-xl border ${note.is_important ? 'border-red-200 bg-red-50/30' : 'border-neutral-100 bg-neutral-50'} transition-all`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900">{note.author_name}</span>
                      {note.is_important && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 uppercase tracking-wider">
                          Important
                        </span>
                      )}
                    </div>
                    {isMine && (
                      <button 
                        onClick={() => handleDelete(note.id)}
                        className="text-neutral-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-neutral-800 whitespace-pre-wrap leading-relaxed mb-3">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center text-xs text-neutral-500 font-medium">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {new Date(note.created_at).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">Leave a Shift Note</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-neutral-900 resize-none transition-all"
                    placeholder="E.g., We're running low on oranges. Please restock in the morning."
                  />
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                      className="w-5 h-5 border-2 border-neutral-300 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-neutral-900 group-hover:text-blue-700 transition-colors">Mark as Important</span>
                    <span className="block text-xs text-neutral-500 mt-0.5">Highlights this note for the next shift.</span>
                  </div>
                </label>

                <div className="flex gap-3 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newContent.trim()}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Post Note</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
