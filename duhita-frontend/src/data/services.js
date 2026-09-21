/**
 * Duhita Dental — service catalogue.
 * Each category has a landing page (/services/:category) and each treatment a
 * long-form, SEO-focused page (/services/:category/:treatment).
 */

/** Resolved image paths: the dentist's new speciality folders, with the old folder as fallback. */
const NEW_IMAGES = {
  'root-canal.jpg': '/images/services/endodontics/Root-Canal-Treatment-Root-Canal-Procedure-Root-Canal-Before-And-After-Photos.webp',
  'rct-3d.jpg': '/images/services/endodontics/Root-Canal-Treatment-Root-Canal-Procedure-Root-Canal-Before-And-After-Photos.webp',
  'broken-tooth.jpg': '/images/services/endodontics/broken_tooth.jpg',
  'tooth-decay.jpg': '/images/services/endodontics/before-and-after-tooth-decay-treatment.webp',
  'smile-design.jpg': '/images/services/endodontics/smile_design.jpeg',
  'implants.jpg': '/images/services/prosthodontics/dental-implants-before-and-after.jpg.webp',
  'crowns.jpg': '/images/services/prosthodontics/ceramic-crowns-bridges.jpg',
  'dentures.jpg': '/images/services/prosthodontics/full-dentures-before-after-small-mouth.jpg',
  'full-mouth.jpg': '/images/services/prosthodontics/full%20mouth%20rehabitation.jpeg',
  'braces.jpg': '/images/services/orthodontics/braces.jpeg',
  'aligners.jpg': '/images/services/orthodontics/teeth-Aligners.webp',
  'pedodontics.jpg': '/images/services/pedodontics/pedodontics.jpg',
  'milk-teeth.jpg': '/images/services/pedodontics/kids%20treatment.jpg',
  'pulpotomy.jpg': '/images/services/pedodontics/2026-09-20_10-15-56.png',
  'space-maintainer.jpg': '/images/services/pedodontics/space%20maintainers.jpg',
  'gingivitis.jpg': '/images/services/periodontics/Gingivitis_%28crop%29.jpg',
  'bleeding-gums.jpg': '/images/services/periodontics/dentistsatmetrotown-services-gum-disease-before-after.jpg',
  'gum-probing.jpg': '/images/services/periodontics/deep%20cleaning%20.jpg.webp',
  'flap-surgery.jpg': '/images/services/periodontics/Dental-Flap-Surgery.webp',
  'loose-teeth.jpg': '/images/services/periodontics/loose%20teeth%20Before-After-Smile-Gallery-3.jpg',
  'bad-breath.jpg': '/images/services/periodontics/bad%20breadh.jpeg',
  'maxillofacial.jpg': '/images/services/maxillo_facial%20surgery/facial%20surgery%20.png.webp',
  'wisdom-teeth.jpg': '/images/services/maxillo_facial%20surgery/Face-Shape-Before-And-After-Wisdom-Teeth-Removal-1080x1080.jpg',
  'tooth-extraction.jpg': '/images/services/maxillo_facial%20surgery/tooth-extraction-painless.jpg',
  'diagnosis.jpg': '/images/services/oral_medicine_diagnosis/diagnosis_home.jpg',
  'digital-scan.jpg': '/images/services/oral_medicine_diagnosis/scan.jpeg',
  'oral-lesions.jpg': '/images/services/oral_medicine_diagnosis/mucocele.jpg',
  'veneers.jpg': '/images/services%20old/veneers.jpg',
  'precision-denture.jpg': '/images/services%20old/precision-denture.jpg',
  'growth-management.jpg': '/images/services%20old/growth-management.jpg',
  'home-visit.jpg': '/images/services%20old/home-visit.jpg',
};

const img = (f) => NEW_IMAGES[f] || `/images/services/${f}`;

export const categories = [
  {
    slug: 'endodontics',
    name: 'Endodontics',
    icon: 'root',
    image: img('root-canal.jpg'),
    short: 'Painless root canal treatment and tooth-saving care that keeps your natural teeth for life.',
    intro:
      'Endodontics is the branch of dentistry that treats the pulp — the living nerve and blood supply inside each tooth. When decay, a crack or an old deep filling lets bacteria reach the pulp, the result is often throbbing pain, swelling or sensitivity that lingers. At Duhita Dental in Vijayawada we use rotary instruments, electronic apex locators and digital X-rays to clean and seal infected canals precisely, relieving pain and saving teeth that might otherwise be extracted.',
    treatments: [
      {
        slug: 'root-canal-treatment',
        title: 'Root Canal Treatment',
        image: img('rct-3d.jpg'),
        excerpt: 'Single-sitting, rotary root canal treatment that removes infection and saves the natural tooth.',
        intro: [
          'A root canal is one of the most reliable ways to save a badly decayed or infected tooth. Despite its reputation, modern root canal treatment at Duhita Dental is performed under profound local anaesthesia and feels much like having a filling placed.',
          'Using rotary nickel-titanium files and an electronic apex locator, we clean, shape and disinfect the canals, then seal them to prevent reinfection. Many straightforward cases are completed in a single sitting.',
        ],
        sections: [
          {
            h: 'Signs You May Need a Root Canal',
            list: [
              'Severe toothache while chewing or biting',
              'Lingering sensitivity to hot or cold after the source is removed',
              'Swelling or a pimple-like boil on the gum',
              'Darkening or greying of a single tooth',
              'Pain that wakes you at night',
            ],
          },
          {
            h: 'How the Procedure Works',
            list: [
              'Digital X-ray and diagnosis to assess the canals and surrounding bone',
              'Local anaesthesia so the tooth is completely numb',
              'Gentle removal of infected pulp through a small opening',
              'Rotary cleaning, shaping and disinfection of each canal',
              'Sealing with biocompatible gutta-percha and a temporary filling',
              'A custom crown, usually one to two weeks later, to protect the tooth',
            ],
          },
          {
            h: 'Why a Crown After Root Canal?',
            p: 'A root-canal-treated back tooth becomes more brittle over time. A zirconia or metal-ceramic crown restores strength and prevents fractures, helping the tooth last for decades.',
          },
        ],
        faqs: [
          { q: 'Does root canal treatment hurt?', a: 'No. The tooth is fully numbed, and most patients report less discomfort than the toothache that brought them in.' },
          { q: 'How many visits does it take?', a: 'Many cases are finished in one sitting of 45–90 minutes. Teeth with severe infection may need two visits.' },
          { q: 'What is the cost of RCT in Vijayawada?', a: 'Cost depends on the tooth and number of canals. We share a clear written estimate after examination and X-ray.' },
        ],
      },
      {
        slug: 'broken-tooth-repair',
        title: 'Broken & Cracked Tooth Repair',
        image: img('broken-tooth.jpg'),
        excerpt: 'Bonding, crowns and root-level care that restore chipped, cracked and fractured teeth.',
        intro: [
          'A chipped or cracked tooth can happen from a fall, a sports injury, biting on something hard or long-term grinding. Treating it early prevents a small crack from spreading into the root.',
          'Depending on the size and depth of the fracture, we may repair it with tooth-coloured bonding, an onlay, a full crown, or — if the pulp is exposed — root canal treatment followed by a crown.',
        ],
        sections: [
          {
            h: 'Treatment Options',
            list: [
              'Composite bonding for small chips on front teeth',
              'Ceramic onlays for broken cusps on back teeth',
              'Zirconia or E-max crowns for large fractures',
              'Root canal plus crown when the nerve is involved',
            ],
          },
          {
            h: 'What to Do If You Break a Tooth',
            list: [
              'Rinse gently with warm water',
              'Save any broken fragment in milk',
              'Apply a cold compress for swelling',
              'Call Duhita Dental for a same-day emergency slot',
            ],
          },
        ],
        faqs: [
          { q: 'Can a cracked tooth heal on its own?', a: 'No. Unlike bone, enamel cannot repair itself. Early treatment is the best way to keep the tooth.' },
        ],
      },
      {
        slug: 'tooth-decay-fillings',
        title: 'Tooth Decay & Tooth-Coloured Fillings',
        image: img('tooth-decay.jpg'),
        excerpt: 'Early cavity detection and invisible composite fillings that seal and strengthen teeth.',
        intro: [
          'Tooth decay starts silently. By the time a cavity hurts, it is often close to the nerve. Regular check-ups help us catch decay while a simple filling is still enough.',
          'We use tooth-coloured composite resin that bonds to enamel and blends in naturally — no dark silver fillings.',
        ],
        sections: [
          {
            h: 'Benefits of Composite Fillings',
            list: [
              'Matched to your natural tooth shade',
              'Bonded to the tooth for added strength',
              'Minimal removal of healthy enamel',
              'Completed in a single short visit',
            ],
          },
        ],
        faqs: [
          { q: 'How long do tooth-coloured fillings last?', a: 'With good oral hygiene, composite fillings typically last many years. We check them at every recall visit.' },
        ],
      },
      {
        slug: 'smile-design',
        title: 'Smile Design & Cosmetic Dentistry',
        image: img('smile-design.jpg'),
        excerpt: 'Whitening, bonding, veneers and gum contouring planned together for a natural, balanced smile.',
        intro: [
          'Smile design is a planned approach to cosmetic dentistry. Rather than treating one tooth at a time, we study your face, lips, gum line and tooth proportions to design a smile that suits you.',
          'Your plan may combine professional whitening, composite bonding, porcelain laminates, gum reshaping or orthodontics — previewed and agreed with you before treatment begins.',
        ],
        sections: [
          {
            h: 'Who Is Smile Design For?',
            list: [
              'Stained, yellow or discoloured teeth',
              'Gaps between front teeth',
              'Chipped, worn or uneven edges',
              'A "gummy" smile or uneven gum line',
              'Brides, grooms and anyone preparing for a special occasion',
            ],
          },
        ],
        faqs: [
          { q: 'How long does a smile makeover take?', a: 'Whitening and bonding can be done in one or two visits. Laminates usually need two to three appointments over two weeks.' },
        ],
      },
    ],
  },
  {
    slug: 'prosthodontics',
    name: 'Prosthodontics & Implants',
    icon: 'implant',
    image: img('implants.jpg'),
    short: 'Dental implants, crowns, bridges and dentures that restore missing teeth, bite and confidence.',
    intro:
      'Prosthodontics focuses on replacing missing teeth and rebuilding damaged ones. Losing even a single tooth affects chewing, speech and the way neighbouring teeth drift over time. At Duhita Dental we offer the full range — from a single implant to full-mouth rehabilitation — planned with digital imaging and crafted by experienced dental laboratories.',
    treatments: [
      {
        slug: 'dental-implants',
        title: 'Dental Implants',
        image: img('implants.jpg'),
        excerpt: 'Permanent, natural-looking replacements for one, several or all missing teeth.',
        intro: [
          'A dental implant is a small titanium post placed into the jawbone, where it bonds with bone to act as a new root. A custom crown is then fixed on top, giving you a tooth that looks, feels and functions like your own.',
          'As an oral & maxillofacial surgeon, Dr. Sasidhar plans each implant with 3D imaging to protect nerves and sinuses and place the fixture precisely where the final tooth needs to be.',
        ],
        sections: [
          {
            h: 'Benefits of Dental Implants',
            list: [
              'Fixed in place — no removal, slipping or clicking',
              'Neighbouring teeth are left untouched, unlike a bridge',
              'Helps preserve jawbone and facial structure',
              'Restores full chewing strength',
              'Can last a lifetime with good care',
            ],
          },
          {
            h: 'The Implant Journey',
            list: [
              'Consultation, CBCT scan and treatment plan',
              'Implant placement under local anaesthesia',
              'Healing period of about 8–12 weeks while bone bonds to the implant',
              'Impressions and fitting of the final crown',
            ],
          },
          {
            h: 'Am I a Candidate?',
            p: 'Most healthy adults with a missing tooth can have implants. Smokers and people with uncontrolled diabetes may need extra care; bone grafting can help where bone has thinned.',
          },
        ],
        faqs: [
          { q: 'Are dental implants painful?', a: 'Placement is done under local anaesthesia. Most patients manage any mild soreness afterwards with simple painkillers.' },
          { q: 'How much do dental implants cost in Vijayawada?', a: 'It depends on the implant system, number of teeth and any bone grafting required. You receive a detailed estimate after your scan.' },
        ],
      },
      {
        slug: 'full-mouth-rehabilitation',
        title: 'Full-Mouth Rehabilitation',
        image: img('full-mouth.jpg'),
        excerpt: 'Implant-supported fixed teeth and complete bite restoration for severely worn or missing dentition.',
        intro: [
          'Full-mouth rehabilitation rebuilds every tooth in the upper and/or lower jaw to restore function, comfort and appearance. It is ideal for patients with many missing teeth, severe wear from grinding, or failing old dental work.',
          'Options range from crowns on every tooth to fixed implant bridges supported by four to six implants per jaw.',
        ],
        sections: [
          {
            h: 'Who Benefits',
            list: [
              'People with multiple missing or failing teeth',
              'Denture wearers wanting fixed teeth',
              'Severe wear or collapsed bite from grinding',
              'Jaw joint pain related to bite problems',
            ],
          },
        ],
        faqs: [
          { q: 'How long does full-mouth rehabilitation take?', a: 'Typically three to six months, including healing time. Temporary teeth are provided so you are never without a smile.' },
        ],
      },
      {
        slug: 'dental-crowns-bridges',
        title: 'Crowns & Bridges',
        image: img('crowns.jpg'),
        excerpt: 'Zirconia and ceramic crowns and fixed bridges that strengthen weak teeth and close gaps.',
        intro: [
          'A crown is a custom cap that covers a weak, broken or root-canal-treated tooth. A bridge uses crowns on neighbouring teeth to hold a replacement tooth in the gap.',
          'We offer metal-free zirconia and E-max ceramics that are strong, precisely fitted and shade-matched to your natural teeth.',
        ],
        sections: [
          {
            h: 'Crown Materials We Offer',
            list: [
              'Zirconia — very strong, ideal for back teeth',
              'E-max lithium disilicate — lifelike translucency for front teeth',
              'Porcelain-fused-to-metal — a reliable, economical option',
            ],
          },
        ],
        faqs: [
          { q: 'How long do crowns last?', a: 'Well-made crowns often last 10–15 years or more with good hygiene and regular check-ups.' },
        ],
      },
      {
        slug: 'veneers-laminates',
        title: 'Veneers & Laminates',
        image: img('veneers.jpg'),
        excerpt: 'Ultra-thin porcelain shells that correct colour, shape and gaps with minimal tooth reduction.',
        intro: [
          'Porcelain laminates are wafer-thin ceramic shells bonded to the front of the teeth. They can close small gaps, cover stains that whitening cannot remove and reshape chipped or uneven teeth.',
          'Because laminates are so thin, only a fraction of a millimetre of enamel is usually prepared — sometimes none at all.',
        ],
        sections: [
          {
            h: 'What Laminates Can Fix',
            list: ['Deep stains and fluorosis', 'Small gaps and spacing', 'Chipped or worn edges', 'Slightly crooked or uneven teeth'],
          },
        ],
        faqs: [
          { q: 'Do veneers look natural?', a: 'Yes. Each laminate is custom-shaded and shaped so it blends with your face and remaining teeth.' },
        ],
      },
      {
        slug: 'dentures',
        title: 'Complete & Partial Dentures',
        image: img('dentures.jpg'),
        excerpt: 'Comfortable, well-fitting dentures — including flexible and implant-supported options.',
        intro: [
          'Modern dentures are lighter, better fitting and more natural looking than ever. We take precise impressions and bite records so your dentures sit comfortably and let you eat and speak with confidence.',
          'For extra stability, two implants can be placed to snap a lower denture firmly in place.',
        ],
        sections: [
          {
            h: 'Denture Options',
            list: [
              'Complete dentures for a full arch',
              'Cast or flexible partial dentures',
              'Implant-supported overdentures',
              'Relining and repair of existing dentures',
            ],
          },
        ],
        faqs: [
          { q: 'How long does it take to get used to new dentures?', a: 'Most people adapt within two to four weeks. We schedule review visits to adjust any sore spots.' },
        ],
      },
      {
        slug: 'precision-attachment-dentures',
        title: 'Precision Attachment Dentures',
        image: img('precision-denture.jpg'),
        excerpt: 'Clasp-free partial dentures that lock discreetly onto crowns for a secure, invisible fit.',
        intro: [
          'Precision attachment partial dentures replace the visible metal clasps of a conventional partial with small, hidden connectors built into crowns on your natural teeth.',
          'The result is a denture that is more stable, more aesthetic and easier to wear.',
        ],
        sections: [
          {
            h: 'Advantages',
            list: ['No visible metal hooks', 'Better stability while chewing', 'Less stress on supporting teeth'],
          },
        ],
        faqs: [
          { q: 'Can I remove a precision attachment denture?', a: 'Yes — it is removable for cleaning, but clicks securely into place while you wear it.' },
        ],
      },
    ],
  },
  {
    slug: 'orthodontics',
    name: 'Orthodontics',
    icon: 'braces',
    image: img('aligners.jpg'),
    short: 'Metal, ceramic and self-ligating braces plus clear aligners for straighter teeth at any age.',
    intro:
      'Orthodontics straightens crooked, crowded or spaced teeth and corrects the way upper and lower jaws meet. A well-aligned bite is easier to clean, less prone to wear and gives a confident smile. Duhita Dental offers braces and clear aligners for children, teenagers and adults in Vijayawada.',
    treatments: [
      {
        slug: 'braces',
        title: 'Braces',
        image: img('braces.jpg'),
        excerpt: 'Metal, ceramic and self-ligating braces tailored to your bite and facial profile.',
        intro: [
          'Braces use small brackets and a wire to move teeth gently into position over time. They remain the most versatile way to correct complex crowding, deep bites and jaw discrepancies.',
          'We plan treatment around your facial profile and, for children, their growth — so results look natural and remain stable.',
        ],
        sections: [
          {
            h: 'Types of Braces',
            list: [
              'Metal braces — durable and cost-effective',
              'Ceramic braces — tooth-coloured and discreet',
              'Self-ligating braces — fewer adjustments, less friction',
            ],
          },
          {
            h: 'Best Age for Braces',
            p: 'An orthodontic check-up around age 7–8 helps spot problems early. Most treatment begins between 11 and 14, but healthy teeth can be moved at any age.',
          },
        ],
        faqs: [
          { q: 'How long do braces take?', a: 'Typically 12 to 24 months, depending on the complexity of the case.' },
          { q: 'Do braces hurt?', a: 'You may feel pressure for a few days after each adjustment, which settles quickly.' },
        ],
      },
      {
        slug: 'clear-aligners',
        title: 'Clear Aligners',
        image: img('aligners.jpg'),
        excerpt: 'Nearly invisible, removable trays that straighten teeth without wires or brackets.',
        intro: [
          'Clear aligners are a series of custom, transparent trays that shift your teeth a little at a time. They are removable for eating and brushing and are almost invisible when worn.',
          'Aligners suit adults and teens with mild to moderate crowding, spacing or relapse after previous braces.',
        ],
        sections: [
          {
            h: 'Why Patients Choose Aligners',
            list: ['Virtually invisible', 'Removable — eat whatever you like', 'Easier brushing and flossing', 'Fewer clinic visits'],
          },
        ],
        faqs: [
          { q: 'How many hours a day should I wear aligners?', a: 'About 20–22 hours a day, removing them only to eat, drink anything other than water, and clean your teeth.' },
        ],
      },
    ],
  },
  {
    slug: 'pedodontics',
    name: 'Pedodontics (Kids Dentistry)',
    icon: 'child',
    image: img('pedodontics.jpg'),
    short: 'Gentle, friendly dental care for children — from the first tooth to the teenage years.',
    intro:
      'Children are not small adults, and their teeth need a different approach. Our kids dentistry service in Vijayawada focuses on prevention, early treatment and making every visit calm and positive, so children grow up without a fear of the dentist.',
    treatments: [
      {
        slug: 'milk-teeth-care',
        title: 'Milk Teeth Care & Fillings',
        image: img('milk-teeth.jpg'),
        excerpt: 'Protecting baby teeth with fluoride, sealants and child-friendly fillings.',
        intro: [
          'Milk teeth hold space for permanent teeth and help children chew and speak properly. Early loss due to decay can cause crowding later.',
          'We use fluoride varnish, pit-and-fissure sealants and gentle fillings to keep baby teeth healthy until they fall out naturally.',
        ],
        sections: [
          {
            h: 'Preventive Care for Kids',
            list: ['Fluoride application', 'Pit & fissure sealants', 'Diet and brushing guidance for parents', 'Six-monthly check-ups'],
          },
        ],
        faqs: [
          { q: 'When should my child first see a dentist?', a: 'By their first birthday, or within six months of the first tooth appearing.' },
        ],
      },
      {
        slug: 'pulpotomy',
        title: 'Pulpotomy (Baby Tooth Root Canal)',
        image: img('pulpotomy.jpg'),
        excerpt: 'Saving decayed milk teeth by treating the infected nerve and capping the tooth.',
        intro: [
          'When decay in a baby tooth reaches the nerve, a pulpotomy removes the infected part of the pulp and seals the rest, relieving pain and keeping the tooth in place.',
          'The tooth is usually protected with a stainless-steel or tooth-coloured crown.',
        ],
        sections: [
          { h: 'Why Save a Baby Tooth?', list: ['Maintains space for the adult tooth', 'Helps normal chewing and speech', 'Prevents infection spreading to the developing tooth'] },
        ],
        faqs: [{ q: 'Is a pulpotomy safe for children?', a: 'Yes. It is a routine, well-established procedure performed under local anaesthesia.' }],
      },
      {
        slug: 'space-maintainers',
        title: 'Space Maintainers',
        image: img('space-maintainer.jpg'),
        excerpt: 'Small appliances that hold the gap when a milk tooth is lost too early.',
        intro: [
          'If a baby tooth is lost early, neighbouring teeth can tip into the gap and block the adult tooth. A space maintainer holds that space open until the permanent tooth erupts.',
        ],
        sections: [{ h: 'Types', list: ['Fixed band-and-loop maintainers', 'Removable maintainers', 'Lingual arch for multiple missing teeth'] }],
        faqs: [{ q: 'How long does a space maintainer stay?', a: 'Until the permanent tooth begins to erupt — we monitor it at each check-up.' }],
      },
      {
        slug: 'growth-habit-management',
        title: 'Growth & Habit Management',
        image: img('growth-management.jpg'),
        excerpt: 'Early guidance for thumb-sucking, mouth breathing and developing bite problems.',
        intro: [
          'Habits such as thumb-sucking, tongue thrusting and mouth breathing can change how the jaws and teeth develop. Catching them early allows simple appliances to guide growth in the right direction.',
        ],
        sections: [{ h: 'Early Signs to Watch', list: ['Thumb or finger sucking beyond age 4', 'Mouth breathing or snoring', 'Front teeth that do not meet', 'Crowding of erupting teeth'] }],
        faqs: [{ q: 'Can early treatment avoid braces later?', a: 'Sometimes. Interceptive treatment often makes later orthodontics shorter and simpler.' }],
      },
    ],
  },
  {
    slug: 'periodontics',
    name: 'Periodontics (Gum Care)',
    icon: 'gum',
    image: img('bleeding-gums.jpg'),
    short: 'Treatment for bleeding gums, bad breath, gum disease and loose teeth.',
    intro:
      'Healthy gums are the foundation of a healthy mouth. Gum disease is the leading cause of tooth loss in adults, yet it is often painless until late. Our periodontal care in Vijayawada ranges from professional deep cleaning to gum surgery that stops bone loss and stabilises loose teeth.',
    treatments: [
      {
        slug: 'bleeding-gums-gingivitis',
        title: 'Bleeding Gums & Gingivitis',
        image: img('gingivitis.jpg'),
        excerpt: 'Professional cleaning and home-care coaching to reverse early gum inflammation.',
        intro: [
          'Bleeding while brushing is the most common early sign of gingivitis — inflammation caused by plaque and tartar at the gum line. The good news: gingivitis is fully reversible with timely care.',
        ],
        sections: [
          { h: 'Symptoms of Gingivitis', list: ['Gums that bleed when brushing or flossing', 'Red, swollen or tender gums', 'Persistent bad breath'] },
          { h: 'Treatment', list: ['Ultrasonic scaling and polishing', 'Medicated mouth rinses where needed', 'Personalised brushing and flossing guidance'] },
        ],
        faqs: [{ q: 'Is scaling bad for teeth?', a: 'No. Professional scaling removes tartar only; it does not weaken enamel or loosen healthy teeth.' }],
      },
      {
        slug: 'deep-cleaning',
        title: 'Deep Cleaning (Scaling & Root Planing)',
        image: img('gum-probing.jpg'),
        excerpt: 'Removing tartar below the gum line to halt periodontitis and help gums reattach.',
        intro: [
          'When gingivitis progresses, pockets form between the gums and teeth where bacteria collect. Deep cleaning removes tartar from these pockets and smooths root surfaces so the gums can heal.',
        ],
        sections: [{ h: 'What to Expect', list: ['Gum pocket measurement (charting)', 'Cleaning under local anaesthesia', 'Review after 4–6 weeks'] }],
        faqs: [{ q: 'How often do I need deep cleaning?', a: 'Once gums are stable, maintenance cleaning every three to six months usually keeps disease under control.' }],
      },
      {
        slug: 'flap-surgery',
        title: 'Periodontal Flap Surgery',
        image: img('flap-surgery.jpg'),
        excerpt: 'Surgical access to clean deep pockets and restore gum and bone health.',
        intro: [
          'For advanced gum disease with deep pockets, flap surgery lets us lift the gum gently, clean the roots thoroughly and, where possible, regenerate lost bone before stitching the gum back in place.',
        ],
        sections: [{ h: 'Benefits', list: ['Reduces pocket depth', 'Stops ongoing bone loss', 'Helps save loose teeth'] }],
        faqs: [{ q: 'Is gum surgery painful?', a: 'It is performed under local anaesthesia. Mild soreness for a few days is managed with medication.' }],
      },
      {
        slug: 'loose-teeth',
        title: 'Loose Teeth Treatment',
        image: img('loose-teeth.jpg'),
        excerpt: 'Splinting, gum therapy and bite correction to stabilise mobile teeth.',
        intro: [
          'Adult teeth should never feel loose. Mobility usually signals bone loss from gum disease, trauma or excessive bite forces. Treating the cause early can often save the tooth.',
        ],
        sections: [{ h: 'How We Help', list: ['Periodontal therapy to control infection', 'Splinting loose teeth together', 'Bite adjustment and night guards'] }],
        faqs: [{ q: 'Can a loose tooth become firm again?', a: 'Often yes, if the underlying gum disease is controlled and enough bone support remains.' }],
      },
      {
        slug: 'bad-breath-treatment',
        title: 'Bad Breath (Halitosis) Treatment',
        image: img('bad-breath.jpg'),
        excerpt: 'Finding and treating the real cause of persistent bad breath.',
        intro: [
          'Persistent bad breath is usually caused by bacteria on the tongue, gum disease, decayed teeth or dry mouth. Mouthwash only masks it; treating the source solves it.',
        ],
        sections: [{ h: 'Our Approach', list: ['Full oral examination', 'Professional cleaning and gum care', 'Tongue cleaning and hydration advice'] }],
        faqs: [{ q: 'Can bad breath be cured permanently?', a: 'When the dental cause is treated and good habits are maintained, most patients see lasting improvement.' }],
      },
    ],
  },
  {
    slug: 'oral-surgery',
    name: 'Oral & Maxillofacial Surgery',
    icon: 'surgery',
    image: img('maxillofacial.jpg'),
    short: 'Painless extractions, wisdom teeth removal and advanced jaw surgery by an M.D.S surgeon.',
    intro:
      'Oral and maxillofacial surgery covers procedures of the teeth, jaws and face. Duhita Dental is led by Dr. Nalluru Sasidhar, a post-graduate specialist in this field, so even complex surgical cases in Vijayawada can be managed in-house with a focus on safety and a smooth recovery.',
    treatments: [
      {
        slug: 'wisdom-teeth-removal',
        title: 'Wisdom Teeth Removal',
        image: img('wisdom-teeth.jpg'),
        excerpt: 'Surgical removal of impacted or painful third molars with a focus on comfort and healing.',
        intro: [
          'Wisdom teeth usually erupt between the ages of 17 and 25. When there is not enough space, they may become impacted — stuck in the bone or gum — causing pain, swelling, infection or damage to the neighbouring tooth.',
          'Dr. Sasidhar uses digital X-rays to map each tooth’s position relative to nerves before surgery, allowing a precise, minimally invasive procedure.',
        ],
        sections: [
          {
            h: 'Signs You May Need Wisdom Teeth Removed',
            list: ['Pain or swelling at the back of the jaw', 'Gum flap that traps food and gets infected', 'Difficulty opening the mouth', 'Decay in the wisdom tooth or the tooth in front', 'Crowding of other teeth'],
          },
          {
            h: 'Recovery Tips',
            list: ['Bite on gauze for the first hour', 'Use cold compresses for the first day', 'Eat soft, cool foods for a few days', 'Avoid smoking, spitting and straws', 'Take medicines as prescribed'],
          },
        ],
        faqs: [
          { q: 'How long is recovery after wisdom tooth removal?', a: 'Most people return to normal activities within 2–3 days. Complete healing of the socket takes a few weeks.' },
          { q: 'Should all wisdom teeth be removed?', a: 'Not always. Healthy, well-positioned wisdom teeth that can be cleaned may be kept and monitored.' },
        ],
      },
      {
        slug: 'tooth-extraction',
        title: 'Painless Tooth Extraction',
        image: img('tooth-extraction.jpg'),
        excerpt: 'Gentle, atraumatic extractions that preserve bone for future implants.',
        intro: [
          'Sometimes a tooth is too damaged to save. Our atraumatic extraction technique removes it gently while preserving the surrounding bone — which matters if you plan to replace the tooth with an implant.',
        ],
        sections: [{ h: 'When Extraction Is Needed', list: ['Severe decay beyond repair', 'Advanced gum disease', 'Fractured roots', 'Orthodontic space creation'] }],
        faqs: [{ q: 'Will I feel pain during extraction?', a: 'No. The area is completely numbed. You may feel pressure but not pain.' }],
      },
      {
        slug: 'maxillofacial-surgery',
        title: 'Jaw & Facial Surgery',
        image: img('maxillofacial.jpg'),
        excerpt: 'Management of jaw fractures, cysts, facial trauma and pre-prosthetic surgery.',
        intro: [
          'Beyond extractions, our surgical services include treatment of jaw cysts and benign lesions, facial trauma and fractures, and bone preparation before implants or dentures.',
        ],
        sections: [{ h: 'Procedures Include', list: ['Cyst and benign tumour removal', 'Jaw fracture management', 'Bone grafting and ridge preparation', 'Biopsy of suspicious lesions'] }],
        faqs: [{ q: 'Do I need a referral?', a: 'No referral is needed. You can book a consultation directly with Dr. Sasidhar.' }],
      },
    ],
  },
  {
    slug: 'oral-medicine',
    name: 'Oral Medicine & Diagnosis',
    icon: 'scan',
    image: img('diagnosis.jpg'),
    short: 'Digital X-rays, oral cancer screening and diagnosis of ulcers, lesions and jaw pain.',
    intro:
      'Accurate diagnosis is the first step to the right treatment. Our oral medicine and radiology service investigates mouth ulcers, white or red patches, lumps, burning mouth, jaw pain and other conditions — using digital imaging and careful clinical examination.',
    treatments: [
      {
        slug: 'digital-xray-scans',
        title: 'Digital X-Rays & 3D Scans',
        image: img('digital-scan.jpg'),
        excerpt: 'RVG, OPG and CBCT imaging for precise, low-radiation diagnosis.',
        intro: [
          'Digital radiography gives instant, high-definition images with far lower radiation than traditional film. For implants and complex surgery, CBCT scans provide a 3D view of bone and nerves.',
        ],
        sections: [{ h: 'Imaging We Use', list: ['RVG intraoral X-rays', 'OPG full-mouth panoramic X-rays', 'CBCT 3D scans for implant planning'] }],
        faqs: [{ q: 'Are dental X-rays safe?', a: 'Yes. Digital dental X-rays use very low doses of radiation and are taken only when clinically needed.' }],
      },
      {
        slug: 'oral-lesions-ulcers',
        title: 'Mouth Ulcers, Lesions & Cancer Screening',
        image: img('oral-lesions.jpg'),
        excerpt: 'Examination and management of ulcers, cysts, patches and early oral cancer signs.',
        intro: [
          'Most mouth ulcers heal within two weeks. Any ulcer, lump or patch that persists longer should be examined. Early detection of pre-cancerous changes can be life-saving, especially for people who use tobacco or gutka.',
        ],
        sections: [{ h: 'See a Dentist If You Notice', list: ['An ulcer lasting more than two weeks', 'White or red patches', 'A lump or thickening in the cheek or tongue', 'Difficulty opening the mouth'] }],
        faqs: [{ q: 'Is oral cancer screening painful?', a: 'No. It is a quick visual and touch examination; a biopsy is suggested only if something needs further investigation.' }],
      },
    ],
  },
];

export const findCategory = (slug) => categories.find((c) => c.slug === slug);

export const findTreatment = (catSlug, slug) =>
  findCategory(catSlug)?.treatments.find((t) => t.slug === slug);

/** Featured cards shown on the home page services grid */
export const featured = [
  ['prosthodontics', 'dental-implants'],
  ['endodontics', 'root-canal-treatment'],
  ['orthodontics', 'braces'],
  ['oral-surgery', 'wisdom-teeth-removal'],
  ['pedodontics', 'milk-teeth-care'],
  ['periodontics', 'bleeding-gums-gingivitis'],
].map(([c, t]) => ({ category: findCategory(c), treatment: findTreatment(c, t) }));
