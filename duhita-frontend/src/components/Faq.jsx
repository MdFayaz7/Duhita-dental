import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';

export default function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-black/10 border-y border-black/10">
      {items.map((f, i) => (
        <div key={f.q}>
          <button
            className="w-full flex items-center justify-between gap-6 py-5 text-left text-[17px] text-ink"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            {f.q}
            <FiPlus className={`shrink-0 transition-transform ${open === i ? 'rotate-45' : ''}`} />
          </button>
          <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
            <p className="overflow-hidden leading-relaxed">{f.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
