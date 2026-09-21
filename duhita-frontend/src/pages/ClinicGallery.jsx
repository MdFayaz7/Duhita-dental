import PageHero from '../components/PageHero';
import Gallery from '../components/Gallery';
import ContactSection from '../components/ContactSection';
import useSeo from '../hooks/useSeo';

export default function ClinicGallery() {
  useSeo(
    'Clinic Gallery | Duhita Multispeciality Dental Centre, Vijayawada',
    'Photo gallery of Duhita Multispeciality Dental Centre in Benz Circle, Vijayawada — treatment rooms, equipment and the clinic our patients visit.',
  );
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Clinic Gallery"
        image="/images/gallery/clinic/clinic-01.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Clinic Gallery' }]}
      >
        A look around Duhita Dental before you visit — our treatment rooms, equipment and the spaces where we care for
        patients every day.
      </PageHero>

      <Gallery id="clinic-gallery" category="clinic" layout="grid" heading="Our Clinic in Pictures" className="bg-ivory">
        Tap any photo to view it full screen. For more of the clinic, see{' '}
        <a href="/about#infrastructure" className="text-ink underline underline-offset-4">Our Infrastructure</a> on the About page.
      </Gallery>

      <ContactSection />
    </>
  );
}
