import { Link } from 'react-router-dom';
import { FiPhone, FiUserPlus, FiCalendar, FiHome } from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { GoogleG } from '../components/GoogleReviews';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

const heroActions = [
  { icon: FiPhone, label: site.phoneDisplay, href: `tel:${site.phone}` },
  { icon: FiUserPlus, label: 'New Patient', to: '/patients/register' },
  { icon: FiCalendar, label: 'Book an Appointment', to: '/patients/book-appointment', primary: true },
  { icon: FiHome, label: 'Home Service', to: '/home-service' },
];

const SOCIALS = [
  { label: 'Facebook', href: site.social.facebook, icon: <FaFacebookF className="w-[18px] h-[18px] text-[#1877F2]" /> },
  { label: 'Instagram', href: site.social.instagram, icon: <FaInstagram className="w-5 h-5 text-[#E4405F]" /> },
  { label: 'Google reviews', href: site.social.google, icon: <GoogleG className="w-5 h-5" /> },
  { label: 'WhatsApp', href: site.whatsapp, icon: <FaWhatsapp className="w-5 h-5 text-[#25D366]" /> },
];

function Hero() {
  return (
    <section className="relative isolate overflow-hidden min-h-[calc(100svh-124px)] lg:min-h-[calc(100svh-76px)] flex flex-col bg-ink">
      <img src="/images/hero.png" alt="Child receiving gentle dental care at Duhita Dental, Vijayawada"
        className="hero-media absolute inset-0 -z-10 w-full h-full object-cover object-[70%_center]" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/45 to-black/70 md:bg-none md:bg-gradient-to-r md:from-black/75 md:via-black/45 md:to-black/10" />

      <div className="flex-1 flex items-center px-[18px] md:px-10 xl:px-16 pt-12 sm:pt-16 pb-8">
        <div className="max-w-[640px] text-white">
          <p className="text-[12.5px] sm:text-[14px] font-semibold tracking-wide">{site.tagline}</p>
          <h1 className="!text-white mt-4 text-[30px] min-[380px]:text-[34px] sm:text-[46px] lg:text-[64px] leading-[1.08] lg:leading-[1.05]">
            Specialist Dental Care in Vijayawada, Andhra Pradesh
          </h1>
          <ul className="mt-6 sm:mt-8 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] sm:text-[14px] text-white/90">
            <li><strong className="font-semibold text-white">30+</strong> years of experience</li>
            <li><strong className="font-semibold text-white">10,000+</strong> patients treated</li>
            <li><strong className="font-semibold text-white">7</strong> specialities</li>
          </ul>
          <ul className="mt-6 sm:mt-7 flex items-center gap-3" aria-label="Follow Duhita Dental">
            {SOCIALS.map(({ label, href, icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}
                  className="w-11 h-11 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:scale-105">
                  {icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container-x pb-6 sm:pb-8">
        <nav aria-label="Quick actions"
          className="bg-white rounded-2xl lg:rounded-full p-1.5 sm:p-2 grid grid-cols-2 lg:grid-cols-4 gap-1.5 shadow-xl">
          {heroActions.map(({ icon: I, label, href, to, primary }) => {
            const cls = `group flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left rounded-xl lg:rounded-full px-2 sm:px-4 py-3 min-h-[64px] lg:min-h-0 transition-colors ${
              primary ? 'bg-slate text-white hover:bg-slate-deep' : 'text-ink hover:bg-ivory'}`;
            const body = (
              <>
                <span className={`w-9 h-9 shrink-0 rounded-full grid place-items-center ${primary ? 'bg-white/15' : 'bg-mist text-slate'}`}>
                  <I className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[13.5px] sm:text-[14.5px] font-semibold leading-tight">{label}</span>
              </>
            );
            return href
              ? <a key={label} href={href} className={cls}>{body}</a>
              : <Link key={label} to={to} className={cls}>{body}</Link>;
          })}
        </nav>

      </div>
    </section>
  );
}

export default function Home() {
  useSeo(
    'Best Dental Clinic in Vijayawada | Duhita Multispeciality Dental Centre, Benz Circle',
    'Trusted dentist in Benz Circle, Vijayawada since 1997. Dental implants, painless root canal, braces & aligners, kids dentistry, gum care and wisdom tooth surgery by Dr. Nalluru Sasidhar, M.D.S. Call +91 94403 13066.',
  );
  return <Hero />;
}
