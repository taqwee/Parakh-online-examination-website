/**
 * src/pages/Exam.jsx
 * Modular Exam Engine with Question Image Rendering, Dynamic Next->Submit Button,
 * In-Screen Confirmation Modal, Rules Gateway, and Anti-Cheat Lockdown.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { useProctoring } from '../hooks/useProctoring';
import { ProctorModals } from '../components/ProctorModals';
import { 
  Timer, Maximize2, ChevronLeft, ChevronRight, 
  Bookmark, Send, AlertTriangle, ArrowLeft,
  CheckSquare, X
} from 'lucide-react';

export const Exam = () => {
  const { id: examId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gateway & Exam Lifecycle State
  const [hasAgreed, setHasAgreed] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  // Live Exam State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Modals & Image Lightbox State
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Keep answer ref in sync for proctoring auto-submission callback
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Submit Handler
  const executeSubmit = async (attemptIdToSubmit, finalAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    setExamStarted(false);
    setShowSubmitConfirmModal(false);

    // Safely exit fullscreen
    try {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        if (document.exitFullscreen) await document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen().catch(() => {});
      }
    } catch (_) {}

    try {
      const targetId = attemptIdToSubmit || attempt?.id;
      const targetAnswers = finalAnswers || answersRef.current;

      const res = await fetch('/api/exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: targetId, answers: targetAnswers })
      });

      const data = await res.json();
      if (data.success) {
        localStorage.removeItem(`exam_answers_${targetId}`);
        navigate(`/results/${targetId}`);
      } else {
        alert(data.error || 'Evaluation failed.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('[Submit Error]:', err);
      alert('Could not connect to evaluation server on port 4000. Ensure node server.js is running.');
      setSubmitting(false);
    }
  };

  // Connect Modular Proctoring Hook
  const {
    isFullscreen,
    warningCount,
    lastWarningReason,
    isTerminated,
    maxWarnings,
    enterFullScreen
  } = useProctoring({
    isActive: examStarted && !submitting,
    maxWarnings: 3,
    onAutoSubmit: () => {
      executeSubmit(attempt?.id, answersRef.current);
    }
  });

  // 1. Fetch Exam Metadata
  useEffect(() => {
    if (examId && profile) {
      fetchExamMetadata();
    }
  }, [examId, profile]);

  const fetchExamMetadata = async () => {
    setLoading(true);
    try {
      const { data: examData, error: examErr } = await supabase
        .from('exams')
        .select(`
          *,
          categories ( name ),
          questions (
            id, question_text, question_type, image_url, marks, order_index,
            options ( id, option_text, order_index )
          )
        `)
        .eq('id', examId)
        .single();

      if (examErr || !examData) {
        navigate('/dashboard');
        return;
      }

      examData.questions.sort((a, b) => a.order_index - b.order_index);
      examData.questions.forEach(q => q.options.sort((a, b) => a.order_index - b.order_index));

      setExam(examData);
      setQuestions(examData.questions);

      // Check active attempt
      const { data: existingAttempts } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', profile.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (existingAttempts && existingAttempts.length > 0) {
        const activeAttempt = existingAttempts[0];
        setAttempt(activeAttempt);

        const startTime = new Date(activeAttempt.started_at).getTime();
        const totalAllowedSeconds = examData.duration_minutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

        if (remainingSeconds <= 0) {
          executeSubmit(activeAttempt.id, {});
          return;
        }

        setTimeLeft(remainingSeconds);

        const cached = localStorage.getItem(`exam_answers_${activeAttempt.id}`);
        if (cached) {
          setAnswers(JSON.parse(cached));
        }

        setExamStarted(true);
        setHasAgreed(true);
      }
    } catch (err) {
      console.error('[Exam Init Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Start Exam Trigger
  const handleLaunchExam = async () => {
    if (!hasAgreed) return;

    try {
      await enterFullScreen();

      const { data: newAttempt, error: createErr } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          user_id: profile.id,
          status: 'in_progress'
        })
        .select()
        .single();

      if (createErr) throw createErr;

      setAttempt(newAttempt);
      setTimeLeft(exam.duration_minutes * 60);
      setExamStarted(true);
    } catch (err) {
      console.error('Failed to start attempt:', err);
    }
  };

  // 3. Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0 || !attempt || !examStarted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          executeSubmit(attempt.id, answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, attempt, examStarted]);

  // Answer selections
  const handleOptionSelect = (questionId, optionId, type) => {
    setAnswers(prev => {
      const currentList = prev[questionId] || [];
      let updated;

      if (type === 'multiple') {
        if (currentList.includes(optionId)) {
          updated = currentList.filter(id => id !== optionId);
        } else {
          updated = [...currentList, optionId];
        }
      } else {
        updated = [optionId];
      }

      const nextAnswers = { ...prev, [questionId]: updated };
      if (attempt?.id) {
        localStorage.setItem(`exam_answers_${attempt.id}`, JSON.stringify(nextAnswers));
      }
      return nextAnswers;
    });
  };

  const handleClearAnswer = (questionId) => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      if (attempt?.id) {
        localStorage.setItem(`exam_answers_${attempt.id}`, JSON.stringify(copy));
      }
      return copy;
    });
  };

  const toggleReviewMark = (questionId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Loading examination environment...
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: RULES GATEWAY
  // =========================================================================
  if (!examStarted) {
    const rulesList = (exam.instructions || '').split('\n').map(r => r.trim()).filter(Boolean);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-8 w-full flex-1 space-y-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                {exam.categories?.name || 'General Examination'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{exam.title}</h1>
              <p className="text-xs text-slate-500">{exam.description || 'Comprehensive assessment test.'}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Duration</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{exam.duration_minutes} Mins</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Questions</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{questions.length}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Marks</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{exam.total_marks}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Passing Marks</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{exam.pass_marks}</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" /> Examination Rules & Instructions
              </h3>

              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-3 text-xs text-slate-700">
                {rulesList.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed font-medium">{rule.replace(/^\d+[\.\)]\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  I agree to attempt this examination in proctored full-screen mode. Right-click, copy-pasting, and tab switching are disabled. Exceeding {maxWarnings} infractions triggers automatic submission.
                </span>
              </label>

              <button
                disabled={!hasAgreed}
                onClick={handleLaunchExam}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-4 h-4" /> I Agree & Start Examination
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LIVE EXAM ENGINE
  // =========================================================================
  const currentQ = questions[currentIndex];
  const currentSelections = answers[currentQ.id] || [];
  const isMulti = currentQ.question_type === 'multiple';

  const answeredCount = Object.values(answers).filter(arr => arr && arr.length > 0).length;
  const allAttempted = answeredCount === questions.length;
  const isLastQuestion = currentIndex === questions.length - 1;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none">
      
      {/* MODULAR SECURITY, WARNING & CONFIRMATION MODALS */}
      <ProctorModals
        isFullscreen={isFullscreen}
        warningCount={warningCount}
        maxWarnings={maxWarnings}
        lastWarningReason={lastWarningReason}
        isTerminated={isTerminated}
        onEnterFullScreen={enterFullScreen}
        showConfirmModal={showSubmitConfirmModal}
        onCloseConfirm={() => setShowSubmitConfirmModal(false)}
        onFinalSubmit={() => executeSubmit(attempt.id, answersRef.current)}
        answeredCount={answeredCount}
        markedCount={markedForReview.size}
        totalQuestions={questions.length}
        submitting={submitting}
      />

      {/* IMAGE ENLARGEMENT LIGHTBOX */}
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
            <img 
              src={enlargedImage} 
              alt="Enlarged question figure" 
              className="max-h-[80vh] w-auto object-contain rounded-lg" 
            />
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider">
            {exam.categories?.name || 'Standard Exam'}
          </span>
          <h1 className="text-base font-bold text-slate-900 leading-tight mt-0.5">{exam.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          {warningCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings: {warningCount}/{maxWarnings}</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl text-amber-800 font-mono font-bold text-sm">
            <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => setShowSubmitConfirmModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-200 transition"
          >
            <Send className="w-3.5 h-3.5" /> Submit Test
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start flex-1">
        
        {/* QUESTION PANEL */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[540px]">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  isMulti ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isMulti ? 'Multiple Options Correct' : 'Single Option Correct'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">{currentQ.marks} Mark(s)</span>
            </div>

            {/* Question Text */}
            <div className="py-5">
              <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed">
                {currentQ.question_text}
              </p>
            </div>

            {/* QUESTION IMAGE RENDERING (IF ATTACHED) */}
            {currentQ.image_url && (
              <div className="mb-6">
                <div 
                  onClick={() => setEnlargedImage(currentQ.image_url)}
                  className="inline-block relative cursor-zoom-in group border border-slate-200/80 rounded-2xl p-2 bg-slate-50/50 hover:bg-slate-100 transition shadow-sm max-w-full"
                >
                  <img
                    src={currentQ.image_url}
                    alt={`Question ${currentIndex + 1} Diagram`}
                    className="max-h-72 max-w-full rounded-xl object-contain"
                  />
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-slate-900/70 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <Maximize2 className="w-3 h-3" /> Click to enlarge
                  </div>
                </div>
              </div>
            )}

            {/* Options Choices */}
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = currentSelections.includes(opt.id);
                const letter = String.fromCharCode(65 + idx);

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleOptionSelect(currentQ.id, opt.id, currentQ.question_type)}
                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center mr-3.5 transition ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {letter}
                    </div>
                    <span className="text-sm font-medium text-slate-800 flex-1">{opt.option_text}</span>
                    {isMulti && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isSelected ? '✓ Selected' : '+ Select'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC ACTION BAR */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleReviewMark(currentQ.id)}
                className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  markedForReview.has(currentQ.id)
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {markedForReview.has(currentQ.id) ? 'Marked for Review' : 'Mark for Review'}
              </button>

              <button
                onClick={() => handleClearAnswer(currentQ.id)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 transition"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              {allAttempted || isLastQuestion ? (
                <button
                  onClick={() => setShowSubmitConfirmModal(true)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition flex items-center gap-1.5 animate-pulse"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Assessment
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QUESTION PALETTE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Question Palette</h3>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = (answers[q.id] || []).length > 0;
              const isMarked = markedForReview.has(q.id);

              let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
              if (isMarked) {
                badgeStyle = 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200';
              } else if (isAnswered) {
                badgeStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full aspect-square text-xs font-bold rounded-xl border flex items-center justify-center transition ${badgeStyle} ${
                    isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-600 rounded"></span> Answered ({answeredCount})</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-500 rounded"></span> Marked for Review ({markedForReview.size})</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></span> Unattempted ({questions.length - answeredCount})</div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Exam;