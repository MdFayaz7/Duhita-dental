import { useEffect, useMemo, useState } from 'react';
import { FiPlusCircle, FiUser } from 'react-icons/fi';
import { api } from '../api';
import { Button, Field, Modal, cx, inputClass, useToast } from '../ui';
import { smallInput } from './shared';

export const DRUG_TYPES = ['TABLET', 'CAPSULE', 'SYRUP', 'MOUTHWASH', 'GEL', 'OINTMENT', 'TOOTHPASTE', 'INJECTION', 'DROPS', 'POWDER'];
export const FOOD = { before: 'Before food', after: 'After food', with: 'With food' };
const RECENT_KEY = 'duhita.recentDrugs';

const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
export const rememberDrug = (id) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 8))); } catch { /* private mode */ }
};

/** Add or edit a drug in the clinic's list, with the dosage that is filled in when it is prescribed. */
export function DrugForm({ open, drug, onClose, onSaved }) {
  const toast = useToast();
  const blank = { type: 'TABLET', name: '', strength: '', dose: '1', frequency: '1-0-1', days: '5', food: 'after', instructions: '' };
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (!open) return;
    if (!drug) return setF(blank);
    const d = drug.data || {};
    // Stored names read "TYPE Name Strength"; split the type and strength back off for editing.
    let name = drug.name;
    if (d.type && name.toUpperCase().startsWith(`${d.type} `)) name = name.slice(d.type.length + 1);
    if (d.strength && name.endsWith(` ${d.strength}`)) name = name.slice(0, -d.strength.length - 1);
    setF({ ...blank, ...d, name, days: d.days ? String(d.days) : '' });
  }, [open, drug]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const name = [f.type, f.name.trim(), f.strength.trim()].filter(Boolean).join(' ');
    const data = { type: f.type, strength: f.strength.trim(), dose: f.dose.trim(), frequency: f.frequency.trim(), days: f.days ? Number(f.days) : null, food: f.food, instructions: f.instructions.trim() };
    try {
      const saved = drug ? await api.updateTerm(drug.id, { kind: 'drug', name, data }) : await api.addTerm({ kind: 'drug', name, data });
      toast(drug ? 'Drug updated' : `${name} added`);
      onSaved(saved);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <Modal open={open} title={drug ? 'Edit drug' : 'Add Drug'} subtitle="Saved to the clinic's drug list for every doctor" onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Type"><select value={f.type} onChange={set('type')} className={inputClass}>{DRUG_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Drug name"><input required value={f.name} onChange={set('name')} placeholder="e.g. Amoxicillin" className={inputClass} /></Field>
        <Field label="Strength"><input value={f.strength} onChange={set('strength')} placeholder="500 mg" className={inputClass} /></Field>
        <Field label="Dose (units)"><input value={f.dose} onChange={set('dose')} className={inputClass} /></Field>
        <Field label="Frequency" hint="morning-afternoon-night"><input value={f.frequency} onChange={set('frequency')} placeholder="1-0-1" className={inputClass} /></Field>
        <Field label="Days"><input type="number" min="1" value={f.days} onChange={set('days')} className={inputClass} /></Field>
        <Field label="Food"><select value={f.food} onChange={set('food')} className={inputClass}><option value="">—</option>{Object.entries(FOOD).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Instructions" className="sm:col-span-2"><input value={f.instructions} onChange={set('instructions')} className={inputClass} /></Field>
        <div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}

/** Practo's drug panel: Drugs / Templates tabs, Add Drug, search, recent drugs then all drugs. */
export function DrugPanel({ onPick, onPickTemplate }) {
  const [tab, setTab] = useState('drug');
  const [items, setItems] = useState({ drug: [], rx_template: [] });
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const load = (kind) => api.terms(kind).then((r) => setItems((x) => ({ ...x, [kind]: r.items }))).catch(() => {});
  useEffect(() => { load('drug'); load('rx_template'); }, []);
  const match = (t) => t.name.toLowerCase().includes(q.trim().toLowerCase());
  const drugs = items.drug.filter(match);
  const recent = useMemo(() => readRecent().map((id) => items.drug.find((d) => d.id === id)).filter(Boolean).filter(match), [items, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (d) => { rememberDrug(d.id); onPick(d); };
  const row = (d) => (
    <button key={d.id} onClick={() => pick(d)} className="flex w-full items-center justify-between border-b border-[#eee] px-2 py-1.5 text-left text-[13.5px] hover:bg-[#f1f6fa]">
      <span>{d.name}</span>{d.data?.added_by_doctor && <FiUser className="text-[#bbb]" />}
    </button>
  );
  return (
    <aside className="flex lg:w-[520px] shrink-0 flex-col border-l border-[#ddd] bg-[#f4f4f4] p-2">
      <div className="flex items-center gap-1">
        {[['drug', 'Drugs'], ['rx_template', 'Templates']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('border px-3 py-1.5 text-[13px]', tab === k ? 'border-[#ddd] border-b-transparent bg-white' : 'border-transparent text-[#555]')}>{l}</button>
        ))}
        {tab === 'drug' && <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setAdding(true)}><FiPlusCircle /> Add Drug</Button>}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={cx(smallInput, 'my-2 w-full')} />
      <div className="max-h-[calc(100vh-260px)] flex-1 overflow-y-auto border border-[#ddd] bg-white">
        {tab === 'drug' ? (
          <>
            {recent.length > 0 && <><p className="bg-[#e9e9e9] px-2 py-1 text-[13px] uppercase text-[#555]">Recent Drugs</p>{recent.map(row)}</>}
            <p className="bg-[#e9e9e9] px-2 py-1 text-[13px] uppercase text-[#555]">All Drugs</p>
            {drugs.map(row)}
            {!drugs.length && <p className="p-3 text-[13px] text-[#888]">{q ? 'No match — use Add Drug.' : 'No drugs yet — use Add Drug.'}</p>}
          </>
        ) : (
          <>
            {items.rx_template.filter(match).map((t) => (
              <button key={t.id} onClick={() => onPickTemplate(t)} className="block w-full border-b border-[#eee] px-2 py-1.5 text-left text-[13.5px] hover:bg-[#f1f6fa]">
                {t.name} <span className="text-[#888]">({t.data?.items?.length || 0} drugs)</span>
              </button>
            ))}
            {!items.rx_template.length && <p className="p-3 text-[13px] text-[#888]">No templates yet. Write a prescription and use “Save as template”.</p>}
          </>
        )}
      </div>
      <DrugForm open={adding} onClose={() => setAdding(false)} onSaved={(d) => { setAdding(false); load('drug'); pick(d); }} />
    </aside>
  );
}
