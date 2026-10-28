import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import { api } from '../api';
import { Button, ErrorNote, Field, Modal, Skeleton, cx, inputClass, useConfirm, useToast } from '../ui';
import { useLiveEvents } from '../../lib/useLiveEvents';
import { escapeHtml, printHtml } from './shared';
import { longDate } from '../billingUi';
import { PractoImport } from './PractoRecord';

const LISTS = [['all', 'All Patients'], ['recently_visited', 'Recently Visited'], ['recent', 'Recently Added']];
const SMART = [['female', 'All Female Customers'], ['male', 'All Male Customers'], ['female_over_30', 'Female Customers Over 30'], ['female_under_30', 'Female Customers Under 30']];
const PAGE = 40;

export default function PatientList() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const [group, setGroup] = useState(params.get('list') === 'practo' ? 'practo' : 'recently_visited');
  const practo = group === 'practo';
  const [practoStats, setPractoStats] = useState(null);
  const practoCount = practoStats?.patients;
  const [q, setQ] = useState('');
  const [counts, setCounts] = useState(null);
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'merge' | 'label'

  const load = useCallback(async (skip = 0) => {
    try {
      const params = { limit: PAGE, skip, ...(q.trim() ? { q: q.trim() } : {}) };
      if (!practo) params.sort = 'newest';
      if (!practo && !q.trim() && !['all', 'recent'].includes(group)) params.group = group;
      const res = await (practo ? api.practoPatients(params) : api.patients(params));
      setItems((prev) => (skip ? [...(prev || []), ...res.items] : res.items));
      setTotal(res.total);
      setError('');
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }, [group, q, practo]);

  useEffect(() => {
    const t = setTimeout(() => load(0), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const loadCounts = () => {
    api.patientGroups().then(setCounts).catch(() => {});
    api.practoSummary().then(setPractoStats).catch(() => {});
  };
  useEffect(() => { loadCounts(); }, []);
  useLiveEvents((e) => ['patient_registered', 'patient_deleted', 'patient_updated'].includes(e.type) && (load(0), loadCounts()));

  const clearPracto = async () => {
    const ok = await confirm({
      title: 'Delete all Practo data',
      message: `This removes all ${practoCount} Practo patients and their imported treatments, invoices and payments. Your clinic's own patients, appointments and bills are not touched. This can't be undone.`,
      confirmLabel: 'Delete Practo data', tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.practoClear();
      toast('Practo data deleted');
      setItems([]);
      loadCounts();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const pick = (g) => { setGroup(g); setQ(''); setItems(null); };
  const open = (p) => navigate(practo ? `/admin/patients/practo/${p.number}` : `/admin/patients/${p.patient_id}`);
  const groupBtn = (id, label, count) => (
    <button key={id} onClick={() => pick(id)}
      className={cx('flex w-full items-center justify-between rounded-[2px] px-2.5 py-[6px] text-left text-[13px]', group === id && (!q || id === 'practo') ? 'bg-[#1aa0e0] text-white' : 'text-[#333] hover:bg-black/5')}>
      {label}{count != null && <span className="rounded-full bg-[#777] px-2 text-[11px] font-medium text-white">{count}</span>}
    </button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#d8d8d8] bg-white px-3 py-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Patient Name / Id / Phone" className={cx(inputClass, '!h-[32px] w-[260px]')} />
        <span className="ml-auto" />
        {practo && <Button size="sm" variant="secondary" onClick={() => setModal('practo')}>Import Practo data</Button>}
        {practo && practoCount > 0 && <Button size="sm" variant="danger" onClick={clearPracto}>Delete Practo data</Button>}
        <Button size="sm" variant="secondary" onClick={() => setModal('label')}>Print Label</Button>
        <Button size="sm" variant="secondary" onClick={() => setModal('merge')}>Merge Patients</Button>
        <Button size="sm" className="!bg-[#1a73e8] !border-[#1a73e8]" onClick={() => setModal('add')}>Add New Patient</Button>
      </div>
      <div className="flex flex-col md:flex-row">
        <aside className="md:w-[300px] shrink-0 border-r border-[#d8d8d8] bg-[#e4e4e4] p-2">
          <h3 className="px-1 pt-1 text-[22px] font-light text-[#6a8a2f]">Patients</h3>
          <div className="mt-1 grid gap-0.5">
            {LISTS.map(([id, label]) => groupBtn(id, label, id === 'all' ? counts?.all : null))}
          </div>
          <h3 className="px-1 pt-5 text-[22px] font-light text-[#6a8a2f]">Practo</h3>
          <div className="mt-1 grid gap-0.5">{groupBtn('practo', 'Practo Patients', practoCount)}</div>
          <p className="px-1 pt-1 text-[11.5px] text-[#888]">
            History exported from Practo under Practo’s own patient numbers{practoStats ? ` — ${practoStats.with_history} have treatments, bills or payments and are listed first` : ''}.
          </p>
          <h3 className="px-1 pt-5 text-[22px] font-light text-[#6a8a2f]">Groups</h3>
          <p className="px-1 pt-2 text-[11.5px] text-[#6a8a2f]">Smart Groups</p>
          <div className="mt-1 grid gap-0.5">{SMART.map(([id, label]) => groupBtn(id, label, counts?.[id]))}</div>
          <p className="px-1 pt-4 text-[11.5px] text-[#888]">Families (same mobile number) show on each patient’s profile. <Link to="/admin/patients/import" className="text-[#1a9ad6]">Import from Practo</Link> · <Link to="/admin/patients/table" className="text-[#1a9ad6]">Table view</Link></p>
        </aside>
        <section className="min-w-0 flex-1 bg-white p-3">
          <ErrorNote>{error}</ErrorNote>
          {!items ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[80px]" />)}</div>
          ) : !items.length ? (
            <p className="p-6 text-center text-[14px] text-[#777]">
              No patients here{q ? ` for “${q}”` : ''}.
              {practo && !q && <><br /><button onClick={() => setModal('practo')} className="mt-2 text-[#1a9ad6] underline">Import the Practo exports</button></>}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {items.map((p) => (
                  <button key={p.patient_id || `p${p.number}`} onClick={() => open(p)}
                    className="flex min-w-0 border border-[#d5d5d5] bg-white text-left hover:border-[#1a9ad6] hover:shadow-sm">
                    <span className="grid w-[78px] shrink-0 place-items-center bg-gradient-to-b from-[#c9c9c9] to-[#9a9a9a] text-white"><FiUser className="w-10 h-10" /></span>
                    <span className="min-w-0 px-2 py-1.5 text-[12.5px] leading-[1.45] text-[#333]">
                      <span className="block truncate text-[13px] font-semibold uppercase">{p.name}</span>
                      <span className="block">{(p.sex ?? p.gender) || '\u00a0'}</span>
                      <span className="block">{(p.phone ?? p.mobile) ? `+91${p.phone ?? p.mobile}` : '\u00a0'}</span>
                      <span className="block">{practo ? <>{p.number.startsWith('NA-') ? 'No Practo number' : `Practo # ${p.number}`}<span className={cx('block', p.records ? 'text-[#1a9ad6]' : 'text-[#aaa]')}>{p.records ? `${p.records} records · ${longDate(p.last_visit)}` : 'No history in export'}</span></> : <># {p.patient_id}{p.family_size > 1 && <span className="ml-1 text-[#1a9ad6]">· family {p.family_size}</span>}</>}</span>
                    </span>
                  </button>
                ))}
              </div>
              {items.length < total && (
                <div className="py-4 text-center"><Button size="sm" onClick={() => load(items.length)} className="!bg-[#2aa7c9] !border-[#2aa7c9]">Get More Patients</Button></div>
              )}
            </>
          )}
        </section>
      </div>
      <AddPatient open={modal === 'add'} onClose={() => setModal(null)} onSaved={(id) => navigate(`/admin/patients/${id}`)} />
      <MergePatients open={modal === 'merge'} onClose={() => setModal(null)} onDone={() => { setModal(null); load(0); loadCounts(); }} />
      <PrintLabel open={modal === 'label'} onClose={() => setModal(null)} />
      <PractoImport open={modal === 'practo'} onClose={() => setModal(null)} onDone={() => { setModal(null); pick('practo'); loadCounts(); }} />
    </>
  );
}

/** Find one patient by ID / name / phone (first match list). */
function PatientPicker({ label, value, onChange }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => api.patients({ q: q.trim(), limit: 8 }).then((r) => setHits(r.items)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Field label={label}>
      {value ? (
        <div className="flex items-center justify-between rounded-[2px] border border-[#c8c8c8] px-3 py-2 text-[13.5px]">
          <span><b className="uppercase">{value.name}</b> · {value.patient_id}{value.phone ? ` · ${value.phone}` : ''}</span>
          <button onClick={() => onChange(null)} className="text-[#1a9ad6] text-[13px]">Change</button>
        </div>
      ) : (
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, patient ID or mobile" className={inputClass} />
          {hits.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-[#ccc] bg-white shadow">
              {hits.map((h) => (
                <button key={h.patient_id} onClick={() => { onChange(h); setQ(''); }} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f1f6fa]">
                  <span className="uppercase">{h.name}</span> <span className="text-[#777]">· {h.patient_id} · {h.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Field>
  );
}

function MergePatients({ open, onClose, onDone }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [keep, setKeep] = useState(null);
  const [remove, setRemove] = useState(null);
  const merge = async () => {
    const ok = await confirm({
      title: 'Merge patients',
      message: `Everything of ${remove.name} (${remove.patient_id}) — appointments, notes, bills, files — moves to ${keep.name} (${keep.patient_id}), and ${remove.patient_id} is deleted. This can't be undone.`,
      confirmLabel: 'Merge', tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.mergePatients(keep.patient_id, remove.patient_id);
      toast(`Merged into ${keep.patient_id}`);
      setKeep(null); setRemove(null);
      onDone();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <Modal open={open} title="Merge Patients" subtitle="For duplicate records of the same person" onClose={onClose}>
      <div className="grid gap-4">
        <PatientPicker label="Keep this record" value={keep} onChange={setKeep} />
        <PatientPicker label="Merge and delete this duplicate" value={remove} onChange={setRemove} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={merge} disabled={!keep || !remove || keep.patient_id === remove.patient_id}>Merge</Button>
        </div>
      </div>
    </Modal>
  );
}

function PrintLabel({ open, onClose }) {
  const [p, setP] = useState(null);
  const print = () => {
    printHtml(`Label ${p.patient_id}`, `<div style="font-size:15px"><b>${escapeHtml(p.name.toUpperCase())}</b></div>
      <div>ID: <b>${escapeHtml(p.patient_id)}</b></div><div>${escapeHtml([p.sex, p.age != null ? `${p.age} yrs` : ''].filter(Boolean).join(', '))}</div>
      <div>${p.phone ? `+91 ${escapeHtml(p.phone)}` : ''}</div>`, { label: true });
  };
  return (
    <Modal open={open} title="Print Label" onClose={onClose}>
      <div className="grid gap-4">
        <PatientPicker label="Patient" value={p} onChange={setP} />
        <div className="flex justify-end"><Button onClick={print} disabled={!p}>Print</Button></div>
      </div>
    </Modal>
  );
}

const BLANK = { name: '', phone: '', age: '', sex: 'Female', address: '', email: '', complaint: '' };

export function AddPatient({ open, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.addPatient({
        name: f.name.trim(), phone: f.phone.trim(), age: Number(f.age), sex: f.sex, address: f.address.trim() || 'Not given',
        email: f.email.trim() || null, complaint: f.complaint.trim() || 'Registered at the clinic', referral: 'clinic',
      });
      toast(`Patient ${res.patient_id} added`);
      setF(BLANK);
      onClose();
      onSaved(res.patient_id);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} title="Add New Patient" onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><input required minLength={2} value={f.name} onChange={set('name')} className={inputClass} /></Field>
        <Field label="Mobile"><input required pattern="[6-9][0-9]{9}" value={f.phone} onChange={set('phone')} placeholder="10 digits" className={inputClass} /></Field>
        <Field label="Age"><input required type="number" min="0" max="120" value={f.age} onChange={set('age')} className={inputClass} /></Field>
        <Field label="Gender">
          <select value={f.sex} onChange={set('sex')} className={inputClass}><option>Female</option><option>Male</option><option>Other</option></select>
        </Field>
        <Field label="Email"><input type="email" value={f.email} onChange={set('email')} className={inputClass} /></Field>
        <Field label="Address" className="sm:col-span-2"><input value={f.address} onChange={set('address')} className={inputClass} /></Field>
        <Field label="Chief complaint" className="sm:col-span-2"><input value={f.complaint} onChange={set('complaint')} className={inputClass} /></Field>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}
