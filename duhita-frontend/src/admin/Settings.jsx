import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiActivity, FiCheckCircle, FiLock, FiXCircle } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, Field, Panel, inputClass, useToast } from './ui';

export default function Settings() {
  const { user } = useOutletContext();
  const toast = useToast();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(`${api.base}/api/health`).then((r) => r.json()).then(setHealth).catch(() => setHealth({ status: 'down' }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast('Use at least 8 characters.', 'error');
    if (form.password !== form.confirm) return toast('The two passwords do not match.', 'error');
    setBusy(true);
    try {
      await api.changePassword(form.password);
      setForm({ password: '', confirm: '' });
      toast('Password changed. Use it the next time you sign in.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const Status = ({ ok, label }) => (
    <span className={`inline-flex items-center gap-2 text-[14px] ${ok ? 'text-[#5fdac9]' : 'text-[#ff8a92]'}`}>
      {ok ? <FiCheckCircle /> : <FiXCircle />} {label}
    </span>
  );

  return (
    <>
      <PageHead title="Settings" subtitle="Your dashboard account and system status" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <span className="w-10 h-10 grid place-items-center rounded-xl bg-[var(--a-accent-soft)] text-[var(--a-accent)]"><FiLock /></span>
          <h2 className="text-[17px] font-semibold mt-4">Change password</h2>
          <p className="mt-1.5 text-[13.5px] text-[var(--a-muted)]">Signed in as <strong className="text-[var(--a-text)]">{user || '—'}</strong>.</p>
          <form onSubmit={save} className="mt-5 grid gap-4">
            <Field label="New password" hint="At least 8 characters. Use something not reused elsewhere.">
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={inputClass} autoComplete="new-password" />
            </Field>
            <div><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button></div>
          </form>
        </Panel>

        <Panel className="p-6">
          <span className="w-10 h-10 grid place-items-center rounded-xl bg-white/6 text-[var(--a-muted)]"><FiActivity /></span>
          <h2 className="text-[17px] font-semibold mt-4">System status</h2>
          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--a-border)] pb-3">
              <span className="text-[14px] text-[var(--a-muted)]">API server</span>
              <Status ok={health?.status === 'ok'} label={health ? (health.status === 'ok' ? 'Running' : 'Unreachable') : 'Checking…'} />
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[var(--a-border)] pb-3">
              <span className="text-[14px] text-[var(--a-muted)]">Database</span>
              <Status ok={health?.database === 'connected'} label={health?.database === 'connected' ? 'Connected' : 'Not connected'} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[14px] text-[var(--a-muted)]">API address</span>
              <code className="text-[13px] text-[var(--a-text)]">{api.base}</code>
            </div>
          </div>
          <p className="mt-5 text-[12.5px] leading-relaxed text-white/35">
            Sessions last 12 hours. If the dashboard signs you out unexpectedly, the API was restarted or the token expired.
          </p>
        </Panel>
      </div>
    </>
  );
}
