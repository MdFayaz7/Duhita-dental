import { Link } from 'react-router-dom';
import { FiPhone, FiUserPlus, FiCalendar, FiHome } from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { GoogleG } from '../components/GoogleReviews';
import useSeo from '../hooks/useSeo';
import HeroMedia from '../components/HeroMedia';
import { site } from '../data/site';

const heroActions = [
  { icon: FiPhone, label: site.phoneDisplay, short: 'Call Us', href: `tel:${site.phone}` },
  { icon: FiUserPlus, label: 'New Patient', short: 'Register', to: '/patients/register' },
  { icon: FiCalendar, label: 'Book an Appointment', short: 'Book', to: '/patients/book-appointment', primary: true },
  { icon: FiHome, label: 'Home Service', short: 'Home Visit', to: '/home-service' },
];

const SOCIALS = [
  { label: 'Facebook', href: site.social.facebook, icon: <FaFacebookF className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#1877F2]" /> },
  { label: 'Instagram', href: site.social.instagram, icon: <FaInstagram className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-[#E4405F]" /> },
  { label: 'Google reviews', href: site.social.google, icon: <GoogleG className="w-[18px] h-[18px] sm:w-5 sm:h-5" /> },
  { label: 'WhatsApp', href: site.whatsapp, icon: <FaWhatsapp className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-[#25D366]" /> },
];

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink flex flex-col min-h-[calc(100svh-69px)] md:min-h-[calc(100svh-76px)]">
      {/* The photo is a band on phones — so the whole scene is visible instead of a
          tight crop — and the full-bleed backdrop from tablets up. */}
      <div className="relative w-full h-[32svh] min-h-[180px] max-h-[290px] shrink-0 md:absolute md:inset-0 md:h-full md:max-h-none md:-z-10">
        <HeroMedia alt="Smiling patient in the dental chair at Duhita Dental, Vijayawada" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent md:bg-gradient-to-r md:from-[rgba(8,14,22,0.86)] md:via-[rgba(8,14,22,0.6)] md:via-40% md:to-transparent md:to-72%" />
      </div>

      <div className="flex-1 flex items-center px-4 md:px-10 xl:px-16 pt-5 md:pt-16 pb-4 md:pb-8">
        <div className="max-w-[640px] text-white">
          <p className="text-[12.5px] sm:text-[14px] font-semibold tracking-wide">{site.tagline}</p>
          <h1 className="!text-white mt-2.5 sm:mt-4 text-[27px] min-[360px]:text-[29px] min-[390px]:text-[32px] sm:text-[46px] lg:text-[64px] leading-[1.12] sm:leading-[1.08] lg:leading-[1.05]">
            Specialist Dental Care in Vijayawada, Andhra Pradesh
          </h1>
          <ul className="mt-3.5 sm:mt-8 flex flex-wrap gap-x-5 gap-y-0.5 text-[13px] sm:text-[14px] text-white/90">
            <li><strong className="font-semibold text-white">30+</strong> years of experience</li>
            <li><strong className="font-semibold text-white">10,000+</strong> patients treated</li>
            <li><strong className="font-semibold text-white">7</strong> specialities</li>
          </ul>
          <ul className="mt-4 sm:mt-7 flex items-center gap-2.5 sm:gap-3" aria-label="Follow Duhita Dental">
            {SOCIALS.map(({ label, href, icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}
                  className="w-9 h-9 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:scale-105">
                  {icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container-x pb-4 sm:pb-8">
        <nav aria-label="Quick actions"
          className="bg-white rounded-2xl lg:rounded-full p-1.5 sm:p-2 grid grid-cols-4 gap-1 sm:gap-1.5 shadow-xl">
          {heroActions.map(({ icon: I, label, short, href, to, primary }) => {
            const cls = `group flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1.5 lg:gap-3 text-center lg:text-left rounded-xl lg:rounded-full px-1 sm:px-3 lg:px-4 py-2.5 lg:py-3 min-h-[62px] lg:min-h-0 transition-colors ${
              primary ? 'bg-slate text-white hover:bg-slate-deep' : 'text-ink hover:bg-ivory'}`;
            const body = (
              <>
                <span className={`w-8 h-8 lg:w-9 lg:h-9 shrink-0 rounded-full grid place-items-center ${primary ? 'bg-white/15' : 'bg-mist text-slate'}`}>
                  <I className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                </span>
                <span className="text-[11px] min-[390px]:text-[12px] sm:text-[13px] lg:text-[14.5px] font-semibold leading-tight">
                  <span className="lg:hidden">{short}</span>
                  <span className="hidden lg:inline">{label}</span>
                </span>
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
