import PageHero from '../components/PageHero';
import Gallery from '../components/Gallery';
import ContactSection from '../components/ContactSection';
import Icon from '../components/Icons';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

const pillars = [
  { icon: 'tooth', title: 'Free Screening', body: 'Complete oral examination for every participant, with findings explained on the spot.' },
  { icon: 'child', title: 'School Programmes', body: 'Brushing demonstrations and oral hygiene talks for students, teachers and parents.' },
  { icon: 'surgeon', title: 'Workplace Camps', body: 'On-site camps for staff of government departments, police units and private organisations.' },
  { icon: 'shield', title: 'Follow-Up Care', body: 'Patients needing treatment are guided to the clinic, with priority appointments.' },
];

export default function CommunityDentistry() {
  useSeo(
    'Free Dental Camps in Vijayawada | Community Dentistry | Duhita Dental',
    'Duhita Multispeciality Dental Centre conducts free dental camps across Vijayawada and Krishna district — school programmes, workplace screenings and community check-ups led by Dr. Nalluru Sasidhar, M.D.S.',
  );

  return (
    <>
      <PageHero
        eyebrow="Community Dentistry"
        title="Free Dental Camps Across Vijayawada"
        image="/images/gallery/camps/camp-06.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Services', to: '/services' }, { label: 'Community Dentistry' }]}
      >
        Taking check-ups, screenings and oral health awareness to schools, workplaces and villages — because most dental
        problems are far easier to treat when they are found early.
      </PageHero>

      <section className="section-y bg-white">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-20 items-start">
          <div className="reveal prose-duhita">
            <h2 className="!mt-0">Dentistry Beyond the Clinic</h2>
            <p>
              Many people in and around Vijayawada see a dentist only when the pain becomes unbearable. Our camps exist to change
              that. The Duhita team travels with portable equipment to schools, government departments, workplaces and
              neighbourhood halls, examining everyone who comes and explaining what they need in plain Telugu or English.
            </p>
            <p>
              Camps have been held with police units, AP SPDCL and AP TRANSCO staff, the EHS scheme, corporate CSR partners and
              local schools. There is no charge for the screening, and nobody is pressured into treatment.
            </p>
          </div>
          <div className="reveal grid sm:grid-cols-2 gap-5">
            {pillars.map((p) => (
              <div key={p.title} className="card p-6">
                <Icon name={p.icon} className="w-9 h-9 text-slate" />
                <h3 className="text-[21px] mt-4 leading-tight">{p.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Gallery id="camp-gallery" category="camps" heading="Camps in Pictures">
        Moments from our free dental camps across Vijayawada and Krishna district — registration desks, screenings and oral
        health counselling for hundreds of patients.
      </Gallery>

      <section className="bg-slate text-white py-16 md:py-20">
        <div className="container-x flex flex-col lg:flex-row lg:items-center gap-8 justify-between">
          <div className="max-w-2xl">
            <h2 className="!text-white text-[25px] sm:text-[30px] md:text-[40px] leading-[1.15]">Want a dental camp at your school or workplace?</h2>
            <p className="mt-4 text-white/85 leading-relaxed">
              Schools, colleges, offices, residential associations and government departments in and around Vijayawada can request
              a free camp. Tell us the location and the number of participants, and our team will plan a date.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <a href={`tel:${site.phone}`} className="btn bg-white text-slate hover:bg-ivory !py-3.5 !px-7">Call {site.phoneDisplay}</a>
            <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn btn-light !py-3.5 !px-7">Request a Camp</a>
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
