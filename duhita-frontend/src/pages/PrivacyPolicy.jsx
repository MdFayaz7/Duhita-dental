import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

export default function PrivacyPolicy() {
  useSeo(
    'Privacy Policy | Duhita Multispeciality Dental Centre, Vijayawada',
    'Learn how Duhita Multispeciality Dental Centre collects, processes, protects, and handles personal, contact, appointment, and AI assistant data.',
    { image: '/images/services/oral_medicine_diagnosis/diagnosis_home.jpg' }
  );

  return (
    <>
      <PageHero
        eyebrow="Legal & Data Governance"
        title="Privacy Policy"
        image="/images/services/oral_medicine_diagnosis/diagnosis_home.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Privacy Policy' }]}
      >
        How we handle your personal records, clinical appointment requests, and AI interactions with confidentiality and care.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x max-w-4xl mx-auto">
          <div className="card p-6 sm:p-10 md:p-12 space-y-9 text-[15px] leading-relaxed text-body">
            <div>
              <p className="text-[12.5px] uppercase tracking-wider font-semibold text-slate mb-1">Last Updated: October 2026</p>
              <h2 className="text-[24px] sm:text-[30px] text-ink font-display">Our Commitment to Patient Privacy</h2>
              <p className="mt-3">
                At <strong>{site.fullName}</strong> (&ldquo;Duhita Dental&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), we recognize the critical sensitivity of personal health information and patient data. This Privacy Policy details how we collect, use, store, process, and disclose information when you visit our website (<code>duhitadental.com</code>), register a patient profile, request a dental appointment, or interact with our interactive digital assistant (Duhita AI).
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">1. Information We Collect</h3>
              <p className="mb-4">We collect information directly from you through our digital platforms and clinical workflows:</p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong>Patient Profile &amp; Registration Details:</strong> Full legal name, date of birth / age, gender, residential address, mobile telephone number, email address, profession, and referral source.
                </li>
                <li>
                  <strong>Medical &amp; Dental History:</strong> Chief complaints, reported dental concerns, pre-existing general medical conditions (e.g. diabetes, hypertension, cardiac disorders, asthma, bleeding disorders, pregnancy status), current medications, allergies, and patient-uploaded diagnostic files (such as intraoral photographs, previous prescriptions, and dental X-rays).
                </li>
                <li>
                  <strong>Appointment Request Records:</strong> Requested appointment date, time session, requested treatment category, clinical notes, submission timestamps, and subsequent administrative workflow states (e.g. Pending, Confirmed, Completed, Cancelled).
                </li>
                <li>
                  <strong>Account Security Credentials:</strong> Cryptographically hashed passwords for patient portal access. We do not store plaintext passwords.
                </li>
                <li>
                  <strong>Information Voluntarily Shared with the AI Assistant (Duhita AI):</strong> Transcribed spoken audio or typed chat queries relating to oral symptoms, questions about dental procedures, and appointment inquiries.
                </li>
                <li>
                  <strong>Technical, Log &amp; Cookie Information:</strong> Standard server access logs, IP addresses, browser types, device screen resolutions, and performance cookies used to maintain portal sessions, preserve chosen interface language, and secure against automated abuse.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">2. How We Use Your Information</h3>
              <p className="mb-3">All collected information is used strictly for legitimate healthcare, clinical operational, and communication purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>To register your patient record in the clinic database prior to your arrival, saving front-desk administrative delays.</li>
                <li>To enable authorized clinical administrators and dentists to review appointment requests manually and determine doctor availability.</li>
                <li>To communicate with you via phone call, SMS, or WhatsApp regarding appointment confirmations, schedule changes, or follow-up oral care instructions.</li>
                <li>To maintain your electronic health record, including past clinical treatments, digital prescriptions, and radiographic scans.</li>
                <li>To ensure safe clinical treatment planning, accounting for contraindications, medical allergies, and medication interactions.</li>
                <li>To process and answer general dental health queries via our digital assistant.</li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">3. Third-Party Service Providers &amp; External AI Processing</h3>
              <p className="mb-3">
                We believe in complete transparency. We <strong>do not sell, rent, or trade</strong> your personal information to data brokers or advertising networks. However, to provide modern web functionality and interactive services, certain data is processed through trusted third-party technical providers:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong>Third-Party Large Language Models (LLM Providers):</strong> When you communicate with our AI assistant (&ldquo;Duhita AI&rdquo;), your typed or spoken text query is transmitted via secure HTTPS API to external cloud artificial intelligence providers (including Google Gemini, Groq, and OpenRouter API infrastructures) solely to generate conversational guidance in English or Telugu. <em>Please do not transmit sensitive government identification numbers or unnecessary financial information in the AI chat.</em>
                </li>
                <li>
                  <strong>Speech Recognition &amp; Voice Synthesis Engines:</strong> Spoken voice recordings captured through the microphone are converted into text and speech audio using browser-standard Web Audio APIs and cloud speech engines.
                </li>
                <li>
                  <strong>Cloud Hosting, Database &amp; VPS Infrastructure:</strong> Our web servers, database storage, and secure patient portals are hosted on encrypted virtual private server (VPS) infrastructure with strict access controls.
                </li>
                <li>
                  <strong>Telecommunication Channels:</strong> Transactional SMS or direct WhatsApp communications regarding appointment approvals are routed through secure telecommunication carriers.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">4. Clinical Confidentiality &amp; Data Security</h3>
              <p>
                Patient data is maintained in accordance with recognized medical ethics and healthcare data confidentiality standards in India. Digital records are protected by role-based access control, requiring authorized clinic credentials. Passwords are encrypted using modern hashing algorithms, and data transferred over the web is protected with SSL/TLS encryption.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">5. Data Retention &amp; Patient Rights</h3>
              <p className="mb-3">
                As a dental healthcare facility, we are required under applicable medical regulations and clinical guidelines to maintain patient treatment histories, prescriptions, and radiographs for statutory minimum periods.
              </p>
              <p>
                You have the right to inspect your personal contact details, review uploaded medical documents through your patient account, update erroneous information, or request account closure subject to medical record retention laws.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">6. Contacting Our Data Privacy Team</h3>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or how your health data is handled, please contact our clinic directly:
              </p>
              <div className="mt-4 p-4 bg-mist rounded-xl text-ink space-y-1">
                <p className="font-semibold">{site.fullName}</p>
                <p className="text-[13.5px]">{site.addressLines.join(', ')}</p>
                <p className="text-[13.5px]">Email: <a href={`mailto:${site.email}`} className="text-slate font-medium underline">{site.email}</a></p>
                <p className="text-[13.5px]">Phone: <a href={`tel:${site.phone}`} className="text-slate font-medium underline">{site.phoneDisplay}</a></p>
              </div>
            </div>

            <div className="border-t border-line pt-7 flex flex-wrap gap-4 text-[13px] text-slate">
              <Link to="/terms-conditions" className="hover:underline">Terms &amp; Conditions</Link>
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
