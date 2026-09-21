import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiUser } from 'react-icons/fi';
import { api, setToken } from './api';
import { Button, ErrorNote, inputClass } from './ui';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { access_token } = await api.login(form.username.trim(), form.password);
      setToken(access_token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin min-h-screen grid place-items-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center">
          <img src="/images/brand/duhita-logo-sm.png" alt="" className="h-16 w-auto mx-auto" />
          <h1 className="mt-5 text-[26px] font-bold text-white">Duhita Admin</h1>
          <p className="mt-1.5 text-[14px] text-[var(--a-muted)]">Sign in to manage the website</p>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-6">
          <ErrorNote>{error}</ErrorNote>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-[var(--a-muted)]">Username</span>
            <span className="relative block">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={`${inputClass} pl-10`} autoComplete="username" />
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-[var(--a-muted)]">Password</span>
            <span className="relative block">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`${inputClass} pl-10`} autoComplete="current-password" />
            </span>
          </label>
          <Button type="submit" disabled={busy} className="mt-1">{busy ? 'Signing in…' : 'Sign In'}</Button>
        </form>

        <p className="mt-6 text-center text-[12.5px] text-white/30">Duhita Multispeciality Dental Centre · Vijayawada</p>
      </div>
    </div>
  );
}
