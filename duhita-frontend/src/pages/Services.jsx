import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import Icon from '../components/Icons';
import useSeo from '../hooks/useSeo';
import { categories } from '../data/services';

export default function Services() {
  useSeo(
    'Dental Treatments in Vijayawada | Implants, RCT, Braces & More | Duhita Dental',
    'Explore all dental treatments at Duhita Dental, Benz Circle, Vijayawada — endodontics, implants & prosthodontics, orthodontics, kids dentistry, gum care, oral surgery and oral diagnosis.',
  );
  return (
    <>
      <PageHero
        eyebrow="Our Services"
        title="Dental Treatments for Every Stage of Life"
        image="/images/services/prosthodontics/full%20mouth%20rehabitation.jpeg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Services' }]}
      >
        From your child’s first check-up to full-mouth implant rehabilitation, every speciality is available at our Benz Circle
        clinic in Vijayawada.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <article key={c.slug} className="reveal card card-hover flex flex-col group">
              <Link to={`/services/${c.slug}`} className="block aspect-[4/3] img-well p-3">
                <img src={c.image} alt={`${c.name} in Vijayawada`} className="w-full h-full object-contain" loading="lazy" />
              </Link>
              <div className="p-6 sm:p-7 flex flex-col flex-1">
                <Icon name={c.icon} className="w-9 h-9 text-ink" />
                <h2 className="text-[24px] sm:text-[26px] mt-4 leading-tight"><Link to={`/services/${c.slug}`}>{c.name}</Link></h2>
                <p className="mt-3 text-[14.5px] leading-relaxed">{c.short}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {c.treatments.map((t) => (
                    <li key={t.slug}>
                      <Link to={`/services/${c.slug}/${t.slug}`} className="text-[14px] text-ink hover:text-slate inline-flex items-center gap-1.5">
                        <FiChevronRight className="w-3.5 h-3.5" />{t.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to={`/services/${c.slug}`} className="btn btn-outline mt-7 w-full sm:w-auto sm:self-start">Explore {c.name.split(' ')[0]}</Link>
              </div>
            </article>
          ))}

          <article className="reveal card card-hover flex flex-col group">
            <Link to="/services/community-dentistry" className="block aspect-[4/3] overflow-hidden">
              <img src="/images/gallery/camps/camp-06.jpg" alt="Free dental camp by Duhita Dental in Vijayawada"
                className="w-full h-full object-cover" loading="lazy" />
            </Link>
            <div className="p-6 sm:p-7 flex flex-col flex-1">
              <Icon name="comfort" className="w-9 h-9 text-ink" />
              <h2 className="text-[24px] sm:text-[26px] mt-4 leading-tight">
                <Link to="/services/community-dentistry">Community Dentistry</Link>
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed">
                Free dental camps taking screenings and oral health awareness to schools, workplaces and villages.
              </p>
              <ul className="mt-5 space-y-2 flex-1">
                {['Free dental screening', 'School oral-health programmes', 'Workplace & department camps', 'Follow-up care at the clinic'].map((item) => (
                  <li key={item} className="text-[14px] text-ink inline-flex w-full items-center gap-1.5">
                    <FiChevronRight className="w-3.5 h-3.5" />{item}
                  </li>
                ))}
              </ul>
              <Link to="/services/community-dentistry" className="btn btn-outline mt-7 w-full sm:w-auto sm:self-start">See Our Camps</Link>
            </div>
          </article>
        </div>
      </section>
      <ContactSection />
    </>
  );
}
