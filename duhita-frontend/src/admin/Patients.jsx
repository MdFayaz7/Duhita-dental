import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiCalendar, FiDownload, FiFile, FiImage, FiPhone, FiPlus, FiRefreshCw, FiTrash2, FiUpload, FiUser, FiUsers,
} from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import {
  Button, Drawer, EmptyState, ErrorNote, Field, IconButton, Modal, Panel, SearchInput, Segmented,
  Skeleton, StatusPill, Table, exportCsv, formatDateTime, formatSlot, inputClass, todayIso, useConfirm, useToast,
} from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';

const RECORD_KINDS = [
  { id: 'prescription', label: 'Prescription' },
  { id: 'xray', label: 'X-ray / scan' },
  { id: 'report', label: 'Report' },
  { id: 'note', label: 'Note' },
];

const SOURCES = { practo: 'Imported from Practo', website: 'Website', app: 'Patient app', clinic: 'Front desk' };
const ageSex = (p) => [p.age != null ? `${p.age}` : null, p.sex].filter(Boolean).join(' · ') || '—';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'By name' },
];

const CONDITION_LABELS = {
  diabetes: 'Diabetes', htn: 'Hypertension (BP)', cardiac: 'Cardiac', resp: 'Respiratory',
  allergy: 'Allergy', gi: 'Gastro-intestinal', bleeding: 'Bleeding disorder', thyroid: 'Thyroid',
  renal: 'Renal', drugs: 'Regular medicines', others: 'Other', none: 'No known conditions',
};

export default function Patients() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => { if (params.get('q') != null) setQ(params.get('q')); }, [params]);
  const [sort, setSort] = useState('newest');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { sort, limit: 100, ...(q ? { q } : {}), ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}) };
      setData(await api.patients(params));
    } catch (e) {
      setError(e.message);
      setData({ items: [], total: 0 });
    }
  }, [q, sort, from, to]);

  useLiveEvents((event) => {
    if (['patient_registered', 'patient_deleted', 'record_updated'].includes(event.type)) {
      load();
    }
  });

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    const interval = setInterval(() => {
      if (!selected && !q && document.visibilityState === 'visible') {
        load();
      }
    }, 5000);

    const onFocus = () => { if (!selected) load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load, q, selected]);

  const open = async (row) => {
    setSelected({ patient: row, appointments: null, records: null });
    try {
      setSelected(await api.patient(row.patient_id));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const reloadSelected = async () => {
    if (!selected?.patient) return;
    try {
      setSelected(await api.patient(selected.patient.patient_id));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: 'Delete registration',
      message: `Delete ${row.name} (${row.patient_id})? Their medical history will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deletePatient(row.patient_id);
      toast('Registration deleted');
      setSelected(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const download = () =>
    exportCsv(`duhita-registrations-${todayIso()}.csv`,
      (data?.items || []).map((p) => ({
        'Patient ID': p.patient_id, 'Practo no.': p.practo_id || '', Name: p.name, Age: p.age ?? '', Sex: p.sex || '', Phone: p.phone,
        'Other mobile': p.alt_phone || '', Email: p.email || '', 'Family size': p.family_size,
        Address: p.address, Profession: p.profession || '', Reference: p.referral || '',
        'Medical history': (p.conditions || []).map((c) => CONDITION_LABELS[c] || c).join('; '),
        Complaint: p.complaint, 'Registered on': formatDateTime(p.created_at),
      })));

  const items = data?.items;

  return (
    <>
      <PageHead
        title="Patients"
        subtitle={data ? `${data.total.toLocaleString('en-IN')} patient${data.total === 1 ? '' : 's'} — website, app, front desk and Practo` : 'Loading…'}
        actions={
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:inline-flex items-center gap-2 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Live</span>
            </div>
            <Button variant="secondary" onClick={() => load()}>
              <FiRefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button variant="secondary" onClick={download} disabled={!items?.length}>
              <FiDownload /> Export CSV
            </Button>
            <Link to="/admin/patients/import" className="inline-flex items-center gap-2 rounded bg-[var(--a-accent)] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--a-accent-hover)]">
              <FiUpload /> Import from Practo
            </Link>
          </div>
        }
      />
      <ErrorNote>{error}</ErrorNote>

      <Panel className="p-4 sm:p-5 flex flex-wrap items-end gap-4">
        <Field label="Search" className="flex-1 min-w-[220px]">
          <SearchInput value={q} onChange={setQ} placeholder="Name, mobile, patient ID or Practo number" />
        </Field>
        <Field label="Registered from"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} /></Field>
        <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} /></Field>
        <Field label="Sort"><Segmented options={SORTS} value={sort} onChange={setSort} /></Field>
        {(from || to || q) && <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setQ(''); }}>Clear filters</Button>}
      </Panel>

      <Panel className="mt-5 overflow-hidden">
        {items === undefined ? (
          <div className="p-5 grid gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={FiUsers} title="No patients found." hint="Website and app registrations appear here; bring in the clinic's existing patients with “Import from Practo”." />
        ) : (
          <>
            <div className="hidden md:block">
              <Table head={['Patient', 'Age / sex', 'Phone', 'Chief complaint', 'Medical history', 'Registered on', '']} minWidth={980}>
                {items.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-black/3" onClick={() => open(p)}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[12.5px] text-[var(--a-muted)]">{p.patient_id}{p.practo_id ? ` · Practo ${p.practo_id}` : ''}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{ageSex(p)}</td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      {p.phone ? <a href={`tel:+91${p.phone}`} className="text-[#1a9ad6] hover:underline">+91 {p.phone}</a> : <span className="text-[var(--a-muted)]">—</span>}
                      {p.family_size > 1 && <FamilyBadge size={p.family_size} />}
                    </td>
                    <td className="px-5 py-4 max-w-[220px] truncate text-[var(--a-muted)]">{p.complaint || '—'}</td>
                    <td className="px-5 py-4 text-[12.5px] text-[var(--a-muted)]">
                      {(p.conditions || []).filter((c) => c !== 'none').length
                        ? `${p.conditions.filter((c) => c !== 'none').length} condition(s)`
                        : 'None reported'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-[13px]">{formatDateTime(p.created_at)}</td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end">
                        <IconButton label="Delete" tone="danger" onClick={() => remove(p)}><FiTrash2 /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            <ul className="md:hidden divide-y divide-[var(--a-border)]">
              {items.map((p) => (
                <li key={p.id}>
                  <button onClick={() => open(p)} className="w-full p-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-[12.5px] text-[var(--a-muted)]">{p.patient_id} · {ageSex(p)}</p>
                        {p.family_size > 1 && <FamilyBadge size={p.family_size} />}
                      </div>
                      <span className="text-[12px] text-[var(--a-muted)] whitespace-nowrap">{formatDateTime(p.created_at)}</span>
                    </div>
                    {p.complaint && <p className="mt-2 text-[13.5px] text-[var(--a-muted)] line-clamp-2">{p.complaint}</p>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <PatientDrawer data={selected} onClose={() => setSelected(null)} onDelete={remove} onRecordsChanged={reloadSelected} onOpen={open} />
    </>
  );
}

const FamilyBadge = ({ size }) => (
  <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-[#7f56d9]/18 px-2 py-0.5 text-[11.5px] text-[#6941c6]" title="Patients sharing this mobile number">
    <FiUsers className="w-3 h-3" /> Family of {size}
  </span>
);

function PatientDrawer({ data, onClose, onDelete, onRecordsChanged, onOpen }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [addingRecord, setAddingRecord] = useState(false);
  const p = data?.patient;
  if (!p) return null;
  const conditions = (p.conditions || []).filter((c) => c !== 'none');

  const removeRecord = async (r) => {
    const ok = await confirm({
      title: 'Delete record',
      message: `Delete "${r.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deletePatientRecord(p.patient_id, r.id);
      toast('Record deleted');
      onRecordsChanged();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const Row = ({ label, value }) => (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 border-b border-[var(--a-border)] text-[14px]">
      <span className="text-[var(--a-muted)]">{label}</span>
      <span className="break-words">{value || '—'}</span>
    </div>
  );

  return (
    <Drawer open={!!p} title={p.name} subtitle={`${p.patient_id} · registered ${formatDateTime(p.created_at)}`} onClose={onClose}>
      <div className="flex gap-2 mb-5">
        {p.phone && <a href={`tel:+91${p.phone}`} className="inline-flex items-center gap-2 rounded bg-[var(--a-accent)] px-4 py-2.5 text-[14px] text-white"><FiPhone className="w-4 h-4" /> Call</a>}
        <Button variant="danger" onClick={() => onDelete(p)}><FiTrash2 /> Delete</Button>
      </div>

      <section>
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-1">Patient</h3>
        <Row label="Age / sex" value={ageSex(p)} />
        {p.dob && <Row label="Date of birth" value={p.dob} />}
        <Row label="Phone" value={p.phone ? `+91 ${p.phone}` : ''} />
        {p.alt_phone && <Row label="Other mobile" value={`+91 ${p.alt_phone}`} />}
        {p.email && <Row label="Email" value={p.email} />}
        {p.blood_group && <Row label="Blood group" value={p.blood_group} />}
        <Row label="Address" value={p.address} />
        <Row label="Profession" value={p.profession} />
        <Row label="Reference" value={[p.referral, p.referral_name].filter(Boolean).join(' — ')} />
        {p.pregnant && <Row label="Pregnancy" value={p.pregnant} />}
        {p.practo_id && <Row label="Practo no." value={p.practo_id} />}
        {p.practo_notes && <Row label="Practo notes" value={p.practo_notes} />}
        {p.source && <Row label="Added via" value={SOURCES[p.source] || p.source} />}
      </section>

      {data.family?.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Family on this mobile number</h3>
          <ul className="grid gap-2">
            {data.family.map((f) => (
              <li key={f.patient_id}>
                <button onClick={() => onOpen(f)} className="w-full flex items-center justify-between gap-3 rounded bg-black/3 px-4 py-3 text-left text-[13.5px] hover:bg-black/5">
                  <span className="flex items-center gap-2"><FiUser className="w-3.5 h-3.5 text-[var(--a-muted)]" /> {f.name}</span>
                  <span className="text-[12px] text-[var(--a-muted)]">{f.patient_id}{f.age != null ? ` · ${f.age}y` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Medical history</h3>
        {conditions.length === 0 ? (
          <p className="text-[14px] text-[var(--a-muted)]">No conditions reported.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <span key={c} className="rounded-full border border-[#b7701a]/25 bg-[#b7701a]/12 px-3 py-1.5 text-[12.5px] text-[#b7701a]">
                {CONDITION_LABELS[c] || c}
                {p.condition_notes?.[c] ? `: ${p.condition_notes[c]}` : ''}
              </span>
            ))}
          </div>
        )}
      </section>

      {p.complaint && (
        <section className="mt-6">
          <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Chief complaint</h3>
          <p className="rounded bg-black/3 p-4 text-[14px] leading-relaxed">{p.complaint}</p>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Appointments</h3>
        {data.appointments === null ? <Skeleton className="h-12" />
          : data.appointments?.length ? (
            <ul className="grid gap-2">
              {data.appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded bg-black/3 px-4 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2"><FiCalendar className="w-3.5 h-3.5 text-[var(--a-muted)]" /> {a.date} · {formatSlot(a.slot)}</span>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-[var(--a-muted)] flex items-center gap-2"><FiUser className="w-4 h-4" /> No appointments booked yet.</p>}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)]">Records &amp; documents</h3>
          <Button size="sm" variant="secondary" onClick={() => setAddingRecord(true)}><FiPlus /> Add record</Button>
        </div>
        {data.records === null ? <Skeleton className="h-12" />
          : data.records?.length ? (
            <ul className="grid gap-2">
              {data.records.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded bg-black/3 px-4 py-3 text-[13.5px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.title}</p>
                    <p className="text-[12px] text-[var(--a-muted)]">
                      {RECORD_KINDS.find((k) => k.id === r.kind)?.label || r.kind} · {r.date}
                    </p>
                  </div>
                  {r.file && (
                    <a href={api.url(r.file)} target="_blank" rel="noreferrer" className="text-[var(--a-accent)] shrink-0" aria-label="View file">
                      {r.file_type === 'image' ? <FiImage className="w-4 h-4" /> : <FiFile className="w-4 h-4" />}
                    </a>
                  )}
                  <IconButton label="Delete record" tone="danger" onClick={() => removeRecord(r)} className="shrink-0"><FiTrash2 className="w-4 h-4" /></IconButton>
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-[var(--a-muted)]">No records added yet.</p>}
      </section>

      <RecordModal open={addingRecord} patientId={p.patient_id} onClose={() => setAddingRecord(false)}
        onSaved={() => { setAddingRecord(false); onRecordsChanged(); }} />
    </Drawer>
  );
}

function RecordModal({ open, patientId, onClose, onSaved }) {
  const toast = useToast();
  const blank = { kind: 'report', title: '', notes: '', date: '' };
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (open) { setForm(blank); setFile(null); setError(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 2) return setError('Please give this record a name.');
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('kind', form.kind);
      fd.append('title', form.title.trim());
      if (form.notes.trim()) fd.append('notes', form.notes.trim());
      if (form.date) fd.append('date', form.date);
      if (file) fd.append('file', file);
      await api.addPatientRecord(patientId, fd);
      toast('Record added');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Add a record" subtitle={patientId} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Type">
          <select value={form.kind} onChange={set('kind')} className={inputClass}>
            {RECORD_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Name"><input required value={form.title} onChange={set('title')} placeholder="OPG X-ray, blood report…" className={inputClass} /></Field>
        <Field label="Date" hint="Defaults to today if left blank"><input type="date" value={form.date} onChange={set('date')} className={inputClass} /></Field>
        <Field label="Notes (optional)"><textarea rows={3} value={form.notes} onChange={set('notes')} className={inputClass} /></Field>
        <Field label="Attach a file (optional)">
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-[13.5px] text-[var(--a-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-black/6 file:px-3.5 file:py-2 file:text-[13px] file:font-semibold file:text-[var(--a-text)]" />
        </Field>
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : 'Save record'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
