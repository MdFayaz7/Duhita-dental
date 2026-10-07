/** Clinic details and the service catalogue, mirroring duhitadental's website. */

export const clinicInfo = {
  name: 'Duhita Dental',
  fullName: 'Duhita Multispeciality Dental Centre',
  tagline: 'Precision. Comfort. Care since 1997.',
  phone: '+919440313066',
  phoneDisplay: '+91 94403 13066',
  whatsapp: 'https://wa.me/919440313066',
  email: 'duhitadent@gmail.com',
  website: 'https://duhitadental.com',
  addressLines: [
    '1st Floor, D.No 59, Shanthi Plaza, 14-2/1',
    'Above SBI NRI Branch, Gayatri Nagar, Krishna Nagar',
    'Benz Circle, Vijayawada, Andhra Pradesh',
  ],
  hours: [
    { label: 'Mon – Sat', value: '9:00 AM – 1:00 PM · 3:00 PM – 9:00 PM' },
    { label: 'Sunday', value: 'By appointment only' },
  ],
  mapLink: 'https://www.google.com/maps/search/?api=1&query=Duhita+Multispeciality+Dental+Centre+Vijayawada',
  social: {
    facebook: 'https://www.facebook.com/Duhitamultispecialitydentalcenter',
    instagram: 'https://instagram.com/duhita.dent_1',
    google: 'https://www.google.com/search?q=duhita+multispeciality+dental+centre',
  },
  stats: [
    { value: '32+', label: 'Years of care' },
    { value: '10,000+', label: 'Patients treated' },
    { value: '7', label: 'Specialities' },
  ],
};

export const founder = {
  name: 'Dr. Nalluru Sasidhar',
  credentials: 'BDS, MDS (Conservative Dentistry)',
  blurb:
    'Founder of Duhita Dental, practising in Vijayawada since 1997. Known for careful diagnosis, gentle hands and explaining every option before treatment begins.',
};

export const aboutStory = [
  'Duhita Multispeciality Dental Centre began in 1997 with a simple idea: people in Vijayawada deserve specialist-level dental care close to home, delivered with patience and respect.',
  'Our clinic in Shanthi Plaza, near Benz Circle, brings seven dental specialities under one roof — so a child’s first check-up, a parent’s root canal and a grandparent’s implants are all handled by one trusted team.',
  'We explain every diagnosis in plain language, show you your X-rays, and give written treatment options with clear costs. No pressure, no unnecessary procedures.',
];

export const whyChoose = [
  { title: 'Specialist-led care', body: 'Treatment is led by an MDS endodontist and implantologist with over 32 years of experience.' },
  { title: 'Strict sterilisation', body: 'Autoclave sterilisation with sealed pouches and single-use disposables at every chair.' },
  { title: 'Honest treatment plans', body: 'Written options with staged pricing before any procedure begins — no surprises.' },
  { title: 'Six days a week', body: 'Morning and late-evening appointments, so care fits around school and work.' },
];

export type Treatment = { slug: string; title: string; excerpt: string };
export type Category = { slug: string; name: string; short: string; treatments: Treatment[] };

export const categories: Category[] = [
  {
    slug: 'endodontics',
    name: 'Endodontics',
    short: 'Painless root canal treatment and tooth-saving care that keeps your natural teeth for life.',
    treatments: [
      { slug: 'root-canal-treatment', title: 'Root Canal Treatment', excerpt: 'Single-sitting rotary root canal that saves an infected tooth and ends the pain.' },
      { slug: 'broken-tooth-repair', title: 'Broken & Cracked Tooth Repair', excerpt: 'Rebuilding chipped, cracked or broken teeth so they look and bite normally again.' },
      { slug: 'tooth-decay-fillings', title: 'Tooth Decay & Tooth-Coloured Fillings', excerpt: 'Cavities cleaned and filled with tooth-coloured composite that nobody can see.' },
      { slug: 'smile-design', title: 'Smile Design & Cosmetic Dentistry', excerpt: 'Reshaping, whitening and veneers planned around your face and smile line.' },
    ],
  },
  {
    slug: 'prosthodontics',
    name: 'Prosthodontics & Implants',
    short: 'Dental implants, crowns, bridges and dentures that restore missing teeth, bite and confidence.',
    treatments: [
      { slug: 'dental-implants', title: 'Dental Implants', excerpt: 'A titanium root and a matching crown that replace a missing tooth for good.' },
      { slug: 'full-mouth-rehabilitation', title: 'Full-Mouth Rehabilitation', excerpt: 'Rebuilding worn, broken or missing teeth across both jaws in a planned sequence.' },
      { slug: 'dental-crowns-bridges', title: 'Crowns & Bridges', excerpt: 'Ceramic crowns that protect weak teeth and bridges that close the gaps.' },
      { slug: 'veneers-laminates', title: 'Veneers & Laminates', excerpt: 'Thin ceramic shells for stained, chipped or uneven front teeth.' },
      { slug: 'dentures', title: 'Complete & Partial Dentures', excerpt: 'Comfortable, natural-looking dentures that let you eat and speak with ease.' },
      { slug: 'precision-attachment-dentures', title: 'Precision Attachment Dentures', excerpt: 'Clip-free dentures held by hidden attachments for a firmer, neater fit.' },
    ],
  },
  {
    slug: 'orthodontics',
    name: 'Orthodontics',
    short: 'Metal, ceramic and self-ligating braces plus clear aligners for straighter teeth at any age.',
    treatments: [
      { slug: 'braces', title: 'Braces', excerpt: 'Metal, ceramic and self-ligating braces that straighten crowded or spaced teeth.' },
      { slug: 'clear-aligners', title: 'Clear Aligners', excerpt: 'Removable, nearly invisible trays that straighten teeth without braces.' },
    ],
  },
  {
    slug: 'pedodontics',
    name: 'Pedodontics (Kids Dentistry)',
    short: 'Gentle, friendly dental care for children — from the first tooth to the teenage years.',
    treatments: [
      { slug: 'milk-teeth-care', title: 'Milk Teeth Care & Fillings', excerpt: 'Check-ups, cleaning and fillings that keep milk teeth healthy until they fall naturally.' },
      { slug: 'pulpotomy', title: 'Pulpotomy (Kids Root Canal)', excerpt: 'Saving a badly decayed milk tooth without pain or fear.' },
      { slug: 'space-maintainers', title: 'Space Maintainers', excerpt: 'Holding the gap when a milk tooth is lost early, so adult teeth come in straight.' },
      { slug: 'growth-habit-management', title: 'Habit & Growth Management', excerpt: 'Help with thumb sucking, mouth breathing and jaw growth at the right age.' },
    ],
  },
  {
    slug: 'periodontics',
    name: 'Periodontics (Gum Care)',
    short: 'Treatment for bleeding gums, bad breath, gum disease and loose teeth.',
    treatments: [
      { slug: 'bleeding-gums-gingivitis', title: 'Bleeding Gums & Gingivitis', excerpt: 'Stopping gum bleeding early, before it loosens the teeth.' },
      { slug: 'deep-cleaning', title: 'Scaling & Deep Cleaning', excerpt: 'Removing tartar above and below the gum line to settle inflammation.' },
      { slug: 'flap-surgery', title: 'Flap Surgery', excerpt: 'Cleaning deep gum pockets surgically when cleaning alone is not enough.' },
      { slug: 'loose-teeth', title: 'Loose Teeth Treatment', excerpt: 'Splinting and gum treatment that can save teeth that have started to move.' },
      { slug: 'bad-breath-treatment', title: 'Bad Breath Treatment', excerpt: 'Finding the cause of persistent bad breath and treating it properly.' },
    ],
  },
  {
    slug: 'oral-surgery',
    name: 'Oral & Maxillofacial Surgery',
    short: 'Painless extractions, wisdom teeth removal and advanced jaw surgery with careful planning and aftercare.',
    treatments: [
      { slug: 'wisdom-teeth-removal', title: 'Wisdom Tooth Removal', excerpt: 'Impacted wisdom teeth removed safely, with clear aftercare.' },
      { slug: 'tooth-extraction', title: 'Tooth Extraction', excerpt: 'Painless removal when a tooth cannot be saved, with options to replace it.' },
      { slug: 'maxillofacial-surgery', title: 'Maxillofacial Surgery', excerpt: 'Jaw cysts, biopsies, facial trauma and corrective jaw surgery.' },
    ],
  },
  {
    slug: 'oral-medicine',
    name: 'Oral Medicine & Diagnosis',
    short: 'Digital X-rays, oral cancer screening and diagnosis of ulcers, lesions and jaw pain.',
    treatments: [
      { slug: 'digital-xray-scans', title: 'Digital X-Rays & Scans', excerpt: 'Chair-side digital imaging with far less radiation than film.' },
      { slug: 'oral-lesions-ulcers', title: 'Ulcers, Lesions & Oral Screening', excerpt: 'Diagnosis of mouth ulcers, white patches and early oral cancer screening.' },
    ],
  },
];

export const communityDentistry = {
  title: 'Community Dentistry',
  body: 'Free dental camps taking check-ups, screenings and oral health awareness to schools, workplaces and villages around Vijayawada.',
};

/** The complaints offered when booking, matching the website's form. */
export const complaints = [
  'Tooth pain',
  'Sensitivity',
  'Bleeding gums',
  'Cavity / decay',
  'Cleaning / scaling',
  'Broken tooth',
  'Missing teeth',
  'Crooked teeth',
  'Bad breath',
  'Swelling',
  'Routine check-up',
  'Child’s dental visit',
];
