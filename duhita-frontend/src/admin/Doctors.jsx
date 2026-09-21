import { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiUpload, FiUserCheck } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, EmptyState, ErrorNote, Field, Modal, Panel, Skeleton, inputClass, useConfirm, useToast } from './ui';

const blank = { name: '', qualification: '', speciality: '', experience_years: '', bio: '', order: 0, active: true };

export default function Doctors() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => api.doctors().then((d) => setItems(d.items)).catch((e) => { setError(e.message); setItems([]); });
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (d) => {
    const ok = await confirm({ title: 'Remove doctor', message: `Remove ${d.name} from the website?`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try {
      await api.deleteDoctor(d.id);
      toast(`${d.name} removed`);
    } catch (e) {
      toast(e.message, 'error');
    }
    load();
  };

  return (
    <>
      <PageHead title="Doctors" subtitle="Profiles shown on the website">
        <Button onClick={() => setEditing(blank)}><FiPlus /> Add doctor</Button>
      </PageHead>
      <ErrorNote>{error}</ErrorNote>

      {items === null ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[184px] rounded-2xl" />)}</div> : items.length === 0 ? (
        <Panel><EmptyState icon={FiUserCheck} title="No doctors added yet." hint="Add the clinic's doctors so patients can see who treats them." /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <Panel key={d.id} className="p-5">
              <div className="flex items-start gap-4">
                <span className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-white/8 grid place-items-center text-white/40">
                  {d.photo ? <img src={api.url(d.photo)} alt="" className="w-full h-full object-cover" /> : <FiUserCheck />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{d.name}</p>
                  <p className="text-[13px] text-white/50">{d.qualification || '—'}</p>
                  {!d.active && <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-white/50">Hidden</span>}
                </div>
              </div>
              {d.speciality && <p className="mt-4 text-[13.5px] text-white/60">{d.speciality}{d.experience_years ? ` · ${d.experience_years} yrs` : ''}</p>}
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setEditing(d)}><FiEdit2 /> Edit</Button>
                <Button variant="danger" onClick={() => remove(d)} aria-label={`Delete ${d.name}`}><FiTrash2 /></Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <DoctorModal doctor={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}

function DoctorModal({ doctor, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    if (doctor) { setForm({ ...blank, ...doctor }); setFile(null); setError(''); }
  }, [doctor]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        qualification: form.qualification || null,
        speciality: form.speciality || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        bio: form.bio || null,
        photo: form.photo || null,
        order: Number(form.order) || 0,
        active: !!form.active,
      };
      const saved = doctor?.id ? await api.updateDoctor(doctor.id, body) : await api.addDoctor(body);
      toast(doctor?.id ? 'Doctor updated' : 'Doctor added');
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        await api.doctorPhoto(saved.id, fd);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!doctor} title={doctor?.id ? 'Edit doctor' : 'Add doctor'} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Full name"><input required value={form.name} onChange={set('name')} className={inputClass} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Qualification"><input value={form.qualification || ''} onChange={set('qualification')} placeholder="M.D.S" className={inputClass} /></Field>
          <Field label="Speciality"><input value={form.speciality || ''} onChange={set('speciality')} className={inputClass} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Years of experience"><input type="number" min="0" value={form.experience_years || ''} onChange={set('experience_years')} className={inputClass} /></Field>
          <Field label="Display order" hint="Lower numbers appear first"><input type="number" value={form.order ?? 0} onChange={set('order')} className={inputClass} /></Field>
        </div>
        <Field label="Short bio"><textarea rows={3} value={form.bio || ''} onChange={set('bio')} className={inputClass} /></Field>
        <Field label="Photo" hint="JPG, PNG or WebP">
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-3 cursor-pointer hover:border-white/30">
            <FiUpload className="text-white/50" />
            <span className="text-[13.5px] text-white/60">{file ? file.name : 'Choose a photo'}</span>
            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </Field>
        <label className="flex items-center gap-2.5 text-[14px] text-white/70">
          <input type="checkbox" checked={!!form.active} onChange={set('active')} className="w-4 h-4 accent-[#0a84ff]" />
          Show on the website
        </label>
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : 'Save doctor'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
