import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

// Route-level code splitting: the landing page ships on its own, the rest load on demand.
const About = lazy(() => import('./pages/About'));
const Doctor = lazy(() => import('./pages/Doctor'));
const ClinicGallery = lazy(() => import('./pages/ClinicGallery'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Research = lazy(() => import('./pages/Research'));
const Services = lazy(() => import('./pages/Services'));
const ServiceCategory = lazy(() => import('./pages/ServiceCategory'));
const Treatment = lazy(() => import('./pages/Treatment'));
const CommunityDentistry = lazy(() => import('./pages/CommunityDentistry'));
const PatientInfo = lazy(() => import('./pages/PatientInfo'));
const Contact = lazy(() => import('./pages/Contact'));
const Register = lazy(() => import('./pages/Register'));
const BookAppointment = lazy(() => import('./pages/BookAppointment'));
const HomeService = lazy(() => import('./pages/HomeService'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin dashboard (dark theme, its own shell — no public header or footer)
const AdminLogin = lazy(() => import('./admin/Login'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminOverview = lazy(() => import('./admin/Overview'));
const AdminAppointments = lazy(() => import('./admin/Appointments'));
const AdminSchedule = lazy(() => import('./admin/Schedule'));
const AdminPatients = lazy(() => import('./admin/Patients'));
const AdminSettings = lazy(() => import('./admin/Settings'));
const AdminDoctors = lazy(() => import('./admin/Doctors'));
const AdminResearch = lazy(() => import('./admin/Research'));
const AdminGallery = lazy(() => import('./admin/Gallery'));
const AdminFeedback = lazy(() => import('./admin/Feedback'));

const Loading = () => <div className="min-h-[60vh]" aria-busy="true" />;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="patients" element={<AdminPatients />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="research" element={<AdminResearch />} />
            <Route path="gallery/:category" element={<AdminGallery />} />
            <Route path="feedback" element={<AdminFeedback />} />
          </Route>

          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="about/dr-nalluru-sasidhar" element={<Doctor />} />
            <Route path="about/clinic-gallery" element={<ClinicGallery />} />
            <Route path="about/reviews" element={<Reviews />} />
            <Route path="about/our-research" element={<Research />} />
            <Route path="services" element={<Services />} />
            <Route path="services/community-dentistry" element={<CommunityDentistry />} />
            <Route path="services/community-service" element={<Navigate to="/services/community-dentistry" replace />} />
            <Route path="services/:category" element={<ServiceCategory />} />
            <Route path="services/:category/:treatment" element={<Treatment />} />
            <Route path="patient-info" element={<PatientInfo />} />
            <Route path="contact" element={<Contact />} />
            <Route path="patients/register" element={<Register />} />
            <Route path="patients/book-appointment" element={<BookAppointment />} />
            <Route path="home-service" element={<HomeService />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
