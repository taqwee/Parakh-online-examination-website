const STYLES = {
  pass: 'bg-success-light text-success',
  fail: 'bg-danger-light text-danger',
  progress: 'bg-warning-light text-warning',
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-light text-brand',
};

export default function StatusPill({ tone = 'neutral', children }) {
  return <span className={`pill ${STYLES[tone] || STYLES.neutral}`}>{children}</span>;
}
