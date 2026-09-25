import { FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

const services = [
  'Dental check-ups and oral screening',
  'Denture adjustment, relining and repair',
  'Treatment of mouth ulcers and sore spots',
  'Emergency pain relief and first aid',
  'Oral hygiene care for bedridden patients',
  'Advice for caregivers on daily mouth care',
];

const whoFor = [
  'Senior citizens who find travel difficult',
  'Bedridden or post-surgery patients',
  'People with disabilities or limited mobility',
  'Patients in nursing homes and care centres',
];

export default function HomeService() {
  useSeo(
    'Dental Home Visit Service in Vijayawada | Duhita Dental',
    'Dental care at home in Vijayawada for senior citizens, bedridden and mobility-limited patients — check-ups, denture care and pain relief by Duhita Dental. Call to book a home visit.',
  );
  const wa = `${site.whatsapp}?text=${encodeURIComponent('Hello Duhita Dental, I would like to request a dental home visit.')}`;
  return (
    <>
      <PageHero eyebrow="Home Service" title="Dental Care at Your Doorstep" image="/images/services%20old/home-visit.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Home Service' }]}>
        For patients who cannot easily visit the clinic, our team brings essential dental care home — across Vijayawada.
      </PageHero>
      <section className="section-y bg-white">
        <div className="container-x grid gap-9 lg:grid-cols-2 lg:gap-20">
          <div className="reveal prose-duhita">
            <h2 className="!mt-0">What We Can Do at Home</h2>
            <ul>{services.map((s) => <li key={s}>{s}</li>)}</ul>
            <p>
              Procedures that need X-rays, surgery or specialised equipment are planned for the clinic, where we make the visit as
              comfortable and quick as possible.
            </p>
          </div>
          <div className="reveal prose-duhita">
            <h2 className="!mt-0">Who It Is For</h2>
            <ul>{whoFor.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="not-prose mt-7 sm:mt-8 bg-ivory rounded-2xl p-5 sm:p-7">
              <p className="font-display text-[21px] sm:text-[24px] text-ink">Request a home visit</p>
              <p className="mt-2 text-[14.5px]">Call or WhatsApp us with the patient’s name, address and concern. We will confirm a visit time.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`tel:${site.phone}`} className="btn btn-solid !py-3"><FiPhone /> Call {site.phoneDisplay}</a>
                <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline !py-3"><FaWhatsapp /> WhatsApp Us</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ContactSection />
    </>
  );
}
