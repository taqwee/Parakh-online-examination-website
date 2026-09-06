/**
 * src/pages/Dashboard.jsx
 * PARAKH - Warm Natural Palette Dashboard
 * Supports Practice Mocks & Synchronized Live Assessments
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { 
  CheckCircle2, TrendingUp, BookOpen, Clock, ArrowRight, 
  Filter, Calendar, Lock, Radio
} from 'lucide-react';

export const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [catsRes, examsRes, attemptsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('exams')
          .select('*, categories(id, name), questions(id)')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('exam_attempts')
          .select('*, exams(title, pass_marks, total_marks)')
          .eq('user_id', profile?.id)
          .order('started_at', { ascending: false })
      ]);

      setCategories(catsRes.data || []);
      setExams(examsRes.data || []);
      setAttempts(attemptsRes.data || []);
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = selectedCategory === 'all'
    ? exams
    : exams.filter(e => e.category_id === selectedCategory);

  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const avgScore = completedAttempts.length > 0
    ? (completedAttempts.reduce((acc, cur) => acc + (Number(cur.percentage) || 0), 0) / completedAttempts.length).toFixed(1)
    : 0;

  const getExamScheduleStatus = (exam) => {
    const now = new Date();
    if (!exam.scheduled_start_time) {
      return { isAvailable: true, label: 'Available Now', isUpcoming: false, isExpired: false };
    }

    const start = new Date(exam.scheduled_start_time);
    const end = exam.scheduled_end_time ? new Date(exam.scheduled_end_time) : null;

    if (now < start) {
      const diffMs = start - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);

      let timeLabel = `${diffHrs}h left`;
      if (diffDays > 0) timeLabel = `${diffDays}d ${diffHrs % 24}h left`;
      else if (diffHrs === 0) timeLabel = `${Math.floor(diffMs / (1000 * 60))}m left`;

      return { 
        isAvailable: false, 
        label: `Starts: ${start.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        countdown: timeLabel,
        isUpcoming: true, 
        isExpired: false 
      };
    }

    if (end && now > end) {
      return { isAvailable: false, label: 'Assessment Concluded', isUpcoming: false, isExpired: true };
    }

    return { isAvailable: true, label: 'Live Now', isUpcoming: false, isExpired: false };
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* KPI OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8E4D9] shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-[#EBF4EE] text-[#426E4E] rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#687074] uppercase tracking-wider">Completed Tests</p>
              <h3 className="text-2xl font-extrabold text-[#2D3234] mt-0.5">{completedAttempts.length}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E8E4D9] shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-[#FBECE7] text-[#D97757] rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#687074] uppercase tracking-wider">Average Performance</p>
              <h3 className="text-2xl font-extrabold text-[#2D3234] mt-0.5">{avgScore}%</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E8E4D9] shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-[#E9EFF0] text-[#4A6B6C] rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#687074] uppercase tracking-wider">Available Assessments</p>
              <h3 className="text-2xl font-extrabold text-[#2D3234] mt-0.5">{filteredExams.length}</h3>
            </div>
          </div>
        </div>

        {/* SYLLABUS PILLS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#2D3234] font-bold text-sm">
            <Filter className="w-4 h-4 text-[#4A6B6C]" />
            <span>Select Target Syllabus / Stream</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#2D3234] text-[#F8F6F0] shadow-sm'
                  : 'bg-white border border-[#E8E4D9] text-[#687074] hover:bg-[#EFECE1]'
              }`}
            >
              All Streams ({exams.length})
            </button>

            {categories.map((category) => {
              const count = exams.filter(e => e.category_id === category.id).length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-[#2D3234] text-[#F8F6F0] shadow-sm'
                      : 'bg-white border border-[#E8E4D9] text-[#687074] hover:bg-[#EFECE1]'
                  }`}
                >
                  {category.name} ({count})
                </button>
              );
            })}
          </div>
        </section>

        {/* EXAMS GRID */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#2D3234]">Examinations & Assessments</h2>

          {loading ? (
            <div className="p-12 text-center text-[#687074] text-sm bg-white rounded-2xl border border-[#E8E4D9]">
              Loading assessment inventory...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="p-12 text-center text-[#687074] text-sm bg-white rounded-2xl border border-[#E8E4D9]">
              No active exams found in this syllabus.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const status = getExamScheduleStatus(exam);
                const isLiveType = exam.exam_type === 'live';

                return (
                  <div
                    key={exam.id}
                    className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition ${
                      status.isUpcoming
                        ? 'border-[#E4D1B9] bg-[#FAF6EE]'
                        : status.isExpired
                        ? 'border-[#E8E4D9] opacity-60'
                        : 'border-[#E8E4D9] hover:border-[#D5CEBF] hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#E9EFF0] text-[#3B5758] border border-[#D5E1E2] uppercase tracking-wider">
                            {exam.categories?.name || 'General'}
                          </span>
                          
                          {/* Live Assessment Indicator */}
                          {isLiveType && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#FBECE7] text-[#D97757] border border-[#F6C6B8] flex items-center gap-1 uppercase tracking-wider">
                              <Radio className="w-3 h-3 animate-pulse text-[#D97757]" /> Live Hall
                            </span>
                          )}
                        </div>

                        {status.isUpcoming ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-[#FDF6EB] text-[#A67527] border border-[#F3DEB8] px-2 py-0.5 rounded-md">
                            <Calendar className="w-3 h-3 text-[#D49B45]" />
                            {status.countdown}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-[#687074] font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#9AA1A6]" />
                            {exam.duration_minutes} Mins
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-[#2D3234] text-base leading-snug">{exam.title}</h3>
                      <p className="text-xs text-[#687074] line-clamp-2 leading-relaxed">
                        {exam.description || 'Standard timed evaluation test.'}
                      </p>

                      {status.isUpcoming && (
                        <div className="p-2.5 bg-[#FDF6EB] border border-[#F3DEB8] rounded-xl text-[11px] font-medium text-[#A67527] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#D49B45] shrink-0" />
                          <span>{status.label}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-5 mt-4 border-t border-[#F0ECE1] flex items-center justify-between">
                      <div className="text-xs text-[#687074]">
                        <span className="font-bold text-[#2D3234]">{exam.total_marks}</span> Marks •{' '}
                        <span className="font-bold text-[#2D3234]">{exam.pass_marks}</span> to pass
                      </div>

                      {/* Dynamic CTA Handling: Practice vs Live Room vs Expired */}
                      {status.isAvailable ? (
                        isLiveType ? (
                          <button
                            onClick={() => navigate(`/live-room/${exam.id}`)}
                            className="px-4 py-2 bg-[#D97757] hover:bg-[#B85739] text-[#F8F6F0] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                          >
                            Enter Hall <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/exam/${exam.id}`)}
                            className="px-4 py-2 bg-[#4A6B6C] hover:bg-[#3B5758] text-[#F8F6F0] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                          >
                            Start Practice <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : status.isUpcoming ? (
                        isLiveType ? (
                          <button
                            onClick={() => navigate(`/live-room/${exam.id}`)}
                            className="px-4 py-2 bg-[#F3DEB8] hover:bg-[#ECD1A0] text-[#845B17] rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Clock className="w-3.5 h-3.5" /> Join
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-[#F3DEB8] text-[#845B17] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                          >
                            <Lock className="w-3.5 h-3.5" /> Scheduled
                          </button>
                        )
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 bg-[#EFECE1] text-[#9AA1A6] rounded-xl text-xs font-bold cursor-not-allowed"
                        >
                          Closed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ATTEMPT HISTORY TABLE */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#2D3234]">Attempt Records</h2>
          <div className="bg-white border border-[#E8E4D9] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E8E4D9] text-xs">
                <thead className="bg-[#FAF9F5] text-[#687074] uppercase tracking-wider font-bold text-left">
                  <tr>
                    <th className="px-6 py-3.5">Assessment</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Score</th>
                    <th className="px-6 py-3.5">Percentage</th>
                    <th className="px-6 py-3.5">Result</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE1] font-medium text-[#2D3234]">
                  {attempts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-[#687074]">
                        No previous test attempts recorded.
                      </td>
                    </tr>
                  ) : (
                    attempts.map((attempt) => {
                      const isPass = (Number(attempt.score) || 0) >= (attempt.exams?.pass_marks || 0);
                      return (
                        <tr key={attempt.id} className="hover:bg-[#FAF9F5] transition">
                          <td className="px-6 py-4 font-bold text-[#2D3234]">{attempt.exams?.title}</td>
                          <td className="px-6 py-4 text-[#687074]">{new Date(attempt.started_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{attempt.score ?? '-'} / {attempt.exams?.total_marks ?? '-'}</td>
                          <td className="px-6 py-4 font-extrabold text-[#2D3234]">{attempt.percentage ? `${attempt.percentage}%` : '-'}</td>
                          <td className="px-6 py-4">
                            {attempt.status === 'completed' ? (
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider ${
                                isPass ? 'bg-[#EBF4EE] text-[#426E4E] border border-[#D1E6D6]' : 'bg-[#F9EDED] text-[#A63B3B] border border-[#F2D1D1]'
                              }`}>
                                {isPass ? 'PASSED' : 'FAILED'}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-[#FDF6EB] text-[#A67527] border border-[#F3DEB8]">
                                IN PROGRESS
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {attempt.status === 'completed' ? (
                              <button
                                onClick={() => navigate(`/results/${attempt.id}`)}
                                className="text-[#4A6B6C] hover:text-[#3B5758] font-extrabold underline underline-offset-2"
                              >
                                View Scorecard
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/exam/${attempt.exam_id}`)}
                                className="text-[#D97757] hover:text-[#B85739] font-extrabold"
                              >
                                Resume Exam
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Dashboard;