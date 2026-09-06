/**
 * src/components/ExamBuilderModal.jsx
 * Admin Exam Builder with 2-Step Marks Verification, Practice vs Live Mode Selector,
 * Scheduled Publishing, Custom Instructions, Image Upload, and Question Authoring.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  X, Plus, Trash2, Calendar, Clock, UploadCloud, 
  FileText, AlertTriangle, CheckCircle2, Radio, Sparkles
} from 'lucide-react';

export const ExamBuilderModal = ({ isOpen, onClose, onExamCreated, categories = [], currentUserId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
`1. The test must be attempted in Full-Screen Mode.
2. Tab-switching and minimizing the browser are strictly monitored.
3. Every question must be answered before final submission.
4. The timer cannot be paused once started.`
  );
  const [categoryId, setCategoryId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalMarks, setTotalMarks] = useState(10);
  const [passMarks, setPassMarks] = useState(5);
  const [isPublished, setIsPublished] = useState(true);

  // Delivery Mode & Schedule State
  const [examType, setExamType] = useState('practice'); // 'practice' | 'live'
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');

  // 2-Step Verification Modal State
  const [showMarksMismatchModal, setShowMarksMismatchModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Questions Stack
  const [questions, setQuestions] = useState([
    {
      question_text: '',
      question_type: 'single',
      marks: 1,
      image_url: '',
      uploadingImage: false,
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    }
  ]);

  // Compute live sum of all individual questions
  const questionMarksSum = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question_text: '',
        question_type: 'single',
        marks: 1,
        image_url: '',
        uploadingImage: false,
        options: [
          { option_text: '', is_correct: true },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false }
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (qIndex) => {
    if (questions.length === 1) {
      alert('An exam must contain at least one question.');
      return;
    }
    setQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleImageUpload = async (qIndex, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    setQuestions(prev => {
      const copy = [...prev];
      copy[qIndex].uploadingImage = true;
      return copy;
    });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `questions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      setQuestions(prev => {
        const copy = [...prev];
        copy[qIndex].image_url = publicUrl;
        copy[qIndex].uploadingImage = false;
        return copy;
      });
    } catch (err) {
      console.error('[Upload Error]:', err);
      alert('Failed to upload image.');
      setQuestions(prev => {
        const copy = [...prev];
        copy[qIndex].uploadingImage = false;
        return copy;
      });
    }
  };

  const handleRemoveImage = (qIndex) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[qIndex].image_url = '';
      return copy;
    });
  };

  const handleOptionCorrectToggle = (qIndex, optIndex, qType) => {
    setQuestions(prev => {
      const copy = [...prev];
      const target = { ...copy[qIndex] };

      if (qType === 'multiple') {
        target.options = target.options.map((opt, idx) =>
          idx === optIndex ? { ...opt, is_correct: !opt.is_correct } : opt
        );
      } else {
        target.options = target.options.map((opt, idx) => ({
          ...opt,
          is_correct: idx === optIndex
        }));
      }

      copy[qIndex] = target;
      return copy;
    });
  };

  // Step 1: Pre-Submission Validation Trigger
  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Check question completeness
    for (let i = 0; i < questions.length; i++) {
      const hasCorrect = questions[i].options.some(o => o.is_correct);
      if (!hasCorrect) {
        setErrorMessage(`Question ${i + 1} must have at least one correct option checked.`);
        return;
      }
    }

    // Schedule checks for Live Exam
    if (examType === 'live') {
      if (!scheduledStartTime) {
        setErrorMessage('Live examinations require a scheduled start date & time.');
        return;
      }

      if (scheduledEndTime && new Date(scheduledEndTime) <= new Date(scheduledStartTime)) {
        setErrorMessage('Scheduled end time must be after start time.');
        return;
      }
    }

    // Check for Marks Mismatch
    if (Number(totalMarks) !== questionMarksSum) {
      setShowMarksMismatchModal(true);
      return;
    }

    saveExamToDatabase(Number(totalMarks));
  };

  // Step 2: Save to Database
  const saveExamToDatabase = async (finalTotalMarks) => {
    if (Number(passMarks) > finalTotalMarks) {
      setErrorMessage('Passing marks cannot exceed total marks.');
      setShowMarksMismatchModal(false);
      return;
    }

    setSubmitting(true);
    try {
      const { data: createdExam, error: examErr } = await supabase
        .from('exams')
        .insert({
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          category_id: categoryId || null,
          duration_minutes: parseInt(durationMinutes, 10),
          total_marks: finalTotalMarks,
          pass_marks: parseInt(passMarks, 10),
          exam_type: examType,
          scheduled_start_time: scheduledStartTime ? new Date(scheduledStartTime).toISOString() : null,
          scheduled_end_time: scheduledEndTime ? new Date(scheduledEndTime).toISOString() : null,
          is_published: isPublished,
          created_by: currentUserId
        })
        .select()
        .single();

      if (examErr) throw examErr;

      // Insert Questions & Options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .insert({
            exam_id: createdExam.id,
            question_text: q.question_text.trim(),
            question_type: q.question_type,
            image_url: q.image_url || null,
            marks: parseInt(q.marks, 10) || 1,
            order_index: i
          })
          .select()
          .single();

        if (qErr) throw qErr;

        const optionsPayload = q.options.map((opt, optIdx) => ({
          question_id: qData.id,
          option_text: opt.option_text.trim(),
          is_correct: opt.is_correct,
          order_index: optIdx
        }));

        const { error: optErr } = await supabase.from('options').insert(optionsPayload);
        if (optErr) throw optErr;
      }

      setShowMarksMismatchModal(false);
      onExamCreated();
      onClose();
    } catch (err) {
      console.error('[ExamBuilder Error]:', err);
      setErrorMessage(err.message || 'Failed to publish examination.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-6">
        
        {/* MARKS MISMATCH MODAL */}
        {showMarksMismatchModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-5 text-center shadow-2xl border border-amber-200">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Marks Discrepancy Detected</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your manually configured <strong>Total Marks</strong> does not match the actual sum of marks across all questions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">You Entered</span>
                  <span className="text-xl font-extrabold text-amber-600">{totalMarks}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-indigo-100">
                  <span className="block text-[10px] font-bold text-indigo-500 uppercase">Questions Sum</span>
                  <span className="text-xl font-extrabold text-indigo-600">{questionMarksSum}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setTotalMarks(questionMarksSum);
                    saveExamToDatabase(questionMarksSum);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Sync Total to {questionMarksSum} Marks
                </button>

                <button
                  type="button"
                  onClick={() => setShowMarksMismatchModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Go Back & Review Question Points
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Exam Authoring Studio</h3>
            <p className="text-xs text-slate-500">Configure parameters, set delivery format, and construct questions.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handlePreSubmit} className="space-y-6">
          {/* TITLE & CATEGORY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mid-Term Physics Assessment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ASSESSMENT FORMAT SELECTOR (PRACTICE VS LIVE HALL) */}
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Assessment Delivery Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExamType('practice')}
                className={`p-3 rounded-xl text-left border transition ${
                  examType === 'practice'
                    ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Self-Paced Practice
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Students attempt on-demand at any time with an individual timer.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExamType('live')}
                className={`p-3 rounded-xl text-left border transition ${
                  examType === 'live'
                    ? 'border-amber-600 bg-amber-50/50 shadow-sm ring-1 ring-amber-600'
                    : 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Synchronized Live Hall
                </div>
                <p className="text-[11px] text-amber-700/80 mt-1">
                  All students join a waiting lobby; starts together at the scheduled time.
                </p>
              </button>
            </div>

            {/* Date-time inputs display when Live Hall is chosen or when scheduling practice */}
            {(examType === 'live' || scheduledStartTime) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Start Date & Time (Goes Live) {examType === 'live' && '*'}
                  </label>
                  <input
                    type="datetime-local"
                    required={examType === 'live'}
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> End Date & Time (Closes) (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DURATION & MARKS */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins)</label>
              <input
                type="number"
                min="1"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Marks</label>
              <input
                type="number"
                min="1"
                required
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Passing Marks</label>
              <input
                type="number"
                min="1"
                required
                value={passMarks}
                onChange={(e) => setPassMarks(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description</label>
            <input
              type="text"
              placeholder="Brief summary of test scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* CANDIDATE RULES */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Candidate Exam Rules & Guidelines
            </label>
            <textarea
              rows="3"
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Line-by-line rules for candidates..."
              className="w-full px-3.5 py-2.5 border border-indigo-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          {/* QUESTIONS LIST WITH IMAGE PICKER */}
          <div className="border-t border-slate-100 pt-6 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900">Questions ({questions.length})</h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Question {qIdx + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <select
                      value={q.question_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setQuestions(prev => {
                          const copy = [...prev];
                          copy[qIdx].question_type = newType;
                          return copy;
                        });
                      }}
                      className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                    >
                      <option value="single">Single Choice (Radio)</option>
                      <option value="multiple">Multiple Correct (Checkbox)</option>
                    </select>

                    <input
                      type="number"
                      min="1"
                      title="Marks"
                      value={q.marks}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setQuestions(prev => {
                          const copy = [...prev];
                          copy[qIdx].marks = val;
                          return copy;
                        });
                      }}
                      className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white text-center font-bold"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Enter question statement..."
                  value={q.question_text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions(prev => {
                      const copy = [...prev];
                      copy[qIdx].question_text = val;
                      return copy;
                    });
                  }}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                {/* IMAGE PICKER */}
                <div className="pt-1">
                  {q.image_url ? (
                    <div className="relative inline-block border border-slate-200 rounded-xl p-2 bg-white group">
                      <img
                        src={q.image_url}
                        alt={`Question ${qIdx + 1} diagram`}
                        className="max-h-40 max-w-full rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(qIdx)}
                        className="absolute top-3 right-3 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white transition text-slate-600">
                      <UploadCloud className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold">
                        {q.uploadingImage ? 'Uploading Image...' : 'Add Diagram / Question Image (Optional)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={q.uploadingImage}
                        onChange={(e) => handleImageUpload(qIdx, e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* OPTIONS LIST */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select correct option({q.question_type === 'multiple' ? 's' : ''}):
                  </p>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2.5">
                      <input
                        type={q.question_type === 'multiple' ? 'checkbox' : 'radio'}
                        name={`q-correct-flag-${qIdx}`}
                        checked={opt.is_correct}
                        onChange={() => handleOptionCorrectToggle(qIdx, optIdx, q.question_type)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                        value={opt.option_text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions(prev => {
                            const copy = [...prev];
                            copy[qIdx].options[optIdx].option_text = val;
                            return copy;
                          });
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Publish to platform
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition disabled:opacity-50"
            >
              {submitting ? 'Saving Assessment...' : 'Save & Publish Exam'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ExamBuilderModal;