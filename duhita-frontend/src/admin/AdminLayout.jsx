import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiCalendar, FiClock, FiUsers, FiUserCheck, FiFileText, FiImage, FiLayers,
  FiCreditCard, FiHeart, FiSettings, FiLogOut, FiExternalLink, FiMenu, FiSearch, FiX, FiVideo,
} from 'react-icons/fi';
import { api, getToken, setToken } from './api';
import { AdminProviders, cx } from './ui';
import useSeo from '../hooks/useSeo';

const GROUPS = [
  {
    label: 'Clinic',
    items: [
      { to: '/admin', label: 'Overview', icon: FiGrid, end: true },
      { to: '/admin/appointments', label: 'Appointments', icon: FiCalendar },
      { to: '/admin/schedule', label: 'Daily Schedule', icon: FiClock },
      { to: '/admin/patients', label: 'Patients', icon: FiUsers },
      { to: '/admin/billing', label: 'Billing', icon: FiCreditCard },
      { to: '/admin/doctors', label: 'Doctors', icon: FiUserCheck },
    ],
  },
  {
    label: 'Website content',
    items: [
      { to: '/admin/gallery/clinic', label: 'Clinic Gallery', icon: FiImage },
      { to: '/admin/gallery/infrastructure', label: 'Infrastructure', icon: FiLayers },
      { to: '/admin/gallery/camps', label: 'Community Dentistry', icon: FiHeart },
      { to: '/admin/feedback', label: 'Patient Feedback', icon: FiVideo },
      { to: '/admin/research', label: 'Research Papers', icon: FiFileText },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/admin/settings', label: 'Settings', icon: FiSettings }],
  },
];

export default function AdminLayout() {
  useSeo('Admin Dashboard | Duhita Dental', undefined, { noindex: true });
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState('');
  const [open, setOpen] = useState(false);

  // Draw nothing until the session is confirmed, so a signed-out visit goes straight to the login page.
  useEffect(() => {
    if (!getToken()) return navigate('/admin/login', { replace: true });
    api.me().then((u) => setUser(u.username)).catch(() => {
      setToken(null);
      navigate('/admin/login', { replace: true });
    });
  }, [navigate]);

  useEffect(() => setOpen(false), [pathname]);

  // Practo's typeface, for the admin only — the public site keeps its own fonts.
  useEffect(() => {
    if (document.getElementById('admin-font')) return;
    const link = Object.assign(document.createElement('link'), {
      id: 'admin-font', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap',
    });
    document.head.appendChild(link);
  }, []);
  // The calendar needs the width: the desktop menu shrinks to an icon rail there, as in Practo.
  const compact = pathname === '/admin/appointments' || /\/invoices\/(new|\d+\/edit)$/.test(pathname)
    || (/^\/admin\/patients(\/|$)/.test(pathname) && !/^\/admin\/patients\/(import|table)$/.test(pathname));

  const signOut = () => {
    setToken(null);
    navigate('/admin/login', { replace: true });
  };

  const nav = (rail, dark = true) => (
    <nav className={cx('py-3 grid gap-5 overflow-y-auto', rail ? 'px-0' : 'px-2')}>
      {GROUPS.map((group) => (
        <div key={group.label}>
          {!rail && (
            <p className={cx('px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em]', dark ? 'text-white/55' : 'text-[var(--a-muted)]')}>
              {group.label}
            </p>
          )}
          <div className="grid">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={rail ? label : undefined} aria-label={rail ? label : undefined}
                className={({ isActive }) =>
                  cx('flex items-center gap-3 text-[14px] transition-colors', rail ? 'justify-center h-[52px]' : 'px-3 h-[40px] rounded-[3px]',
                    dark
                      ? isActive ? 'bg-[var(--a-rail-active)] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                      : isActive ? 'bg-[var(--a-accent-soft)] text-[var(--a-accent)] font-medium' : 'text-[var(--a-text)] hover:bg-black/4')}>
                <Icon className={cx('shrink-0', rail ? 'w-[21px] h-[21px]' : 'w-[17px] h-[17px]')} />
                {!rail && label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const search = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q')?.toString().trim();
    navigate(q ? `/admin/patients?q=${encodeURIComponent(q)}` : '/admin/patients');
  };

  if (!user) return null;

  return (
    <AdminProviders>
      <div className="admin min-h-screen lg:flex bg-white">
        {/* Sidebar — desktop: Practo's indigo rail (icons only on the calendar, labelled elsewhere) */}
        <aside className={cx('hidden lg:flex lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-[var(--a-rail)] text-white', compact ? 'lg:w-[76px]' : 'lg:w-[232px]')}>
          <div className={cx('flex items-center gap-2.5 h-[60px] border-b border-white/10', compact ? 'justify-center' : 'px-4')}>
            <span className="grid place-items-center w-9 h-9 rounded-full bg-white"><img src="/images/brand/duhita-logo-sm.png" alt="" className="h-7 w-auto" /></span>
            {!compact && (
              <span className="leading-tight">
                <span className="block text-[15px] font-medium">Duhita Dental</span>
                <span className="block text-[11.5px] text-white/60">Clinic admin</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">{nav(compact)}</div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out"
            className={cx('flex items-center gap-3 h-[52px] border-t border-white/10 text-[14px] text-white/80 hover:bg-white/10 hover:text-white', compact ? 'justify-center' : 'px-5')}>
            <FiLogOut className="w-[18px] h-[18px]" />{!compact && 'Sign out'}
          </button>
        </aside>

        {/* Top bar — mobile */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 bg-[var(--a-rail)] text-white px-4 h-[56px]">
          <span className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-white"><img src="/images/brand/duhita-logo-sm.png" alt="" className="h-6 w-auto" /></span>
            <span className="text-[15px] font-medium">Duhita Admin</span>
          </span>
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
            className="w-10 h-10 grid place-items-center rounded hover:bg-white/10">
            {open ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </header>

        {open && (
          <div className="lg:hidden fixed inset-x-0 top-[56px] bottom-0 z-40 overflow-y-auto bg-[var(--a-rail)] text-white">
            {nav(false)}
            <div className="px-5 pb-8">
              <button onClick={signOut} className="flex items-center gap-2 text-[14px] text-white/85">
                <FiLogOut /> Sign out of {user}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar — desktop: patient search and the signed-in user, as in Practo */}
          <header className="hidden lg:flex items-center gap-3 h-[60px] px-5 border-b border-[var(--a-border)] bg-white sticky top-0 z-30">
            <form onSubmit={search} className="relative w-[320px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input name="q" placeholder="Search patients" aria-label="Search patients"
                className="w-full h-[38px] rounded-[3px] border border-[#c8c8c8] bg-white pl-9 pr-3 text-[14px] outline-none focus:border-[var(--a-link)]" />
            </form>
            <NavLink to="/admin/patients/import" className="inline-flex items-center h-[38px] px-4 rounded-[3px] border border-[#c8c8c8] text-[14px] text-[var(--a-text)] hover:bg-[#f5f5f5]">
              Import patients
            </NavLink>
            <span className="ml-auto flex items-center gap-2.5 text-[14px] text-[var(--a-muted)]">
              <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[var(--a-text)]"><FiExternalLink className="w-4 h-4" /> Website</a>
              <span className="w-px h-6 bg-[var(--a-border)] mx-1" />
              <span className="w-9 h-9 rounded-full bg-[var(--a-rail)] grid place-items-center text-[14px] font-medium text-white" title={user}>
                {(user || 'A').charAt(0).toUpperCase()}
              </span>
              <span className="text-[var(--a-text)]">{user || '—'}</span>
            </span>
          </header>

          <main className={cx('flex-1 min-w-0', compact ? '' : 'bg-[#f6f6f6] px-4 sm:px-6 lg:px-8 py-6')}>
            <Outlet context={{ user }} />
          </main>
        </div>
      </div>
    </AdminProviders>
  );
}

export function PageHead({ title, subtitle, actions, children }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-7">
      <div className="min-w-0">
        <h1 className="text-[24px] font-normal">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-[var(--a-muted)]">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {actions}
        {children}
        <a href="/" target="_blank" rel="noreferrer"
          className="lg:hidden inline-flex items-center gap-2 rounded-[3px] border border-[#c8c8c8] bg-white px-3 py-2 text-[13px] text-[var(--a-text)] hover:bg-[#f5f5f5]">
          <FiExternalLink className="w-4 h-4" /> Live site
        </a>
      </div>
    </header>
  );
}
