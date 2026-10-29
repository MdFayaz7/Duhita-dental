import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api } from '../api';
import { Button, Field, Modal, cx, inputClass, useConfirm, useToast } from '../ui';
import { DrugForm } from './Drugs';
import { headerOf, setLetterhead, smallInput } from './shared';

const NOTE_KINDS = [['complaint', 'Complaints'], ['observation', 'Observations'], ['investigation', 'Investigations'], ['diagnosis', 'Diagnoses'], ['note', 'Notes']];

/** Practo's Settings ▾ on the patients screens: the lists and printout the whole clinic shares. */
export default function PatientSettings() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const items = [
    ['Add/ edit drug', () => setPanel('drugs')],
    ['Add/ edit procedures', () => navigate('/admin/billing?tab=procedures')],
    ['Add/ edit clinical notes', () => setPanel('notes')],
    ['Modify EMR/ billing printout', () => setPanel('printout')],
    ['Clinic hours', () => navigate('/admin/settings')],
  ];
  return (
    <span ref={ref} className="relative">
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>Settings <FiChevronDown /></Button>
      {open && (
        <span className="absolute right-0 z-30 mt-1 block w-[230px] border border-[#ccc] bg-white py-1 shadow-lg">
          {items.map(([label, fn]) => (
            <button key={label} onClick={() => { setOpen(false); fn(); }} className="block w-full px-3 py-2 text-left text-[13.5px] hover:bg-[#1a9ad6] hover:text-white">{label}</button>
          ))}
        </span>
      )}
      <DrugsManager open={panel === 'drugs'} onClose={() => setPanel(null)} />
      <NotesManager open={panel === 'notes'} onClose={() => setPanel(null)} />
      <PrintoutForm open={panel === 'printout'} onClose={() => setPanel(null)} />
    </span>
  );
}

function useTerms(kind, open) {
  const [items, setItems] = useState([]);
  const load = () => api.terms(kind).then((r) => setItems(r.items)).catch(() => {});
  useEffect(() => { if (open) load(); }, [kind, open]); // eslint-disable-line react-hooks/exhaustive-deps
  return [items, load];
}

function TermRows({ items, q, onEdit, onDelete, render }) {
  const shown = items.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="max-h-[50vh] overflow-y-auto border border-[#ddd]">
      {shown.map((t) => (
        <div key={t.id} className="flex items-center gap-2 border-b border-[#eee] px-3 py-1.5 text-[13.5px]">
          <span className="flex-1">{render ? render(t) : t.name}</span>
          {onEdit && <button onClick={() => onEdit(t)} aria-label="Edit" className="p-1 text-[#777] hover:text-[#1a9ad6]"><FiEdit2 /></button>}
          <button onClick={() => onDelete(t)} aria-label="Delete" className="p-1 text-[#999] hover:text-[#d93a46]"><FiTrash2 /></button>
        </div>
      ))}
      {!shown.length && <p className="p-3 text-[13px] text-[#888]">Nothing here.</p>}
    </div>
  );
}

function useDelete(load) {
  const confirm = useConfirm();
  const toast = useToast();
  return async (t) => {
    if (!(await confirm({ title: 'Remove', message: `Remove “${t.name}” from the list? Past records keep it.`, confirmLabel: 'Remove', tone: 'danger' }))) return;
    await api.deleteTerm(t.id).then(load).catch((e) => toast(e.message, 'error'));
  };
}

function DrugsManager({ open, onClose }) {
  const [items, load] = useTerms('drug', open);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const remove = useDelete(load);
  return (
    <Modal open={open} wide title="Add / edit drugs" subtitle="The drug list every doctor picks from when prescribing" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drugs" className={cx(smallInput, 'flex-1')} />
        <Button size="sm" onClick={() => setEditing(null)}>Add Drug</Button>
      </div>
      <TermRows items={items} q={q} onEdit={setEditing} onDelete={remove}
        render={(t) => <>{t.name} <span className="text-[12px] text-[#888]">{[t.data?.frequency, t.data?.days && `${t.data.days} days`].filter(Boolean).join(' · ')}</span></>} />
      <DrugForm open={editing !== undefined} drug={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
    </Modal>
  );
}

function NotesManager({ open, onClose }) {
  const toast = useToast();
  const [kind, setKind] = useState('complaint');
  const [items, load] = useTerms(kind, open);
  const [q, setQ] = useState('');
  const remove = useDelete(load);
  const add = async () => {
    if (!q.trim()) return;
    await api.addTerm({ kind, name: q.trim() }).then(() => { setQ(''); load(); }).catch((e) => toast(e.message, 'error'));
  };
  return (
    <Modal open={open} wide title="Add / edit clinical notes" subtitle="Pick lists shown beside clinical notes" onClose={onClose}>
      <div className="mb-3 flex flex-wrap gap-1">
        {NOTE_KINDS.map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} className={cx('rounded-[2px] border px-3 py-1 text-[13px]', kind === k ? 'border-[#1a9ad6] bg-[#1a9ad6] text-white' : 'border-[#ccc]')}>{l}</button>
        ))}
      </div>
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Search or type a new entry" className={cx(smallInput, 'flex-1')} />
        <Button size="sm" onClick={add} disabled={!q.trim()}>Add</Button>
      </div>
      <TermRows items={items} q={q} onDelete={remove} />
    </Modal>
  );
}

function PrintoutForm({ open, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(null);
  useEffect(() => {
    if (!open) return;
    api.printout().then((v) => {
      const h = headerOf();
      setF(Object.keys(v || {}).length ? v : { clinic_name: h.name, address: h.address, phone: h.phone, email: h.email, website: h.website, registration: '', footer: '', show_logo: true });
    }).catch((e) => toast(e.message, 'error'));
  }, [open, toast]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try {
      setLetterhead(await api.savePrintout(f));
      toast('Printout updated — invoices, receipts, prescriptions and case sheets use it now');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <Modal open={open} wide title="Modify EMR / billing printout" subtitle="Letterhead and footer on every printout and PDF" onClose={onClose}>
      {f && (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Clinic name" className="sm:col-span-2"><input required value={f.clinic_name} onChange={set('clinic_name')} className={inputClass} /></Field>
          <Field label="Address" className="sm:col-span-2"><input value={f.address} onChange={set('address')} className={inputClass} /></Field>
          <Field label="Phone"><input value={f.phone} onChange={set('phone')} className={inputClass} /></Field>
          <Field label="Email"><input value={f.email} onChange={set('email')} className={inputClass} /></Field>
          <Field label="Website"><input value={f.website} onChange={set('website')} className={inputClass} /></Field>
          <Field label="Registration / GSTIN"><input value={f.registration} onChange={set('registration')} className={inputClass} /></Field>
          <Field label="Footer note" className="sm:col-span-2"><input value={f.footer} onChange={set('footer')} placeholder="e.g. Thank you for choosing Duhita Dental" className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={f.show_logo} onChange={(e) => setF({ ...f, show_logo: e.target.checked })} /> Show the clinic logo</label>
          <div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      )}
    </Modal>
  );
}
