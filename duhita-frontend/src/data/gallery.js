/**
 * Home-page galleries.
 * The photo lists come straight from /public/images/gallery/clinic and /camps —
 * add or delete files there and the sliders update automatically (see vite.config.js).
 * Full-resolution originals are kept in /original-photos/gallery/.
 */
import { clinicFiles, campFiles } from 'virtual:gallery';
import { apiFileUrl, useLiveList } from '../lib/content';

/** Optional captions, keyed by file name. Anything not listed falls back to the default below. */
export const captions = {
  'clinic-01.jpg': 'Treatment room with digital imaging setup',
  'clinic-02.jpg': 'Dental chair with chair-side monitor',
  'clinic-03.jpg': 'Consultation and treatment room',
  'clinic-04.jpg': 'Guests at the clinic opening',
  'clinic-05.jpg': 'Family and guests at the inauguration',
  'clinic-06.jpg': 'Treatment room on opening day',
  'clinic-07.jpg': 'Fully equipped dental operatory',
  'clinic-08.jpg': 'Dental chair with overhead light and monitor',
  'clinic-09.jpg': 'Treatment bay at Duhita Dental',
  'clinic-10.jpg': 'Ribbon cutting at the clinic inauguration',
  'clinic-11.jpg': 'Lamp lighting ceremony at the opening',
  'clinic-12.jpg': 'Felicitating a senior guest',
  'clinic-13.jpg': 'Honouring guests at the inauguration',
  'clinic-14.jpg': 'Guests at the opening ceremony',
  'clinic-15.jpg': 'Group photograph with invitees',
  'clinic-16.jpg': 'Felicitation with a traditional shawl',
  'clinic-17.jpg': 'Families at the clinic opening',
  'clinic-18.jpg': 'Guests touring the new clinic',
  'clinic-19.jpg': 'Visitors in the treatment area',
  'clinic-20.jpg': 'Consultation at the clinic',

  'camp-01.jpg': 'Felicitation at a free dental camp for police personnel',
  'camp-02.jpg': 'Honouring officers at a departmental dental camp',
  'camp-03.jpg': 'The Duhita team at an outdoor dental camp',
  'camp-04.jpg': 'Camp inauguration with department officials',
  'camp-05.jpg': 'Addressing participants at a free dental camp',
  'camp-06.jpg': 'Dental screening at a free camp',
  'camp-07.jpg': 'Duhita dentists examining patients at a camp',
  'camp-08.jpg': 'Check-up at a community dental camp',
  'camp-09.jpg': 'Free dental check-up in progress',
  'camp-10.jpg': 'Registration desk at a free dental camp',
  'camp-11.jpg': 'Screening patients at a workplace camp',
  'camp-12.jpg': 'Dental examination at a community camp',
  'camp-13.jpg': 'Consultation during a free dental camp',
  'camp-14.jpg': 'Patient consultation with our dentist at a camp',
  'camp-15.jpg': 'Oral health advice at a community camp',
  'camp-16.jpg': 'Employee dental camp screening',
  'camp-17.jpg': 'Examining a patient at an employee dental camp',
  'camp-18.jpg': 'Dental check-up at an EHS camp',
  'camp-19.jpg': 'Duhita dentists at a staff dental camp',
  'camp-20.jpg': 'Screening and counselling at a staff camp',
  'camp-21.jpg': 'Free dental check-up at a departmental camp',
};

export const fallback = {
  clinic: 'Duhita Multispeciality Dental Centre, Vijayawada',
  infrastructure: 'Inside Duhita Multispeciality Dental Centre, Vijayawada',
  camps: 'Free dental camp by Duhita Dental, Vijayawada',
};

const build = (files, folder, category) =>
  files.map((file) => ({
    src: `/images/gallery/${folder}/${encodeURIComponent(file)}`,
    category,
    caption: captions[file] || fallback[category],
  }));

/** First 8 clinic photos go to About → Our Infrastructure; the rest fill the Clinic Gallery page. */
const GALLERY_COUNT = 8;

export const galleryImages = [
  ...build(clinicFiles.slice(0, GALLERY_COUNT), 'clinic', 'infrastructure'),
  ...build(clinicFiles.slice(GALLERY_COUNT), 'clinic', 'clinic'),
  ...build(campFiles, 'camps', 'camps'),
];

/** Gallery photos managed in the admin dashboard, with the built-in set as fallback. */
export function useGalleryImages(category) {
  return useLiveList(
    `/api/gallery?category=${category}`,
    (img) => ({
      src: apiFileUrl(img.src),
      category,
      caption: img.caption || captions[img.source_name] || fallback[category],
    }),
    galleryImages.filter((g) => g.category === category),
  );
}
