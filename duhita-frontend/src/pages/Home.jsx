import { Link } from 'react-router-dom';
import { FiPhone, FiUserPlus, FiCalendar, FiHome, FiArrowRight } from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { GoogleG } from '../components/GoogleReviews';
import useSeo from '../hooks/useSeo';
import HeroMedia from '../components/HeroMedia';
import Icon from '../components/Icons';
import Faq from '../components/Faq';
import OurDoctors from '../components/OurDoctors';
import AutoSlider from '../components/AutoSlider';
import ContactSection from '../components/ContactSection';
import { site, doctor, whyChoose, homeFaqs } from '../data/site';
import { categories, featured } from '../data/services';
import { googlePlace } from '../data/reviews';

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
      {/* The photo fills the whole hero: the upright 9:16 shot on phones, the
          landscape one from tablets up. */}
      <div className="absolute inset-0 -z-10">
        <HeroMedia alt="Smiling patient in the dental chair at Duhita Dental, Vijayawada" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(8,14,22,0.82)] via-[rgba(8,14,22,0.35)] via-45% to-[rgba(8,14,22,0.55)] md:bg-gradient-to-r md:from-[rgba(8,14,22,0.86)] md:via-[rgba(8,14,22,0.6)] md:via-40% md:to-transparent md:to-72%" />
      </div>

      <div className="flex-1 flex items-start md:items-center px-4 md:px-10 xl:px-16 pt-6 md:pt-16 pb-4 md:pb-8">
        <div className="max-w-[640px] text-white">
          <p className="text-[12.5px] sm:text-[14px] font-semibold tracking-wide">{site.tagline}</p>
          <h1 className="!text-white mt-2.5 sm:mt-4 text-[27px] min-[360px]:text-[29px] min-[390px]:text-[32px] sm:text-[46px] lg:text-[64px] leading-[1.12] sm:leading-[1.08] lg:leading-[1.05]">
            Specialist Dental Care in Vijayawada, Andhra Pradesh
          </h1>
          <ul className="mt-3.5 sm:mt-8 flex flex-wrap gap-x-5 gap-y-0.5 text-[13px] sm:text-[14px] text-white/90">
            <li><strong className="font-semibold text-white">32+</strong> years of experience</li>
            <li><strong className="font-semibold text-white">200,000+</strong> patients treated</li>
            <li><strong className="font-semibold text-white">30,000+</strong> implants placed</li>
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

      <div className="container-x pb-3 sm:pb-8">
        <nav aria-label="Quick actions"
          className="bg-white rounded-2xl lg:rounded-full p-1 sm:p-2 grid grid-cols-4 gap-1 sm:gap-1.5 shadow-xl">
          {heroActions.map(({ icon: I, label, short, href, to, primary }) => {
            const cls = `group flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 text-center lg:text-left rounded-xl lg:rounded-full px-1 sm:px-3 lg:px-4 py-2 lg:py-3 min-h-[50px] lg:min-h-0 transition-colors ${
              primary ? 'bg-slate text-white hover:bg-slate-deep' : 'text-ink hover:bg-ivory'}`;
            const body = (
              <>
                <span className={`w-6 h-6 lg:w-9 lg:h-9 shrink-0 rounded-full grid place-items-center ${primary ? 'bg-white/15' : 'bg-mist text-slate'}`}>
                  <I className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px]" />
                </span>
                <span className="text-[10.5px] min-[390px]:text-[11.5px] sm:text-[13px] lg:text-[14.5px] font-semibold leading-tight">
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

const TRUST = [
  { value: '32+', label: 'Years of experience' },
  { value: '200,000+', label: 'Patients treated' },
  { value: '30,000+', label: 'Implants placed' },
  { value: '7', label: 'Specialities, one roof' },
];

function SectionHead({ id, eyebrow, title, children, light = false, className = '' }) {
  return (
    <div className={`max-w-2xl reveal ${className}`}>
      <p className={`eyebrow font-semibold ${light ? '!text-white/70' : '!text-slate'}`}>{eyebrow}</p>
      <h2 id={id} className={`mt-3 text-[28px] sm:text-[36px] md:text-[44px] leading-[1.1] ${light ? '!text-white' : ''}`}>{title}</h2>
      {children && <p className={`mt-4 leading-relaxed ${light ? 'text-white/75' : ''}`}>{children}</p>}
    </div>
  );
}

// Right under the hero: the numbers and the Google rating, so the proof is the first thing after the photo.
function TrustBar() {
  return (
    <section aria-label="Duhita Dental at a glance" className="bg-white border-b border-line">
      <div className="container-x py-8 sm:py-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
          {TRUST.map((t) => (
            <div key={t.label} className="sm:border-l sm:border-line sm:pl-5 first:border-0 first:pl-0">
              <dt className="sr-only">{t.label}</dt>
              <dd className="font-display text-[30px] sm:text-[38px] leading-none text-ink">{t.value}</dd>
              <dd className="mt-1.5 text-[13px] sm:text-[14px]">{t.label}</dd>
            </div>
          ))}
        </dl>
        <a href={googlePlace.url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-3 self-start rounded-2xl bg-ivory px-4 py-3 text-ink hover:bg-ivory-deep transition-colors">
          <GoogleG className="w-6 h-6" />
          <span className="leading-tight">
            <span className="block font-semibold text-[15px]">{googlePlace.rating} <span className="text-[#f5a623]">★★★★★</span></span>
            <span className="block text-[12.5px] text-body">{googlePlace.total}+ Google reviews</span>
          </span>
        </a>
      </div>
    </section>
  );
}

// The text search engines and AI answers read to understand who the clinic is, what it treats and where it is —
// every fact comes from src/data, so it stays in step with the rest of the site.
function Intro() {
  return (
    <section className="section-y bg-ivory" aria-labelledby="intro-heading">
      <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 items-center">
        <figure className="reveal relative max-w-md w-full mx-auto lg:mx-0">
          <div className="card aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] img-well !rounded-[28px]">
            <img src="/images/gallery/clinic/clinic-07.jpg" alt="Fully equipped dental operatory at Duhita Dental, Benz Circle, Vijayawada"
              loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </div>
          <figcaption className="card absolute -bottom-5 left-4 right-4 sm:left-auto sm:-right-6 sm:w-72 px-5 py-4 flex items-center gap-3">
            <span className="font-display text-[34px] leading-none text-ink">1997</span>
            <span className="text-[13px] leading-snug">Caring for Vijayawada families, near Benz Circle</span>
          </figcaption>
        </figure>
        <div className="reveal mt-6 lg:mt-0">
          <SectionHead id="intro-heading" eyebrow="About the hospital" title={`${site.fullName}, Vijayawada`} />
          <div className="mt-5 space-y-4 leading-relaxed">
            <p>
              {site.fullName} is a multispeciality dental hospital that has been caring for families in Vijayawada since 1997. Founded by {doctor.name}, {doctor.credentials} —
              an endodontist and implantologist with over {doctor.years} years of experience — the hospital brings seven dental
              specialities under one roof near Benz Circle, so check-ups, root canals, implants, braces, gum treatment, children’s
              dentistry and oral surgery are all planned and carried out in one place.
            </p>
            <p>
              Every treatment starts with a careful diagnosis, digital X-rays where needed and a written estimate before anything
              begins. Morning and evening appointments run Monday to Saturday, and home visits are available for senior citizens
              and bedridden patients.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/patients/book-appointment" className="btn btn-solid">Book an appointment <FiArrowRight /></Link>
            <Link to="/about" className="btn btn-outline">About us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Specialities() {
  return (
    <section className="section-y bg-white overflow-x-clip" aria-labelledby="treatments-heading">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead id="treatments-heading" eyebrow="Our specialities" title="Popular Dental Treatments">
            Seven specialities under one roof — each led by a specialist, from root canals and implants to braces and kids’ dentistry.
          </SectionHead>
          <Link to="/services" className="btn btn-outline reveal">View all treatments <FiArrowRight /></Link>
        </div>
        <div className="mt-9 sm:mt-11 reveal">
          <AutoSlider label="Dental specialities">
            {categories.map((c) => (
              <Link key={c.slug} to={`/services/${c.slug}`} className="group card card-hover h-full flex flex-col">
                <span className="block aspect-[4/3] img-well">
                  <img src={c.image} alt={`${c.name} at Duhita Dental, Vijayawada`} loading="lazy" decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </span>
                <span className="p-5 flex flex-col flex-1">
                  <span className="flex items-center gap-2.5">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-mist text-slate grid place-items-center"><Icon name={c.icon} className="w-5 h-5" /></span>
                    <span className="font-display text-[20px] leading-snug text-ink">{c.name}</span>
                  </span>
                  <span className="mt-3 text-[14px] leading-relaxed flex-1">{c.short}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate">
                    Learn more <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            ))}
          </AutoSlider>
        </div>
        <div className="mt-8 reveal">
          <p className="text-[13px] font-semibold text-ink">Most asked about</p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Popular treatments">
            {featured.map(({ category, treatment }) => (
              <li key={treatment.slug}>
                <Link to={`/services/${category.slug}/${treatment.slug}`}
                  className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-[14px] text-ink hover:border-slate hover:text-slate transition-colors">
                  {treatment.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section className="section-y bg-slate" aria-labelledby="why-heading">
      <div className="container-x">
        <SectionHead id="why-heading" eyebrow="Why Duhita" title="Why Patients Choose Duhita Dental" light />
        <div className="mt-9 sm:mt-11 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {whyChoose.map((w, i) => (
            <div key={w.title} className="reveal rounded-[18px] bg-white/[0.06] ring-1 ring-white/10 p-6 sm:p-8 hover:bg-white/[0.1] transition-colors">
              <div className="flex items-center justify-between">
                <span className="w-12 h-12 rounded-full bg-white text-slate grid place-items-center"><Icon name={w.icon} className="w-6 h-6" /></span>
                <span className="font-display text-[28px] text-white/25">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="!text-white text-[21px] sm:text-[23px] mt-5">{w.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/75">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeFaqs() {
  return (
    <section className="section-y bg-ivory" aria-labelledby="faq-heading">
      <div className="container-x grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="reveal">
          <SectionHead id="faq-heading" eyebrow="FAQ" title="Common Questions">
            Serving patients from {site.areas.join(', ')} — across Vijayawada and nearby areas.
          </SectionHead>
          <Link to="/patient-info" className="mt-5 inline-flex items-center gap-2 text-[14px] text-ink font-medium">
            Patient guide &amp; more FAQs <FiArrowRight />
          </Link>
        </div>
        <div className="reveal"><Faq items={homeFaqs} /></div>
      </div>
    </section>
  );
}

export default function Home() {
  useSeo(
    'Duhita Dental | Best Dental Hospital in Vijayawada, Benz Circle',
    'Duhita Dental: multispeciality dental hospital near Benz Circle, Vijayawada, since 1997 — implants, root canal, braces, kids dentistry and gum care. Call 0866 247 4066.',
    { image: '/images/hero-smile.jpg' }
  );
  return (
    <>
      <Hero />
      <TrustBar />
      <Intro />
      <Specialities />
      <WhyChoose />
      <OurDoctors />
      <HomeFaqs />
      <ContactSection />
    </>
  );
}
