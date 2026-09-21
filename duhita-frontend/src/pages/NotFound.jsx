import { Link } from 'react-router-dom';
import useSeo from '../hooks/useSeo';

export default function NotFound() {
  useSeo('Page not found | Duhita Dental', 'The page you are looking for could not be found.');
  return (
    <section className="bg-ivory section-y">
      <div className="container-x text-center">
        <p className="font-display text-[96px] text-slate leading-none">404</p>
        <h1 className="text-[36px] mt-4">We couldn’t find that page</h1>
        <p className="mt-3">It may have moved. Let’s get you back to a healthy smile.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn btn-solid">Go Home</Link>
          <Link to="/services" className="btn btn-outline">View Services</Link>
        </div>
      </div>
    </section>
  );
}
