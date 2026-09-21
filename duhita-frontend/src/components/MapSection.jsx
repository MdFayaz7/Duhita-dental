import { site } from '../data/site';

export default function MapSection() {
  return (
    <section className="bg-ivory" aria-label="Clinic location map">
      <iframe
        title="Duhita Dental on Google Maps"
        src={site.mapEmbed}
        className="w-full h-[420px] md:h-[560px] border-0 grayscale-[30%]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </section>
  );
}
