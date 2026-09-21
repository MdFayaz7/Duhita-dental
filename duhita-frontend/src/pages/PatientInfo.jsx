import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import Faq from '../components/Faq';
import useSeo from '../hooks/useSeo';
import { homeFaqs } from '../data/site';

const blocks = [
  {
    id: 'first-visit',
    title: 'Your First Visit',
    body: [
      'Plan to arrive ten minutes early so we can register your details and medical history.',
      'Your first appointment includes a full examination, gum assessment and any X-rays needed for diagnosis.',
      'The doctor will explain findings, show you your images and give a written treatment plan with options and costs.',
    ],
  },
  {
    id: 'what-to-bring',
    title: 'What to Bring',
    body: [
      'A list of current medicines, including blood thinners and diabetes or blood-pressure tablets.',
      'Any previous dental X-rays, scans or treatment records.',
      'Your insurance or reimbursement documents, if applicable.',
      'For children, a favourite toy or comfort item is always welcome.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Insurance',
    body: [
      'We accept cash, UPI, debit and credit cards.',
      'Staged treatment plans let you spread larger treatments such as implants or braces over several visits.',
      'We provide detailed invoices and treatment certificates for employer or insurance reimbursement claims.',
    ],
  },
  {
    id: 'aftercare',
    title: 'Aftercare Instructions',
    body: [
      'After extractions or surgery: bite on gauze for an hour, avoid spitting, smoking and hot foods for 24 hours, and use a cold compress for swelling.',
      'After a root canal: avoid chewing hard foods on the tooth until the final crown is fitted.',
      'After fillings: numbness wears off in 2–3 hours — avoid biting your cheek or lip until then.',
      'Call us any time if you experience severe pain, bleeding or swelling that worsens after 48 hours.',
    ],
  },
];

const moreFaqs = [
  ...homeFaqs,
  { q: 'How often should I visit the dentist?', a: 'Every six months for a check-up and cleaning. Patients with gum disease may need visits every three to four months.' },
  { q: 'Do you treat children?', a: 'Yes. Our pedodontic service provides gentle care for children from their first tooth onwards.' },
  { q: 'Is parking available?', a: 'Two-wheeler and car parking is available near Shanthi Plaza. Call us for directions if needed.' },
];

export default function PatientInfo() {
  useSeo(
    'Patient Information | First Visit, Payments & Aftercare | Duhita Dental Vijayawada',
    'Everything you need before visiting Duhita Dental in Vijayawada — first visit guide, what to bring, payment options, aftercare instructions and FAQs.',
  );
  return (
    <>
      <PageHero eyebrow="For Patients" title="New Patient Information" image="/images/services/pedodontics/pedodontics.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'For Patients' }]}>
        Simple guidance to make your visit to Duhita Dental smooth and stress-free.
      </PageHero>
      <section className="section-y bg-ivory">
        <div className="container-x grid gap-5 md:grid-cols-2">
          {blocks.map((b) => (
            <div key={b.id} id={b.id} className="reveal card p-6 sm:p-8 md:p-10 scroll-mt-32">
              <h2 className="text-[30px]">{b.title}</h2>
              <ul className="prose-duhita mt-5">{b.body.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
      <section id="faqs" className="section-y bg-white scroll-mt-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <h2 className="text-[27px] sm:text-[33px] md:text-[44px] leading-[1.1] reveal">Frequently Asked Questions</h2>
          <div className="reveal"><Faq items={moreFaqs} /></div>
        </div>
      </section>
      <ContactSection />
    </>
  );
}
