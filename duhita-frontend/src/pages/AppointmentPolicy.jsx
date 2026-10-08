import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import useSeo from '../hooks/useSeo';
import { site } from '../data/site';

export default function AppointmentPolicy() {
  useSeo(
    'Appointment & Cancellation Policy | Duhita Multispeciality Dental Centre, Vijayawada',
    'Understand our appointment request workflow, manual clinic review process, confirmation terms, cancellation guidelines, and no-show policies.',
    { image: '/images/services/periodontics/deep%20cleaning%20.jpg.webp' }
  );

  return (
    <>
      <PageHero
        eyebrow="Clinic Protocols"
        title="Appointment &amp; Cancellation Policy"
        image="/images/services/periodontics/deep%20cleaning%20.jpg.webp"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Appointment Policy' }]}
      >
        Clear guidelines on how appointment requests are reviewed, confirmed, rescheduled, and managed at our centre.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x max-w-4xl mx-auto">
          <div className="card p-6 sm:p-10 md:p-12 space-y-9 text-[15px] leading-relaxed text-body">
            <div>
              <p className="text-[12.5px] uppercase tracking-wider font-semibold text-slate mb-1">Clinic Guidelines &amp; Booking Standards</p>
              <h2 className="text-[24px] sm:text-[30px] text-ink font-display">Appointment Booking &amp; Review Protocol</h2>
              <p className="mt-3">
                To provide high-quality surgical, restorative, and speciality dental care without chaotic overcrowding or rushed appointments, <strong>{site.fullName}</strong> operates an orderly, surgeon-coordinated scheduling system.
              </p>
            </div>

            <div className="border-t border-line pt-7">
              <div className="p-5 rounded-2xl bg-[#eef8fb] border border-[#cfe0ea] text-ink space-y-3">
                <h3 className="text-[19px] font-semibold text-[#0b7d88]">
                  1. The Two-Step Appointment Workflow (Pending → Confirmed)
                </h3>
                <p className="text-[14.5px] leading-relaxed">
                  Our digital booking system is an <strong>appointment request portal</strong>, not an instantaneous reservation engine. We enforce strict medical and surgical safety:
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                  <div className="p-4 rounded-xl bg-white border border-line">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider bg-[#fff4e5] text-[#a15c07] mb-2">
                      Step 1 · Pending Request
                    </span>
                    <p className="text-[13.5px] text-body">
                      When you submit a request online (via the website or your patient account), your appointment is immediately logged with the status <strong>Pending</strong>.
                    </p>
                    <p className="text-[12.5px] text-[#b42318] mt-2 font-medium">
                      * Submitting a request does NOT guarantee your slot or confirm the appointment.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-line">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider bg-[#e7f5ee] text-[#127a4b] mb-2">
                      Step 2 · Manual Clinic Review &amp; Confirmation
                    </span>
                    <p className="text-[13.5px] text-body">
                      An authorized clinic administrator or doctor manually cross-checks theatre schedules, sterilization turnaround, and specialist doctor availability.
                    </p>
                    <p className="text-[12.5px] text-[#127a4b] mt-2 font-medium">
                      * Only after manual administrative acceptance is the appointment marked Confirmed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">2. Confirmation Notifications</h3>
              <p className="mb-3">
                Patients will receive an authentic confirmation notification <strong>only after manual admin approval</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Our front desk team will contact you via a direct phone call or SMS/WhatsApp confirmation once your request has been reviewed and accepted.
                </li>
                <li>
                  You can track your appointment status in real-time in your <Link to="/account" className="text-slate font-medium underline">Patient Account</Link>.
                </li>
                <li>
                  <strong>Never assume an appointment is confirmed</strong> until you have received explicit approval or spoken directly with our clinic staff.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">3. Clinic Rights to Adjust, Reschedule, or Decline</h3>
              <p className="mb-3">
                As a specialized oral surgery and dental centre handling complex operative procedures, emergencies, and trauma:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  The clinic reserves full discretion to adjust timing, suggest alternative specialist dates, or decline an appointment request if the requested doctor is unavailable or fully booked with major surgical interventions.
                </li>
                <li>
                  If an unforeseen surgical emergency takes precedence, our reception team will notify scheduled patients as early as possible to reschedule without penalty.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">4. Cancellation &amp; Rescheduling Guidelines</h3>
              <p className="mb-3">
                We understand that personal emergencies and schedule conflicts happen. If you need to cancel or modify your visit:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Notice Period:</strong> Please provide at least <strong>4 to 6 hours notice</strong> prior to your scheduled slot. For major procedures (e.g. dental implant surgery, complex wisdom tooth impactions requiring theatre setup), at least 24 hours notice is appreciated.
                </li>
                <li>
                  <strong>How to Cancel:</strong> You can cancel directly from your <Link to="/account" className="text-slate font-medium underline">Patient Portal</Link> or by calling our desk at <a href={`tel:${site.phone}`} className="text-slate font-medium underline">{site.phoneDisplay}</a>.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7">
              <h3 className="text-[20px] font-display text-ink mb-3">5. Punctuality &amp; No-Show Policy</h3>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong>Arrival Time:</strong> Please arrive at our Benz Circle clinic <strong>10 minutes before</strong> your confirmed slot to allow for chair preparation, vitals checks, or updated radiography.
                </li>
                <li>
                  <strong>Late Arrivals:</strong> If you are more than 15 minutes late without prior notice, we may need to shorten your treatment duration or attend to the next scheduled patient to avoid delaying subsequent appointments.
                </li>
                <li>
                  <strong>No-Shows:</strong> Repeated unnotified absences (no-shows) deprive other patients in acute pain of timely care. Patients with multiple unnotified absences may be restricted to in-person walk-in appointments only.
                </li>
              </ul>
            </div>

            <div className="border-t border-line pt-7 flex flex-wrap gap-4 text-[13px] text-slate">
              <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
              <span>·</span>
              <Link to="/terms-conditions" className="hover:underline">Terms &amp; Conditions</Link>
              <span>·</span>
              <Link to="/medical-disclaimer" className="hover:underline">Medical &amp; AI Disclaimer</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
