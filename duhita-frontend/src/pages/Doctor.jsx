import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import useSeo from '../hooks/useSeo';
import { doctor } from '../data/site';

const expertise = [
  'Wisdom tooth and impacted tooth surgery',
  'Dental implants and full-mouth rehabilitation',
  'Bone grafting and ridge preparation',
  'Jaw cysts, biopsies and oral lesion management',
  'Facial trauma and jaw fracture care',
  'Painless root canal treatment',
];

export default function Doctor() {
  useSeo(
    'Dr. Nalluru Sasidhar, M.D.S | Oral & Maxillofacial Surgeon in Vijayawada',
    'Meet Dr. Nalluru Sasidhar, M.D.S (Oral & Maxillofacial Surgery), founder of Duhita Dental, Vijayawada — 30+ years of experience in implants, wisdom tooth surgery and complex dental care.',
  );
  return (
    <>
      <PageHero eyebrow="Meet the Doctor" title={`${doctor.name}, M.D.S`} image="/images/services/maxillo_facial%20surgery/facial%20surgery%20.png.webp"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: doctor.name }]}>
        Oral &amp; Maxillofacial Surgeon · Founder, Duhita Multispeciality Dental Centre
      </PageHero>
      <section className="section-y bg-ivory">
        <div className="container-x grid gap-12 lg:grid-cols-[380px_1fr] lg:gap-20 items-start">
          <div className="reveal card overflow-hidden w-[220px] sm:w-[280px] lg:w-auto mx-auto lg:mx-0 lg:sticky lg:top-32">
            <div className="aspect-[4/5] overflow-hidden img-well"><img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover object-top" /></div>
            <div className="bg-slate text-white p-6">
              <p className="font-display text-[22px]">{doctor.name}</p>
              <p className="text-[13.5px] text-white/80 mt-1">{doctor.credentials}</p>
            </div>
          </div>
          <article className="reveal prose-duhita">
            <h2 className="!mt-0">A Surgeon’s Precision, a Family Dentist’s Warmth</h2>
            <p>
              {doctor.name} completed his Master of Dental Surgery in Oral &amp; Maxillofacial Surgery and founded Duhita Dental in
              Vijayawada in 1997. For more than {doctor.years} years he has treated patients of every age — combining surgical
              expertise with the patience and clear communication that nervous patients value most.
            </p>
            <p>
              Patients frequently mention his punctuality, discipline and the time he takes to explain a diagnosis before any
              treatment begins. Those values run through the whole Duhita team.
            </p>
            <h2>Areas of Expertise</h2>
            <ul>{expertise.map((e) => <li key={e}>{e}</li>)}</ul>
            <h2>Treatment Philosophy</h2>
            <p>
              “Save the natural tooth whenever it can be saved, replace it properly when it cannot, and never recommend a treatment I
              would not choose for my own family.” That principle shapes every plan made at the clinic.
            </p>
          </article>
        </div>
      </section>
      <ContactSection heading={`Consult ${doctor.name}`} />
    </>
  );
}
