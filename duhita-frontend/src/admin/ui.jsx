import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInbox, FiSearch, FiX } from 'react-icons/fi';

export const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------- buttons & surfaces ---------- */

// Practo Ray buttons: solid orange for the main action, white with a grey border for the rest.
const VARIANTS = {
  primary: 'bg-[var(--a-accent)] text-white border border-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]',
  secondary: 'bg-white text-[var(--a-text)] border border-[#c8c8c8] hover:bg-[#f5f5f5]',
  outline: 'bg-white text-[var(--a-accent)] border border-[var(--a-accent)] hover:bg-[var(--a-accent-soft)]',
  ghost: 'text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-black/4',
  danger: 'bg-white text-[#d93a46] border border-[#e8a1a6] hover:bg-[#fdecee]',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizing = size === 'sm' ? 'px-3 py-1.5 text-[13px] min-h-[32px]' : 'px-4 py-2 text-[14px] min-h-[38px]';
  return (
    <button className={cx('inline-flex items-center justify-center gap-2 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed', VARIANTS[variant], sizing, className)} {...props} />
  );
}

export function IconButton({ label, tone = 'default', className = '', ...props }) {
  const tones = {
    default: 'text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-black/5',
    danger: 'text-[var(--a-muted)] hover:text-[#d93a46] hover:bg-[#f0616d]/15',
  };
  return <button aria-label={label} title={label} className={cx('w-8 h-8 grid place-items-center rounded-[3px] transition-colors', tones[tone], className)} {...props} />;
}

export const Panel = ({ className = '', ...props }) => (
  <div className={cx('rounded-[4px] border border-[var(--a-border)] bg-[var(--a-surface)]', className)} {...props} />
);

export const Skeleton = ({ className = '' }) => (
  <div className={cx('animate-pulse rounded-lg bg-black/4', className)} />
);

export const EmptyState = ({ icon: Icon = FiInbox, title, hint, action }) => (
  <div className="py-16 px-6 text-center">
    <span className="w-12 h-12 mx-auto grid place-items-center rounded-md bg-black/3 text-[var(--a-muted)]"><Icon className="w-5 h-5" /></span>
    <p className="mt-4 text-[15px] text-[var(--a-text)]">{title}</p>
    {hint && <p className="mt-1.5 text-[13.5px] text-[var(--a-muted)] max-w-sm mx-auto">{hint}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const ErrorNote = ({ children }) =>
  children ? (
    <p className="flex items-start gap-2 rounded border border-[#f0616d]/30 bg-[#f0616d]/10 px-3.5 py-3 text-[13.5px] text-[#d93a46]">
      <FiAlertCircle className="mt-0.5 shrink-0" /> {children}
    </p>
  ) : null;

/* ---------- forms ---------- */

export const inputClass =
  'w-full min-h-[38px] rounded-[3px] border border-[#c8c8c8] bg-white px-3 py-2 text-[14px] text-[var(--a-text)] placeholder:text-[#9a9a9a] outline-none transition-colors focus:border-[var(--a-link)]';

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={cx('grid gap-1.5', className)}>
      {label && <span className="text-[13px] text-[#555]">{label}</span>}
      {children}
      {error ? <span className="text-[12.5px] text-[#d93a46]">{error}</span> : hint && <span className="text-[12.5px] text-[var(--a-muted)]">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <span className="relative block">
      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--a-muted)]" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} pl-10 pr-9`} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-md text-[var(--a-muted)] hover:bg-black/5">
          <FiX className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div role="tablist" className="inline-flex flex-wrap rounded-[3px] border border-[#c8c8c8] bg-white overflow-hidden">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('px-4 py-[7px] text-[14px] transition-colors border-r border-[#c8c8c8] last:border-r-0',
            value === o.value ? 'bg-[var(--a-selected)] text-white' : 'text-[#555] hover:bg-[#f5f5f5]')}>
          {o.label}
          {o.count != null && <span className={cx('ml-2 rounded-full px-1.5 py-0.5 text-[11px]', value === o.value ? 'bg-white/25' : 'bg-black/6')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- overlays ---------- */

export function Modal({ open, title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="admin fixed inset-0 z-[90] grid place-items-end sm:place-items-center bg-[rgba(20,25,60,0.55)] sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={cx('w-full max-h-[92vh] overflow-y-auto rounded-t-lg sm:rounded-[4px] bg-white shadow-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        style={{ animation: 'a-in .2s ease' }}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--a-border)] bg-[var(--a-panel)] px-5 sm:px-6 py-3.5">
          <div>
            <h2 className="text-[16px] font-medium">{title}</h2>
            {subtitle && <p className="text-[13px] text-[var(--a-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}><FiX /></IconButton>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ open, title, subtitle, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="admin fixed inset-0 z-[90] flex justify-end bg-[rgba(20,25,60,0.35)]" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[440px] h-full overflow-y-auto bg-white shadow-2xl a-in">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--a-border)] bg-[var(--a-panel)] px-5 py-3.5">
          <div>
            <h2 className="text-[16px] font-medium">{title}</h2>
            {subtitle && <p className="text-[13px] text-[var(--a-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}><FiX /></IconButton>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}

/* ---------- toasts & confirm ---------- */

const ToastCtx = createContext(() => {});
const ConfirmCtx = createContext(() => Promise.resolve(false));

export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

export function AdminProviders({ children }) {
  const [toasts, setToasts] = useState([]);
  const [ask, setAsk] = useState(null);
  const resolver = useRef(null);

  const toast = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const confirm = useCallback((options) => {
    setAsk(typeof options === 'string' ? { message: options } : options);
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (result) => {
    setAsk(null);
    resolver.current?.(result);
  };

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastCtx.Provider value={value}>
      <ConfirmCtx.Provider value={confirm}>
        {children}

        <div className="admin fixed bottom-5 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-[95] grid gap-2 w-[min(92vw,380px)]">
          {toasts.map((t) => (
            <div key={t.id} role="status"
              className={cx('a-in flex items-start gap-3 rounded-[3px] px-4 py-3 text-[14px] text-white shadow-lg',
                t.tone === 'error' ? 'bg-[#e53935]' : 'bg-[#323232]')}>
              {t.tone === 'error' ? <FiAlertCircle className="mt-0.5 shrink-0" /> : <FiCheckCircle className="mt-0.5 shrink-0" />}
              {t.message}
            </div>
          ))}
        </div>

        <Modal open={!!ask} title={ask?.title || 'Are you sure?'} onClose={() => close(false)}>
          <div className="flex gap-3.5">
            <span className="w-10 h-10 shrink-0 grid place-items-center rounded bg-[#f0616d]/12 text-[#d93a46]"><FiAlertTriangle /></span>
            <p className="text-[14.5px] leading-relaxed text-[var(--a-muted)]">{ask?.message}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant={ask?.tone === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={() => close(true)}>
              {ask?.confirmLabel || 'Yes, continue'}
            </Button>
            <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
          </div>
        </Modal>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ---------- data display ---------- */

export const STATUSES = ['pending', 'confirmed', 'checked_in', 'engaged', 'completed', 'cancelled', 'no_show'];

/** Front-desk wording, as in Practo: a checked-in patient is "waiting", one in the chair "engaged". */
export const STATUS_LABELS = {
  pending: 'Request', confirmed: 'Booked', checked_in: 'Waiting', engaged: 'Engaged', completed: 'Done',
  cancelled: 'Cancelled', no_show: 'No show',
};

// Solid chips in Practo's status colours (Waiting red, Engaged cyan, Done green).
const STATUS_STYLES = {
  pending: 'bg-[#ffb74d] text-white',
  confirmed: 'bg-[#5c6bc0] text-white',
  checked_in: 'bg-[var(--a-waiting)] text-white',
  engaged: 'bg-[var(--a-engaged)] text-white',
  completed: 'bg-[var(--a-done)] text-white',
  cancelled: 'bg-[#bdbdbd] text-white',
  no_show: 'bg-[#8d8d8d] text-white',
};

export const StatusPill = ({ status }) => (
  <span className={cx('inline-flex items-center rounded-[3px] px-2 py-[3px] text-[12px] font-medium whitespace-nowrap', STATUS_STYLES[status] || STATUS_STYLES.no_show)}>
    {STATUS_LABELS[status] || String(status || '').replace('_', ' ')}
  </span>
);

export const Table = ({ head, children, minWidth = 860 }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[14px]" style={{ minWidth }}>
      <thead>
        <tr className="border-b border-[var(--a-border)] bg-[var(--a-panel)] text-[12px] uppercase text-[#666]">
          {head.map((h) => <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--a-border)]">{children}</tbody>
    </table>
  </div>
);

/** Download any array of objects as a spreadsheet-friendly CSV. */
export function exportCsv(filename, rows) {
  if (!rows.length) return;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/** 2026-09-20T18:04:11Z -> "20 Sep 2026, 11:34 PM" in clinic (IST) time */
export const formatDateTime = (iso) => {
  if (!iso) return '—';
  let s = String(iso);
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
};

export const formatSlot = (t) => {
  if (!t) return '—';
  if (!t.includes(':')) return t;
  const parts = t.split(':').map(Number);
  if (isNaN(parts[0]) || isNaN(parts[1])) return t;
  const [h, m] = parts;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Today in clinic time (IST), as YYYY-MM-DD. */
export const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
