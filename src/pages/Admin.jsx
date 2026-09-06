/**
 * src/pages/Admin.jsx
 * Admin portal: Category CRUD management, Exam listing, toggle publish, and deletion.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ExamBuilderModal } from '../components/ExamBuilderModal';
import { Plus, Trash2, Layers, BookOpen, Clock, Users } from 'lucide-react';

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
        supabase.from('exams').select('*, categories(name), questions(count)').order('created_at', { ascending: false }),
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

  const handleDeleteExam = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam and all its associated questions and attempts?')) {
      await supabase.from('exams').delete().eq('id', examId);
      loadAdminCatalog();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full flex-1">
        {/* HERO TITLE & ACTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administrator Console</h1>
            <p className="text-xs text-slate-500">Author examinations, configure categories, and oversee assessment delivery.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-100 transition self-start"
          >
            <Plus className="w-4 h-4" /> Create New Exam
          </button>
        </div>

        {/* 1. CATEGORY MANAGEMENT SECTION */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Academic & Exam Categories</h2>
          </div>

          {/* Inline Form */}
          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="New Category Name (e.g. JEE Advanced)"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="submit"
              disabled={creatingCategory}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              {creatingCategory ? 'Adding...' : 'Add Category'}
            </button>
          </form>

          {/* Categories Pill List */}
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="text-slate-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 2. EXAMS CATALOG TABLE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Active Examination Catalog</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-left">
                <tr>
                  <th className="px-6 py-3.5">Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Marks</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading catalog...</td></tr>
                ) : exams.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400">No exams authored yet. Click "Create New Exam" above.</td></tr>
                ) : (
                  exams.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{e.title}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[11px]">
                          {e.categories?.name || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{e.duration_minutes} Mins</td>
                      <td className="px-6 py-4">{e.total_marks} Marks</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => togglePublish(e.id, e.is_published)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider transition ${
                            e.is_published ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {e.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteExam(e.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

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