/** Full-bleed hero photo, shown exactly as supplied (WebP with a JPEG fallback). */
export default function HeroMedia({ alt }) {
  return (
    <picture>
      <source srcSet="/images/hero-smile.webp" type="image/webp" />
      <img src="/images/hero-smile.jpg" alt={alt} width="1870" height="841" fetchPriority="high"
        className="hero-media absolute inset-0 -z-10 w-full h-full object-cover object-[76%_center]" />
    </picture>
  );
}
