import { Fragment, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlusCircle, FiTrash2, FiX } from 'react-icons/fi';
import { api } from '../api';
import { Button, cx, todayIso, useConfirm, useToast } from '../ui';
import { longDate } from '../billingUi';
import { AddButton, DayGroups, MoreButton, SectionBar, Signed, smallInput, usePaged, usePatientCtx } from './shared';

/** Shared list/edit plumbing for an EMR kind. */
function useEmr(kind) {
  const { patient } = usePatientCtx();
  const pid = patient?.patient.patient_id;
  const list = usePaged((p) => api.emr(kind, { ...p, ...(pid ? { patient_id: pid } : {}) }), [kind, pid]);
  const [editing, setEditing] = useState(null); // {} = new, row = edit
  const toast = useToast();
  const confirm = useConfirm();
  const save = async (body) => {
    try {
      await api.saveEmr(kind, { patient_id: pid, ...body }, editing?.id);
      toast('Saved');
      setEditing(null);
      list.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete', message: 'Delete this entry?', confirmLabel: 'Delete', tone: 'danger' }))) return;
    await api.deleteEmr(kind, row.id).then(list.reload).catch((e) => toast(e.message, 'error'));
  };
  return { pid, list, editing, setEditing, save, remove };
}

const RowActions = ({ onEdit, onDelete }) => (
  <span className="flex gap-1">
    <button onClick={onEdit} aria-label="Edit" className="p-1.5 text-[#777] hover:text-[#1a9ad6]"><FiEdit2 /></button>
    <button onClick={onDelete} aria-label="Delete" className="p-1.5 text-[#777] hover:text-[#d93a46]"><FiTrash2 /></button>
  </span>
);

export function DoctorSelect({ value, onChange }) {
  const { doctors } = usePatientCtx();
  const list = Object.values(doctors).filter((d) => d.in_calendar !== false);
  useEffect(() => { if (!value && list[0]) onChange(String(list[0].id)); }, [list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={smallInput}>
      <option value="">Doctor…</option>{list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  );
}

const FormBar = ({ title, saveLabel, onCancel, onSave, date, setDate, doctor, setDoctor }) => (
  <SectionBar title={title}>
    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={smallInput} />
    <DoctorSelect value={doctor} onChange={setDoctor} />
    <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
    <Button size="sm" onClick={onSave} className="!bg-[#3cae4c] !border-[#3cae4c]">{saveLabel}</Button>
  </SectionBar>
);

/* ---------------------------------------------------------------- vital signs */

const VITALS = [
  ['pulse', 'Pulse', 'Heart Beats/min'], ['temperature', 'Temperature', '°F'], ['bp', 'Blood Pressure', 'mmHg'],
  ['weight', 'Weight', 'Kg'], ['resp_rate', 'Resp. Rate', 'Breaths/min'],
];
const TEMP_SITES = ['Axillary (Armpit)', 'Oral', 'Tympanic (Ear)', 'Forehead'];
const BP_POSITIONS = ['Sitting', 'Standing', 'Lying'];

export default function Vitals() {
  const { pid, list, editing, setEditing, save, remove } = useEmr('vitals');
  const { doctors } = usePatientCtx();
  if (editing) return <VitalForm row={editing} onCancel={() => setEditing(null)} onSave={save} />;
  const show = (v) => [
    v.pulse && `Pulse ${v.pulse}/min`, v.temperature && `Temp ${Number(v.temperature)}°F${v.temperature_site ? ` (${v.temperature_site})` : ''}`,
    v.bp_systolic && `BP ${v.bp_systolic}/${v.bp_diastolic ?? '–'} mmHg${v.bp_position ? ` (${v.bp_position})` : ''}`,
    v.weight && `Weight ${Number(v.weight)} kg`, v.resp_rate && `Resp. ${v.resp_rate}/min`,
  ].filter(Boolean);
  return (
    <>
      <SectionBar title="Vital Signs">{pid && <AddButton onClick={() => setEditing({})}>+ Add</AddButton>}</SectionBar>
      <DayGroups items={list.items} showPatient={!pid} empty="No vital signs recorded."
        render={(rows) => rows.map((v) => (
          <div key={v.id}>
            <div className="flex items-start gap-3 px-3 py-2.5 text-[13.5px]">
              <div className="flex flex-1 flex-wrap gap-x-6 gap-y-1">{show(v).map((t) => <span key={t}>{t}</span>)}</div>
              {pid && <RowActions onEdit={() => setEditing(v)} onDelete={() => remove(v)} />}
            </div>
            <Signed label="Recorded by" doctor={doctors[String(v.doctor_id)]?.name} />
          </div>
        ))} />
      <MoreButton more={list.more} onClick={list.loadMore} />
    </>
  );
}

function VitalForm({ row, onCancel, onSave }) {
  const [f, setF] = useState({ temperature_site: TEMP_SITES[0], bp_position: BP_POSITIONS[0], ...row });
  const [date, setDate] = useState(row.date || todayIso());
  const [doctor, setDoctor] = useState(row.doctor_id ? String(row.doctor_id) : '');
  const num = (k) => (f[k] === '' || f[k] == null ? null : Number(f[k]));
  const input = (k, ph = 'Reading') => <input type="number" step="any" value={f[k] ?? ''} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={cx(smallInput, 'w-[150px]')} />;
  const cycle = (k, opts) => <button type="button" onClick={() => setF({ ...f, [k]: opts[(opts.indexOf(f[k]) + 1) % opts.length] })} className="text-[13px] text-[#1a9ad6]">{f[k]}</button>;
  const submit = () => onSave({
    date, doctor_id: doctor ? Number(doctor) : null, pulse: num('pulse'), temperature: num('temperature'), temperature_site: f.temperature_site,
    bp_systolic: num('bp_systolic'), bp_diastolic: num('bp_diastolic'), bp_position: f.bp_position, weight: num('weight'), resp_rate: num('resp_rate'),
  });
  return (
    <>
      <FormBar title="Vital Signs" saveLabel="Save Vital Sign" onCancel={onCancel} onSave={submit} date={date} setDate={setDate} doctor={doctor} setDoctor={setDoctor} />
      <div className="grid gap-5 bg-white p-4">
        {VITALS.map(([k, label, unit]) => (
          <div key={k}>
            <p className="mb-1 text-[12px] uppercase text-[#444]">{label} <span className="normal-case text-[13px]">({unit})</span></p>
            <div className="flex items-center gap-2">
              {k === 'bp' ? <>{input('bp_systolic', 'Systolic')}<span className="text-[20px] text-[#666]">/</span>{input('bp_diastolic', 'Diastolic')}{cycle('bp_position', BP_POSITIONS)}</>
                : k === 'temperature' ? <>{input(k)}{cycle('temperature_site', TEMP_SITES)}</> : input(k)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- clinical notes */

const NOTE_ROWS = [
  ['complaints', 'complaint', 'Chief Complaints', 'Complaints'], ['observations', 'observation', 'Observations', 'Observations'],
  ['investigations', 'investigation', 'Investigations', 'Investigations'], ['diagnoses', 'diagnosis', 'Diagnoses', 'Diagnoses'],
  ['notes', 'note', 'Notes', 'Notes'],
];

export function ClinicalNotes() {
  const { pid, list, editing, setEditing, save, remove } = useEmr('notes');
  const { doctors } = usePatientCtx();
  if (editing) return <NoteForm row={editing} onCancel={() => setEditing(null)} onSave={save} />;
  return (
    <>
      <SectionBar title="Clinical Notes">{pid && <AddButton onClick={() => setEditing({})}>+ Add</AddButton>}</SectionBar>
      <DayGroups items={list.items} showPatient={!pid} empty="No clinical notes yet."
        render={(rows) => rows.map((n) => (
          <div key={n.id} className="border-l-4 border-[#e9573f]">
            <div className="flex items-start gap-3 px-3 py-2">
              <dl className="grid flex-1 grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-[13.5px]">
                {NOTE_ROWS.filter(([k]) => n[k]?.length).map(([k, , label]) => (
                  <Fragment key={k}><dt className="text-[#777]">{label}</dt><dd>{n[k].join(', ')}</dd></Fragment>
                ))}
                {n.follow_up && <><dt className="text-[#777]">Follow up</dt><dd>{longDate(n.follow_up)}</dd></>}
              </dl>
              {pid && <RowActions onEdit={() => setEditing(n)} onDelete={() => remove(n)} />}
            </div>
            <Signed label="Noted by" doctor={doctors[String(n.doctor_id)]?.name} />
          </div>
        ))} />
      <MoreButton more={list.more} onClick={list.loadMore} />
    </>
  );
}

function NoteForm({ row, onCancel, onSave }) {
  const [f, setF] = useState(() => Object.fromEntries(NOTE_ROWS.map(([k]) => [k, row[k] || []])));
  const [drafts, setDrafts] = useState({});
  const [active, setActive] = useState('complaints');
  const [date, setDate] = useState(row.date || todayIso());
  const [doctor, setDoctor] = useState(row.doctor_id ? String(row.doctor_id) : '');
  const [follow, setFollow] = useState({ n: 0, unit: 'days', date: row.follow_up || '' });

  const add = (k, term) => term.trim() && setF((x) => (x[k].includes(term.trim()) ? x : { ...x, [k]: [...x[k], term.trim()] }));
  const followDate = () => {
    if (!follow.n) return null;
    const d = new Date(`${date}T00:00:00`);
    if (follow.unit === 'days') d.setDate(d.getDate() + Number(follow.n));
    if (follow.unit === 'weeks') d.setDate(d.getDate() + 7 * Number(follow.n));
    if (follow.unit === 'months') d.setMonth(d.getMonth() + Number(follow.n));
    return d.toLocaleDateString('en-CA');
  };
  const submit = () => {
    const all = { ...f };
    for (const [k] of NOTE_ROWS) if (drafts[k]?.trim()) all[k] = [...all[k], drafts[k].trim()];
    onSave({ ...all, date, doctor_id: doctor ? Number(doctor) : null, follow_up: followDate() || follow.date || null });
  };
  const activeRow = NOTE_ROWS.find(([k]) => k === active);

  return (
    <>
      <FormBar title="Clinical Notes" saveLabel="Save Clinical Note" onCancel={onCancel} onSave={submit} date={date} setDate={setDate} doctor={doctor} setDoctor={setDoctor} />
      <div className="flex flex-col lg:flex-row bg-white">
        <div className="flex-1">
          {NOTE_ROWS.map(([k, , label]) => (
            <div key={k} className={cx('flex items-start gap-3 border-b border-[#e5e5e5] px-3 py-3', active === k && 'bg-[#ececec]')}>
              <span className="w-[140px] shrink-0 border-r-2 border-[#1a9ad6] pr-2 pt-1.5 text-right text-[14px] text-[#555]">{label}</span>
              <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-[2px] border border-[#c8c8c8] bg-white px-2 py-1 min-h-[34px]">
                {f[k].map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-[2px] bg-[#e3f1f8] px-2 py-0.5 text-[13px]">
                    {t}<button onClick={() => setF({ ...f, [k]: f[k].filter((x) => x !== t) })} aria-label={`Remove ${t}`}><FiX className="w-3 h-3" /></button>
                  </span>
                ))}
                <input value={drafts[k] || ''} onFocus={() => setActive(k)} placeholder={label.replace(/s$/, '').replace('Chief Complaint', 'Complaint').replace('Diagnose', 'Diagnosis')}
                  onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(k, drafts[k] || ''); setDrafts({ ...drafts, [k]: '' }); } }}
                  className="flex-1 min-w-[160px] h-[24px] text-[13px] outline-none" />
              </div>
            </div>
          ))}
          <div className="px-10 py-4 text-[14px]">
            <p className="mb-2">Next Follow Up Appointment</p>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={follow.n} onChange={(e) => setFollow({ ...follow, n: e.target.value })} className={cx(smallInput, 'w-[60px]')} />
              <select value={follow.unit} onChange={(e) => setFollow({ ...follow, unit: e.target.value })} className={smallInput}>
                <option value="days">day(s)</option><option value="weeks">week(s)</option><option value="months">month(s)</option>
              </select>
              {followDate() && <span className="text-[13px] text-[#555]">on {longDate(followDate())}</span>}
            </div>
          </div>
        </div>
        <TermPicker kind={activeRow[1]} title={activeRow[3]} selected={f[active]} onPick={(t) => add(active, t)}
          kinds={NOTE_ROWS} active={active} onKind={setActive} />
      </div>
    </>
  );
}

/** Right-hand pick list (Practo's "Complaints ▾ / Search / Add new Complaint"). */
export function TermPicker({ kind, title, selected = [], onPick, kinds, active, onKind, render }) {
  const toast = useToast();
  const [terms, setTerms] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); api.terms(kind).then((r) => setTerms(r.items)).catch(() => setTerms([])); }, [kind]);
  const shown = useMemo(() => terms.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())), [terms, q]);
  const addNew = async () => {
    const name = (q.trim() || window.prompt(`New ${title.replace(/s$/, '').toLowerCase()}`) || '').trim();
    if (!name) return;
    try {
      const t = await api.addTerm({ kind, name });
      setTerms((x) => [...x, t]);
      onPick(name, t);
      setQ('');
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <aside className="lg:w-[520px] shrink-0 border-l border-[#ddd] p-2">
      <div className="flex items-center gap-2 border-b border-[#ddd] pb-2">
        {kinds ? (
          <select value={active} onChange={(e) => onKind(e.target.value)} className={cx(smallInput, 'font-medium')}>
            {kinds.map(([k, , , label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        ) : <span className="text-[13px] font-medium">{title}</span>}
        <Button size="sm" variant="secondary" className="ml-auto" onClick={addNew}><FiPlusCircle /> Add new {title.replace(/s$/, '').replace('Diagnose', 'Diagnosis')}</Button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={cx(smallInput, 'my-2 w-full')} />
      <div className="max-h-[520px] overflow-y-auto border border-[#ddd]">
        {shown.map((t) => (
          <button key={t.id} onClick={() => onPick(t.name, t)}
            className={cx('block w-full border-b border-[#eee] px-2 py-1.5 text-left text-[13.5px] hover:bg-[#f1f6fa]', selected.includes(t.name) && 'text-[#1a9ad6]')}>
            {render ? render(t) : t.name}
          </button>
        ))}
        {!shown.length && <p className="p-3 text-[13px] text-[#888]">{q ? 'No match — use “Add new”.' : 'Nothing saved yet.'}</p>}
      </div>
    </aside>
  );
}
