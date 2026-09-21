import { useCallback, useEffect, useState } from 'react';
import { FiCalendar, FiDownload, FiPhone, FiTrash2, FiUser, FiUsers } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import {
  Button, Drawer, EmptyState, ErrorNote, Field, IconButton, Panel, SearchInput, Segmented, Skeleton,
  StatusPill, Table, exportCsv, formatDateTime, formatSlot, inputClass, todayIso, useConfirm, useToast,
} from './ui';

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
  const [q, setQ] = useState('');
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

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const open = async (row) => {
    setSelected({ patient: row, appointments: null });
    try {
      setSelected(await api.patient(row.patient_id));
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
        'Patient ID': p.patient_id, Name: p.name, Age: p.age, Sex: p.sex, Phone: p.phone,
        Address: p.address, Profession: p.profession || '', Reference: p.referral || '',
        'Medical history': (p.conditions || []).map((c) => CONDITION_LABELS[c] || c).join('; '),
        Complaint: p.complaint, 'Registered on': formatDateTime(p.created_at),
      })));

  const items = data?.items;

  return (
    <>
      <PageHead
        title="Patient Registrations"
        subtitle={data ? `${data.total} registration${data.total === 1 ? '' : 's'} from the website` : 'Loading…'}
        actions={<Button variant="secondary" onClick={download} disabled={!items?.length}><FiDownload /> Export CSV</Button>}
      />
      <ErrorNote>{error}</ErrorNote>

      <Panel className="p-4 sm:p-5 flex flex-wrap items-end gap-4">
        <Field label="Search" className="flex-1 min-w-[220px]">
          <SearchInput value={q} onChange={setQ} placeholder="Name, phone or patient ID" />
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
          <EmptyState icon={FiUsers} title="No registrations found." hint="Patients who fill the registration form on the website appear here." />
        ) : (
          <>
            <div className="hidden md:block">
              <Table head={['Patient', 'Age / sex', 'Phone', 'Chief complaint', 'Medical history', 'Registered on', '']} minWidth={980}>
                {items.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-white/3" onClick={() => open(p)}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[12.5px] text-[var(--a-muted)]">{p.patient_id}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{p.age} · {p.sex}</td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <a href={`tel:+91${p.phone}`} className="text-[var(--a-accent)] hover:underline">+91 {p.phone}</a>
                    </td>
                    <td className="px-5 py-4 max-w-[220px] truncate text-[var(--a-muted)]">{p.complaint}</td>
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
                        <p className="text-[12.5px] text-[var(--a-muted)]">{p.patient_id} · {p.age} {p.sex}</p>
                      </div>
                      <span className="text-[12px] text-[var(--a-muted)] whitespace-nowrap">{formatDateTime(p.created_at)}</span>
                    </div>
                    <p className="mt-2 text-[13.5px] text-[var(--a-muted)] line-clamp-2">{p.complaint}</p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <PatientDrawer data={selected} onClose={() => setSelected(null)} onDelete={remove} />
    </>
  );
}

function PatientDrawer({ data, onClose, onDelete }) {
  const p = data?.patient;
  if (!p) return null;
  const conditions = (p.conditions || []).filter((c) => c !== 'none');

  const Row = ({ label, value }) => (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 border-b border-[var(--a-border)] text-[14px]">
      <span className="text-[var(--a-muted)]">{label}</span>
      <span className="break-words">{value || '—'}</span>
    </div>
  );

  return (
    <Drawer open={!!p} title={p.name} subtitle={`${p.patient_id} · registered ${formatDateTime(p.created_at)}`} onClose={onClose}>
      <div className="flex gap-2 mb-5">
        <a href={`tel:+91${p.phone}`} className="inline-flex items-center gap-2 rounded-xl bg-[var(--a-accent)] px-4 py-2.5 text-[14px] text-white"><FiPhone className="w-4 h-4" /> Call</a>
        <Button variant="danger" onClick={() => onDelete(p)}><FiTrash2 /> Delete</Button>
      </div>

      <section>
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-1">Patient</h3>
        <Row label="Age / sex" value={`${p.age} years · ${p.sex}`} />
        <Row label="Phone" value={`+91 ${p.phone}`} />
        <Row label="Address" value={p.address} />
        <Row label="Profession" value={p.profession} />
        <Row label="Reference" value={[p.referral, p.referral_name].filter(Boolean).join(' — ')} />
        {p.pregnant && <Row label="Pregnancy" value={p.pregnant} />}
      </section>

      <section className="mt-6">
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Medical history</h3>
        {conditions.length === 0 ? (
          <p className="text-[14px] text-[var(--a-muted)]">No conditions reported.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <span key={c} className="rounded-full border border-[#f2b356]/25 bg-[#f2b356]/12 px-3 py-1.5 text-[12.5px] text-[#f2b356]">
                {CONDITION_LABELS[c] || c}
                {p.condition_notes?.[c] ? `: ${p.condition_notes[c]}` : ''}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Chief complaint</h3>
        <p className="rounded-xl bg-white/4 p-4 text-[14px] leading-relaxed">{p.complaint}</p>
      </section>

      <section className="mt-6">
        <h3 className="text-[13px] uppercase tracking-wider text-[var(--a-muted)] mb-2">Appointments</h3>
        {data.appointments === null ? <Skeleton className="h-12" />
          : data.appointments?.length ? (
            <ul className="grid gap-2">
              {data.appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/4 px-4 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2"><FiCalendar className="w-3.5 h-3.5 text-[var(--a-muted)]" /> {a.date} · {formatSlot(a.slot)}</span>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-[var(--a-muted)] flex items-center gap-2"><FiUser className="w-4 h-4" /> No appointments booked yet.</p>}
      </section>
    </Drawer>
  );
}
