import PageHero from '../components/PageHero';
import GoogleReviews from '../components/GoogleReviews';
import FeedbackReel from '../components/FeedbackReel';
import ContactSection from '../components/ContactSection';
import useSeo from '../hooks/useSeo';
import { googlePlace } from '../data/reviews';

export default function Reviews() {
  useSeo(
    'Patient Reviews | Duhita Dental, Vijayawada — 4.7★ on Google',
    `Read what patients say about Duhita Multispeciality Dental Centre, Vijayawada — rated ${googlePlace.rating} from ${googlePlace.total} Google reviews.`,
  );
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Patient Reviews"
        image="/images/services/smile-design.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Reviews' }]}
      >
        Rated {googlePlace.rating} out of 5 from {googlePlace.total} Google reviews by patients across Vijayawada.
      </PageHero>

      <FeedbackReel />
      <GoogleReviews />
      <ContactSection heading="Ready to Visit Us?" />
    </>
  );
}
