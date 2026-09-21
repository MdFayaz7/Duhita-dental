import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import Gallery from '../components/Gallery';
import OurDoctors from '../components/OurDoctors';
import ContactSection from '../components/ContactSection';
import Icon from '../components/Icons';
import useSeo from '../hooks/useSeo';
import { doctor, stats, whyChoose, technology } from '../data/site';

const milestones = [
  { year: '1997', text: 'Dr. Nalluru Sasidhar opens Duhita Dental in Vijayawada with a single chair and a promise of honest, gentle care.' },
  { year: '2008', text: 'The clinic grows into a multispeciality centre, adding endodontics, orthodontics, prosthodontics and kids dentistry.' },
  { year: '2016', text: 'Digital X-rays and rotary root canal systems are introduced across every treatment room.' },
  { year: 'Today', text: 'More than 10,000 patients treated and hundreds of implants placed — with the same personal attention as day one.' },
];

export default function About() {
  useSeo(
    'About Duhita Dental | Trusted Dental Clinic in Vijayawada Since 1997',
    'Learn about Duhita Multispeciality Dental Centre, Benz Circle, Vijayawada — a surgeon-led family dental clinic caring for patients since 1997.',
  );
  return (
    <>
      <PageHero eyebrow="About Us" title="Caring for Vijayawada’s Smiles Since 1997" image="/images/services/oral_medicine_diagnosis/scan.jpeg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us' }]}>
        A family dental practice built on careful diagnosis, honest advice and gentle hands.
      </PageHero>

      <section className="section-y bg-white">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          <div className="reveal prose-duhita">
            <h2 className="!mt-0">Our Story</h2>
            <p>
              Duhita Multispeciality Dental Centre began in 1997 with a simple idea: people in Vijayawada deserve specialist-level
              dental care close to home, delivered with patience and respect. More than 30 years later, that idea still guides
              every appointment.
            </p>
            <p>
              Today our clinic in Shanthi Plaza, near Benz Circle, brings seven dental specialities under one roof — so a child’s
              first check-up, a parent’s root canal and a grandparent’s implants can all be handled by one trusted team.
            </p>
            <p>
              We explain every diagnosis in plain language, show you your X-rays, and give written treatment options with clear
              costs. No pressure, no unnecessary procedures — just the care you would want for your own family.
            </p>
          </div>
          <dl className="reveal grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-ivory p-8">
                <dt className="font-display text-[44px] text-slate leading-none">{s.value}</dt>
                <dd className="mt-3 text-[14px]">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section-y bg-mist">
        <div className="container-x">
          <h2 className="text-[28px] sm:text-[34px] md:text-[48px] reveal">Our Journey</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {milestones.map((m) => (
              <li key={m.year} className="reveal border-t border-slate/40 pt-6">
                <p className="font-display text-[34px] text-slate">{m.year}</p>
                <p className="mt-3 text-[14.5px] leading-relaxed">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-y bg-ivory">
        <div className="container-x">
          <h2 className="text-[28px] sm:text-[34px] md:text-[48px] reveal max-w-xl">What Makes Our Care Different</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {whyChoose.map((w) => (
              <div key={w.title} className="reveal card p-6 sm:p-8">
                <Icon name={w.icon} className="w-10 h-10 text-slate" />
                <h3 className="text-[24px] mt-5">{w.title}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Gallery id="infrastructure" category="infrastructure" heading="Our Infrastructure" className="bg-white">
        Six treatment rooms at our Benz Circle clinic, each with a modern dental chair, chair-side imaging and a dedicated
        sterilisation area — built so that treatment is safe, unhurried and comfortable for every patient.
      </Gallery>

      <section className="section-y bg-mist">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          <div className="reveal">
            <h2 className="text-[28px] sm:text-[34px] md:text-[48px] leading-[1.1]">Technology</h2>
            <p className="mt-5 leading-relaxed">
              We keep investing in proven dental technology so diagnosis is more accurate, procedures are quicker and recovery is
              more comfortable for every patient.
            </p>
            <ul className="mt-8 space-y-5">
              {technology.map((t) => (
                <li key={t.strong} className="text-[16px] leading-relaxed text-ink">
                  <strong className="font-semibold">{t.strong}</strong> {t.rest}
                </li>
              ))}
              <li className="text-[16px] leading-relaxed text-ink">
                <strong className="font-semibold">Rotary endodontics and apex location</strong> for faster, more comfortable root
                canal treatment — often completed in a single sitting.
              </li>
              <li className="text-[16px] leading-relaxed text-ink">
                <strong className="font-semibold">Autoclave sterilisation with sealed pouches</strong> and single-use disposables
                at every chair, every time.
              </li>
            </ul>
          </div>
          <div className="reveal bg-white p-3">
            <img src={technology[0].image} alt={technology[0].strong} className="w-full h-auto object-contain" loading="lazy" />
          </div>
        </div>
      </section>

      <OurDoctors />
      <ContactSection />
    </>
  );
}
