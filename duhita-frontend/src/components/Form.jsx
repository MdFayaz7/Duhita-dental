/* Shared form primitives for patient-facing forms. */
export function Field({ label, required, error, hint, className = '', children }) {
  return (
    <label className={`grid gap-1.5 text-[14px] text-ink ${className}`}>
      <span>
        {label}
        {required && <span className="text-[#b42318]"> *</span>}
      </span>
      {children}
      {error ? <span className="text-[12.5px] text-[#b42318]" role="alert">{error}</span> : hint && <span className="text-[12.5px] text-body">{hint}</span>}
    </label>
  );
}

export function FormSection({ step, title, children }) {
  return (
    <fieldset className="grid gap-4 sm:gap-5 min-w-0 border-t border-line pt-6 sm:pt-7 first:border-0 first:pt-0">
      <legend className="flex items-center gap-3 mb-4 sm:mb-5">
        <span className="w-7 h-7 rounded-full bg-slate text-white text-[13px] grid place-items-center">{step}</span>
        <span className="font-display text-[21px] sm:text-[24px] text-ink">{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}

export function Chip({ active, onClick, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full border text-[14px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:line-through ${
        active ? 'bg-slate border-slate text-white' : 'bg-white border-[#b9c3cc] text-ink hover:border-slate'
      }`}
    >
      {children}
    </button>
  );
}

export const invalid = (err) => (err ? '!border-[#b42318]' : '');
