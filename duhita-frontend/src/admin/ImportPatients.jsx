import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiFileText, FiRefreshCw, FiUploadCloud, FiUsers } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, ErrorNote, Panel, Table, cx, useConfirm, useToast } from './ui';

const FIELD_LABELS = {
  practo_id: 'Practo patient number', name: 'Name', phone: 'Mobile', alt_phone: 'Other mobile', email: 'Email',
  sex: 'Gender', dob: 'Date of birth', age: 'Age', address: 'Address', locality: 'Locality', city: 'City',
  pincode: 'Pincode', blood_group: 'Blood group', referral: 'Referred by', medical_history: 'Medical history',
  allergies: 'Allergies', notes: 'Notes', groups: 'Groups', registered_on: 'Registered on',
};
const IMPORTANT = ['name', 'phone', 'practo_id', 'registered_on'];

const n = (v) => Number(v || 0).toLocaleString('en-IN');

export default function ImportPatients() {
  const toast = useToast();
  const confirm = useConfirm();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const form = (withMapping) => {
    const fd = new FormData();
    fd.append('file', file);
    if (withMapping) fd.append('mapping', JSON.stringify(mapping));
    return fd;
  };

  const check = async (chosen, withMapping = false) => {
    setBusy('preview');
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', chosen);
      if (withMapping) fd.append('mapping', JSON.stringify(mapping));
      const res = await api.importPreview(fd);
      setPreview(res);
      setMapping(res.mapping);
      setDirty(false);
    } catch (e) {
      setError(e.message);
      setPreview(null);
    } finally {
      setBusy('');
    }
  };

  const choose = (f) => {
    if (!f) return;
    setFile(f);
    check(f);
  };

  const run = async () => {
    const s = preview.summary;
    const ok = await confirm({
      title: 'Import patients',
      message: `Add ${n(s.to_create)} new patients and fill in details for ${n(s.to_update)} existing ones? Existing details are never overwritten, and importing the same file again won’t create duplicates.`,
      confirmLabel: 'Import now',
    });
    if (!ok) return;
    setBusy('commit');
    setError('');
    try {
      const res = await api.importCommit(form(true));
      setResult(res);
      toast(`Imported ${n(res.created)} patients`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const s = preview?.summary;

  return (
    <>
      <PageHead title="Import patients from Practo" subtitle="Bring the clinic’s existing patient list into this dashboard"
        actions={<Link to="/admin/patients" className="inline-flex items-center gap-2 rounded border border-[var(--a-border)] px-3.5 py-2.5 text-[13px] text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-black/3"><FiArrowLeft /> Patients</Link>} />
      <ErrorNote>{error}</ErrorNote>

      {result ? (
        <Panel className="p-6 sm:p-8 text-center">
          <FiCheckCircle className="mx-auto w-10 h-10 text-[#0e8a7d]" />
          <h2 className="mt-4 text-[20px] font-semibold">Import complete</h2>
          <p className="mt-2 text-[14px] text-[var(--a-muted)]">
            {n(result.created)} new patients added · {n(result.updated)} existing patients filled in
            {result.family_numbers ? ` · ${n(result.patients_in_families)} patients grouped into ${n(result.family_numbers)} families` : ''}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/admin/patients" className="inline-flex items-center gap-2 rounded bg-[var(--a-accent)] px-4 py-2.5 text-[14px] font-medium text-white">View patients</Link>
            <Button variant="secondary" onClick={() => { setFile(null); setPreview(null); setResult(null); }}>Import another file</Button>
          </div>
        </Panel>
      ) : (
        <>
          <Panel className="p-5 sm:p-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="text-[14px] leading-relaxed text-[var(--a-muted)]">
              <h2 className="text-[15px] font-semibold text-[var(--a-text)] mb-2">1. Export from Practo</h2>
              <ol className="list-decimal pl-5 grid gap-1.5">
                <li>In Practo Ray, open <b className="text-[var(--a-text)]">Patients</b> and use <b className="text-[var(--a-text)]">Export</b> to download the full list as Excel or CSV.</li>
                <li>If you can’t find an export option, ask Practo support for a <b className="text-[var(--a-text)]">full patient data export</b>. They provide one on request.</li>
                <li>Upload the file here. Nothing is saved until you check the preview and press Import.</li>
              </ol>
              <p className="mt-3 text-[13px]">Patients who share a mobile number (families) are all kept, each with their own patient ID, and shown together as a family.</p>
            </div>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
              className={cx('grid place-items-center rounded-md border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors',
                dragging ? 'border-[var(--a-accent)] bg-[var(--a-accent-soft)]' : 'border-[var(--a-border)] hover:border-[var(--a-border)]')}>
              <span>
                {busy === 'preview' ? <FiRefreshCw className="mx-auto w-8 h-8 animate-spin text-[var(--a-accent)]" /> : <FiUploadCloud className="mx-auto w-8 h-8 text-[var(--a-accent)]" />}
                <span className="mt-3 block text-[15px] font-medium">{file ? file.name : '2. Choose or drop the Practo file'}</span>
                <span className="mt-1 block text-[13px] text-[var(--a-muted)]">
                  {busy === 'preview' ? 'Reading the file…' : file ? `${file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`} · click to choose a different file` : 'Excel (.xlsx, .xls) or CSV, up to 40 MB'}
                </span>
              </span>
              <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </Panel>

          {preview && (
            <>
              <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-5">
                <Stat label="Rows in file" value={n(s.rows_in_file)} />
                <Stat label="New patients" value={n(s.to_create)} tone="accent" />
                <Stat label="Already here (fill in)" value={n(s.to_update)} />
                <Stat label="Families (shared mobile)" value={n(s.family_numbers)} hint={`${n(s.patients_in_families)} patients`} tone="violet" />
                <Stat label="No valid mobile" value={n(s.no_mobile)} hint="imported, but can’t log in to the app" tone={s.no_mobile ? 'warn' : ''} />
              </div>
              {(s.skipped_no_name > 0 || s.duplicates_in_file > 0) && (
                <p className="mt-3 text-[13px] text-[var(--a-muted)]">
                  Skipped: {n(s.skipped_no_name)} rows without a name, {n(s.duplicates_in_file)} repeated rows (the later row in the file wins).
                </p>
              )}

              <Panel className="mt-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold">3. Check the columns</h2>
                    <p className="text-[13px] text-[var(--a-muted)]">Matched automatically. Change any that look wrong.</p>
                  </div>
                  {dirty && <Button variant="secondary" disabled={!!busy} onClick={() => check(file, true)}><FiRefreshCw /> Re-check with these columns</Button>}
                </div>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                  {preview.fields.map((f) => (
                    <label key={f} className="grid grid-cols-[140px_1fr] items-center gap-3 text-[13.5px]">
                      <span className={cx(IMPORTANT.includes(f) ? 'text-[var(--a-text)]' : 'text-[var(--a-muted)]')}>{FIELD_LABELS[f] || f}{f === 'name' ? ' *' : ''}</span>
                      <select value={mapping[f] || ''} onChange={(e) => { setMapping({ ...mapping, [f]: e.target.value || undefined }); setDirty(true); }}
                        className="min-w-0 rounded-lg border border-[var(--a-border)] bg-[var(--a-input)] px-2.5 py-2 text-[13px]">
                        <option value="">Not in file</option>
                        {preview.headers.filter(Boolean).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                {!mapping.phone && (
                  <p className="mt-4 flex items-center gap-2 text-[13px] text-[#b7701a]"><FiAlertTriangle /> No mobile column chosen: patients can’t be grouped into families or matched to website registrations.</p>
                )}
              </Panel>

              <Panel className="mt-5 overflow-hidden">
                <div className="px-5 sm:px-6 pt-5 pb-3"><h2 className="text-[15px] font-semibold">How the first rows will be saved</h2></div>
                <Table head={['Name', 'Mobile', 'Age / sex', 'Practo no.', 'Registered', 'Notes']} minWidth={760}>
                  {preview.sample.map((r, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 font-medium">{r.name}</td>
                      <td className="px-5 py-3">{r.phone || <span className="text-[#b7701a]">missing</span>}{r.alt_phone && <span className="block text-[12px] text-[var(--a-muted)]">+ {r.alt_phone}</span>}</td>
                      <td className="px-5 py-3 text-[var(--a-muted)]">{[r.age, r.sex].filter((v) => v != null && v !== '').join(' · ') || '—'}</td>
                      <td className="px-5 py-3 text-[var(--a-muted)]">{r.practo_id || '—'}</td>
                      <td className="px-5 py-3 text-[var(--a-muted)]">{r.registered_on || '—'}</td>
                      <td className="px-5 py-3 text-[12.5px] text-[var(--a-muted)] max-w-[220px] truncate">{[r.address, r.conditions?.join(', ')].filter(Boolean).join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </Table>
              </Panel>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {preview.sample_families.length > 0 && (
                  <Panel className="p-5">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold"><FiUsers className="text-[#6941c6]" /> Families found</h2>
                    <p className="text-[13px] text-[var(--a-muted)] mb-3">Each person keeps their own patient ID and history. They’re linked by the shared mobile number.</p>
                    <ul className="grid gap-2 text-[13.5px]">
                      {preview.sample_families.map((f) => (
                        <li key={f.phone} className="rounded bg-black/3 px-4 py-2.5">
                          <span className="text-[var(--a-muted)]">+91 {f.phone}</span> · {f.members.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
                {preview.problems.length > 0 && (
                  <Panel className="p-5">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold"><FiFileText className="text-[#b7701a]" /> Rows to look at</h2>
                    <p className="text-[13px] text-[var(--a-muted)] mb-3">The first {preview.problems.length}. Rows without a name are skipped; the rest are still imported.</p>
                    <ul className="grid gap-1.5 text-[13px] max-h-64 overflow-y-auto">
                      {preview.problems.map((p) => (
                        <li key={p.row} className="flex justify-between gap-3">
                          <span>Row {p.row} · {p.name || <em className="text-[var(--a-muted)]">no name</em>}</span>
                          <span className="text-[#b7701a]">{p.issues.join(', ')}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={run} disabled={!!busy || dirty || !s.to_create && !s.to_update}>
                  {busy === 'commit' ? <><FiRefreshCw className="animate-spin" /> Importing…</> : `Import ${n(s.to_create + s.to_update)} patients`}
                </Button>
                {dirty && <span className="text-[13px] text-[#b7701a]">Re-check with the new columns first.</span>}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function Stat({ label, value, hint, tone }) {
  const tones = { accent: 'text-[#0e8a7d]', violet: 'text-[#6941c6]', warn: 'text-[#b7701a]' };
  return (
    <Panel className="p-4">
      <p className="text-[12px] text-[var(--a-muted)]">{label}</p>
      <p className={cx('mt-1 text-[22px] font-semibold tabular-nums', tones[tone])}>{value}</p>
      {hint && <p className="text-[11.5px] text-[var(--a-muted)]">{hint}</p>}
    </Panel>
  );
}
