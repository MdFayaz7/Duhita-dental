import { useState } from 'react';
import { FiFile, FiTrash2 } from 'react-icons/fi';
import { api } from '../api';
import { Button, Field, Modal, cx, inputClass, todayIso, useConfirm, useToast } from '../ui';
import { AddButton, DayGroups, MoreButton, SectionBar, usePaged, usePatientCtx } from './shared';

const LABELS = { xray: 'X-ray / scan', report: 'Report', prescription: 'Prescription', note: 'Note' };

export default function Files() {
  const { patient } = usePatientCtx();
  const pid = patient?.patient.patient_id;
  const toast = useToast();
  const confirm = useConfirm();
  const [kind, setKind] = useState('');
  const [adding, setAdding] = useState(false);
  const [labels, setLabels] = useState({});
  const list = usePaged(async (p) => {
    const r = await api.emrFiles({ ...p, ...(pid ? { patient_id: pid } : {}), ...(kind ? { kind } : {}) });
    setLabels(r.labels);
    return r;
  }, [pid, kind]);

  const remove = async (f) => {
    if (!(await confirm({ title: 'Delete file', message: `Delete ${f.title}?`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    await api.deletePatientRecord(f.patient_id, f.id).then(list.reload).catch((e) => toast(e.message, 'error'));
  };
  const all = Object.values(labels).reduce((a, b) => a + b, 0);

  return (
    <>
      <SectionBar title="Files">{pid && <AddButton onClick={() => setAdding(true)}>+ Add</AddButton>}</SectionBar>
      <div className="flex flex-col md:flex-row">
        <aside className="md:w-[260px] shrink-0 border-r border-[#d8d8d8] bg-[#e4e4e4] p-3 text-[13px]">
          <h3 className="text-[15px] text-[#6a8a2f]">Uploaded Files</h3>
          {[['', 'All files', all], ...Object.entries(labels).map(([k, n]) => [k, LABELS[k] || k, n])].map(([k, label, n]) => (
            <button key={k || 'all'} onClick={() => setKind(k)}
              className={cx('mt-1 flex w-full justify-between rounded-[2px] px-2.5 py-1.5 text-left', kind === k ? 'bg-[#1aa0e0] text-white' : 'hover:bg-black/5')}>
              {label}<span>{n}</span>
            </button>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          <DayGroups items={list.items} showPatient={!pid} empty="No files."
            render={(rows) => (
              <div className="flex flex-wrap gap-4 p-3">
                {rows.map((f) => {
                  const url = f.file && api.url(f.file);
                  return (
                    <figure key={f.id} className="relative w-[130px] border border-[#ccc] bg-white">
                      <a href={url || undefined} target="_blank" rel="noreferrer" className="grid h-[100px] place-items-center bg-[#222] overflow-hidden">
                        {f.file_type === 'image' && url ? <img src={url} alt={f.title} loading="lazy" className="h-full w-full object-cover" /> : <FiFile className="w-8 h-8 text-white" />}
                      </a>
                      <figcaption className="px-1.5 py-1 text-[11.5px] leading-tight">
                        <span className="block truncate" title={f.title}>{f.title}</span>
                        <span className="text-[#777]">Tags: {LABELS[f.kind] || f.kind}</span>
                      </figcaption>
                      <button onClick={() => remove(f)} aria-label="Delete" className="absolute right-1 top-1 rounded bg-white/90 p-1 text-[#d93a46]"><FiTrash2 className="w-3 h-3" /></button>
                    </figure>
                  );
                })}
              </div>
            )} />
          <MoreButton more={list.more} onClick={list.loadMore} />
        </div>
      </div>
      {pid && <Upload open={adding} pid={pid} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(); }} />}
    </>
  );
}

function Upload({ open, pid, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ kind: 'xray', title: '', date: todayIso(), notes: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!files.length) return toast('Choose a file.', 'error');
    setBusy(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('kind', f.kind);
        form.append('title', (f.title.trim() || file.name).slice(0, 140));
        form.append('date', f.date);
        form.append('notes', f.notes);
        form.append('file', file);
        await api.addPatientRecord(pid, form);
      }
      toast(`${files.length} file(s) added`);
      setFiles([]);
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} title="Add files" subtitle={pid} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <Field label="Files"><input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles([...e.target.files])} /></Field>
        <Field label="Label"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inputClass}>{Object.entries(LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Title" hint="Blank = file name"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputClass} /></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputClass} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</Button></div>
      </form>
    </Modal>
  );
}
