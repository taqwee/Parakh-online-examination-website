/**
 * server.js - Backend Evaluation Server
 * Handles multi-select & single-select scoring and exam completions.
 */
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Resolve URL & Key with fallbacks
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env file!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

/**
 * POST /api/exams/submit
 * Body: { attemptId: string, answers: { [questionId: string]: string | string[] } }
 */
app.post('/api/exams/submit', async (req, res) => {
  const { attemptId, answers } = req.body;

  if (!attemptId || !answers) {
    return res.status(400).json({ error: 'Attempt ID and answers payload are required.' });
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

    let calculatedScore = 0;
    const answerBatch = [];

    // 3. Evaluate each question
    questions.forEach(question => {
      const candidateRawChoice = answers[question.id];
      
      let selectedOptionIds = [];
      if (Array.isArray(candidateRawChoice)) {
        selectedOptionIds = candidateRawChoice.filter(Boolean);
      } else if (candidateRawChoice) {
        selectedOptionIds = [candidateRawChoice];
      }

      const correctOptionIds = question.options
        .filter(opt => opt.is_correct)
        .map(opt => opt.id);

        // Evaluate choices (supports full matching & partial credit)
        const hasIncorrectPick = selectedOptionIds.some(id => !correctOptionIds.includes(id));
        const correctPicksCount = selectedOptionIds.filter(id => correctOptionIds.includes(id)).length;
        const isExactMatch = 
          selectedOptionIds.length > 0 &&
          selectedOptionIds.length === correctOptionIds.length &&
          !hasIncorrectPick;
    
        let awardedMarks = 0;
    
        if (!hasIncorrectPick && selectedOptionIds.length > 0) {
          if (isExactMatch) {
            // Full score when all correct options are selected
            awardedMarks = Number(question.marks || 1);
          } else {
            // Proportional partial credit when some correct options are selected (and 0 incorrect ones)
            awardedMarks = Number(((correctPicksCount / correctOptionIds.length) * Number(question.marks || 1)).toFixed(2));
          }
        }
    
        calculatedScore += awardedMarks;
    
        answerBatch.push({
          attempt_id: attemptId,
          question_id: question.id,
          selected_option_ids: selectedOptionIds,
          is_correct: !hasIncorrectPick && correctPicksCount > 0 // Marked correct if at least partial credit awarded
        });
    });

    const totalMarks = attempt.exams?.total_marks || 1;
    const percentage = Number(((calculatedScore / totalMarks) * 100).toFixed(2));

    // 4. Batch upsert answers
    const { error: batchErr } = await supabaseAdmin
      .from('user_answers')
      .upsert(answerBatch, { onConflict: 'attempt_id, question_id' });

    if (batchErr) throw batchErr;

    // 5. Finalize attempt record
    const { data: updatedAttempt, error: updateErr } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score: calculatedScore,
        percentage: percentage,
        status: 'completed'
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
      attempt: updatedAttempt
    });

  } catch (error) {
    console.error('[Evaluation Error]:', error);
    return res.status(500).json({ error: 'Server evaluation failed. Contact proctor.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✓ SkillAssess Evaluation Engine listening on http://localhost:${PORT}`);
});