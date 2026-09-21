import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiCheck, FiX } from 'react-icons/fi';

/** Checkbox dropdown with a "none" option and removable chips for the selection. */
export default function MultiSelect({ options, value, onChange, none, noneLabel = 'None', placeholder, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const toggle = (id) => {
    if (id === 'none') return onChange(none ? [] : ['none']);
    const base = value.filter((v) => v !== 'none');
    onChange(base.includes(id) ? base.filter((v) => v !== id) : [...base, id]);
  };
  const selected = options.filter((o) => value.includes(o.id));
  const isNone = value.includes('none');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`field flex items-center justify-between text-left min-h-[44px] ${error ? '!border-[#b42318]' : ''}`}
      >
        <span className={selected.length || isNone ? 'text-ink' : 'text-body/70'}>
          {isNone ? noneLabel : selected.length ? `${selected.length} condition${selected.length > 1 ? 's' : ''} selected` : placeholder}
        </span>
        <FiChevronDown className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul role="listbox" aria-multiselectable="true"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-line shadow-xl py-1">
          {[{ id: 'none', label: noneLabel }, ...options].map((o) => {
            const on = o.id === 'none' ? isNone : value.includes(o.id);
            return (
              <li key={o.id} role="option" aria-selected={on}>
                <button type="button" onClick={() => toggle(o.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14.5px] text-left hover:bg-ivory ${o.id === 'none' ? 'border-b border-line' : ''}`}>
                  <span className={`w-[18px] h-[18px] shrink-0 grid place-items-center border ${on ? 'bg-slate border-slate text-white' : 'border-[#9aa6b2]'}`}>
                    {on && <FiCheck className="w-3.5 h-3.5" />}
                  </span>
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {selected.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1.5 bg-mist text-ink text-[13px] pl-3 pr-1.5 py-1 rounded-full">
              {o.label}
              <button type="button" onClick={() => toggle(o.id)} aria-label={`Remove ${o.label}`} className="w-5 h-5 grid place-items-center rounded-full hover:bg-white">
                <FiX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
