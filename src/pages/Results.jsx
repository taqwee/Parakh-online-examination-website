/**
 * src/pages/Results.jsx
 * Candidate Results View: Displays the Topper and the authenticated student's rank.
 * Styled with PARAKH Warm Natural Palette.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { 
  Trophy, Award, CheckCircle2, XCircle, ArrowLeft, 
  Clock, ShieldAlert, BarChart3 
} from 'lucide-react';

export const Results = () => {
  const params = useParams();
  const attemptId = params.id || params.attemptId;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);

    try {
      // Force direct connection to the Node.js backend port
      const res = await fetch(`http://127.0.0.1:4000/api/results/${attemptId}`);

      if (!res.ok) {
        // If the backend rejects it, extract the exact error message
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Unable to retrieve result record.');
      }

      const data = await res.json();
      setResultData(data);
    } catch (err) {
      setError(err.message || 'Connection to evaluation server failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-xs text-[#687074]">
          Loading verified score card and rankings...
        </div>
      </div>
    );
  }

  if (error || !resultData) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4D9] p-6 rounded-2xl text-center space-y-3 max-w-sm w-full">
            <ShieldAlert className="w-8 h-8 text-[#A63B3B] mx-auto" />
            <p className="text-xs font-bold text-[#2D3234]">{error || 'Record Not Found'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-[#2D3234] text-[#F8F6F0] rounded-xl text-xs font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State: Results not yet published by Administrator
  if (!resultData.published) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4D9] p-8 rounded-3xl text-center space-y-4 max-w-md w-full shadow-sm">
            <Clock className="w-10 h-10 text-[#D97757] mx-auto animate-pulse" />
            <div>
              <h2 className="text-base font-black text-[#2D3234]">Evaluation Under Review</h2>
              <p className="text-xs text-[#687074] mt-1">
                Your answers for <span className="font-bold text-[#2D3234]">{resultData.examTitle}</span> have been safely recorded.
              </p>
            </div>
            <p className="text-[11px] text-[#845B17] bg-[#FDF6EB] border border-[#F3DEB8] p-3 rounded-xl">
              Rankings and scorecards will become visible as soon as the proctor publishes the final results.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-[#2D3234] hover:bg-[#1E2223] text-[#F8F6F0] text-xs font-bold rounded-xl transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { student, topper, totalMarks, passMarks, totalCandidates, examTitle } = resultData;
  const isPass = student ? student.score >= passMarks : false;

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#687074] hover:text-[#2D3234] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <span className="text-[11px] text-[#687074]">
            Numbers of Candidates appeared: <strong className="text-[#2D3234]">{totalCandidates} Candidates</strong>
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-[#2D3234] tracking-tight">{examTitle}</h1>
          <p className="text-xs text-[#687074]">Official Scorecard & Evaluated Standing</p>
        </div>

        
        {/* 1. TOPPER SHOWCASE CARD - Gold Gradient */}
        {topper && (
          <div className="bg-gradient-to-r from-[#D49B45] to-[#A67527] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border-none text-white">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/20 backdrop-blur-sm rounded-xl shrink-0 shadow-inner">
                <Trophy className="w-7 h-7 text-white drop-shadow-md" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#845B17] uppercase tracking-wider bg-white/90 px-2.5 py-0.5 rounded shadow-sm">
                  Cohort Rank #1 (Topper)
                </span>
                <h3 className="text-lg font-black mt-1.5 drop-shadow-sm">{topper.candidateName}</h3>
                <p className="text-xs text-white/80 font-medium mt-0.5">
                  Scored {topper.score} / {totalMarks} Marks ({Number(topper.percentage).toFixed(1)}%)
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-t border-white/20 sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
              <div className="text-[10px] text-white/80 uppercase font-bold tracking-wider">Accuracy</div>
              <div className="text-2xl font-black drop-shadow-sm">
                {topper.accuracy != null ? `${Number(topper.accuracy).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
        )}

        {/* 2. LOGGED-IN STUDENT'S PERSONAL SCORECARD */}
        {student ? (
          <div className="bg-white border-2 border-[#E8E4D9] rounded-3xl p-6 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
            
            {/* Subtle vibrant top accent line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isPass ? 'bg-[#426E4E]' : 'bg-[#A63B3B]'}`}></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-[#2D3234]">{student.candidateName}</h2>
                  {/* High Contrast Solid Pass/Fail Badge */}
                  <span className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${
                    isPass ? 'bg-[#426E4E] text-white' : 'bg-[#A63B3B] text-white'
                  }`}>
                    {isPass ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <p className="text-xs text-[#687074] mt-1 font-medium">Your Final Examination Assessment</p>
              </div>

              {/* High Contrast Rank Badge in Deep Teal */}
              <div className="flex items-center gap-3 bg-[#4A6B6C] shadow-md px-5 py-2.5 rounded-2xl text-white transform transition hover:scale-105">
                <Award className="w-6 h-6 text-[#D5E1E2]" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#A3BFC0] tracking-wider">Your Rank</div>
                  <div className="text-2xl font-black">
                    #{student.rank} <span className="text-sm text-[#A3BFC0] font-bold">/ {totalCandidates}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#FAF9F5] border border-[#E8E4D9] rounded-2xl p-4 hover:border-[#D5CEBF] transition">
                <div className="text-[10px] uppercase font-bold text-[#687074] tracking-wider">Score Obtained</div>
                <div className="text-2xl font-black text-[#2D3234] mt-1">
                  {student.score} <span className="text-sm text-[#687074] font-bold">/ {totalMarks}</span>
                </div>
              </div>

              <div className="bg-[#E9EFF0] border border-[#D5E1E2] rounded-2xl p-4">
                <div className="text-[10px] uppercase font-bold text-[#4A6B6C] tracking-wider">Percentage</div>
                <div className="text-2xl font-black text-[#3B5758] mt-1">
                  {Number(student.percentage).toFixed(1)}%
                </div>
              </div>

              <div className="bg-[#FAF9F5] border border-[#E8E4D9] rounded-2xl p-4 hover:border-[#D5CEBF] transition">
                <div className="text-[10px] uppercase font-bold text-[#687074] tracking-wider">Accuracy</div>
                <div className="text-2xl font-black text-[#2D3234] mt-1">
                  {student.accuracy != null ? `${Number(student.accuracy).toFixed(1)}%` : '—'}
                </div>
              </div>

              <div className="bg-[#FAF9F5] border border-[#E8E4D9] rounded-2xl p-4 hover:border-[#D5CEBF] transition">
                <div className="text-[10px] uppercase font-bold text-[#687074] tracking-wider">Questions Attempted</div>
                <div className="text-2xl font-black text-[#2D3234] mt-1">
                  {student.totalAttempted}
                </div>
              </div>
            </div>

            {/* Response Breakdown */}
            <div className="border border-[#E8E4D9] rounded-2xl p-4 bg-white flex flex-wrap items-center justify-around gap-4 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#426E4E]" />
                <span>Correct: <strong className="text-[#426E4E]">{student.correctAnswers}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#A63B3B]" />
                <span>Incorrect: <strong className="text-[#A63B3B]">{student.incorrectAnswers}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#687074]" />
                <span>Pass Criteria: <strong>{passMarks} Marks</strong></span>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-8 text-center bg-white border border-[#E8E4D9] rounded-2xl text-xs text-[#687074]">
            No completed attempt record found for your account on this exam.
          </div>
        )}

      </main>
    </div>
  );
};

export default Results;