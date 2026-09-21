import { Link } from 'react-router-dom';
import { FiArrowRight, FiUser } from 'react-icons/fi';
import { apiFileUrl, useLiveList } from '../lib/content';
import { doctor as founder } from '../data/site';

const FOUNDER_PATH = '/about/dr-nalluru-sasidhar';

/** Shown until the API answers (or if it can't be reached). */
const builtIn = [{
  id: 'founder',
  name: founder.name,
  qualification: founder.credentials,
  speciality: 'Oral & Maxillofacial Surgery',
  experience_years: founder.years,
  bio: 'Founder of Duhita Multispeciality Dental Centre, practising in Vijayawada since 1997.',
  photo: founder.image,
}];

const toCard = (d) => ({ ...d, photo: apiFileUrl(d.photo) });

/** Doctors managed in the admin dashboard: add, edit, hide, reorder and delete all show here. */
export default function OurDoctors() {
  const doctors = useLiveList('/api/doctors', toCard, builtIn);
  if (!doctors.length) return null;

  return (
    <section className="section-y bg-white" aria-labelledby="doctors-heading">
      <div className="container-x">
        <div className="max-w-2xl reveal">
          <h2 id="doctors-heading" className="text-[27px] sm:text-[33px] md:text-[44px]">Our Doctors</h2>
          <p className="mt-4 leading-relaxed">
            Specialists who plan and carry out every treatment at Duhita Dental, led by our founder, an M.D.S oral &amp;
            maxillofacial surgeon.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => {
            const isFounder = /sasidhar/i.test(d.name);
            const meta = [d.speciality, d.experience_years ? `${d.experience_years}+ years` : null].filter(Boolean).join(' · ');
            return (
              <article key={d.id || d.name} className="reveal card card-hover flex flex-col">
                <div className="aspect-[4/5] max-h-[340px] img-well overflow-hidden">
                  {d.photo
                    ? <img src={d.photo} alt={d.name} loading="lazy" className="w-full h-full object-cover object-top" />
                    : <FiUser className="w-12 h-12 text-stone" aria-hidden="true" />}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-[22px] leading-snug">{d.name}</h3>
                  {d.qualification && <p className="mt-1 text-[14px] text-ink">{d.qualification}</p>}
                  {meta && <p className="mt-1 text-[13px]">{meta}</p>}
                  {d.bio && <p className="mt-3 text-[14.5px] leading-relaxed flex-1">{d.bio}</p>}
                  {isFounder && (
                    <Link to={FOUNDER_PATH} className="mt-5 inline-flex items-center gap-2 text-[14px] text-ink font-medium hover:gap-3 transition-all">
                      Read full profile <FiArrowRight />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
