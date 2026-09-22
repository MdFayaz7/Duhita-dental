import { useCallback, useEffect, useRef, useState } from 'react';
import { FiEdit2, FiEyeOff, FiTrash2, FiUploadCloud, FiVideo } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, EmptyState, ErrorNote, Field, Modal, Panel, Skeleton, inputClass, useConfirm, useToast } from './ui';

export default function FeedbackAdmin() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [limits, setLimits] = useState({ max_mb: 20, cdn: false });
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState([]); // [{ name, progress, error }]
  const [editing, setEditing] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    api.feedback().then((d) => { setItems(d.items); if (d.max_mb) setLimits({ max_mb: d.max_mb, cdn: !!d.cdn }); }).catch((e) => { setError(e.message); setItems([]); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (files) => {
    const videos = files.filter((f) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
    if (!videos.length) return toast('Please choose video files (MP4, MOV or WebM).', 'error');
    setUploads(videos.map((f) => ({ name: f.name, progress: 0, error: '' })));
    let done = 0;
    for (const [i, file] of videos.entries()) {
      const setRow = (patch) => setUploads((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
      if (file.size > limits.max_mb * 1024 * 1024) {
        setRow({ error: `Too large (${(file.size / 1048576).toFixed(0)} MB — max ${limits.max_mb} MB). Please compress it first.` });
        continue;
      }
      const fd = new FormData();
      fd.append('patient_name', '');
      fd.append('caption', '');
      fd.append('file', file);
      try {
        await api.uploadFeedback(fd, (p) => setRow({ progress: p }));
        setRow({ progress: 1 });
        done += 1;
      } catch (e) {
        setRow({ error: e.message });
      }
    }
    if (done) toast(`${done} clip${done === 1 ? '' : 's'} uploaded`);
    setTimeout(() => setUploads((rows) => rows.filter((r) => r.error)), 1500);
    load();
  };

  const move = async (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await api.reorderFeedback(next.map((c) => c.id));
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  const remove = async (clip) => {
    const ok = await confirm({
      title: 'Delete clip',
      message: `Delete ${clip.patient_name ? `${clip.patient_name}'s` : 'this'} feedback video? It will be removed from the website and the server.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteFeedback(clip.id);
      toast('Clip deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
    load();
  };

  return (
    <>
      <PageHead
        title="Patient Feedback"
        subtitle="Video testimonials shown on About → Patient Reviews. They play one after another."
        actions={
          <>
            <Button onClick={() => fileRef.current?.click()} disabled={uploads.some((u) => u.progress < 1 && !u.error)}>
              <FiUploadCloud /> Upload clips
            </Button>
            <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" multiple className="hidden"
              onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
          </>
        }
      />
      <ErrorNote>{error}</ErrorNote>

      <Panel className="p-4 mb-5 text-[13.5px] text-[var(--a-muted)] leading-relaxed">
        <strong className="text-[var(--a-text)]">Best results:</strong> portrait 9:16 clips, MP4 format, 30–60 seconds, under {limits.max_mb} MB.
        {limits.cdn
          ? ' Clips are compressed and served from a fast video CDN automatically.'
          : ' Smaller clips load faster for patients — export at 720p (WhatsApp-quality is fine) before uploading.'}
        {' '}On iPhone, set Camera → Formats → <em>Most Compatible</em> so clips save as MP4 and play in every browser.
      </Panel>

      {uploads.length > 0 && (
        <Panel className="p-4 mb-5 grid gap-3">
          {uploads.map((u) => (
            <div key={u.name}>
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="truncate">{u.name}</span>
                <span className={u.error ? 'text-[#ff8a92]' : 'text-[var(--a-muted)]'}>
                  {u.error || (u.progress >= 1 ? 'Done' : `${Math.round(u.progress * 100)}%`)}
                </span>
              </div>
              {!u.error && (
                <div className="mt-1.5 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full bg-[var(--a-accent)] transition-[width] duration-200" style={{ width: `${u.progress * 100}%` }} />
                </div>
              )}
            </div>
          ))}
        </Panel>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload([...e.dataTransfer.files]); }}
        className="rounded-2xl border border-dashed border-white/12 p-4"
      >
        {items === null ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={FiVideo} title="No feedback clips yet." hint="Click “Upload clips”, or drag video files here." />
        ) : (
          <>
            <p className="px-1 pb-4 text-[13px] text-[var(--a-muted)]">{items.length} clip{items.length === 1 ? '' : 's'} · plays in this order · use ← → to reorder</p>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {items.map((clip, index) => (
                <Panel key={clip.id} className="overflow-hidden">
                  <div className="relative aspect-[9/16] bg-black">
                    <video src={`${api.url(clip.src)}#t=0.5`} poster={clip.poster || undefined} preload={clip.poster ? 'none' : 'metadata'} muted playsInline controls
                      className="absolute inset-0 w-full h-full object-cover" />
                    {clip.active === false && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11.5px]">
                        <FiEyeOff /> Hidden
                      </span>
                    )}
                    <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11.5px]">{index + 1}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-[13.5px] truncate">{clip.patient_name || <span className="text-white/30">No name</span>}</p>
                    <p className="text-[12px] text-[var(--a-muted)] truncate">{clip.caption || '—'}</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Play earlier">←</Button>
                      <Button size="sm" variant="secondary" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Play later">→</Button>
                      <span className="flex-1" />
                      <Button size="sm" variant="secondary" onClick={() => setEditing(clip)} aria-label="Edit"><FiEdit2 /></Button>
                      <Button size="sm" variant="danger" onClick={() => remove(clip)} aria-label="Delete"><FiTrash2 /></Button>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>

      <ClipModal clip={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}

function ClipModal({ clip, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ patient_name: '', caption: '', active: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (clip) setForm({ patient_name: clip.patient_name || '', caption: clip.caption || '', active: clip.active !== false });
  }, [clip]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateFeedback(clip.id, form);
      toast('Clip updated');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!clip} title="Edit feedback clip" onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        {clip && (
          <video src={api.url(clip.src)} controls playsInline className="w-full max-h-[50vh] rounded-xl bg-black" />
        )}
        <Field label="Patient name" hint="Shown on the video, e.g. “Lakshmi, Patamata”">
          <input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Caption" hint="Optional — e.g. the treatment they had">
          <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className={inputClass} placeholder="Root canal treatment" />
        </Field>
        <label className="flex items-center gap-2.5 text-[14px] text-[var(--a-muted)]">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[var(--a-accent)]" />
          Show on the website
        </label>
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
