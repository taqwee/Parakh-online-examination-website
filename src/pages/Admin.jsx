/**
 * src/pages/Admin.jsx
 * Admin portal: Category CRUD management, Exam listing, toggle publish, and deletion.
 * Styled with PARAKH Warm Natural Palette.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ExamBuilderModal } from '../components/ExamBuilderModal';
import { Plus, Trash2, Layers, Radio, Sparkles, Eye, X } from 'lucide-react';

export const Admin = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Category Mini-Form State
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Candidate Results Viewer State
  const [selectedExamResults, setSelectedExamResults] = useState(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard');
    } else {
      loadAdminCatalog();
    }
  }, [profile]);

  const loadAdminCatalog = async () => {
    setLoading(true);
    try {
      const [examsRes, catsRes] = await Promise.all([
        supabase
          .from('exams')
          .select('*, categories(name), questions(count)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name')
      ]);

      setExams(examsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Error loading admin catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: categoryName.trim(),
        description: categoryDesc.trim()
      });

      if (error) throw error;

      setCategoryName('');
      setCategoryDesc('');
      loadAdminCatalog();
    } catch (err) {
      alert(err.message || 'Failed to create category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (window.confirm('Delete this category? Exams linked to it will become uncategorized.')) {
      await supabase.from('categories').delete().eq('id', catId);
      loadAdminCatalog();
    }
  };

  const togglePublish = async (examId, currentStatus) => {
    await supabase.from('exams').update({ is_published: !currentStatus }).eq('id', examId);
    loadAdminCatalog();
  };

  const toggleActiveStatus = async (examId, currentActive) => {
    await supabase.from('exams').update({ is_active: !currentActive }).eq('id', examId);
    loadAdminCatalog();
  };

  const toggleResultsPublished = async (examId, currentPublished) => {
    const confirmMsg = currentPublished 
      ? 'Hide results from students?' 
      : 'Publish results? Students will now see their ranks and scorecards.';
    
    if (window.confirm(confirmMsg)) {
      await supabase.from('exams').update({ results_published: !currentPublished }).eq('id', examId);
      loadAdminCatalog();
    }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam and all its associated questions and attempts?')) {
      await supabase.from('exams').delete().eq('id', examId);
      loadAdminCatalog();
    }
  };

  // Fetch Candidate Submissions for Selected Exam
  const handleViewResults = async (exam) => {
    setResultsLoading(true);
    setSelectedExamResults({ examTitle: exam.title, totalMarks: exam.total_marks, list: [] });
    setResultsModalOpen(true);

    try {
      // Check relative route (production/proxy) first, then fallback to local port 4000
      let response;
      try {
        response = await fetch(`/api/admin/exams/${exam.id}/results`);
      } catch {
        response = await fetch(`http://localhost:4000/api/admin/exams/${exam.id}/results`);
      }

      if (!response || !response.ok) {
        throw new Error('Could not fetch results from server. Make sure the backend server is running.');
      }

      const data = await response.json();
      setSelectedExamResults({ 
        examTitle: exam.title, 
        totalMarks: exam.total_marks, 
        list: Array.isArray(data) ? data : [] 
      });
    } catch (err) {
      alert(err.message || 'Error fetching exam results.');
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full flex-1">
        {/* HERO TITLE & ACTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#2D3234] tracking-tight">Administrator Console</h1>
            <p className="text-xs text-[#687074]">Author examinations, configure categories, and oversee assessment delivery.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#4A6B6C] hover:bg-[#3B5758] text-[#F8F6F0] text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition self-start"
          >
            <Plus className="w-4 h-4" /> Create New Exam
          </button>
        </div>

        {/* 1. CATEGORY MANAGEMENT SECTION */}
        <div className="bg-white border border-[#E8E4D9] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4A6B6C]" />
            <h2 className="text-sm font-bold text-[#2D3234]">Academic & Exam Categories</h2>
          </div>

          {/* Inline Form */}
          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="New Category Name (e.g. Information Technology)"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E8E4D9] rounded-xl text-xs text-[#2D3234] placeholder-[#9AA1A6] focus:outline-none focus:border-[#4A6B6C] focus:bg-white transition"
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              className="px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E8E4D9] rounded-xl text-xs text-[#2D3234] placeholder-[#9AA1A6] focus:outline-none focus:border-[#4A6B6C] focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={creatingCategory}
              className="px-4 py-2.5 bg-[#2D3234] hover:bg-[#1E2223] text-[#F8F6F0] rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {creatingCategory ? 'Adding...' : 'Add Category'}
            </button>
          </form>

          {/* Categories Pill List */}
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F5] text-[#2D3234] rounded-xl text-xs font-medium border border-[#E8E4D9]"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="text-[#9AA1A6] hover:text-[#A63B3B] transition"
                  title="Delete category"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 2. EXAMS CATALOG TABLE */}
        <div className="bg-white border border-[#E8E4D9] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#F0ECE1]">
            <h2 className="text-sm font-bold text-[#2D3234]">Active Examination Catalog</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E4D9] text-xs">
              <thead className="bg-[#FAF9F5] text-[#687074] uppercase tracking-wider font-bold text-left">
                <tr>
                  <th className="px-6 py-3.5">Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Format</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Marks</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1] font-medium text-[#2D3234]">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-[#687074]">Loading catalog...</td></tr>
                ) : exams.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-[#687074]">No exams authored yet. Click "Create New Exam" above.</td></tr>
                ) : (
                  exams.map((e) => {
                    const isLive = e.exam_type === 'live' || Boolean(e.scheduled_start_time);

                    return (
                      <tr key={e.id} className="hover:bg-[#FAF9F5] transition">
                        <td className="px-6 py-4 font-bold text-[#2D3234]">
                          <div>{e.title}</div>
                          {isLive && e.scheduled_start_time && (
                            <div className="text-[10px] text-[#D97757] font-semibold mt-0.5">
                              Starts: {new Date(e.scheduled_start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-[#E9EFF0] text-[#3B5758] border border-[#D5E1E2] rounded-lg font-bold text-[11px] uppercase tracking-wider">
                            {e.categories?.name || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#FBECE7] text-[#D97757] border border-[#F6C6B8] uppercase tracking-wider">
                              <Radio className="w-2.5 h-2.5 text-[#D97757] animate-pulse" /> Live Hall
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF9F5] text-[#687074] border border-[#E8E4D9]">
                              <Sparkles className="w-2.5 h-2.5 text-[#9AA1A6]" /> Practice
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">{e.duration_minutes} Mins</td>
                        <td className="px-6 py-4">{e.total_marks} Marks</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {/* Visibility Toggle */}
                            <button
                              onClick={() => togglePublish(e.id, e.is_published)}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider transition ${
                                e.is_published ? 'bg-[#EBF4EE] text-[#426E4E]' : 'bg-[#FAF9F5] text-[#687074] border border-[#E8E4D9]'
                              }`}
                            >
                              {e.is_published ? '👁️ VISIBLE' : '🔒 HIDDEN'}
                            </button>
                            
                            {/* Acceptance/Archive Toggle */}
                            <button
                              onClick={() => toggleActiveStatus(e.id, e.is_active !== false)}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider transition ${
                                e.is_active !== false ? 'bg-[#EBF4EE] text-[#426E4E]' : 'bg-[#F9EDED] text-[#A63B3B]'
                              }`}
                            >
                              {e.is_active !== false ? '🟢 ACCEPTING ATTEMPTS' : '🔴 ARCHIVED / CLOSED'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            
                            {/* Publish Results Button */}
                            <button
                              onClick={() => toggleResultsPublished(e.id, e.results_published)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 ${
                                e.results_published ? 'bg-[#D97757] text-white hover:bg-[#C26244]' : 'bg-[#FAF9F5] text-[#687074] border border-[#E8E4D9] hover:bg-[#E8E4D9]'
                              }`}
                              title="Publish Student Results"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> {e.results_published ? 'Results Live' : 'Publish Results'}
                            </button>

                            {/* View Results Button */}
                            <button
                              onClick={() => handleViewResults(e)}
                              className="px-2.5 py-1 bg-[#E9EFF0] text-[#3B5758] hover:bg-[#D5E1E2] rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                              title="View Student Rankings"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Rank
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteExam(e.id)}
                              className="p-1.5 text-[#9AA1A6] hover:text-[#A63B3B] rounded-lg hover:bg-[#F9EDED] transition"
                              title="Delete Exam"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CANDIDATE RESULTS MODAL */}
      {resultsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E8E4D9] rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#F0ECE1] flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#2D3234]">Candidate Submissions & Rankings</h2>
                <p className="text-xs text-[#687074]">
                  {selectedExamResults?.examTitle} (Total Marks: {selectedExamResults?.totalMarks})
                </p>
              </div>
              <button
                onClick={() => setResultsModalOpen(false)}
                className="p-1.5 text-[#687074] hover:text-[#2D3234] bg-[#FAF9F5] border border-[#E8E4D9] rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Results Table */}
            <div className="p-6 overflow-y-auto flex-1">
              {resultsLoading ? (
                <p className="text-xs text-[#687074] text-center py-8">Loading candidate submissions...</p>
              ) : selectedExamResults?.list?.length === 0 ? (
                <div className="text-center py-8 space-y-1">
                  <p className="text-xs font-bold text-[#2D3234]">No Submissions Recorded</p>
                  <p className="text-[11px] text-[#687074]">No students have submitted this assessment yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F5] text-[#687074] uppercase tracking-wider font-bold border-b border-[#E8E4D9]">
                      <tr>
                        <th className="px-4 py-2.5">Rank</th>
                        <th className="px-4 py-2.5">Candidate</th>
                        <th className="px-4 py-2.5">Score</th>
                        <th className="px-4 py-2.5" title="Attempted / Correct / Incorrect">A / C / W</th>
                        <th className="px-4 py-2.5">Accuracy</th>
                        <th className="px-4 py-2.5 text-right">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE1] font-medium text-[#2D3234]">
                      {selectedExamResults.list.map((res) => (
                        <tr key={res.id} className="hover:bg-[#FAF9F5] transition">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md font-black ${
                              res.rank === 1 ? 'bg-[#FFD700]/20 text-[#B8860B]' :
                              res.rank === 2 ? 'bg-[#C0C0C0]/20 text-[#696969]' :
                              res.rank === 3 ? 'bg-[#CD7F32]/20 text-[#8B4513]' : 'text-[#687074]'
                            }`}>
                              #{res.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#2D3234]">{res.candidateName || 'Candidate'}</div>
                            <div className="text-[10px] text-[#687074]">{res.candidateEmail || '—'}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#4A6B6C]">{res.score ?? 0} Marks</td>
                          <td className="px-4 py-3 text-[11px]">
                            <span className="text-[#687074]">{res.total_attempted}</span> / <span className="text-[#426E4E]">{res.correct_answers}</span> / <span className="text-[#A63B3B]">{res.incorrect_answers}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#2D3234]">
                            {res.accuracy != null ? `${Number(res.accuracy).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-[#687074] text-[11px]">
                            {res.submitted_at
                              ? new Date(res.submitted_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* EXAM BUILDER MODAL */}
      <ExamBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExamCreated={loadAdminCatalog}
        categories={categories}
        currentUserId={profile?.id}
      />
    </div>
  );
};

export default Admin;