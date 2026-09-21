import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiCalendar, FiClock, FiUsers, FiUserCheck, FiFileText, FiImage, FiLayers,
  FiHeart, FiSettings, FiLogOut, FiExternalLink, FiMenu, FiX,
} from 'react-icons/fi';
import { api, getToken, setToken } from './api';
import { AdminProviders, cx } from './ui';

const GROUPS = [
  {
    label: 'Clinic',
    items: [
      { to: '/admin', label: 'Overview', icon: FiGrid, end: true },
      { to: '/admin/appointments', label: 'Appointments', icon: FiCalendar },
      { to: '/admin/schedule', label: 'Daily Schedule', icon: FiClock },
      { to: '/admin/patients', label: 'Registrations', icon: FiUsers },
      { to: '/admin/doctors', label: 'Doctors', icon: FiUserCheck },
    ],
  },
  {
    label: 'Website content',
    items: [
      { to: '/admin/gallery/clinic', label: 'Clinic Gallery', icon: FiImage },
      { to: '/admin/gallery/infrastructure', label: 'Infrastructure', icon: FiLayers },
      { to: '/admin/gallery/camps', label: 'Dental Camps', icon: FiHeart },
      { to: '/admin/research', label: 'Research Papers', icon: FiFileText },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/admin/settings', label: 'Settings', icon: FiSettings }],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) return navigate('/admin/login', { replace: true });
    api.me().then((u) => setUser(u.username)).catch(() => {});
  }, [navigate]);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = () => {
    setToken(null);
    navigate('/admin/login', { replace: true });
  };

  const nav = (
    <nav className="px-3 py-4 grid gap-6 overflow-y-auto">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">{group.label}</p>
          <div className="grid gap-0.5">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  cx('relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors',
                    isActive
                      ? 'bg-[var(--a-accent-soft)] text-white font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[var(--a-accent)]'
                      : 'text-[var(--a-muted)] hover:bg-white/5 hover:text-[var(--a-text)]')}>
                <Icon className="w-[17px] h-[17px] shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <AdminProviders>
      <div className="admin min-h-screen lg:flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex lg:w-[264px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-[var(--a-border)] bg-[#0e141b]">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--a-border)]">
            <img src="/images/brand/duhita-logo-sm.png" alt="" className="h-9 w-auto" />
            <span className="leading-tight">
              <span className="block text-[14.5px] font-semibold">Duhita Dental</span>
              <span className="block text-[11.5px] text-[var(--a-muted)]">Admin dashboard</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          <div className="border-t border-[var(--a-border)] p-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <span className="w-8 h-8 rounded-full bg-[var(--a-accent)] grid place-items-center text-[13px] font-semibold text-white">
                {(user || 'A').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px]">{user || '—'}</span>
                <span className="block text-[11.5px] text-[var(--a-muted)]">Signed in</span>
              </span>
              <button onClick={signOut} aria-label="Sign out" title="Sign out"
                className="w-8 h-8 grid place-items-center rounded-lg text-[var(--a-muted)] hover:bg-[#f0616d]/15 hover:text-[#ff8a92]">
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Top bar — mobile */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--a-border)] bg-[#0e141b] px-4 py-3">
          <span className="flex items-center gap-2.5">
            <img src="/images/brand/duhita-logo-sm.png" alt="" className="h-8 w-auto" />
            <span className="text-[15px] font-semibold">Duhita Admin</span>
          </span>
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
            className="w-10 h-10 grid place-items-center rounded-lg hover:bg-white/8">
            {open ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </header>

        {open && (
          <div className="lg:hidden fixed inset-x-0 top-[57px] bottom-0 z-40 overflow-y-auto bg-[#0e141b] border-t border-[var(--a-border)]">
            {nav}
            <div className="px-6 pb-8">
              <button onClick={signOut} className="flex items-center gap-2 text-[14px] text-[#ff8a92]">
                <FiLogOut /> Sign out of {user}
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-9 py-6 lg:py-8">
          <Outlet context={{ user }} />
        </main>
      </div>
    </AdminProviders>
  );
}

export function PageHead({ title, subtitle, actions, children }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-7">
      <div className="min-w-0">
        <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-[var(--a-muted)]">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {actions}
        {children}
        <a href="/" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--a-border)] px-3.5 py-2.5 text-[13px] text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-white/5">
          <FiExternalLink className="w-4 h-4" /> Live site
        </a>
      </div>
    </header>
  );
}
