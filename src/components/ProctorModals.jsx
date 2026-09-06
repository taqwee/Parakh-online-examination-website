/**
 * src/components/ProctorModals.jsx
 * UI Modals for Anti-Cheat Warnings, Auto-Submission Alert, and Submit Confirmation
 */
import React from 'react';
import { ShieldAlert, HelpCircle, XCircle } from 'lucide-react';

export const ProctorModals = ({
  isFullscreen,
  warningCount,
  maxWarnings,
  lastWarningReason,
  isTerminated,
  onEnterFullScreen,
  showConfirmModal,
  onCloseConfirm,
  onFinalSubmit,
  answeredCount,
  markedCount,
  totalQuestions,
  submitting
}) => {
  // 1. AUTO-SUBMISSION ON DISQUALIFICATION
  if (isTerminated) {
    return (
      <div className="fixed inset-0 bg-red-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 text-center space-y-4 shadow-2xl border border-red-300">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Assessment Auto-Submitted</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              You exceeded the maximum allowed security infractions (<strong>{maxWarnings} Warnings</strong>). Your assessment has been locked and submitted for evaluation.
            </p>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            Reason: {lastWarningReason || 'Multiple security infractions detected'}
          </div>
        </div>
      </div>
    );
  }

  // 2. FULLSCREEN WARNING MODAL
  if (!isFullscreen && !submitting) {
    return (
      <div className="fixed inset-0 bg-red-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-red-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Security Warning!</h3>
            <p className="text-xs text-slate-500 mt-1">
              {lastWarningReason || 'You must remain in full-screen mode during the exam.'}
            </p>
            <p className="text-xs text-red-600 font-bold mt-2">
              Infractions: {warningCount} of {maxWarnings} (Auto-submits at {maxWarnings})
            </p>
          </div>
          <button
            onClick={onEnterFullScreen}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition"
          >
            Resume Full Screen
          </button>
        </div>
      </div>
    );
  }

  // 3. IN-SCREEN SUBMIT CONFIRMATION MODAL
  if (showConfirmModal) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">Submit Examination?</h3>
            <p className="text-xs text-slate-500 mt-1">Verify your response summary before final evaluation.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="block text-xs font-bold text-emerald-800 uppercase">Answered</span>
              <span className="text-lg font-extrabold text-emerald-900">{answeredCount}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="block text-xs font-bold text-amber-800 uppercase">Review</span>
              <span className="text-lg font-extrabold text-amber-900">{markedCount}</span>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
              <span className="block text-xs font-bold text-slate-600 uppercase">Unanswered</span>
              <span className="text-lg font-extrabold text-slate-800">{totalQuestions - answeredCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCloseConfirm}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Back to Exam
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onFinalSubmit}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
            >
              {submitting ? 'Evaluating...' : 'Yes, Submit Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};