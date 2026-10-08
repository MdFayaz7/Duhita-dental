const loaders = {
  '/about': () => import('../pages/About'),
  '/about/dr-nalluru-sasidhar': () => import('../pages/Doctor'),
  '/about/clinic-gallery': () => import('../pages/ClinicGallery'),
  '/about/reviews': () => import('../pages/Reviews'),
  '/about/our-research': () => import('../pages/Research'),
  '/services': () => import('../pages/Services'),
  '/services/community-dentistry': () => import('../pages/CommunityDentistry'),
  '/patient-info': () => import('../pages/PatientInfo'),
  '/patients/register': () => import('../pages/Register'),
  '/patients/book-appointment': () => import('../pages/BookAppointment'),
  '/home-service': () => import('../pages/HomeService'),
  '/contact': () => import('../pages/Contact'),
  '/account': () => import('../pages/Account'),
  '/assistant': () => import('../pages/Assistant'),
  '/admin': () => Promise.all([import('../admin/AdminLayout'), import('../admin/Overview')]),
  '/admin/login': () => import('../admin/Login'),
  '/admin/appointments': () => import('../admin/Appointments'),
  '/admin/patients': () => import('../admin/Patients'),
  '/admin/schedule': () => import('../admin/Schedule'),
  '/admin/doctors': () => import('../admin/Doctors'),
  '/admin/research': () => import('../admin/Research'),
  '/admin/feedback': () => import('../admin/Feedback'),
};

const preloaded = new Set();

export function preloadRoute(path) {
  if (!path || typeof path !== 'string') return;
  const clean = path.split('?')[0].split('#')[0];
  if (preloaded.has(clean)) return;

  if (loaders[clean]) {
    preloaded.add(clean);
    loaders[clean]().catch(() => {});
    return;
  }

  if (clean.startsWith('/services/')) {
    preloaded.add(clean);
    import('../pages/ServiceCategory').catch(() => {});
    import('../pages/Treatment').catch(() => {});
  }
}
