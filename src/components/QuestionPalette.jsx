const STATUS_STYLES = {
  answered: 'bg-success text-white border-success',
  unanswered: 'bg-danger text-white border-danger',
  marked: 'bg-brand text-white border-brand',
  'not-visited': 'bg-white text-slate-500 border-border',
};

const LEGEND = [
  { key: 'answered', label: 'Answered' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'marked', label: 'Marked for review' },
  { key: 'not-visited', label: 'Not visited' },
];

export default function QuestionPalette({ questions, statuses, currentIndex, onJump }) {
  const counts = LEGEND.reduce((acc, l) => {
    acc[l.key] = questions.filter((_, i) => statuses[i] === l.key).length;
    return acc;
  }, {});

  return (
    <aside className="card p-4 h-fit sticky top-20">
      <h3 className="font-bold text-ink text-sm mb-3">Question Palette</h3>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {questions.map((q, i) => {
          const status = statuses[i] || 'not-visited';
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={`relative h-9 w-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition-transform hover:scale-105 ${STATUS_STYLES[status]} ${
                isCurrent ? 'ring-2 ring-offset-1 ring-ink' : ''
              }`}
              title={`Question ${i + 1} — ${status.replace('-', ' ')}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        {LEGEND.map((l) => (
          <div key={l.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-sm border ${STATUS_STYLES[l.key]}`} />
              {l.label}
            </span>
            <span className="font-semibold text-ink">{counts[l.key]}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
