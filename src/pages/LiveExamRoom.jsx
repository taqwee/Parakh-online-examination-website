/**
 * src/pages/LiveExamRoom.jsx
 * Synchronized Assessment Room for Scheduled / CA-Style Exams
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';

export const LiveExamRoom = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    fetchExamAndSyncClock();
  }, [id]);

  const fetchExamAndSyncClock = async () => {
    setLoading(true);
    try {
      // 1. Fetch exam details
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setExam(data);

      // 2. Compute approximate server time offset via DB clock ping
      const clientReqTime = Date.now();
      const { data: pingData } = await supabase.rpc('get_current_timestamp');
      const serverTime = pingData ? new Date(pingData).getTime() : Date.now();
      setServerOffset(serverTime - clientReqTime);
    } catch (err) {
      console.error('[Live Exam Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronized countdown loop
  useEffect(() => {
    if (!exam || !exam.scheduled_start_time) return;

    const interval = setInterval(() => {
      const now = Date.now() + serverOffset;
      const startTime = new Date(exam.scheduled_start_time).getTime();
      const endTime = exam.scheduled_end_time 
        ? new Date(exam.scheduled_end_time).getTime() 
        : startTime + exam.duration_minutes * 60 * 1000;

      if (now < startTime) {
        setTimeLeftMs(startTime - now);
        setIsExamActive(false);
        setIsExpired(false);
      } else if (now >= startTime && now <= endTime) {
        setTimeLeftMs(0);
        setIsExamActive(true);
        setIsExpired(false);
      } else {
        setTimeLeftMs(0);
        setIsExamActive(false);
        setIsExpired(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exam, serverOffset]);

  const formatCountdown = (ms) => {
    if (ms === null || ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Connecting to Examination Server...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3">
          <p className="text-red-600 font-bold text-sm">Exam Not Found</p>
          <button onClick={() => navigate('/dashboard')} className="text-xs text-indigo-600 underline">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Synchronized Examination Room
          </span>
          <span className="text-xs font-medium text-slate-400">
            {exam.duration_minutes} Mins Duration
          </span>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-black text-slate-900">{exam.title}</h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {exam.description || 'Strictly invigilated online continuous evaluation.'}
          </p>
        </div>

        {/* Dynamic State Display */}
        {isExpired ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Assessment Window Concluded</p>
            <p className="text-xs text-slate-500">The scheduled examination time has passed.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        ) : !isExamActive ? (
          /* Waiting Lobby Countdown */
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
            <Clock className="w-8 h-8 text-amber-600 mx-auto animate-bounce" />
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Exam Commences In</p>
            <div className="text-4xl font-mono font-black text-amber-900 tracking-widest">
              {formatCountdown(timeLeftMs)}
            </div>
            <p className="text-[11px] text-amber-700">
              Questions will unlock automatically for all students once the timer hits zero. Please stay on this screen.
            </p>
          </div>
        ) : (
          /* Exam Live State */
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
            <div>
              <p className="text-sm font-bold text-emerald-900">The Exam is Now Live!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Fullscreen proctoring will initiate upon entry.</p>
            </div>
            <button
              onClick={() => navigate(`/exam/${exam.id}`)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-4 h-4" /> Enter Examination Hall
            </button>
          </div>
        )}

        {/* Examination Instructions */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-left">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" /> Mandatory Instructions:
          </p>
          <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
            <li>Tab-switching or window minimize triggers infraction strikes.</li>
            <li>Reaching 3 infractions forces automated test submission.</li>
            <li>Clipboard copy-paste and inspect shortcut keys are disabled.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default LiveExamRoom;