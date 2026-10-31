import { Link, useParams } from 'react-router-dom';
import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import MapSection from '../components/MapSection';
import Faq from '../components/Faq';
import NotFound from './NotFound';
import useSeo from '../hooks/useSeo';
import { findCategory, findTreatment, relatedTreatments } from '../data/services';
import { site } from '../data/site';
import { breadcrumbs } from '../lib/schema';

// Search results cut titles off at about 60 characters: keep the treatment and city, shorten the brand when needed.
const treatmentTitle = (name) => {
  const full = `${name} in Vijayawada | Duhita Dental`;
  return full.length <= 60 ? full : `${name} | Duhita Dental Vijayawada`;
};

export default function Treatment() {
  const { category, treatment } = useParams();
  const c = findCategory(category);
  const t = findTreatment(category, treatment);

  const pageUrl = `https://duhitadental.com/services/${category}/${treatment}`;
  const schema = t ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalProcedure',
        '@id': `${pageUrl}#procedure`,
        name: t.title,
        description: t.excerpt,
        url: pageUrl,
        image: `https://duhitadental.com${t.image}`,
        bodyLocation: 'Mouth',
        ...(t.sections.find((s) => s.steps) && { howPerformed: t.sections.find((s) => s.steps).steps.join(' ') }),
        provider: { '@id': 'https://duhitadental.com/#dentist' },
      },
      breadcrumbs([
        ['Home', '/'],
        ['Services', '/services'],
        [c.name, `/services/${c.slug}`],
        [t.title, `/services/${c.slug}/${t.slug}`],
      ]),
    ],
  } : null;

  useSeo(
    t ? treatmentTitle(t.title) : 'Page not found | Duhita Dental',
    t ? `${t.excerpt} Duhita Dental, Benz Circle, Vijayawada. Call ${site.phoneDisplay}.` : undefined,
    {
      image: t?.image || undefined,
      schema,
    }
  );

  if (!c || !t) return <NotFound />;

  const others = relatedTreatments(c.slug, t.slug);

  return (
    <>
      <PageHero
        eyebrow={c.name}
        title={`${t.title} in Vijayawada`}
        image={t.image}
        crumbs={[
          { label: 'Home', to: '/' },
          { label: 'Services', to: '/services' },
          { label: c.name, to: `/services/${c.slug}` },
          { label: t.title },
        ]}
      >
        {t.excerpt}
      </PageHero>

      <section className="section-y bg-white">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-20 items-start">
          <article className="prose-duhita max-w-3xl">
            {t.intro.map((p) => <p key={p.slice(0, 20)} className="text-[16px] sm:text-[17px]">{p}</p>)}
            {t.glance?.length > 0 && (
              <div className="not-prose card bg-ivory p-5 sm:p-6 my-7">
                <h2 className="text-[20px] sm:text-[22px]">{t.title} at a glance</h2>
                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {t.glance.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[13px]">{label}</dt>
                      <dd className="text-[15px] text-ink font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <figure className="my-7 sm:my-10 card img-well p-3 flex justify-center">
              <img src={t.image} alt={`${t.title} at Duhita Dental Vijayawada`} loading="lazy" decoding="async" className="max-h-[320px] sm:max-h-[520px] w-auto max-w-full object-contain" />
            </figure>
            {t.sections.map((s) => (
              <div key={s.h}>
                <h2>{s.h}</h2>
                {[].concat(s.p || []).map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                {s.steps && <ol>{s.steps.map((li) => <li key={li}>{li}</li>)}</ol>}
                {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
                {s.after && <p>{s.after}</p>}
              </div>
            ))}
            <h2>{t.title} at Duhita Dental</h2>
            <p>
              Patients from {site.areas.slice(0, 6).join(', ')} and across Vijayawada choose Duhita Dental for experienced,
              specialist-led care, strict sterilisation and transparent pricing. <Link to="/patients/book-appointment">Book a consultation</Link>{' '}
              or call <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a> to discuss your treatment.
            </p>
            {t.faqs?.length > 0 && (
              <>
                <h2>Frequently Asked Questions</h2>
                <div className="not-prose"><Faq items={t.faqs} /></div>
              </>
            )}
          </article>

          <aside className="lg:sticky lg:top-32 space-y-6">
            <div className="bg-slate text-white p-7 rounded-[18px]">
              <h3 className="!text-white text-[24px]">Book a Consultation</h3>
              <p className="mt-3 text-[14px] text-white/80">Mon – Sat · 10 AM – 1 PM &amp; 4:30 PM – 8 PM</p>
              <div className="mt-6 grid gap-3">
                <Link to="/patients/book-appointment" className="btn bg-white text-slate hover:bg-ivory">Request Appointment</Link>
                <a href={`tel:${site.phone}`} className="btn btn-light">Call {site.phoneDisplay}</a>
              </div>
            </div>
            {others.length > 0 && (
              <div className="card p-6">
                <h3 className="text-[22px]">Related Treatments</h3>
                <ul className="mt-4 space-y-2.5">
                  {others.map(({ category: oc, treatment: o }) => (
                    <li key={`${oc}/${o.slug}`}><Link to={`/services/${oc}/${o.slug}`} className="text-[14.5px] text-ink hover:text-slate">{o.title}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
      <ContactSection />
      <MapSection />
    </>
  );
}
