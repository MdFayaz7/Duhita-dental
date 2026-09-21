import { useEffect, useState } from 'react';
import { FiDownload, FiEdit2, FiFileText, FiPlus, FiTrash2, FiUpload } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, EmptyState, ErrorNote, Field, Modal, Panel, Skeleton, formatDateTime, inputClass, useConfirm, useToast } from './ui';

const blank = { title: '', authors: '', publication: '', year: '', category: '', description: '' };

export default function ResearchAdmin() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => api.research().then((d) => setItems(d.items)).catch((e) => { setError(e.message); setItems([]); });
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (p) => {
    const ok = await confirm({ title: 'Delete paper', message: `Delete “${p.title}”? The uploaded PDF is removed too.`, confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await api.deleteResearch(p.id);
      toast('Paper deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
    load();
  };

  return (
    <>
      <PageHead title="Research Papers" subtitle="Papers shown on About → Our Research">
        <Button onClick={() => setEditing(blank)}><FiPlus /> Upload paper</Button>
      </PageHead>
      <ErrorNote>{error}</ErrorNote>

      {items === null ? <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-[196px] rounded-2xl" />)}</div> : items.length === 0 ? (
        <Panel><EmptyState icon={FiFileText} title="No papers uploaded yet." hint="Upload a PDF with its title, authors and a short description." /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((p) => (
            <Panel key={p.id} className="p-5 flex gap-4">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-[#0a84ff]/15 text-[#5ac8fa] grid place-items-center"><FiFileText /></span>
              <div className="min-w-0 flex-1">
                {p.category && <p className="text-[11.5px] uppercase tracking-wider text-white/40">{p.category}</p>}
                <h2 className="font-semibold text-white leading-snug">{p.title}</h2>
                <p className="mt-1 text-[13.5px] text-white/60">{p.authors}</p>
                {(p.publication || p.year) && (
                  <p className="text-[12.5px] text-white/40">{[p.publication, p.year].filter(Boolean).join(' · ')}</p>
                )}
                {p.description && <p className="mt-3 text-[13.5px] text-[var(--a-muted)] line-clamp-3">{p.description}</p>}
                <p className="mt-2 text-[12px] text-white/30">Uploaded {formatDateTime(p.created_at)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.file && (
                    <a href={api.url(p.file)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-3.5 py-2 text-[13px] text-white/75 hover:bg-white/10">
                      <FiDownload /> View PDF
                    </a>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setEditing(p)}><FiEdit2 /> Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(p)}><FiTrash2 /></Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <PaperModal paper={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}

function PaperModal({ paper, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (paper) { setForm({ ...blank, ...paper }); setFile(null); setError(''); }
  }, [paper]);

  const save = async (e) => {
    e.preventDefault();
    if (!paper?.id && !file) return setError('Please choose a PDF to upload.');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries({ ...form }).forEach(([k, v]) => {
        if (['title', 'authors', 'publication', 'year', 'category', 'description'].includes(k)) fd.append(k, v ?? '');
      });
      if (file) fd.append('file', file);
      paper?.id ? await api.updateResearch(paper.id, fd) : await api.addResearch(fd);
      toast(paper?.id ? 'Paper updated' : 'Paper uploaded');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!paper} title={paper?.id ? 'Edit paper' : 'Upload research paper'} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Title"><input required value={form.title} onChange={set('title')} className={inputClass} /></Field>
        <Field label="Authors" hint="e.g. Dr. Nalluru Sasidhar, M.D.S"><input required value={form.authors} onChange={set('authors')} className={inputClass} /></Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Publication"><input value={form.publication || ''} onChange={set('publication')} className={inputClass} /></Field>
          <Field label="Year"><input value={form.year || ''} onChange={set('year')} placeholder="2026" className={inputClass} /></Field>
          <Field label="Speciality"><input value={form.category || ''} onChange={set('category')} placeholder="Oral Surgery" className={inputClass} /></Field>
        </div>
        <Field label="Description"><textarea rows={4} value={form.description || ''} onChange={set('description')} className={inputClass} /></Field>
        <Field label="PDF file" hint={paper?.file ? 'Choosing a new file replaces the current PDF.' : 'PDF only, up to 15 MB.'}>
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-3.5 cursor-pointer hover:border-white/30">
            <FiUpload className="text-white/50" />
            <span className="text-[13.5px] text-white/60">{file ? file.name : paper?.file ? 'Replace PDF' : 'Choose a PDF'}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </Field>
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : 'Save paper'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
