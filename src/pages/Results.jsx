/**
 * src/pages/Results.jsx
 * Detailed Assessment Scorecard with 1-Click Verified PDF Export & Question Audit
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Navbar } from '../components/Navbar';
import { exportElementToPdf } from '../utils/pdfGenerator';
import { CheckCircle2, XCircle, ArrowLeft, Download, Award, Loader2, Maximize2, X } from 'lucide-react';

export const Results = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);

  useEffect(() => {
    if (attemptId) {
      loadResults();
    }
  }, [attemptId]);

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exams (
            title, pass_marks, total_marks,
            categories ( name ),
            questions (
              id, question_text, image_url, marks, question_type, order_index,
              options ( id, option_text, is_correct, order_index )
            )
          ),
          user_answers ( question_id, selected_option_ids, is_correct )
        `)
        .eq('id', attemptId)
        .single();

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      data.exams.questions.sort((a, b) => a.order_index - b.order_index);
      data.exams.questions.forEach(q => q.options.sort((a, b) => a.order_index - b.order_index));

      setAttempt(data);
    } catch (err) {
      console.error('[Results Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await exportElementToPdf(
        'scorecard-printable-area',
        `PARAKH_${attempt.exams?.title?.replace(/\s+/g, '_')}_Scorecard.pdf`
      );
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };
  if (loading || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Generating performance scorecard...
      </div>
    );
  }

  const isPass = (Number(attempt.score) || 0) >= (attempt.exams?.pass_marks || 0);
  const answersMap = {};
  (attempt.user_answers || []).forEach(ua => {
    answersMap[ua.question_id] = ua;
  });

  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  attempt.exams.questions.forEach(q => {
    const ua = answersMap[q.id];
    if (!ua || !ua.selected_option_ids || ua.selected_option_ids.length === 0) {
      skippedCount++;
    } else if (ua.is_correct) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Image Lightbox */}
      {enlargedImage && (
        <div 
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white p-3 rounded-2xl shadow-2xl">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/70 text-white rounded-full hover:bg-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={enlargedImage} alt="Diagram" className="max-h-[80vh] w-auto object-contain rounded-lg" />
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6 flex-1">
        {/* ACTION BAR */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition flex items-center gap-2 disabled:opacity-60"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Preparing PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download Official Scorecard (PDF)
              </>
            )}
          </button>
        </div>

        {/* PRINTABLE AREA TARGET */}
        <div id="scorecard-printable-area" className="p-2 space-y-6 bg-slate-50">
          
          {/* SCORECARD HERO */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2.5 ${isPass ? 'bg-emerald-500' : 'bg-red-500'}`} />

            <div className={`inline-flex p-3 rounded-2xl ${isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} mb-3`}>
              {isPass ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
              {attempt.exams?.categories?.name || 'General Assessment'}
            </span>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{attempt.exams?.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Assessment Attempt ID: <span className="font-mono">{attempt.id}</span> • Completed on{' '}
              {new Date(attempt.submitted_at || attempt.started_at).toLocaleString()}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Score</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {attempt.score} <span className="text-sm font-normal text-slate-400">/ {attempt.exams?.total_marks}</span>
                </h3>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Percentage</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{attempt.percentage}%</h3>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Result Status</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                  isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isPass ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Passing Mark</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{attempt.exams?.pass_marks}</h3>
              </div>
            </div>
          </div>

          {/* METRICS SUMMARY */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
              <p className="text-xs font-bold text-emerald-800 uppercase">Correct</p>
              <h4 className="text-2xl font-extrabold text-emerald-900 mt-0.5">{correctCount}</h4>
            </div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
              <p className="text-xs font-bold text-red-800 uppercase">Incorrect</p>
              <h4 className="text-2xl font-extrabold text-red-900 mt-0.5">{incorrectCount}</h4>
            </div>
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl">
              <p className="text-xs font-bold text-slate-600 uppercase">Skipped</p>
              <h4 className="text-2xl font-extrabold text-slate-800 mt-0.5">{skippedCount}</h4>
            </div>
          </div>

          {/* QUESTION AUDIT */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">Answer Key Audit & Solutions</h2>

            {attempt.exams?.questions.map((q, idx) => {
              const userAns = answersMap[q.id];
              const selectedIds = userAns?.selected_option_ids || [];
              const isCorrect = userAns?.is_correct;

              return (
                <div key={q.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Question {idx + 1}</span>
                      <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold uppercase">
                        {q.question_type === 'multiple' ? 'Multiple Correct' : 'Single Correct'}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedIds.length === 0 ? 'bg-slate-100 text-slate-600' :
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedIds.length === 0 ? 'Skipped' : isCorrect ? `+${q.marks} Mark` : '0 Marks'}
                    </span>
                  </div>

                  <p className="text-base text-slate-800 font-medium">{q.question_text}</p>

                  {q.image_url && (
                    <div className="py-2">
                      <img
                        src={q.image_url}
                        alt={`Question ${idx + 1} reference`}
                        onClick={() => setEnlargedImage(q.image_url)}
                        className="max-h-60 max-w-full rounded-xl border border-slate-200 object-contain cursor-zoom-in"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {q.options.map(opt => {
                      const wasSelected = selectedIds.includes(opt.id);
                      const isOptionCorrect = opt.is_correct;

                      let rowStyle = 'border-slate-200 bg-white text-slate-700';
                      if (isOptionCorrect) {
                        rowStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold';
                      } else if (wasSelected && !isOptionCorrect) {
                        rowStyle = 'border-red-500 bg-red-50/70 text-red-900';
                      }

                      return (
                        <div key={opt.id} className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${rowStyle}`}>
                          <span>{opt.option_text}</span>
                          <div className="flex items-center gap-2">
                            {isOptionCorrect && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px] uppercase">
                                Correct Choice
                              </span>
                            )}
                            {wasSelected && (
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                isOptionCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-red-600 text-white'
                              }`}>
                                Your Selection
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Results;