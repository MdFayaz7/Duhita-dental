import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import MapSection from '../components/MapSection';
import useSeo from '../hooks/useSeo';

export default function Contact() {
  useSeo(
    'Contact Duhita Dental | Dentist Near Benz Circle, Vijayawada | +91 94403 13066',
    'Book an appointment at Duhita Multispeciality Dental Centre, Shanthi Plaza, Krishna Nagar, near Benz Circle, Vijayawada. Open Mon–Sat 9 AM–1 PM & 3 PM–9 PM.',
  );
  return (
    <>
      <PageHero eyebrow="Contact" title="Visit Our Clinic Near Benz Circle" image="/images/services/oral_medicine_diagnosis/scan.jpeg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}>
        Call, WhatsApp or send us a request — we will confirm a time that suits you.
      </PageHero>
      <ContactSection heading="Request an Appointment" />
      <MapSection />
    </>
  );
}
