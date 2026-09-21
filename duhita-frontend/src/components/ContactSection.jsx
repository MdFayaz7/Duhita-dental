import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiClock, FiCalendar } from 'react-icons/fi';
import { site } from '../data/site';

export default function ContactSection({ heading = 'Book Your Visit', eyebrow = 'Ready to take the next step?' }) {
  return (
    <section id="appointment" className="bg-mist section-y scroll-mt-24">
      <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
        <div className="reveal">
          <p className="text-[14px] font-semibold text-ink mb-3">{eyebrow}</p>
          <h2 className="text-[28px] sm:text-[34px] md:text-[48px] leading-[1.1]">{heading}</h2>
          <ul className="mt-10 space-y-4 text-[15px] text-ink">
            <li className="flex gap-3"><FiPhone className="mt-1 shrink-0" /><a href={`tel:${site.phone}`}>{site.phoneDisplay}</a></li>
            <li className="flex gap-3"><FiMail className="mt-1 shrink-0" /><a href={`mailto:${site.email}`}>{site.email}</a></li>
            <li className="flex gap-3"><FiMapPin className="mt-1 shrink-0" /><span>{site.addressLines.map((l) => <span key={l} className="block">{l}</span>)}</span></li>
            <li className="flex gap-3"><FiClock className="mt-1 shrink-0" /><span>{site.hours.map((h) => <span key={h.label} className="block">{h.label}: {h.value}</span>)}</span></li>
          </ul>
        </div>

        <div className="reveal card p-8 sm:p-10 md:p-14 text-center">
          <span className="w-16 h-16 mx-auto rounded-full bg-mist grid place-items-center text-slate"><FiCalendar className="w-7 h-7" /></span>
          <p className="mt-6 text-[16px] leading-relaxed max-w-sm mx-auto">
            Choose a date and time that suits you — morning or evening, Monday to Saturday.
          </p>
          <Link to="/patients/book-appointment" className="btn btn-solid !px-9 !py-4 !text-[15px] mt-8 w-full sm:w-auto">Book an Appointment</Link>
        </div>
      </div>
    </section>
  );
}
