import { Link, useParams } from 'react-router-dom';
import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import MapSection from '../components/MapSection';
import Faq from '../components/Faq';
import NotFound from './NotFound';
import useSeo from '../hooks/useSeo';
import { findCategory, findTreatment } from '../data/services';
import { site } from '../data/site';

export default function Treatment() {
  const { category, treatment } = useParams();
  const c = findCategory(category);
  const t = findTreatment(category, treatment);
  useSeo(
    t ? `${t.title} in Vijayawada | Duhita Dental, Benz Circle` : 'Page not found | Duhita Dental',
    t ? `${t.excerpt} Expert ${t.title.toLowerCase()} at Duhita Multispeciality Dental Centre, Vijayawada. Call ${site.phoneDisplay}.` : undefined,
  );
  if (!t) return <NotFound />;

  const others = c.treatments.filter((x) => x.slug !== t.slug);

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
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_320px] lg:gap-20 items-start">
          <article className="prose-duhita max-w-3xl">
            {t.intro.map((p) => <p key={p.slice(0, 20)} className="text-[17px]">{p}</p>)}
            <figure className="my-10 card img-well p-3 flex justify-center">
              <img src={t.image} alt={`${t.title} at Duhita Dental Vijayawada`} className="max-h-[520px] w-auto max-w-full object-contain" />
            </figure>
            {t.sections.map((s) => (
              <div key={s.h}>
                <h2>{s.h}</h2>
                {s.p && <p>{s.p}</p>}
                {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
              </div>
            ))}
            <h2>{t.title} at Duhita Dental</h2>
            <p>
              Patients from {site.areas.slice(0, 6).join(', ')} and across Vijayawada choose Duhita Dental for experienced,
              surgeon-led care, strict sterilisation and transparent pricing. <Link to="/patients/book-appointment">Book a consultation</Link>{' '}
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
              <p className="mt-3 text-[14px] text-white/80">Mon – Sat · 9 AM – 1 PM &amp; 3 PM – 9 PM</p>
              <div className="mt-6 grid gap-3">
                <Link to="/patients/book-appointment" className="btn bg-white text-slate hover:bg-ivory">Request Appointment</Link>
                <a href={`tel:${site.phone}`} className="btn btn-light">Call {site.phoneDisplay}</a>
              </div>
            </div>
            {others.length > 0 && (
              <div className="card p-6">
                <h3 className="text-[22px]">Related Treatments</h3>
                <ul className="mt-4 space-y-2.5">
                  {others.map((o) => (
                    <li key={o.slug}><Link to={`/services/${c.slug}/${o.slug}`} className="text-[14.5px] text-ink hover:text-slate">{o.title}</Link></li>
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
