import { Link } from 'react-router-dom';
import { FiPhone, FiClock, FiMapPin } from 'react-icons/fi';
import { site } from '../data/site';

export default function PatientAside({ title, steps, cta }) {
  return (
    <aside className="lg:sticky lg:top-32 space-y-5">
      <div className="bg-slate text-white p-6 sm:p-7 rounded-[18px]">
        <h2 className="!text-white text-[24px]">{title}</h2>
        <ol className="mt-5 space-y-4">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[14px] text-white/85 leading-relaxed">
              <span className="w-6 h-6 shrink-0 rounded-full border border-white/40 grid place-items-center text-[12px]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        {cta && <Link to={cta.to} className="btn bg-white text-slate hover:bg-ivory mt-7 w-full">{cta.label}</Link>}
      </div>
      <ul className="card p-5 sm:p-6 space-y-4 text-[14px]">
        <li className="flex gap-3"><FiPhone className="mt-0.5 shrink-0 text-slate" /><span>Need help? Call <a href={`tel:${site.phone}`} className="text-ink font-medium">{site.phoneDisplay}</a></span></li>
        <li className="flex gap-3"><FiClock className="mt-0.5 shrink-0 text-slate" /><span>{site.hours.map((h) => <span key={h.label} className="block">{h.label}: {h.value}</span>)}</span></li>
        <li className="flex gap-3"><FiMapPin className="mt-0.5 shrink-0 text-slate" /><span>{site.addressLines.join(', ')}</span></li>
      </ul>
      <p className="text-[12.5px] leading-relaxed px-1">
        Your details are kept confidential and used only for your dental care at {site.fullName}.
      </p>
    </aside>
  );
}
