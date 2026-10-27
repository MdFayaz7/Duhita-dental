import { useState } from 'react';
import { FiEdit2, FiPrinter, FiTrash2, FiX } from 'react-icons/fi';
import { api } from '../api';
import { Button, cx, todayIso, useConfirm, useToast } from '../ui';
import { longDate } from '../billingUi';
import { DoctorSelect, TermPicker } from './Clinical';
import { AddButton, DayGroups, MoreButton, SectionBar, Signed, escapeHtml, printHtml, smallInput, usePaged, usePatientCtx } from './shared';

const FOOD = { before: 'Before food', after: 'After food', with: 'With food' };
const blankItem = (drug = '', data = {}) => ({ drug, strength: data.strength || '', dose: data.dose || '1', frequency: data.frequency || '1-0-1', food: data.food || 'after', days: data.days || 5, instructions: data.instructions || '' });
const itemText = (i) => [i.strength, i.dose && `${i.dose} unit`, i.frequency, FOOD[i.food], i.days && `${i.days} days`].filter(Boolean).join(' · ');

export default function Prescriptions() {
  const { patient, doctors } = usePatientCtx();
  const pid = patient?.patient.patient_id;
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const list = usePaged((p) => api.emr('prescriptions', { ...p, ...(pid ? { patient_id: pid } : {}) }), [pid]);

  const save = async (body) => {
    try {
      await api.saveEmr('prescriptions', { patient_id: pid, ...body }, editing?.id);
      toast('Prescription saved');
      setEditing(null);
      list.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const remove = async (rx) => {
    if (!(await confirm({ title: 'Delete prescription', message: 'Delete this prescription?', confirmLabel: 'Delete', tone: 'danger' }))) return;
    await api.deleteEmr('prescriptions', rx.id).then(list.reload).catch((e) => toast(e.message, 'error'));
  };
  const print = (rx) => printHtml('Prescription', `<p><b>${escapeHtml((rx.patient_name || patient?.patient.name || '').toUpperCase())}</b> · ID ${escapeHtml(rx.patient_id)} · ${longDate(rx.date)}</p>
    <h2 style="font-size:22px;margin:12px 0 4px">℞</h2><table><tr><th>#</th><th>Drug</th><th>Dosage</th><th>Instructions</th></tr>
    ${rx.items.map((i, n) => `<tr><td>${n + 1}</td><td><b>${escapeHtml(i.drug)}</b></td><td>${escapeHtml(itemText(i))}</td><td>${escapeHtml(i.instructions || '')}</td></tr>`).join('')}</table>
    ${rx.notes ? `<p>${escapeHtml(rx.notes)}</p>` : ''}<p style="margin-top:40px;text-align:right">${escapeHtml(doctors[String(rx.doctor_id)]?.name || '')}</p>`);

  if (editing) return <RxForm row={editing} onCancel={() => setEditing(null)} onSave={save} />;
  return (
    <>
      <SectionBar title="Prescriptions" share="prescriptions">{pid && <AddButton onClick={() => setEditing({})}>+ Add</AddButton>}</SectionBar>
      <DayGroups items={list.items} showPatient={!pid} empty="No prescriptions yet."
        render={(rows) => rows.map((rx) => (
          <div key={rx.id} className="border-l-4 border-[#e9573f]">
            <div className="flex items-start gap-3 px-3 py-2 text-[13.5px]">
              <ol className="flex-1 grid gap-1 list-decimal pl-5">
                {rx.items.map((i, n) => <li key={n}><b className="uppercase">{i.drug}</b> <span className="text-[#555]">{itemText(i)}</span>{i.instructions && <span className="block text-[#777]">{i.instructions}</span>}</li>)}
              </ol>
              <span className="flex">
                <button onClick={() => print(rx)} aria-label="Print" className="p-1.5 text-[#555]"><FiPrinter /></button>
                {pid && <button onClick={() => setEditing(rx)} aria-label="Edit" className="p-1.5 text-[#777]"><FiEdit2 /></button>}
                {pid && <button onClick={() => remove(rx)} aria-label="Delete" className="p-1.5 text-[#777] hover:text-[#d93a46]"><FiTrash2 /></button>}
              </span>
            </div>
            {rx.notes && <p className="px-3 pb-2 text-[13px] text-[#555]">{rx.notes}</p>}
            <Signed label="Prescribed by" doctor={doctors[String(rx.doctor_id)]?.name} />
          </div>
        ))} />
      <MoreButton more={list.more} onClick={list.loadMore} />
    </>
  );
}

function RxForm({ row, onCancel, onSave }) {
  const toast = useToast();
  const [items, setItems] = useState(row.items || []);
  const [notes, setNotes] = useState(row.notes || '');
  const [date, setDate] = useState(row.date || todayIso());
  const [doctor, setDoctor] = useState(row.doctor_id ? String(row.doctor_id) : '');
  const [tab, setTab] = useState('drug');
  const upd = (n, ch) => setItems((xs) => xs.map((x, i) => (i === n ? { ...x, ...ch } : x)));
  const pick = (name, term) => {
    if (tab === 'rx_template') return setItems((xs) => [...xs, ...(term?.data?.items || [])]);
    setItems((xs) => [...xs, blankItem(name, term?.data)]);
  };
  const saveTemplate = async () => {
    const name = window.prompt('Template name');
    if (!name?.trim() || !items.length) return;
    await api.addTerm({ kind: 'rx_template', name: name.trim(), data: { items } }).then(() => toast('Template saved')).catch((e) => toast(e.message, 'error'));
  };
  const submit = () => {
    const clean = items.filter((i) => i.drug.trim()).map((i) => ({ ...i, drug: i.drug.trim(), days: i.days ? Number(i.days) : null, food: i.food || null }));
    if (!clean.length) return toast('Add at least one drug.', 'error');
    onSave({ date, doctor_id: doctor ? Number(doctor) : null, items: clean, notes: notes.trim() || null });
  };

  return (
    <>
      <SectionBar title="Prescriptions">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={smallInput} />
        <DoctorSelect value={doctor} onChange={setDoctor} />
        <Button size="sm" variant="secondary" onClick={saveTemplate} disabled={!items.length}>Save as template</Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={submit} className="!bg-[#1a73e8] !border-[#1a73e8]">Save Prescription</Button>
      </SectionBar>
      <div className="flex flex-col lg:flex-row bg-white">
        <div className="flex-1 p-3 text-[13px]">
          <div className="flex justify-between border-b border-[#eee] pb-2">
            <span>Select a drug from the right. You can add multiple items.</span>
            <button onClick={() => setItems((xs) => [...xs, blankItem()])} className="text-[#1a9ad6]">prescribe custom drug</button>
          </div>
          {items.map((i, n) => (
            <div key={n} className="flex flex-wrap items-center gap-2 border-b border-[#eee] py-2">
              <input value={i.drug} onChange={(e) => upd(n, { drug: e.target.value })} placeholder="Drug" className={cx(smallInput, 'flex-1 min-w-[180px]')} />
              <input value={i.strength} onChange={(e) => upd(n, { strength: e.target.value })} placeholder="Strength" className={cx(smallInput, 'w-[90px]')} />
              <input value={i.dose} onChange={(e) => upd(n, { dose: e.target.value })} placeholder="Dose" className={cx(smallInput, 'w-[60px]')} />
              <input value={i.frequency} onChange={(e) => upd(n, { frequency: e.target.value })} placeholder="1-0-1" className={cx(smallInput, 'w-[70px]')} />
              <select value={i.food || ''} onChange={(e) => upd(n, { food: e.target.value })} className={smallInput}><option value="">—</option>{Object.entries(FOOD).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input type="number" min="1" value={i.days ?? ''} onChange={(e) => upd(n, { days: e.target.value })} placeholder="Days" className={cx(smallInput, 'w-[64px]')} />
              <input value={i.instructions || ''} onChange={(e) => upd(n, { instructions: e.target.value })} placeholder="Instructions" className={cx(smallInput, 'w-full')} />
              <button onClick={() => setItems((xs) => xs.filter((_, j) => j !== n))} aria-label="Remove" className="p-1 text-[#999]"><FiX /></button>
            </div>
          ))}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Advice / notes" rows={3} className={cx(smallInput, 'mt-3 h-auto w-full py-2')} />
        </div>
        <div>
          <div className="flex gap-1 px-2 pt-2">
            {[['drug', 'Drugs'], ['rx_template', 'Templates']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cx('px-3 py-1.5 text-[13px] border border-b-0', tab === k ? 'bg-white border-[#ddd]' : 'border-transparent text-[#555]')}>{l}</button>
            ))}
          </div>
          <TermPicker key={tab} kind={tab} title={tab === 'drug' ? 'Drugs' : 'Templates'} onPick={pick}
            render={(t) => (tab === 'rx_template' ? `${t.name} (${t.data?.items?.length || 0} drugs)` : t.name)} />
        </div>
      </div>
    </>
  );
}
