import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

export default function TermsConditions() {
  useSeo(
    'Terms & Conditions | Duhita Multispeciality Dental Centre, Vijayawada',
    'Official terms and conditions for using the Duhita Dental website, patient registration portal, appointment request workflows, and digital services.',
    { image: '/images/services/oral_medicine_diagnosis/scan.jpeg' }
  );

  return (
    <>
      <PageHero
        eyebrow="Legal & Governance"
        title="Terms & Conditions"
        image="/images/services/oral_medicine_diagnosis/scan.jpeg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Terms & Conditions' }]}
      >
        Rules, rights, and responsibilities governing use of our website, patient registration, and clinical service requests.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x max-w-4xl mx-auto">
          <div className="card p-6 sm:p-10 md:p-12 space-y-9 text-[15px] leading-relaxed text-body">
            <div>
              <p className="text-[12.5px] uppercase tracking-wider font-semibold text-slate mb-1">Last Updated: October 2026</p>
              <h2 className="text-[24px] sm:text-[30px] text-ink font-display">Agreement to Terms</h2>
              <p className="mt-3">
                Welcome to the digital portal of <strong>{site.fullName}</strong> (&ldquo;Duhita Dental&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), located at Benz Circle, Vijayawada. By accessing or using this website, registering a patient profile, requesting an appointment, or using our AI assistant, you agree to be legally bound by these Terms &amp; Conditions and our related policies.
              </p>
              <p className="mt-2.5">
                If you do not agree with these terms, you must refrain from using this website and contact our clinic front desk directly via telephone or in person.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">1. Scope of Digital Services</h3>
              <p className="mb-3">Our website is designed to facilitate:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Educational information about our dental surgical, restorative, orthodontic, and paediatric specialities.</li>
                <li>Digital patient profile registration to save administrative time at the front desk.</li>
                <li>Digital appointment requests subject to strict manual review.</li>
                <li>Secure access to personal diagnostic documents and visit records.</li>
                <li>Interactive, preliminary oral health guidance via our digital assistant (&ldquo;Duhita AI&rdquo;).</li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">2. Manual Review &amp; Non-Guarantee of Appointments</h3>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-ink mb-4">
                <p className="font-semibold text-amber-900">Important Appointment Notice:</p>
                <p className="text-[14px] mt-1 text-amber-950">
                  Submitting an appointment request through this website <strong>does not guarantee an appointment or reserve a guaranteed time slot</strong>. All online submissions enter a <strong>Pending</strong> state and require explicit manual review and verification by clinic administration.
                </p>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  An appointment is legally and clinically <strong>Confirmed only after</strong> an authorized staff member reviews the surgeon’s schedule, checks chair availability, and manually accepts the request.
                </li>
                <li>
                  The system will <strong>never automatically confirm</strong> an appointment simply because a web form was submitted.
                </li>
                <li>
                  Duhita Dental reserves the full right to decline, reschedule, or offer alternative time slots based on clinical emergencies, surgical procedures, or doctor availability.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">3. Patient Account Responsibilities</h3>
              <p className="mb-3">
                When creating an account or registering a patient ID, you agree to:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide truthful, accurate, and up-to-date personal, contact, and medical information.</li>
                <li>Disclose all known systemic health conditions, allergies, and ongoing prescription medications. Concealing medical details may jeopardize treatment safety.</li>
                <li>Maintain the confidentiality of your account password and restrict access to unauthorized persons.</li>
                <li>Promptly notify the clinic if you believe your phone number or account credentials have been compromised.</li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">4. Intellectual Property &amp; Website Use</h3>
              <p>
                All original text, diagrams, photographs, clinic branding, logos, software shaders, and design layouts displayed on this website are the intellectual property of Duhita Multispeciality Dental Centre or its licensors. Reproduction, redistribution, scraping, or commercial exploitation without prior written consent is strictly prohibited.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">5. Disclaimer of Digital Liability</h3>
              <p className="mb-3">
                While we strive for continuous website uptime and accurate information:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>We do not warrant that digital access will be completely uninterrupted or free from telecommunication network errors.</li>
                <li>We are not liable for transmission delays, SMS delivery failures, or connectivity issues that prevent prompt delivery of online notifications.</li>
                <li>In any dental emergency (acute bleeding, severe facial swelling, trauma, difficulty breathing), you must immediately visit a hospital casualty department or contact our emergency telephone line rather than relying on web communications.</li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">6. Governing Law &amp; Jurisdiction</h3>
              <p>
                These terms are governed by the laws of India. Any legal dispute, claim, or proceedings arising out of or related to these terms or services rendered shall be subject to the exclusive jurisdiction of the competent courts in Vijayawada, Andhra Pradesh, India.
              </p>
            </div>

            <div className="border-t border-line pt-7 flex flex-wrap gap-4 text-[13px] text-slate">
              <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
              <span>·</span>
              <Link to="/medical-disclaimer" className="hover:underline">Medical &amp; AI Disclaimer</Link>
              <span>·</span>
              <Link to="/appointment-policy" className="hover:underline">Appointment Policy</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
