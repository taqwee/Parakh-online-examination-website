/**
 * server.js - Unified Production Server for Parakh Online Examination
 * Serves Vite static client build & handles secure assessment evaluations.
 */
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Derive __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Resolve Supabase URL & Service Key with fallbacks
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Missing Supabase credentials. Define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. API & HEALTH ROUTES (MUST BE DEFINED FIRST)
// ==========================================

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * GET /api/admin/exams/:id/results
 * Fetches candidate results and ranks them using multi-criteria tie-breakers:
 * Marks -> Least Negatives -> Most Positives -> Accuracy -> Attempt count
 */
app.get('/api/admin/exams/:id/results', async (req, res) => {
  try {
    const { id: examId } = req.params;

    const { data: attempts, error } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, user_id, score, percentage, status, submitted_at, total_attempted, correct_answers, incorrect_answers')
      .eq('exam_id', examId);

    if (error) throw error;
    if (!attempts || attempts.length === 0) return res.json([]);

    const userIds = attempts.map((a) => a.user_id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // 1. Merge Profiles and calculate Accuracy
    let merged = attempts.map((a) => {
      const accuracy = a.total_attempted > 0 ? (a.correct_answers / a.total_attempted) * 100 : 0;
      return {
        ...a,
        candidateName: profileMap.get(a.user_id)?.full_name || 'Candidate',
        candidateEmail: profileMap.get(a.user_id)?.email || '—',
        accuracy: accuracy
      };
    });

    // 2. Apply Tie-Breaker Ranking Logic
    merged.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // 1st: Highest Marks
      if (a.incorrect_answers !== b.incorrect_answers) return a.incorrect_answers - b.incorrect_answers; // 2nd: Least Negatives (Lower is better)
      if (b.correct_answers !== a.correct_answers) return b.correct_answers - a.correct_answers; // 3rd: Most Positives
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy; // 4th: Highest Accuracy
      return b.total_attempted - a.total_attempted; // 5th: Highest Attempted
    });

    // 3. Assign Ranks
    merged = merged.map((attempt, index) => ({
      ...attempt,
      rank: index + 1
    }));

    res.json(merged);
  } catch (err) {
    console.error('[Admin Results Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/exams/submit
 * Body: { attemptId: string, answers: { [questionId: string]: string | string[] } }
 */
app.post('/api/exams/submit', async (req, res) => {
  const { attemptId, answers } = req.body;

  if (!attemptId || typeof answers !== 'object' || answers === null) {
    return res.status(400).json({ error: 'Valid attemptId and answers payload are required.' });
  }

  try {
    // 1. Fetch Attempt and linked Exam Details
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, user_id, status, exam_id, started_at, exams(id, total_marks, pass_marks, duration_minutes)')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Examination attempt not found.' });
    }

    if (attempt.status === 'completed') {
      return res.status(400).json({ error: 'This assessment attempt has already been submitted.' });
    }

    // 2. Fetch Questions and Options with is_correct flags
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, marks, question_type, options(id, is_correct)')
      .eq('exam_id', attempt.exam_id);

    if (qErr) throw qErr;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'No questions found for this examination.' });
    }

    let calculatedScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let attemptedCount = 0;
    const answerBatch = [];

    // 3. Evaluate each question
    questions.forEach((question) => {
      const candidateRawChoice = answers[question.id];

      let selectedOptionIds = [];
      if (Array.isArray(candidateRawChoice)) {
        selectedOptionIds = candidateRawChoice.filter(Boolean);
      } else if (candidateRawChoice) {
        selectedOptionIds = [candidateRawChoice];
      }

      const correctOptionIds = (question.options || [])
        .filter((opt) => opt.is_correct)
        .map((opt) => opt.id);

      const hasIncorrectPick = selectedOptionIds.some((id) => !correctOptionIds.includes(id));
      const correctPicksCount = selectedOptionIds.filter((id) => correctOptionIds.includes(id)).length;
      const isExactMatch =
        selectedOptionIds.length > 0 &&
        selectedOptionIds.length === correctOptionIds.length &&
        !hasIncorrectPick;

      let awardedMarks = 0;

      // Track granular attempt stats for tie-breakers
      if (selectedOptionIds.length > 0) {
        attemptedCount++;
        if (!hasIncorrectPick && correctPicksCount > 0) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }

      if (!hasIncorrectPick && selectedOptionIds.length > 0 && correctOptionIds.length > 0) {
        if (isExactMatch) {
          awardedMarks = Number(question.marks || 1);
        } else {
          // Proportional partial credit for multi-select
          awardedMarks = Number(
            ((correctPicksCount / correctOptionIds.length) * Number(question.marks || 1)).toFixed(2)
          );
        }
      }

      calculatedScore += awardedMarks;

      answerBatch.push({
        attempt_id: attemptId,
        question_id: question.id,
        selected_option_ids: selectedOptionIds,
        is_correct: !hasIncorrectPick && correctPicksCount > 0,
      });
    });

    const totalMarks = attempt.exams?.total_marks || 100;
    const percentage = Number(((calculatedScore / totalMarks) * 100).toFixed(2));

    // 4. Batch upsert candidate answers
    if (answerBatch.length > 0) {
      const { error: batchErr } = await supabaseAdmin
        .from('user_answers')
        .upsert(answerBatch, { onConflict: 'attempt_id, question_id' });

      if (batchErr) throw batchErr;
    }

    // 5. Finalize exam attempt with granular tie-breaker stats
    const { data: updatedAttempt, error: updateErr } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score: calculatedScore,
        percentage: percentage,
        status: 'completed',
        total_attempted: attemptedCount,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      score: calculatedScore,
      percentage: percentage,
      passed: calculatedScore >= (attempt.exams?.pass_marks || 0),
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('[Evaluation Error]:', error);
    return res.status(500).json({ error: 'Server evaluation failed. Please contact your proctor.' });
  }
});

// ==========================================
// 2. STATIC ASSETS & SPA ROUTING FALLBACK
// ==========================================

// Serve compiled Vite frontend assets from /dist
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback: Send index.html for any frontend navigation (e.g. /dashboard, /live-room/:id)
// Express 5 compatible wildcard
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Bind to PORT and host '0.0.0.0' for cloud container compatibility
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Parakh Examination Engine & Web Client listening on port ${PORT}`);
});