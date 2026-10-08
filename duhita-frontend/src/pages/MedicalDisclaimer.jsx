import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

export default function MedicalDisclaimer() {
  useSeo(
    'Medical & AI Disclaimer | Duhita Multispeciality Dental Centre, Vijayawada',
    'Official Medical Disclaimer and Artificial Intelligence disclosure regarding Duhita AI, informational boundaries, and clinical consultation standards.',
    { image: '/images/services/pedodontics/pedodontics.jpg' }
  );

  return (
    <>
      <PageHero
        eyebrow="Clinical Disclosure"
        title="Medical & AI Disclaimer"
        image="/images/services/pedodontics/pedodontics.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Medical & AI Disclaimer' }]}
      >
        Important clinical boundaries regarding our digital assistant, educational materials, and professional dentist consultations.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x max-w-4xl mx-auto">
          <div className="card p-6 sm:p-10 md:p-12 space-y-9 text-[15px] leading-relaxed text-body">
            <div>
              <p className="text-[12.5px] uppercase tracking-wider font-semibold text-slate mb-1">Notice of Medical Limitations</p>
              <h2 className="text-[24px] sm:text-[30px] text-ink font-display">General Medical &amp; Dental Disclaimer</h2>
              <p className="mt-3">
                All materials, articles, procedural guides, FAQs, and educational resources published on this website are provided strictly for <strong>general informational and health literacy purposes only</strong>.
              </p>
              <p className="mt-2.5">
                Nothing contained on this website constitutes professional dental examination, diagnosis, or customized medical advice. No content is intended to establish a formal doctor-patient relationship prior to an in-person clinical consultation and thorough diagnostic assessment at <strong>{site.fullName}</strong>.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-ink space-y-2.5">
                <h3 className="text-[18px] font-semibold text-amber-950 flex items-center gap-2">
                  <span>⚠️</span> Artificial Intelligence (&ldquo;Duhita AI&rdquo;) Disclosure
                </h3>
                <p className="text-[14.5px] text-amber-900 leading-relaxed">
                  Our website includes an interactive digital assistant named <strong>Duhita AI</strong>. While designed to converse about dental terminology, symptom categories, and appointment bookings, users must be fully aware of the following fundamental clinical and technological limitations:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-[14px] text-amber-950">
                  <li>
                    <strong>Duhita AI is an automated software algorithm, not a licensed dentist, surgeon, or healthcare professional.</strong>
                  </li>
                  <li>
                    <strong>The AI does not and cannot provide a medical or dental diagnosis.</strong> Diagnosis requires direct visual inspection, tactile evaluation, periodontal probing, and appropriate radiological imaging (such as digital IOPA X-rays, OPG, or CBCT scans) performed by a licensed dental surgeon.
                  </li>
                  <li>
                    <strong>AI responses never replace an in-person clinical evaluation or customized treatment plan.</strong> You should never start, modify, or discontinue medications, or perform self-treatment based on automated chatbot advice.
                  </li>
                  <li>
                    <strong>Third-Party Cloud AI Processing Disclosure:</strong> To process complex language queries in English and Telugu, messages submitted to Duhita AI are processed via secure technical APIs powered by third-party artificial intelligence infrastructure (including Google Gemini, Groq, and OpenRouter cloud platforms).
                  </li>
                  <li>
                    <strong>Potential for Model Inaccuracies:</strong> Generative AI systems can occasionally produce imprecise, non-exhaustive, or contextual misinterpretations. Always corroborate information with our clinical doctors during your visit.
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">Red-Flag Symptoms &amp; Dental Emergencies</h3>
              <p className="mb-3">
                If you or a family member experience any of the following acute dental or maxillofacial emergency symptoms, <strong>do not rely on our website, forms, or AI chat</strong>:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-[14px]">
                {[
                  'Rapidly spreading facial or submandibular swelling',
                  'Difficulty breathing or difficulty swallowing saliva',
                  'Inability to open the mouth (severe trismus)',
                  'Uncontrolled bleeding following an extraction or trauma',
                  'Knocked-out (avulsed) permanent tooth',
                  'Severe facial trauma or suspected jaw fracture',
                  'High fever accompanied by severe dental pain',
                  'Visible pus discharge or severe systemic malaise',
                ].map((item) => (
                  <div key={item} className="p-3 rounded-xl bg-mist border border-line text-ink flex items-start gap-2.5">
                    <span className="text-[#b42318] font-bold text-[16px] leading-none shrink-0">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[14px]">
                In the event of an emergency, immediately report to the nearest hospital emergency room (casualty) or contact our clinic directly at{' '}
                <a href={`tel:${site.phone}`} className="font-semibold text-slate underline">{site.phoneDisplay}</a>.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">Limitation of Clinical Liability</h3>
              <p>
                Duhita Multispeciality Dental Centre, Dr. Nalluru Sasidhar, and our associate doctors and staff expressly disclaim any liability for adverse outcomes, delays in seeking professional care, or damages arising from reliance upon information provided on this website or by the digital AI assistant.
              </p>
            </div>

            <div className="border-t border-line pt-7 flex flex-wrap gap-4 text-[13px] text-slate">
              <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
              <span>·</span>
              <Link to="/terms-conditions" className="hover:underline">Terms &amp; Conditions</Link>
              <span>·</span>
              <Link to="/appointment-policy" className="hover:underline">Appointment Policy</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
