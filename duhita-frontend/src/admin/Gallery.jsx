import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiEdit2, FiImage, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, EmptyState, ErrorNote, Field, IconButton, Modal, Panel, Skeleton, inputClass, useConfirm, useToast } from './ui';

const META = {
  clinic: { title: 'Clinic Gallery', where: 'About → Clinic Gallery page' },
  infrastructure: { title: 'Infrastructure Gallery', where: 'About → Our Infrastructure section' },
  camps: { title: 'Dental Camp Gallery', where: 'Services → Community Service page' },
};

export default function GalleryAdmin() {
  const toast = useToast();
  const confirm = useConfirm();
  const { category = 'clinic' } = useParams();
  const meta = META[category] || META.clinic;
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setItems(null);
    api.gallery(category).then((d) => setItems(d.items)).catch((e) => { setError(e.message); setItems([]); });
  }, [category]);
  useEffect(() => {
    load();
  }, [load]);

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    for (const file of files) {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('caption', '');
      fd.append('file', file);
      try {
        await api.addImage(fd);
      } catch (e) {
        setError(`${file.name}: ${e.message}`);
      }
    }
    setBusy(false);
    toast(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded`);
    load();
  };

  const remove = async (img) => {
    const ok = await confirm({ title: 'Delete photo', message: 'This photo will be removed from the website and deleted from the server.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await api.deleteImage(img.id);
      toast('Photo deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
    load();
  };

  /** Move a photo one place earlier or later in the gallery. */
  const move = async (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await api.reorderImages(next.map((i) => i.id));
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  return (
    <>
      <PageHead title={`${meta.title} Management`} subtitle={`Shown on the ${meta.where}`}>
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>
          <FiUploadCloud /> {busy ? 'Uploading…' : 'Upload photos'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
      </PageHead>
      <ErrorNote>{error}</ErrorNote>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))); }}
        className="rounded-2xl border border-dashed border-white/12 p-4"
      >
        {items === null ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}</div> : items.length === 0 ? (
          <EmptyState icon={FiImage} title="No photos yet." hint="Click “Upload photos”, or drag image files onto this area." />
        ) : (
          <>
            <p className="px-1 pb-4 text-[13px] text-[var(--a-muted)]">{items.length} photo{items.length === 1 ? '' : 's'} · drag files here to add more · use ← → to reorder</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((img, index) => (
                <Panel key={img.id} className="group overflow-hidden">
                  <div className="relative aspect-[4/3] bg-black/40">
                    <img src={api.url(img.src)} alt={img.caption || ''} loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-gradient-to-t from-black/85 to-transparent pt-10">
                      <button onClick={() => move(index, -1)} aria-label="Move earlier" disabled={index === 0}
                        className="w-9 h-9 grid place-items-center rounded-lg bg-white/15 text-white hover:bg-white/25 disabled:opacity-30">←</button>
                      <button onClick={() => move(index, 1)} aria-label="Move later" disabled={index === items.length - 1}
                        className="w-9 h-9 grid place-items-center rounded-lg bg-white/15 text-white hover:bg-white/25 disabled:opacity-30">→</button>
                      <span className="flex-1" />
                      <button onClick={() => setEditing(img)} aria-label="Edit caption"
                        className="w-9 h-9 grid place-items-center rounded-lg bg-white/15 text-white hover:bg-white/25"><FiEdit2 /></button>
                      <button onClick={() => remove(img)} aria-label="Delete photo"
                        className="w-9 h-9 grid place-items-center rounded-lg bg-[#f0616d] text-white hover:bg-[#d8515d]"><FiTrash2 /></button>
                    </div>
                  </div>
                  <p className="px-3.5 py-3 text-[13px] text-[var(--a-muted)] line-clamp-2">
                    <span className="text-white/30 mr-1.5">{index + 1}.</span>
                    {img.caption || <span className="text-white/30">No caption</span>}
                  </p>
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>

      <CaptionModal image={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}

function CaptionModal({ image, onClose, onSaved }) {
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('clinic');
  const [error, setError] = useState('');

  useEffect(() => {
    if (image) { setCaption(image.caption || ''); setCategory(image.category); setError(''); }
  }, [image]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.updateImage(image.id, { caption, category });
      toast('Photo updated');
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open={!!image} title="Edit photo" onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <ErrorNote>{error}</ErrorNote>
        {image && <img src={api.url(image.src)} alt="" className="w-full rounded-xl" />}
        <Field label="Caption" hint="Shown under the photo in the full-screen viewer">
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Gallery">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="clinic">Clinic Gallery</option>
            <option value="infrastructure">Infrastructure Gallery</option>
            <option value="camps">Dental Camp Gallery</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-1">
          <Button type="submit" className="flex-1">Save changes</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
