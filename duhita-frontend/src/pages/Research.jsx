import { useMemo, useState } from 'react';
import { FiFileText, FiDownload, FiExternalLink, FiBookOpen } from 'react-icons/fi';
import PageHero from '../components/PageHero';
import ContactSection from '../components/ContactSection';
import { Chip } from '../components/Form';
import useSeo from '../hooks/useSeo';
import { research as builtInResearch } from '../data/research';
import { apiFileUrl, useLiveList } from '../lib/content';
import { site } from '../data/site';

const ALL = 'All';

function PaperCard({ paper }) {
  const meta = [paper.publication, paper.year].filter(Boolean).join(' · ');
  return (
    <article className="reveal card card-hover p-6 sm:p-7 flex flex-col">
      <span className="w-11 h-11 rounded-full bg-mist text-slate grid place-items-center shrink-0">
        <FiFileText className="w-5 h-5" />
      </span>
      {paper.category && <p className="eyebrow mt-5">{paper.category}</p>}
      <h2 className="text-[21px] sm:text-[23px] leading-snug mt-2">{paper.title}</h2>
      <p className="mt-2 text-[14px] text-ink">{paper.authors}</p>
      {meta && <p className="text-[13px] text-body mt-1">{meta}</p>}
      {paper.description && <p className="mt-4 text-[14.5px] leading-relaxed flex-1">{paper.description}</p>}
      {paper.file && (
        <div className="mt-6 flex flex-wrap gap-2.5">
          <a href={paper.file} target="_blank" rel="noreferrer" className="btn btn-solid !py-2.5 grow sm:grow-0">
            <FiExternalLink className="w-4 h-4" /> Read paper
          </a>
          <a href={paper.file} download className="btn btn-outline !py-2.5 grow sm:grow-0">
            <FiDownload className="w-4 h-4" /> Download PDF
          </a>
        </div>
      )}
    </article>
  );
}

export default function Research() {
  useSeo(
    'Our Research & Publications | Duhita Dental, Vijayawada',
    'Research papers, case studies and publications from the team at Duhita Multispeciality Dental Centre, Vijayawada.',
  );

  const research = useLiveList('/api/research', (p) => ({ ...p, file: apiFileUrl(p.file) }), builtInResearch);

  const categories = useMemo(
    () => [ALL, ...new Set(research.map((p) => p.category).filter(Boolean))],
    [research],
  );
  const [active, setActive] = useState(ALL);
  const papers = active === ALL ? research : research.filter((p) => p.category === active);

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Our Research"
        image="/images/services/oral_medicine_diagnosis/scan.jpeg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Our Research' }]}
      >
        Papers, case studies and clinical reviews from the team at Duhita Multispeciality Dental Centre.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x">
          {research.length === 0 ? (
            <div className="card p-8 sm:p-14 text-center max-w-2xl mx-auto reveal">
              <span className="w-16 h-16 mx-auto rounded-full bg-mist text-slate grid place-items-center">
                <FiBookOpen className="w-7 h-7" />
              </span>
              <h2 className="text-[26px] sm:text-[32px] mt-6">Publications coming soon</h2>
              <p className="mt-4 leading-relaxed">
                Dr. Sasidhar and the Duhita team are preparing a set of clinical papers and case studies for publication here.
                In the meantime, we are happy to discuss any treatment or diagnosis in detail at the clinic.
              </p>
              <a href={`tel:${site.phone}`} className="btn btn-outline mt-8">Talk to Our Team</a>
            </div>
          ) : (
            <>
              {categories.length > 2 && (
                <div className="flex flex-wrap gap-2 mb-10 reveal" role="group" aria-label="Filter research by speciality">
                  {categories.map((c) => (
                    <Chip key={c} active={active === c} onClick={() => setActive(c)}>{c}</Chip>
                  ))}
                </div>
              )}
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {papers.map((p) => <PaperCard key={p.title} paper={p} />)}
              </div>
            </>
          )}
        </div>
      </section>

      <ContactSection />
    </>
  );
}
