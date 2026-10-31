import { Link } from 'react-router-dom';
import { FiPhone, FiUserPlus, FiCalendar, FiHome, FiArrowRight } from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { GoogleG } from '../components/GoogleReviews';
import useSeo from '../hooks/useSeo';
import HeroMedia from '../components/HeroMedia';
import Icon from '../components/Icons';
import Faq from '../components/Faq';
import OurDoctors from '../components/OurDoctors';
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

// Below the hero: the text search engines and AI answers read to understand who the clinic is,
// what it treats and where it is — every fact comes from src/data, so it stays in step with the rest of the site.
function Intro() {
  return (
    <section className="section-y bg-white" aria-labelledby="intro-heading">
      <div className="container-x grid gap-8 lg:grid-cols-2 lg:gap-20 items-start">
        <div className="reveal">
          <h2 id="intro-heading" className="text-[27px] sm:text-[33px] md:text-[44px] leading-[1.1]">
            {site.fullName}, Vijayawada
          </h2>
          <p className="mt-4 text-[14.5px]">
            <a href={googlePlace.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink font-medium">
              <GoogleG className="w-4 h-4" /> {googlePlace.rating}★ from {googlePlace.total}+ Google reviews
            </a>
          </p>
        </div>
        <div className="reveal space-y-4 leading-relaxed">
          <p>
            {site.name} has been caring for families in Vijayawada since 1997. Founded by {doctor.name}, {doctor.credentials} —
            an endodontist and implantologist with over {doctor.years} years of experience — the clinic brings seven dental
            specialities under one roof near Benz Circle, so check-ups, root canals, implants, braces, gum treatment, children’s
            dentistry and oral surgery are all planned and carried out in one place.
          </p>
          <p>
            Every treatment starts with a careful diagnosis, digital X-rays where needed and a written estimate before anything
            begins. Morning and evening appointments run Monday to Saturday, and home visits are available for senior citizens
            and bedridden patients.
          </p>
        </div>
      </div>
    </section>
  );
}

function FeaturedTreatments() {
  return (
    <section className="section-y bg-ivory" aria-labelledby="treatments-heading">
      <div className="container-x">
        <div className="max-w-2xl reveal">
          <h2 id="treatments-heading" className="text-[27px] sm:text-[33px] md:text-[44px]">Popular Dental Treatments</h2>
          <p className="mt-4 leading-relaxed">
            The treatments patients in Vijayawada ask us about most — each one led by a specialist.
          </p>
        </div>
        <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(({ category, treatment }) => (
            <article key={treatment.slug} className="reveal card card-hover flex flex-col">
              <Link to={`/services/${category.slug}/${treatment.slug}`} className="block aspect-[16/10] img-well p-3">
                <img src={treatment.image} alt={`${treatment.title} at Duhita Dental, Vijayawada`}
                  className="w-full h-full object-contain" loading="lazy" decoding="async" />
              </Link>
              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <p className="text-[13px]">{category.name}</p>
                <h3 className="text-[21px] sm:text-[23px] mt-1 leading-snug">
                  <Link to={`/services/${category.slug}/${treatment.slug}`}>{treatment.title}</Link>
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed flex-1">{treatment.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
        <ul className="mt-8 flex flex-wrap gap-2 reveal" aria-label="All specialities">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link to={`/services/${c.slug}`} className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-[14px] text-ink hover:text-slate">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/services" className="btn btn-outline mt-6 inline-flex items-center gap-2">
          View all treatments <FiArrowRight />
        </Link>
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section className="section-y bg-white" aria-labelledby="why-heading">
      <div className="container-x">
        <h2 id="why-heading" className="text-[27px] sm:text-[33px] md:text-[44px] reveal max-w-xl">Why Patients Choose Duhita Dental</h2>
        <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {whyChoose.map((w) => (
            <div key={w.title} className="reveal card p-5 sm:p-8">
              <Icon name={w.icon} className="w-10 h-10 text-slate" />
              <h3 className="text-[21px] sm:text-[24px] mt-4 sm:mt-5">{w.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed">{w.body}</p>
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
          <h2 id="faq-heading" className="text-[27px] sm:text-[33px] md:text-[44px]">Common Questions</h2>
          <p className="mt-4 leading-relaxed">
            Serving patients from {site.areas.join(', ')} and across Vijayawada.
          </p>
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
    'Duhita Dental | Best Dental Clinic in Vijayawada, Benz Circle',
    'Duhita Dental: multispeciality dental clinic near Benz Circle, Vijayawada, since 1997 — implants, root canal, braces, aligners, kids dentistry and gum care. Call 0866 247 4066.',
    { image: '/images/hero-smile.jpg' }
  );
  return (
    <>
      <Hero />
      <Intro />
      <FeaturedTreatments />
      <WhyChoose />
      <OurDoctors />
      <HomeFaqs />
      <ContactSection />
    </>
  );
}
