import { Link, useParams } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import NotFound from './NotFound';
import useSeo from '../hooks/useSeo';
import { findCategory } from '../data/services';

export default function ServiceCategory() {
  const { category } = useParams();
  const c = findCategory(category);
  useSeo(
    c ? `${c.name} in Vijayawada | Duhita Multispeciality Dental Centre` : 'Page not found | Duhita Dental',
    c ? `${c.short} Book at Duhita Dental, Benz Circle, Vijayawada.` : undefined,
  );
  if (!c) return <NotFound />;

  return (
    <>
      <PageHero
        eyebrow="Our Services"
        title={`${c.name} in Vijayawada`}
        image={c.image}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Services', to: '/services' }, { label: c.name }]}
      >
        {c.short}
      </PageHero>

      <section className="section-y bg-white">
        <div className="container-x grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20 items-start">
          <div className="reveal prose-duhita">
            <h2 className="!mt-0">About {c.name}</h2>
            <p>{c.intro}</p>
            <p>
              Not sure which treatment you need? Book a consultation — we will examine your teeth, take any necessary digital
              X-rays and explain every option clearly before you decide.
            </p>
          </div>
          <div className="reveal card aspect-[4/3] img-well p-4">
            <img src={c.image} alt={c.name} className="w-full h-full object-contain" />
          </div>
        </div>
      </section>

      <section className="section-y bg-ivory">
        <div className="container-x">
          <h2 className="text-[27px] sm:text-[33px] md:text-[44px] reveal">Treatments We Offer</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {c.treatments.map((t) => (
              <Link key={t.slug} to={`/services/${c.slug}/${t.slug}`} className="reveal card card-hover group flex flex-col">
                <div className="aspect-[4/3] img-well p-3">
                  <img src={t.image} alt={t.title} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-[24px] leading-tight">{t.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed flex-1">{t.excerpt}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] text-ink">
                    Learn more <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <ContactSection />
    </>
  );
}
