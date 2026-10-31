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
  'pulpotomy.jpg': '/images/services/pedodontics/pulpotomy.webp',
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
    intro: [
      'Endodontics is the branch of dentistry that treats the pulp — the soft nerve and blood supply inside each tooth. When deep decay, a crack or an old filling lets bacteria reach the pulp, it becomes inflamed or infected. The result is usually a throbbing toothache, pain on biting, sensitivity that lingers after hot or cold food, or swelling in the gum.',
      'The aim of endodontic treatment is simple: remove the infection, stop the pain and keep your own tooth. A natural tooth that has been treated well and protected with a crown can last for many years — and keeping it is almost always better, and less expensive in the long run, than extracting it and replacing it with an implant or bridge.',
      'Endodontics is the speciality of our founder, Dr. Nalluru Sasidhar, BDS, MDS (Conservative Dentistry). At Duhita Dental in Vijayawada we use digital X-rays, rotary nickel-titanium instruments and electronic apex locators to clean and seal canals accurately, and we explain every step before we begin.',
    ],
    treatments: [
      {
        slug: 'root-canal-treatment',
        title: 'Root Canal Treatment',
        image: img('rct-3d.jpg'),
        excerpt: 'Single-sitting, rotary root canal treatment that removes infection and saves the natural tooth.',
        intro: [
          'Root canal treatment (RCT) saves a tooth whose inner pulp has become infected or badly inflamed. The infected tissue is removed, the canals inside the roots are cleaned and disinfected, and the tooth is sealed so bacteria cannot get back in.',
          'Many people fear a root canal, but the treatment itself is not what hurts — the infection is. With good local anaesthesia, modern RCT feels much like having a filling, and most patients leave with far less pain than they came in with.',
          'At Duhita Dental, every root canal plan is reviewed by Dr. Sasidhar, an MDS endodontist. Using rotary files, an electronic apex locator and digital X-rays, many straightforward cases are completed in a single sitting.',
        ],
        glance: [
          ['Sittings', 'Often one; two for severe infection'],
          ['Time per sitting', 'About 45–90 minutes'],
          ['Anaesthesia', 'Local — the tooth is fully numb'],
          ['Back to work', 'Usually the same day'],
          ['Afterwards', 'A crown is usually advised, especially on back teeth'],
        ],
        sections: [
          {
            h: 'Signs You May Need a Root Canal',
            list: [
              'Severe toothache, especially when chewing or biting',
              'Sensitivity to hot or cold that lingers after the food or drink is gone',
              'Pain that wakes you up at night',
              'Swelling of the gum or face, or a small pimple-like boil on the gum',
              'A tooth that has turned dark or grey',
              'A deep cavity or crack seen on an X-ray, even if it does not hurt yet',
            ],
            after: 'Some infected teeth cause no pain at all and are found only on an X-ray. That is one reason regular check-ups matter.',
          },
          {
            h: 'How Root Canal Treatment Is Done, Step by Step',
            steps: [
              'Examination and a digital X-ray to see the shape of the roots and the extent of infection.',
              'Local anaesthesia so the tooth and surrounding gum are completely numb.',
              'A small opening is made in the top of the tooth to reach the pulp chamber.',
              'The infected pulp is removed and each canal is cleaned and shaped with rotary instruments, while an apex locator measures its exact length.',
              'The canals are rinsed with disinfecting solutions to kill remaining bacteria.',
              'The canals are filled and sealed with gutta-percha, a rubber-like biocompatible material, and the opening is closed with a filling.',
              'Once the tooth has settled, a crown is placed to protect it from breaking.',
            ],
          },
          {
            h: 'Recovery and Aftercare',
            p: 'It is normal for the tooth to feel slightly tender for two to three days, especially when biting. Simple painkillers advised by your dentist are usually enough. Avoid chewing hard food on the treated side until the final filling or crown is in place.',
            list: [
              'Brush and floss normally — keeping the area clean helps healing',
              'Take any prescribed medicines for the full course',
              'Call the clinic if swelling increases or pain gets worse after three days',
              'Do not delay the crown: an uncrowned back tooth can crack',
            ],
          },
          {
            h: 'Why a Crown After Root Canal?',
            p: 'A root-canal-treated tooth no longer has a living blood supply, and back teeth in particular become more brittle over time. A zirconia or metal-ceramic crown covers and holds the tooth together, protecting it from fractures so it can last for many years. Front teeth that are only slightly damaged sometimes need just a filling — we will tell you which applies to you.',
          },
          {
            h: 'What Affects the Cost of Root Canal Treatment?',
            p: 'There is no single price for RCT because every tooth is different. After examining the tooth and the X-ray, we give you a clear written estimate before starting.',
            list: [
              'Which tooth it is — molars have three or four canals, front teeth usually one',
              'How severe the infection is and whether more than one sitting is needed',
              'Whether it is a first treatment or a re-treatment of an old root canal',
              'The type of crown you choose afterwards',
            ],
          },
        ],
        faqs: [
          { q: 'Does root canal treatment hurt?', a: 'No. The tooth is fully numbed, and most patients report less discomfort than the toothache that brought them in.' },
          { q: 'How many visits does it take?', a: 'Many cases are finished in one sitting of 45–90 minutes. Teeth with severe infection or swelling may need two visits so the infection can settle first.' },
          { q: 'Is it better to remove the tooth instead?', a: 'Keeping your natural tooth is almost always the better choice. An extracted tooth needs replacing with an implant, bridge or denture to stop the other teeth drifting, which usually costs more and takes longer.' },
          { q: 'How long does a root canal treated tooth last?', a: 'With a well-fitting crown, good brushing and regular check-ups, a root canal treated tooth can last for many years — often for life.' },
          { q: 'Can I eat after a root canal?', a: 'Yes, once the numbness wears off, usually after two to three hours. Choose soft food and chew on the other side until the tooth is crowned.' },
          { q: 'What is the cost of RCT in Vijayawada?', a: 'Cost depends on the tooth and number of canals. We share a clear written estimate after examination and X-ray.' },
        ],
      },
      {
        slug: 'broken-tooth-repair',
        title: 'Broken & Cracked Tooth Repair',
        image: img('broken-tooth.jpg'),
        excerpt: 'Bonding, crowns and root-level care that restore chipped, cracked and fractured teeth.',
        intro: [
          'Teeth can chip or crack from a fall, a sports injury, biting on something hard like a bone or seed, or years of grinding at night. Teeth with large old fillings or root canal treatment are especially prone to breaking.',
          'A small chip may only affect how your smile looks, but a crack can slowly spread deeper towards the nerve and root. Seeing a dentist early usually means a simpler, less expensive repair — and a much better chance of keeping the tooth.',
          'At Duhita Dental we examine the tooth closely, take a digital X-ray and then choose the most conservative repair that will last: from tooth-coloured bonding to a full crown.',
        ],
        glance: [
          ['Sittings', 'One for bonding; two for crowns and onlays'],
          ['Anaesthesia', 'Local, when needed'],
          ['Urgency', 'Same-day appointment for pain or a large break'],
          ['Materials', 'Composite, ceramic, zirconia or E-max'],
        ],
        sections: [
          {
            h: 'Types of Tooth Fractures',
            list: [
              'Chipped enamel — a small piece breaks off the edge, usually painless',
              'Broken cusp — a corner of a back tooth breaks, often around an old filling',
              'Cracked tooth — a crack runs from the biting surface towards the root, causing sharp pain on biting or releasing',
              'Split tooth — the crack has divided the tooth into separate parts',
              'Vertical root fracture — a crack that starts in the root, often found in root-canal-treated teeth',
            ],
          },
          {
            h: 'Treatment Options',
            list: [
              'Composite bonding for small chips on front teeth — done in one visit',
              'Ceramic onlays for broken cusps on back teeth',
              'Zirconia or E-max crowns to hold a cracked tooth together',
              'Root canal treatment followed by a crown when the crack has reached the nerve',
              'Extraction and replacement with an implant or bridge when a tooth is split beyond repair',
            ],
          },
          {
            h: 'What to Do If You Break a Tooth',
            steps: [
              'Rinse your mouth gently with warm water.',
              'If there is bleeding, press a clean gauze or cloth on the area for ten minutes.',
              'Save any broken piece in a small container of milk and bring it with you.',
              'Use a cold compress on the cheek to reduce swelling.',
              'Avoid chewing on that side and call Duhita Dental on 0866 247 4066 for an early appointment.',
            ],
          },
          {
            h: 'How to Protect Your Teeth from Breaking',
            list: [
              'Avoid biting hard objects — ice, bones, betel nut, pen caps, opening bottles',
              'Wear a mouthguard for contact sports',
              'Ask about a night guard if you grind or clench your teeth',
              'Get large old fillings and root-canal-treated teeth crowned when advised',
            ],
          },
        ],
        faqs: [
          { q: 'Can a cracked tooth heal on its own?', a: 'No. Unlike bone, enamel cannot repair itself. Early treatment is the best way to keep the tooth.' },
          { q: 'Is a chipped tooth an emergency?', a: 'A small painless chip can wait a few days. A large break, pain, bleeding or a visible pink or red spot (the nerve) needs to be seen the same day.' },
          { q: 'Why does my tooth hurt only when I bite?', a: 'Sharp pain on biting, or when you release the bite, is a typical sign of a cracked tooth. The crack flexes under pressure. A crown often stops the pain by holding the tooth together.' },
          { q: 'Will the repair look natural?', a: 'Yes. Composite bonding and ceramic crowns are matched to the shade of your own teeth, so the repair blends in.' },
        ],
      },
      {
        slug: 'tooth-decay-fillings',
        title: 'Tooth Decay & Tooth-Coloured Fillings',
        image: img('tooth-decay.jpg'),
        excerpt: 'Early cavity detection and invisible composite fillings that seal and strengthen teeth.',
        intro: [
          'Tooth decay (dental caries) happens when bacteria in plaque turn sugar into acid, which slowly dissolves the enamel. It starts as a white or brown spot, then becomes a hole — a cavity — that grows deeper over time.',
          'Early decay usually causes no pain at all. By the time a cavity hurts, it is often close to the nerve and may need a root canal instead of a simple filling. That is why regular check-ups, every six months, are the easiest way to keep treatment small and affordable.',
          'At Duhita Dental we use tooth-coloured composite fillings that bond to the tooth and match its shade, so the repair is practically invisible.',
        ],
        glance: [
          ['Sittings', 'Usually one'],
          ['Time', 'About 20–45 minutes per tooth'],
          ['Anaesthesia', 'Local if the cavity is deep; often not needed for small ones'],
          ['Eat afterwards', 'As soon as the numbness wears off'],
        ],
        sections: [
          {
            h: 'Signs of Tooth Decay',
            list: [
              'Sensitivity to sweets, cold drinks or ice cream',
              'A visible hole, or a brown or black spot on a tooth',
              'Food getting stuck between the same teeth again and again',
              'Pain when biting on one tooth',
              'Bad taste or bad breath that does not go away',
            ],
          },
          {
            h: 'How a Tooth-Coloured Filling Is Placed',
            steps: [
              'The tooth is examined and, if needed, an X-ray shows how deep the decay goes.',
              'The area is numbed if required.',
              'The decayed part is gently removed, keeping as much healthy tooth as possible.',
              'The tooth is cleaned and a bonding agent is applied.',
              'Composite resin is placed in layers, shaped to match your tooth and hardened with a blue curing light.',
              'The filling is polished and your bite is checked so it feels natural.',
            ],
          },
          {
            h: 'Benefits of Composite Fillings',
            list: [
              'Matched to your natural tooth shade',
              'Bonded to the tooth for added strength',
              'Less drilling of healthy tooth than older silver fillings',
              'No mercury',
              'Completed in a single short visit',
            ],
          },
          {
            h: 'How to Prevent Cavities',
            list: [
              'Brush twice a day with fluoride toothpaste, for two minutes',
              'Clean between your teeth daily with floss or interdental brushes',
              'Cut down on sticky sweets, biscuits and sugary drinks between meals',
              'Rinse with water after tea, coffee or snacks',
              'Visit the dentist every six months for a check-up and cleaning',
            ],
          },
        ],
        faqs: [
          { q: 'How long do tooth-coloured fillings last?', a: 'With good oral hygiene, composite fillings typically last many years. We check them at every recall visit.' },
          { q: 'Should I replace my old silver fillings?', a: 'Not automatically. If an old filling is cracked, leaking or has decay under it, we replace it. If it is sound, it can usually stay.' },
          { q: 'Can a cavity go away by itself?', a: 'A very early white spot can sometimes harden again with fluoride and good brushing, but once there is a hole, only a filling can repair it.' },
          { q: 'Is a filling painful?', a: 'No. Small fillings often need no injection at all, and deeper ones are done with the tooth numbed.' },
        ],
      },
      {
        slug: 'smile-design',
        title: 'Smile Design & Cosmetic Dentistry',
        image: img('smile-design.jpg'),
        excerpt: 'Whitening, bonding, veneers and gum contouring planned together for a natural, balanced smile.',
        intro: [
          'Smile design is a planned approach to cosmetic dentistry. Instead of fixing one tooth at a time, we look at your whole face — your lips, gum line, tooth shape, colour and proportions — and design a smile that looks natural for you.',
          'A smile makeover can be as simple as professional whitening, or a combination of treatments such as composite bonding, porcelain laminates, crowns, gum contouring and orthodontics. Every option is discussed and agreed with you before any treatment begins.',
          'Our goal is a smile that looks like the best version of your own — not artificial, overly white “fake” teeth.',
        ],
        glance: [
          ['Sittings', '1–2 for whitening or bonding; 2–3 for laminates'],
          ['Planning', 'Photos, examination and a discussion of your goals'],
          ['Anaesthesia', 'Usually little or none'],
          ['Best for', 'Stains, gaps, chips, uneven or worn teeth'],
        ],
        sections: [
          {
            h: 'Who Is Smile Design For?',
            list: [
              'Stained, yellow or discoloured teeth',
              'Gaps between front teeth',
              'Chipped, worn or uneven edges',
              'A "gummy" smile or uneven gum line',
              'Old fillings or crowns that no longer match',
              'Brides, grooms and anyone preparing for a special occasion',
            ],
          },
          {
            h: 'Treatments That May Be Part of Your Plan',
            list: [
              'Professional teeth whitening — lightens natural tooth colour safely',
              'Composite bonding — reshapes and repairs chipped or uneven teeth in one visit',
              'Porcelain veneers and laminates — thin shells that correct colour, shape and small gaps',
              'Ceramic crowns — for heavily filled or damaged front teeth',
              'Gum contouring — evens out an uneven or high gum line',
              'Braces or clear aligners — when teeth need moving, not just covering',
            ],
          },
          {
            h: 'How Smile Design Works',
            steps: [
              'Consultation: we listen to what you would like to change and examine your teeth and gums.',
              'Photographs and records are taken to study your smile.',
              'Any cavities or gum problems are treated first, so cosmetic work lasts.',
              'We explain the options, timeline and cost, and agree the final plan with you.',
              'Treatment is carried out, and the final result is reviewed together.',
            ],
          },
          {
            h: 'Keeping Your New Smile',
            p: 'Cosmetic results last longest with good daily care. Brush twice a day, limit tea, coffee and tobacco which stain teeth, avoid biting hard objects with your front teeth and keep up six-monthly check-ups and cleanings.',
          },
        ],
        faqs: [
          { q: 'How long does a smile makeover take?', a: 'Whitening and bonding can be done in one or two visits. Laminates usually need two to three appointments over two weeks.' },
          { q: 'Is teeth whitening safe?', a: 'Yes, when it is done or supervised by a dentist. Some people feel temporary sensitivity for a day or two, which settles on its own.' },
          { q: 'Will my teeth look fake?', a: 'No. We match shape, size and shade to your face and age so the result looks natural.' },
          { q: 'Does cosmetic dentistry damage teeth?', a: 'Whitening and bonding remove little or no tooth. Laminates need only a very thin preparation. We always choose the most conservative option that meets your goals.' },
        ],
      },
      {
        slug: 'teeth-whitening',
        title: 'Teeth Whitening',
        image: img('smile-design.jpg'),
        excerpt: 'Safe, dentist-supervised whitening that lifts stains and brightens your natural smile.',
        intro: [
          'Teeth naturally darken with age, and everyday habits — tea, coffee, tobacco, betel nut and some foods — add surface and deep stains over time. Professional teeth whitening lightens the natural colour of your teeth, giving a brighter, fresher smile without drilling or injections.',
          'Whitening done or supervised by a dentist is safer and more predictable than products bought over the counter. We first check that your teeth and gums are healthy, because whitening over cavities or gum disease can cause pain, and we explain realistic results before you start.',
          'Whitening can be done on its own or as part of a planned smile makeover with bonding, veneers or crowns.',
        ],
        glance: [
          ['Sittings', 'Usually one or two'],
          ['Anaesthesia', 'Not needed'],
          ['Sensitivity', 'Mild and temporary for some people'],
          ['Results last', 'Months to a few years, depending on habits'],
          ['First step', 'Check-up and cleaning'],
        ],
        sections: [
          {
            h: 'Who Is Whitening For?',
            list: [
              'Yellowing of teeth with age',
              'Stains from tea, coffee, tobacco or betel nut',
              'Anyone wanting a brighter smile for a wedding or special occasion',
            ],
            after: 'Whitening works on natural teeth only. Crowns, veneers and fillings do not change colour, and some deep grey stains or white fluorosis spots respond better to bonding or veneers.',
          },
          {
            h: 'How Teeth Whitening Is Done',
            steps: [
              'A check-up to make sure there are no cavities, leaking fillings or gum problems.',
              'Scaling and polishing to remove surface stains and tartar, which often brightens teeth on its own.',
              'Your current shade is recorded so you can compare the result.',
              'The gums are protected and a whitening gel is applied to the teeth.',
              'The final shade is checked and aftercare is explained.',
            ],
          },
          {
            h: 'After Whitening',
            list: [
              'Avoid tea, coffee, colas, turmeric-heavy curries and tobacco for the first 48 hours',
              'Use a toothpaste for sensitive teeth if you feel any sensitivity',
              'Brush twice daily and keep up six-monthly cleanings',
              'Occasional top-ups can help maintain the result',
            ],
          },
          {
            h: 'Is Whitening Safe?',
            p: 'Yes, when it is done or supervised by a dentist. The gums are protected and the strength of the gel is chosen for your teeth. Temporary sensitivity is the most common side effect and settles within a day or two. Whitening is not recommended during pregnancy or breastfeeding, or for children whose teeth are still developing.',
          },
        ],
        faqs: [
          { q: 'Does teeth whitening damage enamel?', a: 'No. Dentist-supervised whitening lightens the colour inside the tooth without removing enamel.' },
          { q: 'How long does whitening last?', a: 'Usually from several months to a few years. It lasts longer if you limit tea, coffee and tobacco and keep up regular cleanings.' },
          { q: 'Will whitening work on my crowns or fillings?', a: 'No. Only natural teeth lighten. If a front crown or filling no longer matches after whitening, it can be replaced to match the new shade.' },
          { q: 'Is cleaning the same as whitening?', a: 'No. Scaling and polishing remove surface stains and tartar. Whitening changes the natural shade of the tooth itself. A cleaning is usually done first.' },
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
    intro: [
      'Prosthodontics is the branch of dentistry that replaces missing teeth and rebuilds damaged ones. Losing even one tooth affects more than your smile: chewing becomes harder, nearby teeth slowly drift and tilt into the gap, the opposite tooth can grow out of place, and the jawbone where the tooth used to be begins to shrink.',
      'Today there is a solution for almost every situation — a single implant, a crown on a weak tooth, a fixed bridge, comfortable dentures, or fixed teeth on implants for a whole jaw. The right choice depends on your health, your bone, the teeth you still have, your budget and what matters most to you.',
      'Dr. Nalluru Sasidhar is an implantologist with more than 32 years of clinical experience. At Duhita Dental in Vijayawada, every replacement is planned with digital X-rays and, where needed, 3D CBCT scans, and crafted by experienced dental laboratories.',
    ],
    treatments: [
      {
        slug: 'dental-implants',
        title: 'Dental Implants',
        image: img('implants.jpg'),
        excerpt: 'Permanent, natural-looking replacements for one, several or all missing teeth.',
        intro: [
          'A dental implant is a small titanium post placed into the jawbone where a tooth is missing. Over a few weeks the bone bonds firmly to the implant, so it acts like a new tooth root. A custom-made crown is then fixed on top — giving you a tooth that looks, feels and works like your own.',
          'Implants are the closest thing to a natural tooth. They do not need the neighbouring teeth to be cut down, as a bridge does, and they do not move or slip like a removable denture.',
          'As an implantologist, Dr. Sasidhar plans each implant with 3D imaging to avoid nerves and sinuses and to place the implant exactly where the final tooth needs to be.',
        ],
        glance: [
          ['Total time', 'Usually about 3–4 months from placement to final tooth'],
          ['Surgery', 'Under local anaesthesia, typically about an hour per implant'],
          ['Healing', 'About 8–12 weeks for the bone to bond'],
          ['Planning', 'Examination, X-ray and CBCT 3D scan'],
          ['Lifespan', 'Can last a lifetime with good care'],
        ],
        sections: [
          {
            h: 'Benefits of Dental Implants',
            list: [
              'Fixed in place — no removal, slipping or clicking',
              'Neighbouring teeth are left untouched, unlike a bridge',
              'Helps preserve jawbone and facial structure',
              'Restores full chewing strength — eat what you like',
              'Looks natural and is easy to clean like a normal tooth',
              'Can last a lifetime with good care',
            ],
          },
          {
            h: 'The Implant Journey, Step by Step',
            steps: [
              'Consultation and examination, with a CBCT 3D scan to measure the bone and locate nerves.',
              'Treatment planning: we explain the number of implants, the type of crown, the timeline and the cost.',
              'Implant placement under local anaesthesia — a short, carefully planned procedure.',
              'Healing for about 8–12 weeks while the bone bonds to the implant. A temporary tooth can often be provided for front teeth.',
              'An impression or scan is taken and the final crown is made in the laboratory.',
              'The crown is fixed onto the implant, and your bite is checked and adjusted.',
            ],
          },
          {
            h: 'Am I a Candidate for Implants?',
            p: [
              'Most healthy adults with one or more missing teeth can have implants. What matters most is having enough healthy bone, healthy gums and good general health.',
              'Smokers and people with uncontrolled diabetes have a higher risk of implant problems, so we may advise controlling these first. Where the bone has thinned after an old extraction, bone grafting can often rebuild it.',
            ],
          },
          {
            h: 'Implants vs Bridge vs Denture',
            list: [
              'Implant — replaces the root and the tooth, no damage to other teeth, longest-lasting option',
              'Bridge — fixed, faster to complete, but the teeth on either side must be trimmed for crowns',
              'Partial denture — the most economical, but removable and less stable while chewing',
            ],
          },
          {
            h: 'Caring for Your Implants',
            p: 'Implants cannot decay, but the gum and bone around them can become infected if plaque builds up. Brush twice a day, clean around the implant with floss or an interdental brush, avoid smoking and come for regular check-ups and professional cleaning.',
          },
          {
            h: 'What Affects the Cost of Dental Implants?',
            list: [
              'The number of implants needed',
              'The implant system and the crown material chosen',
              'Whether bone grafting or sinus lifting is required',
              'Any extractions or gum treatment needed first',
            ],
            after: 'You receive a detailed written estimate after your examination and scan, with no hidden charges.',
          },
        ],
        faqs: [
          { q: 'Are dental implants painful?', a: 'Placement is done under local anaesthesia. Most patients manage any mild soreness afterwards with simple painkillers.' },
          { q: 'How long do dental implants last?', a: 'With good oral hygiene and regular check-ups, implants can last a lifetime. The crown on top may need replacing after many years of wear.' },
          { q: 'Can I get an implant years after losing a tooth?', a: 'Usually yes. If the bone has shrunk, a bone graft can often rebuild it before or at the same time as the implant.' },
          { q: 'Am I too old for implants?', a: 'There is no upper age limit. What matters is your general health and bone, not your age.' },
          { q: 'How much do dental implants cost in Vijayawada?', a: 'It depends on the implant system, number of teeth and any bone grafting required. You receive a detailed estimate after your scan.' },
        ],
      },
      {
        slug: 'full-mouth-rehabilitation',
        title: 'Full-Mouth Rehabilitation',
        image: img('full-mouth.jpg'),
        excerpt: 'Implant-supported fixed teeth and complete bite restoration for severely worn or missing dentition.',
        intro: [
          'Full-mouth rehabilitation rebuilds all the teeth in the upper jaw, the lower jaw, or both. It restores how you chew, how your teeth meet, how comfortable your jaw feels and how your smile looks.',
          'It is planned for people who have many missing or broken teeth, teeth badly worn down by grinding or acid, failing old crowns and bridges, or loose dentures they are unhappy with.',
          'Depending on your situation, treatment may combine root canals, crowns on every tooth, bridges, gum treatment and implants — up to fixed implant bridges supported by four to six implants per jaw.',
        ],
        glance: [
          ['Total time', 'Typically 3–6 months, including healing'],
          ['Planning', 'Full examination, X-rays, CBCT scan, bite records and photographs'],
          ['Temporary teeth', 'Provided so you are never without teeth'],
          ['Options', 'Crowns and bridges, or fixed teeth on 4–6 implants per jaw'],
        ],
        sections: [
          {
            h: 'Who Benefits',
            list: [
              'People with multiple missing or failing teeth',
              'Denture wearers wanting fixed teeth',
              'Severe wear or collapsed bite from grinding',
              'Jaw joint pain related to bite problems',
              'Many old fillings, crowns and bridges that are breaking down',
            ],
          },
          {
            h: 'How Full-Mouth Rehabilitation Is Planned and Done',
            steps: [
              'A detailed examination of teeth, gums, jaw joints and bite, with X-rays and a CBCT scan.',
              'Photographs and models are used to plan the new bite and smile.',
              'Urgent problems are treated first — infection, gum disease and teeth that cannot be saved.',
              'Teeth are prepared or implants are placed, and temporary teeth are fitted.',
              'After healing and a trial period with the temporaries, the final crowns or implant bridges are made.',
              'The final teeth are fixed and the bite is fine-tuned, followed by review visits.',
            ],
          },
          {
            h: 'Life with Your New Teeth',
            p: 'Most patients describe being able to chew properly, smile without hiding their teeth and feel comfortable in their jaw for the first time in years. To protect the investment, keep up daily cleaning around crowns and implants, wear a night guard if advised, and come for professional cleaning and check-ups every six months.',
          },
        ],
        faqs: [
          { q: 'How long does full-mouth rehabilitation take?', a: 'Typically three to six months, including healing time. Temporary teeth are provided so you are never without a smile.' },
          { q: 'Can I get fixed teeth instead of dentures?', a: 'In most cases, yes. Four to six implants per jaw can support a fixed bridge of teeth that you do not remove.' },
          { q: 'Is it painful?', a: 'All procedures are done under local anaesthesia, and treatment is spread over several visits so it is comfortable. Mild soreness after implant surgery is managed with medicines.' },
          { q: 'How much does full-mouth rehabilitation cost?', a: 'The cost depends entirely on the plan — how many teeth, crowns or implants are needed and the materials chosen. We give a detailed, staged estimate after the planning visit.' },
        ],
      },
      {
        slug: 'dental-crowns-bridges',
        title: 'Crowns & Bridges',
        image: img('crowns.jpg'),
        excerpt: 'Zirconia and ceramic crowns and fixed bridges that strengthen weak teeth and close gaps.',
        intro: [
          'A crown (often called a “cap”) is a custom-made cover that fits over the whole visible part of a tooth. It restores the tooth’s shape and strength and protects it from breaking.',
          'A bridge replaces one or more missing teeth. Crowns are placed on the teeth on either side of the gap, and these hold a false tooth in between. A bridge is fixed — you do not take it out.',
          'We offer metal-free zirconia and E-max ceramics that are strong, precisely fitted and shade-matched to your natural teeth.',
        ],
        glance: [
          ['Sittings', 'Usually two, about a week apart'],
          ['Anaesthesia', 'Local, for tooth preparation'],
          ['Temporary', 'A temporary crown is fitted between visits'],
          ['Lifespan', 'Often 10–15 years or more'],
        ],
        sections: [
          {
            h: 'When Do You Need a Crown?',
            list: [
              'After root canal treatment, especially on back teeth',
              'A tooth with a very large filling or a broken cusp',
              'A cracked tooth that hurts when biting',
              'A badly worn, discoloured or misshapen tooth',
              'On top of a dental implant',
            ],
          },
          {
            h: 'Crown Materials We Offer',
            list: [
              'Zirconia — very strong, ideal for back teeth',
              'E-max lithium disilicate — lifelike translucency for front teeth',
              'Porcelain-fused-to-metal — a reliable, economical option',
            ],
          },
          {
            h: 'How a Crown or Bridge Is Made',
            steps: [
              'The tooth is examined and an X-ray checks that the root and nerve are healthy.',
              'Under local anaesthesia, the tooth is shaped to make room for the crown.',
              'An impression is taken and the shade is matched to your neighbouring teeth.',
              'A temporary crown protects the tooth while the laboratory makes the final one.',
              'At the second visit the final crown or bridge is tried in, adjusted and cemented in place.',
            ],
          },
          {
            h: 'Bridge or Implant?',
            p: 'A bridge is quicker and needs no surgery, but the healthy teeth on either side must be trimmed to hold it. An implant replaces the missing tooth on its own without touching the neighbours. We explain the pros and cons of both for your situation.',
          },
          {
            h: 'Caring for Crowns and Bridges',
            list: [
              'Brush twice a day and clean along the gum line, where decay can start',
              'Clean under a bridge daily with a floss threader or interdental brush',
              'Avoid biting very hard objects with crowned teeth',
              'Visit for check-ups every six months',
            ],
          },
        ],
        faqs: [
          { q: 'How long do crowns last?', a: 'Well-made crowns often last 10–15 years or more with good hygiene and regular check-ups.' },
          { q: 'Will a crown look natural?', a: 'Yes. Ceramic and zirconia crowns are shade-matched to your teeth, so they blend in with your smile.' },
          { q: 'Is getting a crown painful?', a: 'No. The tooth is numbed while it is prepared. It may feel slightly sensitive for a few days afterwards.' },
          { q: 'Can a tooth with a crown still get decay?', a: 'Yes — the natural tooth under the edge of the crown can decay if plaque is left there, so careful brushing along the gum line is important.' },
        ],
      },
      {
        slug: 'veneers-laminates',
        title: 'Veneers & Laminates',
        image: img('veneers.jpg'),
        excerpt: 'Ultra-thin porcelain shells that correct colour, shape and gaps with minimal tooth reduction.',
        intro: [
          'Veneers, also called laminates, are wafer-thin shells of porcelain bonded to the front surface of the teeth. They change the colour, shape and size of front teeth to give a brighter, more even smile.',
          'They can close small gaps, cover stains that whitening cannot remove, and reshape chipped, worn or uneven teeth.',
          'Because laminates are so thin, only a fraction of a millimetre of enamel is usually prepared — sometimes none at all.',
        ],
        glance: [
          ['Sittings', 'Usually 2–3 over about two weeks'],
          ['Tooth preparation', 'Minimal — a fraction of a millimetre'],
          ['Anaesthesia', 'Little or none in most cases'],
          ['Lifespan', 'Many years with good care'],
        ],
        sections: [
          {
            h: 'What Laminates Can Fix',
            list: ['Deep stains and fluorosis that whitening cannot lift', 'Small gaps and spacing', 'Chipped or worn edges', 'Slightly crooked or uneven teeth', 'Teeth that are too small or oddly shaped'],
          },
          {
            h: 'How Veneers Are Placed',
            steps: [
              'Smile consultation: we discuss the look you want and examine your teeth and gums.',
              'The front surface of the teeth is very lightly prepared, if needed.',
              'Impressions and shade selection are done, and temporary veneers can be placed.',
              'The laboratory crafts each laminate to your planned shape and shade.',
              'The laminates are tried in, checked with you, and bonded permanently.',
            ],
          },
          {
            h: 'Veneers vs Bonding vs Crowns',
            list: [
              'Composite bonding — quicker and cheaper, done in one visit, but stains and chips more easily over time',
              'Porcelain veneers — more stain-resistant and lifelike, need very little tooth preparation',
              'Crowns — better when a tooth is heavily filled, broken or root-canal treated',
            ],
          },
          {
            h: 'Caring for Veneers',
            p: 'Brush and floss normally. Avoid biting hard things like nails, ice or bones with your front teeth, and ask for a night guard if you grind your teeth. Regular check-ups help them last longer.',
          },
        ],
        faqs: [
          { q: 'Do veneers look natural?', a: 'Yes. Each laminate is custom-shaded and shaped so it blends with your face and remaining teeth.' },
          { q: 'Are veneers permanent?', a: 'Once bonded, veneers stay fixed. Because some enamel may be prepared, the tooth will usually always need a veneer or similar covering in future.' },
          { q: 'Do veneers stain?', a: 'Porcelain resists stains far better than natural enamel or composite. The tooth around it can still stain, so good cleaning matters.' },
          { q: 'Can veneers fix crooked teeth?', a: 'Slightly uneven teeth, yes. For more crowding, braces or aligners are usually the better and healthier choice.' },
        ],
      },
      {
        slug: 'dentures',
        title: 'Complete & Partial Dentures',
        image: img('dentures.jpg'),
        excerpt: 'Comfortable, well-fitting dentures — including flexible and implant-supported options.',
        intro: [
          'Dentures are removable replacement teeth. A complete denture replaces all the teeth in a jaw; a partial denture fills the gaps when some natural teeth remain.',
          'Modern dentures are lighter, better fitting and more natural looking than ever. We take precise impressions and bite records so your dentures sit comfortably and let you eat and speak with confidence.',
          'For extra stability, two implants can be placed to snap a lower denture firmly in place.',
        ],
        glance: [
          ['Sittings', 'Usually 4–5 visits over 2–4 weeks'],
          ['Adjusting', 'Most people adapt within 2–4 weeks'],
          ['Options', 'Complete, cast or flexible partial, implant-supported'],
          ['Check-ups', 'Yearly, to keep the fit right'],
        ],
        sections: [
          {
            h: 'Denture Options',
            list: [
              'Complete dentures for a full arch',
              'Cast metal partial dentures — thin and strong',
              'Flexible partial dentures — comfortable, with no metal clasps showing',
              'Implant-supported overdentures — clip onto implants for much better grip',
              'Relining and repair of existing dentures',
            ],
          },
          {
            h: 'How Dentures Are Made',
            steps: [
              'Examination and, if needed, treatment of the gums and remaining teeth.',
              'Preliminary and final impressions of your mouth.',
              'Bite records to set how your jaws meet and how the teeth should line up.',
              'A wax trial: you see and approve the look of the teeth before the denture is finished.',
              'The final denture is fitted, and sore spots are adjusted at follow-up visits.',
            ],
          },
          {
            h: 'Tips for New Denture Wearers',
            list: [
              'Start with soft food cut into small pieces, chewing on both sides',
              'Read aloud to get used to speaking with the denture',
              'Take dentures out at night to rest your gums',
              'Clean them daily with a soft brush and soap or denture cleaner — not toothpaste, which scratches',
              'Keep them in water when out of the mouth so they do not warp',
              'Come back if anything rubs — small adjustments make a big difference',
            ],
          },
        ],
        faqs: [
          { q: 'How long does it take to get used to new dentures?', a: 'Most people adapt within two to four weeks. We schedule review visits to adjust any sore spots.' },
          { q: 'Why is my old denture loose?', a: 'The gums and bone slowly shrink after teeth are lost, so a denture loosens over the years. A reline or a new denture restores the fit.' },
          { q: 'Can dentures be made more stable?', a: 'Yes. Two implants in the lower jaw can hold a denture firmly in place so it does not lift or slip while eating.' },
          { q: 'How long do dentures last?', a: 'Usually five to eight years before they need relining or replacing, depending on wear and changes in the gums.' },
        ],
      },
      {
        slug: 'precision-attachment-dentures',
        title: 'Precision Attachment Dentures',
        image: img('precision-denture.jpg'),
        excerpt: 'Clasp-free partial dentures that lock discreetly onto crowns for a secure, invisible fit.',
        intro: [
          'A conventional partial denture holds on with metal clasps that hook around your natural teeth — and those clasps often show when you smile.',
          'Precision attachment partial dentures replace the visible clasps with small, hidden connectors. One part is built into crowns on your natural teeth; the matching part is inside the denture. The two click together securely.',
          'The result is a partial denture that is more stable, more aesthetic and more comfortable to wear.',
        ],
        glance: [
          ['Sittings', 'Several visits over a few weeks'],
          ['Involves', 'Crowns on supporting teeth plus the denture'],
          ['Removable', 'Yes, for cleaning'],
          ['Best for', 'Several missing back teeth with healthy front teeth remaining'],
        ],
        sections: [
          {
            h: 'Advantages',
            list: ['No visible metal hooks', 'Better stability while chewing and speaking', 'Less stress on supporting teeth', 'Feels more like fixed teeth than a normal partial denture'],
          },
          {
            h: 'How It Is Made',
            steps: [
              'The supporting teeth are examined and treated if needed.',
              'The supporting teeth are prepared for crowns, and impressions are taken.',
              'The laboratory makes the crowns and the denture together, with matching attachments.',
              'The crowns are cemented and the denture is fitted so it clicks securely into place.',
            ],
          },
          {
            h: 'Is It Right for Me?',
            p: 'Precision attachment dentures suit people missing several teeth who want a more discreet and stable option than a clasp denture, but who cannot have — or do not want — implants. We explain how it compares with implants, bridges and flexible dentures for your case.',
          },
        ],
        faqs: [
          { q: 'Can I remove a precision attachment denture?', a: 'Yes — it is removable for cleaning, but clicks securely into place while you wear it.' },
          { q: 'Will people see the attachments?', a: 'No. The attachments are hidden inside the crowns and the denture, so there are no visible clasps.' },
          { q: 'How do I clean it?', a: 'Remove the denture daily, brush it gently, and clean the crowns and attachments in your mouth carefully with a brush and floss.' },
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
    intro: [
      'Orthodontics straightens crooked, crowded or spaced teeth and corrects the way the upper and lower jaws meet. It is not only about looks: straight teeth are easier to clean, wear down less, and put less strain on the gums and jaw joints.',
      'Common problems we treat include crowding, gaps, protruding front teeth, deep bites, open bites, crossbites and teeth that have moved again after earlier braces.',
      'Duhita Dental offers metal, ceramic and self-ligating braces as well as clear aligners for children, teenagers and adults in Vijayawada — planned around your face, your bite and, for children, their growth.',
    ],
    treatments: [
      {
        slug: 'braces',
        title: 'Braces',
        image: img('braces.jpg'),
        excerpt: 'Metal, ceramic and self-ligating braces tailored to your bite and facial profile.',
        intro: [
          'Braces use small brackets bonded to the teeth and a thin wire that gently guides the teeth into their correct positions over time. They remain the most versatile way to correct crowding, gaps, deep bites, protruding teeth and differences between the jaws.',
          'Treatment is planned around your facial profile and, for children and teenagers, their natural growth — so results look natural and stay stable.',
          'You can choose between metal braces, tooth-coloured ceramic braces and self-ligating braces, depending on your preference and budget.',
        ],
        glance: [
          ['Treatment time', 'Typically 12–24 months'],
          ['Visits', 'An adjustment about every 4–6 weeks'],
          ['Age', 'Most often 11–14, but adults can have braces too'],
          ['Afterwards', 'Retainers keep teeth in their new position'],
        ],
        sections: [
          {
            h: 'Problems Braces Can Correct',
            list: [
              'Crowded or overlapping teeth',
              'Gaps between teeth',
              'Protruding upper front teeth',
              'Deep bite, open bite, crossbite or underbite',
              'Teeth that have shifted after earlier treatment',
            ],
          },
          {
            h: 'Types of Braces',
            list: [
              'Metal braces — durable and cost-effective',
              'Ceramic braces — tooth-coloured and discreet',
              'Self-ligating braces — fewer adjustments, less friction',
            ],
          },
          {
            h: 'Your Braces Journey',
            steps: [
              'Consultation and examination, with X-rays, photographs and impressions or models.',
              'A treatment plan explaining how teeth will move, how long it will take and the cost.',
              'Brackets are bonded to the teeth and the first wire is placed — a painless visit.',
              'Regular adjustment visits every four to six weeks to change wires and check progress.',
              'Brackets are removed and retainers are given to hold the result.',
            ],
          },
          {
            h: 'Best Age for Braces',
            p: 'An orthodontic check-up around age 7–8 helps spot problems early. Most treatment begins between 11 and 14, but healthy teeth can be moved at any age — many of our braces patients are adults.',
          },
          {
            h: 'Living with Braces',
            list: [
              'Brush after meals and use an interdental brush around the brackets',
              'Avoid hard and sticky foods — nuts, hard sweets, chewing gum, corn on the cob',
              'Cut fruits like apples into small pieces',
              'Wear a mouthguard for sports',
              'Wear your retainer exactly as advised once braces come off',
            ],
          },
        ],
        faqs: [
          { q: 'How long do braces take?', a: 'Typically 12 to 24 months, depending on the complexity of the case.' },
          { q: 'Do braces hurt?', a: 'You may feel pressure for a few days after each adjustment, which settles quickly.' },
          { q: 'Am I too old for braces?', a: 'No. Teeth can be moved at any age as long as the gums and bone are healthy.' },
          { q: 'Why do I need a retainer?', a: 'Teeth tend to drift back towards their old positions. A retainer holds them in place while the bone around them settles, and protects your result long term.' },
          { q: 'Braces or clear aligners — which is better?', a: 'Both work well. Braces handle complex movements more easily; aligners are nearly invisible and removable. We advise which suits your teeth after examination.' },
        ],
      },
      {
        slug: 'clear-aligners',
        title: 'Clear Aligners',
        image: img('aligners.jpg'),
        excerpt: 'Nearly invisible, removable trays that straighten teeth without wires or brackets.',
        intro: [
          'Clear aligners are a series of custom-made, transparent plastic trays. Each set moves your teeth a small step, and you change to the next set every week or two until your teeth reach their planned position.',
          'Aligners are almost invisible when worn and can be taken out to eat, drink and brush — which is why many adults and working professionals prefer them to braces.',
          'They suit adults and teenagers with mild to moderate crowding, spacing, or teeth that have moved again after previous braces.',
        ],
        glance: [
          ['Treatment time', 'Often 6–18 months, depending on the case'],
          ['Wear time', '20–22 hours a day'],
          ['Visits', 'A check-up every 6–8 weeks'],
          ['Afterwards', 'Retainers keep teeth in place'],
        ],
        sections: [
          {
            h: 'Why Patients Choose Aligners',
            list: ['Virtually invisible', 'Removable — eat whatever you like', 'Easier brushing and flossing than braces', 'No wires or brackets to rub', 'Fewer clinic visits'],
          },
          {
            h: 'How Aligner Treatment Works',
            steps: [
              'Examination, X-rays and a scan or impressions of your teeth.',
              'A digital plan shows how your teeth will move, stage by stage.',
              'Your aligners are made and fitted, with instructions on wearing and cleaning them.',
              'You change to a new set of aligners as directed, with check-ups to track progress.',
              'When treatment is finished, retainers keep your new smile in place.',
            ],
          },
          {
            h: 'Are Aligners Right for Me?',
            p: 'Aligners work best for mild to moderate crowding and spacing, and for relapse after braces. Very complex bites or large jaw differences are usually better treated with braces. Aligners also need discipline — if they are not worn for enough hours each day, the teeth will not move as planned.',
          },
          {
            h: 'Caring for Your Aligners',
            list: [
              'Take them out to eat and to drink anything other than plain water',
              'Brush your teeth before putting them back in',
              'Rinse and gently brush the aligners daily with cool water — hot water can warp them',
              'Keep them in their case when not in your mouth',
            ],
          },
        ],
        faqs: [
          { q: 'How many hours a day should I wear aligners?', a: 'About 20–22 hours a day, removing them only to eat, drink anything other than water, and clean your teeth.' },
          { q: 'Do aligners hurt?', a: 'You may feel pressure for a day or two with each new set. This is a sign they are working and settles quickly.' },
          { q: 'Will aligners affect my speech?', a: 'Some people notice a slight lisp for the first few days. It usually disappears as your tongue gets used to them.' },
          { q: 'Are aligners more expensive than braces?', a: 'Aligners usually cost more than metal braces. The exact cost depends on how many aligners your case needs — we give you an estimate after planning.' },
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
    intro: [
      'Children are not small adults, and their teeth need a different approach. Milk teeth have thinner enamel and decay faster, children’s jaws are still growing, and a child’s first experiences at the dentist shape how they feel about dental care for life.',
      'Our kids dentistry service in Vijayawada focuses on prevention, early treatment and making every visit calm and positive. We explain things in simple words, go at the child’s pace and keep parents involved at every step.',
      'From the first check-up and fluoride application to fillings, baby tooth root canals, space maintainers and guidance for habits like thumb-sucking, we help children grow up with healthy teeth and without a fear of the dentist.',
    ],
    treatments: [
      {
        slug: 'milk-teeth-care',
        title: 'Milk Teeth Care & Fillings',
        image: img('milk-teeth.jpg'),
        excerpt: 'Protecting baby teeth with fluoride, sealants and child-friendly fillings.',
        intro: [
          'Milk teeth (baby teeth) may eventually fall out, but they do important jobs until then. They help children chew and speak properly, and they hold space in the jaw for the permanent teeth growing underneath.',
          'Decay in milk teeth spreads quickly because their enamel is thin. Untreated, it can cause pain, infection, difficulty eating and sleeping — and early loss of the tooth, which can lead to crowding of the adult teeth later.',
          'We use fluoride varnish, pit-and-fissure sealants and gentle fillings to keep baby teeth healthy until they fall out naturally.',
        ],
        glance: [
          ['First visit', 'By the first birthday'],
          ['Check-ups', 'Every six months'],
          ['Prevention', 'Fluoride varnish and sealants — quick and painless'],
          ['Fillings', 'Tooth-coloured, usually in one short visit'],
        ],
        sections: [
          {
            h: 'Preventive Care for Kids',
            list: [
              'Fluoride varnish — strengthens enamel against decay',
              'Pit and fissure sealants — a thin protective coating on the grooves of back teeth',
              'Diet and brushing guidance for parents',
              'Six-monthly check-ups to catch problems early',
            ],
          },
          {
            h: 'Signs of Decay in Children',
            list: [
              'White, brown or black spots on the teeth',
              'Complaining of pain while eating sweets or cold food',
              'Avoiding chewing on one side',
              'Swelling of the gum near a tooth',
            ],
          },
          {
            h: 'Healthy Teeth Tips for Parents',
            list: [
              'Clean your baby’s gums with a soft cloth even before teeth appear',
              'Use a smear of fluoride toothpaste under age 3, and a pea-sized amount from age 3',
              'Brush for your child until they can do it well themselves — usually around age 7–8',
              'Do not put your child to sleep with a bottle of milk or juice',
              'Limit sweets, chocolates and sticky snacks to mealtimes',
              'Offer water instead of sugary drinks',
            ],
          },
        ],
        faqs: [
          { q: 'When should my child first see a dentist?', a: 'By their first birthday, or within six months of the first tooth appearing.' },
          { q: 'Why fill a milk tooth if it will fall out anyway?', a: 'Some milk teeth stay until age 10–12. Leaving decay untreated causes pain and infection, and early loss can lead to crowded adult teeth.' },
          { q: 'Are fluoride treatments safe for children?', a: 'Yes. Fluoride varnish uses a small, carefully measured amount and is one of the most effective ways to prevent decay in children.' },
          { q: 'What are dental sealants?', a: 'A thin, tooth-coloured coating painted onto the deep grooves of the back teeth, where food and bacteria collect. It is quick, painless and needs no injection.' },
        ],
      },
      {
        slug: 'pulpotomy',
        title: 'Pulpotomy (Baby Tooth Root Canal)',
        image: img('pulpotomy.jpg'),
        excerpt: 'Saving decayed milk teeth by treating the infected nerve and capping the tooth.',
        intro: [
          'When decay in a milk tooth reaches the nerve (pulp), the child usually has pain, especially at night or while eating. A pulpotomy removes the infected part of the pulp in the crown of the tooth and seals the healthy part that remains in the roots.',
          'This relieves the pain and keeps the tooth in place until it is ready to fall out naturally — which is better for chewing, speech and the spacing of the adult teeth.',
          'If the infection has spread further into the roots, a pulpectomy (complete cleaning of the root canals of the milk tooth) may be needed instead. The tooth is usually protected with a stainless-steel or tooth-coloured crown.',
        ],
        glance: [
          ['Sittings', 'Usually one'],
          ['Anaesthesia', 'Local, with a gentle approach for children'],
          ['After treatment', 'A crown protects the tooth'],
          ['Child-friendly', 'We explain each step in simple words'],
        ],
        sections: [
          {
            h: 'Why Save a Baby Tooth?',
            list: ['Maintains space for the adult tooth', 'Helps normal chewing and speech', 'Prevents infection spreading to the developing tooth', 'Avoids the need for a space maintainer'],
          },
          {
            h: 'Signs Your Child May Need a Pulpotomy',
            list: [
              'Toothache, especially at night',
              'Pain while eating or drinking hot, cold or sweet things',
              'A large cavity in a back milk tooth',
              'Swelling or a boil on the gum',
            ],
          },
          {
            h: 'How a Pulpotomy Is Done',
            steps: [
              'An examination and X-ray to see how deep the decay goes.',
              'The tooth is numbed gently with local anaesthesia.',
              'The decay and the infected pulp in the crown of the tooth are removed.',
              'A medicated material is placed over the remaining healthy pulp.',
              'The tooth is sealed and protected with a crown.',
            ],
          },
          {
            h: 'After the Treatment',
            p: 'Your child can eat once the numbness wears off — watch that they do not bite their cheek or lip while it is numb. Mild soreness for a day is normal. Keep up good brushing and regular check-ups so the crown and tooth stay healthy until the adult tooth comes in.',
          },
        ],
        faqs: [
          { q: 'Is a pulpotomy safe for children?', a: 'Yes. It is a routine, well-established procedure performed under local anaesthesia.' },
          { q: 'Will my child feel pain?', a: 'The tooth is numbed first, so the treatment itself should not hurt. Most children feel relief once the infected nerve is treated.' },
          { q: 'Why does the tooth need a crown afterwards?', a: 'A treated milk tooth is weaker and can break. A crown protects it until it falls out naturally.' },
        ],
      },
      {
        slug: 'space-maintainers',
        title: 'Space Maintainers',
        image: img('space-maintainer.jpg'),
        excerpt: 'Small appliances that hold the gap when a milk tooth is lost too early.',
        intro: [
          'Each milk tooth holds space for the permanent tooth growing underneath. If a milk tooth is lost early — because of decay or an injury — the neighbouring teeth can tip and drift into the gap.',
          'When that happens, the permanent tooth may not have room to come in. It can come in crooked, stay trapped in the bone, or cause crowding that later needs braces.',
          'A space maintainer is a small, custom-made appliance that holds the gap open until the permanent tooth erupts.',
        ],
        glance: [
          ['Visits', 'Usually two — one to measure, one to fit'],
          ['Anaesthesia', 'Not needed'],
          ['Stays until', 'The permanent tooth starts to come in'],
          ['Check-ups', 'Every six months'],
        ],
        sections: [
          {
            h: 'Types of Space Maintainers',
            list: [
              'Fixed band-and-loop maintainers — cemented to a neighbouring tooth, for one missing tooth',
              'Removable maintainers — like a small plate, can replace front teeth for appearance too',
              'Lingual arch — a wire behind the lower teeth when several back teeth are missing',
            ],
          },
          {
            h: 'How It Is Fitted',
            steps: [
              'The gap and the position of the developing tooth are checked on an X-ray.',
              'A band is fitted and an impression is taken.',
              'The appliance is made in the laboratory.',
              'It is cemented or fitted in a short, painless visit.',
            ],
          },
          {
            h: 'Caring for a Space Maintainer',
            list: [
              'Avoid sticky sweets and chewing gum, which can loosen it',
              'Do not push or pull at it with fingers or tongue',
              'Brush around it carefully twice a day',
              'Tell us if it feels loose or breaks',
            ],
          },
        ],
        faqs: [
          { q: 'How long does a space maintainer stay?', a: 'Until the permanent tooth begins to erupt — we monitor it at each check-up.' },
          { q: 'Does every lost milk tooth need a space maintainer?', a: 'No. It depends on which tooth was lost, the child’s age and how soon the adult tooth is expected. We decide after an X-ray.' },
          { q: 'Is it uncomfortable?', a: 'Children usually get used to it within a few days.' },
        ],
      },
      {
        slug: 'growth-habit-management',
        title: 'Growth & Habit Management',
        image: img('growth-management.jpg'),
        excerpt: 'Early guidance for thumb-sucking, mouth breathing and developing bite problems.',
        intro: [
          'A child’s jaws and teeth are still developing, and certain habits can change the way they grow. Thumb or finger sucking, tongue thrusting, mouth breathing and lip biting can push teeth out of place and affect the shape of the jaws.',
          'Catching these habits and early bite problems while a child is still growing means they can often be guided with simple appliances and advice — before they become bigger problems that need longer treatment later.',
          'This is sometimes called interceptive orthodontics. It does not always replace braces, but it often makes later treatment shorter and simpler.',
        ],
        glance: [
          ['Best age for a check', 'Around 7–8 years'],
          ['Approach', 'Advice, habit-breaking and simple appliances'],
          ['Anaesthesia', 'Not needed'],
          ['Goal', 'Guide growth and reduce later orthodontic treatment'],
        ],
        sections: [
          {
            h: 'Early Signs to Watch',
            list: ['Thumb or finger sucking beyond age 4', 'Mouth breathing or snoring', 'Front teeth that do not meet when biting', 'Protruding upper front teeth', 'Crowding of erupting teeth', 'Losing milk teeth very early or very late'],
          },
          {
            h: 'How We Help',
            list: [
              'Gentle counselling for the child and practical tips for parents to stop habits',
              'Habit-breaking appliances when advice alone is not enough',
              'Appliances that widen a narrow upper jaw or guide jaw growth',
              'Referral to an ENT specialist if mouth breathing is caused by enlarged tonsils, adenoids or a blocked nose',
            ],
          },
          {
            h: 'What Parents Can Do',
            list: [
              'Praise your child for not sucking their thumb, rather than scolding',
              'Notice when the habit happens — boredom, tiredness, watching TV — and offer distractions',
              'Watch for mouth breathing or snoring at night and mention it at the check-up',
              'Bring your child for an orthodontic check around age 7–8',
            ],
          },
        ],
        faqs: [
          { q: 'Can early treatment avoid braces later?', a: 'Sometimes. Interceptive treatment often makes later orthodontics shorter and simpler.' },
          { q: 'Is thumb-sucking harmful?', a: 'It is normal in babies and toddlers. If it continues after permanent teeth start to come in, around age 5–6, it can push teeth and the jaw out of position.' },
          { q: 'Why does mouth breathing matter?', a: 'Long-term mouth breathing can affect how the face and jaws grow and can lead to a narrow upper jaw and crowded teeth. Finding the cause early helps.' },
        ],
      },
    ],
  },
  {
    slug: 'periodontics',
    name: 'Periodontics (Gum Care)',
    icon: 'gum',
    image: img('bleeding-gums.jpg'),
    short: 'Treatment for bleeding gums, bad breath, gum disease and loose teeth.',
    intro: [
      'Healthy gums are the foundation of a healthy mouth. Gum disease starts quietly as gingivitis — red, swollen gums that bleed when you brush. If it is not treated, it can progress to periodontitis, where the bone that holds the teeth slowly breaks down.',
      'Gum disease is a leading cause of tooth loss in adults, yet it is often painless until late. Warning signs include bleeding gums, bad breath, gums shrinking back from the teeth, spaces opening between teeth and teeth that feel loose.',
      'Our periodontal care in Vijayawada ranges from professional cleaning and deep cleaning to gum surgery that stops bone loss and helps stabilise loose teeth. Gum disease is also linked with conditions such as diabetes, so healthy gums matter for your overall health too.',
    ],
    treatments: [
      {
        slug: 'bleeding-gums-gingivitis',
        title: 'Bleeding Gums & Gingivitis',
        image: img('gingivitis.jpg'),
        excerpt: 'Professional cleaning and home-care coaching to reverse early gum inflammation.',
        intro: [
          'Bleeding while brushing is the most common early sign of gingivitis — inflammation of the gums caused by plaque and tartar building up along the gum line.',
          'Many people stop brushing the bleeding area, thinking they are hurting the gums. In fact, the bleeding is caused by bacteria, and gentle, thorough cleaning is exactly what the gums need.',
          'The good news: gingivitis is fully reversible. A professional cleaning and good daily care usually bring the gums back to health within a few weeks.',
        ],
        glance: [
          ['Treatment', 'Scaling and polishing (professional cleaning)'],
          ['Sittings', 'Usually one'],
          ['Anaesthesia', 'Usually not needed'],
          ['Result', 'Gums typically settle within 1–2 weeks with good home care'],
        ],
        sections: [
          {
            h: 'Symptoms of Gingivitis',
            list: ['Gums that bleed when brushing or flossing', 'Red, swollen or tender gums', 'Persistent bad breath', 'Tartar — hard yellow or brown deposits near the gum line'],
          },
          {
            h: 'Common Causes',
            list: [
              'Plaque and tartar left on the teeth',
              'Irregular or rushed brushing, and not cleaning between teeth',
              'Smoking and tobacco use',
              'Hormonal changes during pregnancy',
              'Diabetes and some medicines',
            ],
          },
          {
            h: 'Treatment',
            steps: [
              'Examination of the gums to check for bleeding and pockets.',
              'Ultrasonic scaling removes plaque and tartar from above and just below the gum line.',
              'Polishing smooths the teeth so plaque is slower to stick.',
              'Personalised brushing and flossing guidance, and a medicated mouth rinse where needed.',
            ],
          },
          {
            h: 'Preventing Gum Disease at Home',
            list: [
              'Brush twice a day with a soft brush, angled towards the gum line',
              'Clean between teeth daily with floss or interdental brushes',
              'Stop smoking or chewing tobacco',
              'Have a professional cleaning every six months',
            ],
          },
        ],
        faqs: [
          { q: 'Is scaling bad for teeth?', a: 'No. Professional scaling removes tartar only; it does not weaken enamel or loosen healthy teeth.' },
          { q: 'Why do my gums bleed when I brush?', a: 'Usually because plaque at the gum line has caused inflammation. A professional cleaning and regular, gentle brushing normally stop the bleeding.' },
          { q: 'My teeth feel loose or sensitive after scaling. Is that normal?', a: 'Some sensitivity for a few days is common, as tartar that was covering the teeth has been removed. It settles on its own. Teeth do not become loose because of scaling.' },
          { q: 'How often should I get a cleaning?', a: 'For most people, every six months. People with gum disease or diabetes may need it more often.' },
        ],
      },
      {
        slug: 'deep-cleaning',
        title: 'Deep Cleaning (Scaling & Root Planing)',
        image: img('gum-probing.jpg'),
        excerpt: 'Removing tartar below the gum line to halt periodontitis and help gums reattach.',
        intro: [
          'When gingivitis is left untreated, the gums begin to pull away from the teeth, forming pockets. Plaque and tartar collect deep in these pockets, where a toothbrush cannot reach, and the bone around the teeth starts to break down. This is periodontitis.',
          'Deep cleaning — scaling and root planing — removes the tartar and bacteria from inside these pockets and smooths the root surfaces, so the gums can heal and tighten around the teeth again.',
          'It is the main, non-surgical treatment for periodontitis, and for many patients it is all that is needed to bring gum disease under control.',
        ],
        glance: [
          ['Sittings', 'Usually 1–2, often one side of the mouth at a time'],
          ['Anaesthesia', 'Local, so it is comfortable'],
          ['Review', 'Gums re-checked after 4–6 weeks'],
          ['Maintenance', 'Cleaning every 3–6 months afterwards'],
        ],
        sections: [
          {
            h: 'Signs You May Need Deep Cleaning',
            list: [
              'Gums that bleed easily, are swollen or have pulled back from the teeth',
              'Bad breath or a bad taste that does not go away',
              'Teeth that look longer or have new gaps between them',
              'Teeth that feel loose',
              'Gum pockets deeper than normal when measured',
            ],
          },
          {
            h: 'What to Expect',
            steps: [
              'Gum pocket measurement (charting) and X-rays to check the bone level.',
              'Local anaesthesia so the cleaning is comfortable.',
              'Scaling removes tartar and bacteria from deep inside the pockets.',
              'Root planing smooths the root surfaces so the gums can reattach.',
              'A review visit after 4–6 weeks to measure how the gums have healed.',
            ],
          },
          {
            h: 'After Deep Cleaning',
            p: 'The gums may feel sore and the teeth sensitive for a few days. As the swelling goes down, the gums tighten and may look slightly lower than before — this is a sign of healing. Keep brushing gently, use any mouthwash prescribed, and do not miss the review visit.',
          },
        ],
        faqs: [
          { q: 'How often do I need deep cleaning?', a: 'Once gums are stable, maintenance cleaning every three to six months usually keeps disease under control.' },
          { q: 'What is the difference between normal cleaning and deep cleaning?', a: 'Normal scaling cleans above and just below the gum line. Deep cleaning reaches far below the gum line into the pockets, and is done under local anaesthesia.' },
          { q: 'Will I need gum surgery?', a: 'Many patients do not. Surgery is considered only if deep pockets remain after deep cleaning and good home care.' },
        ],
      },
      {
        slug: 'flap-surgery',
        title: 'Periodontal Flap Surgery',
        image: img('flap-surgery.jpg'),
        excerpt: 'Surgical access to clean deep pockets and restore gum and bone health.',
        intro: [
          'In advanced gum disease, the pockets around the teeth can become too deep to clean fully from the outside, even with deep cleaning. Bacteria and tartar left in these pockets keep destroying the bone.',
          'Flap surgery allows the gum to be gently lifted back so the roots and bone can be seen and cleaned thoroughly. Where possible, lost bone can be rebuilt with grafting materials before the gum is stitched back in place.',
          'The aim is to reduce pocket depth, stop further bone loss and give loose teeth the best chance of staying.',
        ],
        glance: [
          ['Anaesthesia', 'Local'],
          ['Time', 'About 1–2 hours, depending on the area'],
          ['Stitches', 'Usually removed after about a week'],
          ['Recovery', 'Mild soreness for a few days'],
        ],
        sections: [
          {
            h: 'When Is Flap Surgery Needed?',
            list: [
              'Deep gum pockets that remain after deep cleaning',
              'Ongoing bone loss seen on X-rays',
              'Areas where tartar cannot be reached without surgery',
            ],
          },
          {
            h: 'How It Is Done',
            steps: [
              'The area is numbed with local anaesthesia.',
              'The gum is gently lifted away from the teeth.',
              'Tartar and infected tissue are removed and the roots are smoothed.',
              'Bone defects are reshaped or grafted where suitable.',
              'The gum is placed back and stitched snugly around the teeth.',
            ],
          },
          {
            h: 'Recovery Tips',
            list: [
              'Use cold compresses on the cheek for the first day',
              'Eat soft food and avoid chewing on the treated side',
              'Take prescribed medicines and use the mouthwash as advised',
              'Do not smoke — it slows healing',
              'Come back for stitch removal and review',
            ],
          },
        ],
        faqs: [
          { q: 'Is gum surgery painful?', a: 'It is performed under local anaesthesia. Mild soreness for a few days is managed with medication.' },
          { q: 'Will my teeth become firm again?', a: 'Often they become more stable once the infection is removed and the gums heal. How much depends on how much bone support remains.' },
          { q: 'Can gum disease come back after surgery?', a: 'Yes, if plaque builds up again. Regular maintenance cleaning and good home care are essential to keep the results.' },
        ],
      },
      {
        slug: 'loose-teeth',
        title: 'Loose Teeth Treatment',
        image: img('loose-teeth.jpg'),
        excerpt: 'Splinting, gum therapy and bite correction to stabilise mobile teeth.',
        intro: [
          'Adult teeth should never feel loose. When they do, it usually means the bone and gum supporting them have been damaged — most often by gum disease, but also by an injury or by too much force from grinding or an uneven bite.',
          'A loose tooth is a warning sign, not something to ignore. The sooner the cause is found and treated, the better the chance of keeping the tooth.',
          'Treatment focuses on stopping the cause first, then stabilising the teeth so you can chew comfortably again.',
        ],
        glance: [
          ['First step', 'Examination and X-rays to find the cause'],
          ['Treatments', 'Gum therapy, splinting, bite adjustment, night guard'],
          ['Anaesthesia', 'Depends on the treatment'],
          ['Urgency', 'Same day if loose after an injury'],
        ],
        sections: [
          {
            h: 'Common Causes of Loose Teeth',
            list: [
              'Gum disease (periodontitis) causing bone loss',
              'Injury or trauma to the mouth',
              'Grinding or clenching the teeth',
              'An uneven bite placing heavy force on certain teeth',
              'Infection at the root tip',
            ],
          },
          {
            h: 'How We Help',
            list: [
              'Periodontal therapy — deep cleaning or surgery — to control infection',
              'Splinting loose teeth together so they support each other',
              'Bite adjustment to spread chewing forces evenly',
              'A night guard if you grind or clench',
              'Replacement with an implant or bridge if a tooth cannot be saved',
            ],
          },
          {
            h: 'What You Can Do',
            list: [
              'Do not wiggle the loose tooth',
              'Chew on the other side and choose softer foods',
              'Keep brushing gently — cleanliness helps the gums recover',
              'Book an appointment early rather than waiting',
            ],
          },
        ],
        faqs: [
          { q: 'Can a loose tooth become firm again?', a: 'Often yes, if the underlying gum disease is controlled and enough bone support remains.' },
          { q: 'What is splinting?', a: 'A thin wire or fibre bonded behind the loose tooth and its neighbours, so they hold each other steady while the gums heal.' },
          { q: 'My tooth became loose after a fall. What should I do?', a: 'Avoid touching it, bite gently on a clean cloth and come to the clinic the same day. Quick treatment improves the chance of saving the tooth.' },
        ],
      },
      {
        slug: 'bad-breath-treatment',
        title: 'Bad Breath (Halitosis) Treatment',
        image: img('bad-breath.jpg'),
        excerpt: 'Finding and treating the real cause of persistent bad breath.',
        intro: [
          'Everyone has bad breath sometimes — after waking up or eating onion and garlic. Persistent bad breath (halitosis) that does not go away with brushing is different, and it can affect your confidence at work and with family.',
          'In most cases the cause is in the mouth: bacteria on the back of the tongue, gum disease, decayed teeth, food trapped around old fillings, or a dry mouth.',
          'Mouthwash and mints only mask the smell for a short time. Finding and treating the source is what solves it.',
        ],
        glance: [
          ['First step', 'Full oral examination'],
          ['Common treatment', 'Professional cleaning plus tongue and home care'],
          ['Sittings', 'Usually one or two'],
          ['Result', 'Most patients notice improvement within days'],
        ],
        sections: [
          {
            h: 'Common Causes of Bad Breath',
            list: [
              'Bacterial coating on the back of the tongue',
              'Gum disease and tartar',
              'Decayed teeth or food trapped around fillings and crowns',
              'Dry mouth — from not drinking enough water, mouth breathing or some medicines',
              'Smoking and chewing tobacco',
              'Occasionally sinus, throat or stomach problems',
            ],
          },
          {
            h: 'Our Approach',
            steps: [
              'A full oral examination to find the source.',
              'Professional cleaning and treatment of any gum disease.',
              'Repair of decayed teeth or leaking fillings.',
              'Advice on tongue cleaning, brushing, flossing and drinking enough water.',
              'Referral to a physician or ENT specialist if the cause is outside the mouth.',
            ],
          },
          {
            h: 'Tips for Fresh Breath',
            list: [
              'Brush twice a day and clean your tongue every morning',
              'Floss to remove food stuck between teeth',
              'Drink plenty of water through the day',
              'Avoid tobacco',
              'Have your teeth cleaned every six months',
            ],
          },
        ],
        faqs: [
          { q: 'Can bad breath be cured permanently?', a: 'When the dental cause is treated and good habits are maintained, most patients see lasting improvement.' },
          { q: 'Does mouthwash cure bad breath?', a: 'It only masks the smell for a short while. Treating the cause — usually tongue bacteria or gum disease — is what works.' },
          { q: 'How do I know if I have bad breath?', a: 'It can be hard to notice your own. A dental examination can identify signs like tongue coating, tartar and gum disease that commonly cause it.' },
        ],
      },
    ],
  },
  {
    slug: 'oral-surgery',
    name: 'Oral & Maxillofacial Surgery',
    icon: 'surgery',
    image: img('maxillofacial.jpg'),
    short: 'Painless extractions, wisdom teeth removal and advanced jaw surgery with careful planning and aftercare.',
    intro: [
      'Oral and maxillofacial surgery covers procedures of the teeth, jaws and face — from removing a badly broken tooth or an impacted wisdom tooth to treating jaw cysts, injuries and preparing the bone for implants.',
      'The word “surgery” can sound frightening, but most of these procedures are done in the dental chair under local anaesthesia and take well under an hour. Careful planning is what makes them safe and comfortable.',
      'At Duhita Dental these procedures are planned with digital X-rays and, where needed, 3D scans, so we know exactly where nerves, sinuses and roots lie before we begin. We also give clear written aftercare instructions and are available if you have any concerns during healing.',
    ],
    treatments: [
      {
        slug: 'wisdom-teeth-removal',
        title: 'Wisdom Teeth Removal',
        image: img('wisdom-teeth.jpg'),
        excerpt: 'Surgical removal of impacted or painful third molars with a focus on comfort and healing.',
        intro: [
          'Wisdom teeth are the third molars at the very back of the mouth. They usually come through between the ages of 17 and 25 — and because they are the last teeth to arrive, there is often not enough room for them.',
          'When a wisdom tooth cannot come through properly, it becomes impacted: stuck partly or fully in the bone or gum. Impacted wisdom teeth can cause repeated pain and swelling, infection of the gum around them, decay, and damage to the tooth in front.',
          'We use digital X-rays to map each tooth’s position relative to nerves before surgery, allowing a precise, minimally invasive procedure.',
        ],
        glance: [
          ['Time', 'About 20–60 minutes per tooth'],
          ['Anaesthesia', 'Local'],
          ['Back to routine', 'Usually within 2–3 days'],
          ['Full healing', 'A few weeks for the socket to fill in'],
          ['Planning', 'X-ray (OPG) to locate the tooth and the nerve'],
        ],
        sections: [
          {
            h: 'Signs You May Need Wisdom Teeth Removed',
            list: ['Pain or swelling at the back of the jaw', 'Gum flap that traps food and gets infected', 'Difficulty opening the mouth', 'Decay in the wisdom tooth or the tooth in front', 'Bad taste or bad breath from the back of the mouth', 'Crowding of other teeth'],
          },
          {
            h: 'How Wisdom Tooth Removal Is Done',
            steps: [
              'Examination and an X-ray to see the angle of the tooth and how close it is to the nerve.',
              'Local anaesthesia so the area is completely numb.',
              'For an erupted tooth, it is gently loosened and removed. For an impacted tooth, a small opening is made in the gum and the tooth may be removed in sections.',
              'The socket is cleaned and stitched if needed.',
              'You bite on gauze to control bleeding and receive written aftercare instructions.',
            ],
          },
          {
            h: 'Recovery Tips',
            list: ['Bite on gauze for the first hour', 'Use cold compresses for the first day', 'Eat soft, cool foods for a few days', 'Avoid smoking, spitting and straws for at least 24 hours', 'From the next day, rinse gently with warm salt water after meals', 'Take medicines as prescribed'],
            after: 'Some swelling and stiffness of the jaw for two to three days is normal. Call us if bleeding does not stop, swelling keeps increasing after the third day, or you develop a fever.',
          },
        ],
        faqs: [
          { q: 'How long is recovery after wisdom tooth removal?', a: 'Most people return to normal activities within 2–3 days. Complete healing of the socket takes a few weeks.' },
          { q: 'Should all wisdom teeth be removed?', a: 'Not always. Healthy, well-positioned wisdom teeth that can be cleaned may be kept and monitored.' },
          { q: 'Does wisdom tooth removal hurt?', a: 'The area is fully numbed, so you feel pressure but not pain during the procedure. Soreness afterwards is managed with prescribed painkillers.' },
          { q: 'What is a dry socket?', a: 'It happens when the blood clot in the socket is lost too early, causing pain a few days after extraction. Avoiding smoking, spitting and straws helps prevent it. If it happens, we can treat it quickly.' },
        ],
      },
      {
        slug: 'tooth-extraction',
        title: 'Painless Tooth Extraction',
        image: img('tooth-extraction.jpg'),
        excerpt: 'Gentle, atraumatic extractions that preserve bone for future implants.',
        intro: [
          'We always try to save a natural tooth first — with a filling, root canal or crown. But sometimes a tooth is too damaged, infected or loose to keep, and removing it is the healthiest option.',
          'Our atraumatic extraction technique removes the tooth gently while preserving as much of the surrounding bone as possible. This makes healing more comfortable and matters if you plan to replace the tooth with an implant later.',
          'With good local anaesthesia, an extraction should not be painful. Most patients feel only pressure.',
        ],
        glance: [
          ['Time', 'Usually 15–40 minutes'],
          ['Anaesthesia', 'Local'],
          ['Back to routine', 'Usually the next day'],
          ['Replacement', 'Implant, bridge or denture can be planned'],
        ],
        sections: [
          {
            h: 'When Extraction Is Needed',
            list: ['Severe decay beyond repair', 'Advanced gum disease with very loose teeth', 'Fractured roots or a tooth split below the gum', 'Infection that cannot be treated with a root canal', 'Orthodontic space creation', 'Milk teeth that do not fall out on time'],
          },
          {
            h: 'How an Extraction Is Done',
            steps: [
              'We review your medical history and medicines, and take an X-ray.',
              'The area is numbed with local anaesthesia.',
              'The tooth is gently loosened and removed, protecting the surrounding bone.',
              'The socket is cleaned and you bite on gauze to stop bleeding.',
              'You receive aftercare instructions and options for replacing the tooth.',
            ],
          },
          {
            h: 'Aftercare',
            list: [
              'Bite firmly on the gauze for 30–60 minutes',
              'Do not rinse, spit or use a straw for the first 24 hours',
              'Eat soft, cool food on the other side',
              'Avoid smoking and alcohol for at least a day',
              'From the next day, rinse gently with warm salt water',
            ],
          },
          {
            h: 'Please Tell Us Before an Extraction If You…',
            list: [
              'Take blood thinners such as aspirin or clopidogrel',
              'Have diabetes, high blood pressure or heart problems',
              'Are pregnant',
              'Take medicines for bone conditions such as osteoporosis',
            ],
          },
        ],
        faqs: [
          { q: 'Will I feel pain during extraction?', a: 'No. The area is completely numbed. You may feel pressure but not pain.' },
          { q: 'Should I replace an extracted tooth?', a: 'Usually yes. A gap lets neighbouring teeth tilt and the opposite tooth drift, which affects your bite. An implant, bridge or denture prevents this.' },
          { q: 'When can I eat after an extraction?', a: 'Once the numbness has worn off — usually in two to three hours. Choose soft, cool food for the first day.' },
        ],
      },
      {
        slug: 'maxillofacial-surgery',
        title: 'Jaw & Facial Surgery',
        image: img('maxillofacial.jpg'),
        excerpt: 'Management of jaw fractures, cysts, facial trauma and pre-prosthetic surgery.',
        intro: [
          'Beyond extractions, oral and maxillofacial surgery treats problems of the jaw bones and the soft tissues of the mouth and face.',
          'Our surgical services include treatment of jaw cysts and benign lesions, management of jaw fractures and facial injuries, biopsy of suspicious areas, and bone preparation before implants or dentures.',
          'Every case starts with a careful examination and imaging. If a condition needs hospital-based care, we guide you to the right specialist centre.',
        ],
        glance: [
          ['Planning', 'Examination, X-rays and 3D imaging where needed'],
          ['Anaesthesia', 'Local for most procedures'],
          ['Referral', 'Not needed — book directly'],
          ['Follow-up', 'Review visits until healing is complete'],
        ],
        sections: [
          {
            h: 'Procedures Include',
            list: ['Cyst and benign tumour removal', 'Jaw fracture management', 'Bone grafting and ridge preparation before implants or dentures', 'Biopsy of suspicious lesions', 'Removal of buried roots and teeth'],
          },
          {
            h: 'Symptoms That Need Attention',
            list: [
              'A swelling in the jaw or face that does not go away',
              'Numbness of the lip or chin',
              'Pain or difficulty opening the mouth after an injury',
              'Teeth that suddenly do not meet properly',
              'A lump, ulcer or patch in the mouth lasting more than two weeks',
            ],
          },
          {
            h: 'What to Expect',
            p: 'We explain the diagnosis, the procedure, the expected recovery and the cost before treatment. Most minor procedures are done in the clinic under local anaesthesia, with written aftercare instructions and a follow-up visit. Any tissue removed can be sent for laboratory testing so the diagnosis is certain.',
          },
        ],
        faqs: [
          { q: 'Do I need a referral?', a: 'No referral is needed. You can book a consultation directly with the clinic.' },
          { q: 'Is a jaw cyst serious?', a: 'Most jaw cysts are benign, but they can slowly grow and weaken the bone, so they should be examined and treated.' },
          { q: 'What is a biopsy?', a: 'A small piece of tissue is removed under local anaesthesia and sent to a laboratory to confirm exactly what a lesion is.' },
        ],
      },
    ],
  },
  {
    slug: 'oral-medicine',
    name: 'Oral Medicine & Diagnosis',
    icon: 'scan',
    image: img('diagnosis.jpg'),
    short: 'Digital X-rays, oral cancer screening and diagnosis of ulcers, lesions and jaw pain.',
    intro: [
      'Accurate diagnosis is the first step to the right treatment. Many dental problems — early decay between teeth, infection at the root tip, bone loss from gum disease — cannot be seen just by looking in the mouth.',
      'Our oral medicine and radiology service investigates mouth ulcers, white or red patches, lumps, burning mouth, jaw pain and other conditions, using careful clinical examination and digital imaging.',
      'We also offer oral cancer screening. This is especially important in India, where tobacco, gutka and betel nut use make oral cancer common — and where early detection makes a very big difference.',
    ],
    treatments: [
      {
        slug: 'digital-xray-scans',
        title: 'Digital X-Rays & 3D Scans',
        image: img('digital-scan.jpg'),
        excerpt: 'RVG, OPG and CBCT imaging for precise, low-radiation diagnosis.',
        intro: [
          'Dental X-rays show what the eye cannot: decay between teeth, infection at the tip of a root, bone loss from gum disease, impacted teeth, cysts and the shape of the canals before a root canal.',
          'Digital radiography gives instant, high-definition images with far lower radiation than traditional film. The image appears on screen within seconds, so we can show you exactly what we see and explain it.',
          'For implants and complex surgery, CBCT scans provide a 3D view of the bone, nerves and sinuses for precise planning.',
        ],
        glance: [
          ['Time', 'A few seconds to a few minutes'],
          ['Pain', 'None'],
          ['Results', 'Instant, shown on screen'],
          ['Radiation', 'Very low — taken only when clinically needed'],
        ],
        sections: [
          {
            h: 'Imaging We Use',
            list: [
              'RVG intraoral X-rays — close-up images of one to three teeth, used for cavities and root canals',
              'OPG full-mouth panoramic X-rays — all teeth and both jaws in one image, used for wisdom teeth, gum disease and overall check-ups',
              'CBCT 3D scans for implant planning, impacted teeth and complex cases',
            ],
          },
          {
            h: 'Why X-Rays Matter',
            list: [
              'Find decay early, while a small filling is enough',
              'Check root infections and plan root canals accurately',
              'Measure bone before implants',
              'Locate impacted wisdom teeth and nerves before surgery',
              'Monitor bone loss in gum disease',
            ],
          },
          {
            h: 'Safety and Pregnancy',
            p: 'Digital dental X-rays use a very small dose of radiation, and we take them only when they are needed for diagnosis or treatment. If you are pregnant or think you might be, please tell us before any X-ray — routine X-rays are usually postponed, and only essential images are taken with extra precautions.',
          },
        ],
        faqs: [
          { q: 'Are dental X-rays safe?', a: 'Yes. Digital dental X-rays use very low doses of radiation and are taken only when clinically needed.' },
          { q: 'What is the difference between an OPG and a CBCT?', a: 'An OPG is a flat panoramic picture of all the teeth and jaws. A CBCT is a 3D scan that shows the bone in depth, used mainly for implant planning and complex surgery.' },
          { q: 'Can I get a copy of my X-rays?', a: 'Yes. Please ask the clinic team and we will share your images.' },
        ],
      },
      {
        slug: 'oral-lesions-ulcers',
        title: 'Mouth Ulcers, Lesions & Cancer Screening',
        image: img('oral-lesions.jpg'),
        excerpt: 'Examination and management of ulcers, cysts, patches and early oral cancer signs.',
        intro: [
          'Most mouth ulcers are harmless. They are often caused by biting the cheek, a sharp tooth, stress or a minor infection, and they heal on their own within about two weeks.',
          'Any ulcer, lump or patch that lasts longer than two weeks should be examined by a dentist. Some long-lasting changes in the mouth can be early or pre-cancerous signs — especially in people who use tobacco, gutka, pan masala or betel nut, or who drink alcohol regularly.',
          'Oral cancer found early is far easier to treat. A screening is quick, painless and can be done during a routine check-up.',
        ],
        glance: [
          ['Screening time', 'About 10 minutes'],
          ['Pain', 'None — a visual and touch examination'],
          ['Biopsy', 'Only if something needs further testing'],
          ['Who should be screened', 'Anyone using tobacco or areca nut, and all adults at check-ups'],
        ],
        sections: [
          {
            h: 'See a Dentist If You Notice',
            list: ['An ulcer lasting more than two weeks', 'White or red patches', 'A lump or thickening in the cheek or tongue', 'Difficulty opening the mouth, or tight bands in the cheeks', 'Burning sensation when eating spicy food', 'Unexplained bleeding or numbness in the mouth'],
          },
          {
            h: 'Common Mouth Conditions We Diagnose',
            list: [
              'Recurrent mouth ulcers (aphthous ulcers)',
              'Leukoplakia — white patches that cannot be rubbed off',
              'Oral submucous fibrosis — stiffening of the cheeks linked with areca nut and gutka',
              'Mucoceles — small fluid-filled swellings on the lip',
              'Fungal infections and lichen planus',
            ],
          },
          {
            h: 'What Happens During a Screening',
            steps: [
              'We ask about your symptoms, habits and medical history.',
              'The lips, cheeks, tongue, floor of the mouth, palate and throat are examined.',
              'The neck and jaw are gently felt for lumps.',
              'If something looks unusual, we explain the next step — monitoring, treatment or a biopsy.',
            ],
          },
          {
            h: 'Lowering Your Risk',
            list: [
              'Stop using tobacco, gutka, pan masala and betel nut — help is available',
              'Limit alcohol',
              'Get sharp or broken teeth that rub the cheek or tongue fixed',
              'Have a dental check-up every six months',
            ],
          },
        ],
        faqs: [
          { q: 'Is oral cancer screening painful?', a: 'No. It is a quick visual and touch examination; a biopsy is suggested only if something needs further investigation.' },
          { q: 'When should I worry about a mouth ulcer?', a: 'If it lasts more than two weeks, keeps coming back in the same place, bleeds easily or is painless and hard — get it examined.' },
          { q: 'Does a white patch mean cancer?', a: 'Not necessarily. Many white patches are harmless, but some can be pre-cancerous, so they should always be checked by a dentist.' },
        ],
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

/** Cross-speciality links for the "Related Treatments" box — treatments patients often need together. */
const crossLinks = {
  'endodontics/root-canal-treatment': ['prosthodontics/dental-crowns-bridges', 'oral-medicine/digital-xray-scans'],
  'endodontics/broken-tooth-repair': ['prosthodontics/dental-crowns-bridges', 'endodontics/root-canal-treatment'],
  'endodontics/tooth-decay-fillings': ['pedodontics/milk-teeth-care', 'endodontics/root-canal-treatment'],
  'endodontics/smile-design': ['prosthodontics/veneers-laminates', 'orthodontics/clear-aligners'],
  'endodontics/teeth-whitening': ['prosthodontics/veneers-laminates', 'periodontics/bleeding-gums-gingivitis'],
  'prosthodontics/dental-implants': ['oral-surgery/tooth-extraction', 'oral-medicine/digital-xray-scans'],
  'prosthodontics/full-mouth-rehabilitation': ['prosthodontics/dental-implants', 'periodontics/deep-cleaning'],
  'prosthodontics/dental-crowns-bridges': ['endodontics/root-canal-treatment', 'prosthodontics/dental-implants'],
  'prosthodontics/veneers-laminates': ['endodontics/teeth-whitening', 'endodontics/smile-design'],
  'prosthodontics/dentures': ['prosthodontics/dental-implants'],
  'orthodontics/braces': ['pedodontics/growth-habit-management', 'endodontics/smile-design'],
  'orthodontics/clear-aligners': ['endodontics/smile-design', 'endodontics/teeth-whitening'],
  'pedodontics/milk-teeth-care': ['endodontics/tooth-decay-fillings'],
  'pedodontics/space-maintainers': ['orthodontics/braces'],
  'pedodontics/growth-habit-management': ['orthodontics/braces'],
  'periodontics/bleeding-gums-gingivitis': ['periodontics/bad-breath-treatment', 'endodontics/teeth-whitening'],
  'periodontics/loose-teeth': ['prosthodontics/dental-implants'],
  'periodontics/bad-breath-treatment': ['endodontics/tooth-decay-fillings'],
  'oral-surgery/wisdom-teeth-removal': ['oral-medicine/digital-xray-scans'],
  'oral-surgery/tooth-extraction': ['prosthodontics/dental-implants', 'prosthodontics/dentures'],
  'oral-surgery/maxillofacial-surgery': ['oral-medicine/oral-lesions-ulcers', 'prosthodontics/dental-implants'],
  'oral-medicine/digital-xray-scans': ['prosthodontics/dental-implants', 'oral-surgery/wisdom-teeth-removal'],
  'oral-medicine/oral-lesions-ulcers': ['oral-surgery/maxillofacial-surgery'],
};

/** Treatments to suggest next to one: the rest of its speciality, then the cross-speciality links. */
export const relatedTreatments = (catSlug, slug) => {
  const own = findCategory(catSlug).treatments.filter((t) => t.slug !== slug).map((t) => ({ category: catSlug, treatment: t }));
  const cross = (crossLinks[`${catSlug}/${slug}`] || []).map((key) => {
    const [c, t] = key.split('/');
    return { category: c, treatment: findTreatment(c, t) };
  });
  return [...own, ...cross];
};
