'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  deleteTransaksi,
  getMaster,
  getMasterDonasi,
  getPemasukan,
  updateDonasi,
  updateJimpitan,
  type MasterDonasiRow,
  type PemasukanRow,
} from '../../lib/rt-api';

type DetailType = 'DONASI' | 'JIMPITAN';
type JimpitanMaster = { id: string; namaItem: string; tipe: string; status: boolean };
type EditForm = { id: string; masterId: string; tanggal: string; nama: string; nominal: string; keterangan: string };

const money = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value || 0);

function displayDate(value: string | null) {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function dateInputValue(value: string | null) {
  if (!value) return '';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
}

function legacyDonationCategory(row: PemasukanRow) {
  return row.keterangan.match(/(?:^|\|\s*)Kategori:\s*([^|]+)/i)?.[1]?.trim() || '';
}

function noteForEdit(row: PemasukanRow, type: DetailType, jimpitanName = '') {
  if (type === 'DONASI') return row.keterangan.replace(/(?:^|\|\s*)Kategori:\s*[^|]+\s*(?:\|\s*)?/i, '').trim();
  if (jimpitanName && row.keterangan.startsWith(`${jimpitanName} - `)) return row.keterangan.slice(jimpitanName.length + 3).trim();
  if (jimpitanName && row.keterangan === jimpitanName) return '';
  return row.keterangan;
}

export default function PemasukanDetailTable({ type, refreshToken = 0 }: { type: DetailType; refreshToken?: number }) {
  const [rows, setRows] = useState<PemasukanRow[]>([]);
  const [donationTypes, setDonationTypes] = useState<MasterDonasiRow[]>([]);
  const [jimpitanMasters, setJimpitanMasters] = useState<JimpitanMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PemasukanRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const masterRequest = type === 'DONASI'
      ? getMasterDonasi().then(result => ({ donations: result.rows || [], jimpitan: [] as JimpitanMaster[] }))
      : getMaster().then((result: any) => ({
        donations: [] as MasterDonasiRow[],
        jimpitan: (result.rows || []).filter((row: JimpitanMaster) => row.tipe === 'JIMPITAN'),
      }));
    Promise.all([getPemasukan(), masterRequest])
      .then(([result, masters]) => {
        if (!active) return;
        setRows((result.rows || []).filter(row => String(row.tipe || '').trim().toUpperCase() === type));
        setDonationTypes(masters.donations);
        setJimpitanMasters(masters.jimpitan);
      })
      .catch(exception => { if (active) setError(exception instanceof Error ? exception.message : 'Gagal memuat detail transaksi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, refreshToken, reloadToken]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return rows.filter(row => !query || [row.nama, row.nik, row.keterangan, row.id, row.masterId, row.tipe,
      donationTypes.find(master => master.id === row.masterId)?.nama || legacyDonationCategory(row)]
      .join(' ').toLocaleLowerCase('id').includes(query))
      .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')) || String(b.id).localeCompare(String(a.id)));
  }, [rows, search, type, donationTypes]);

  const title = type === 'DONASI' ? 'Detail Donasi' : 'Detail Jimpitan';

  function beginEdit(row: PemasukanRow) {
    const masterName = jimpitanMasters.find(master => master.id === row.masterId)?.namaItem || '';
    setEditForm({
      id: row.id,
      masterId: row.masterId || (type === 'DONASI' ? donationTypes.find(master => master.nama === legacyDonationCategory(row))?.id || '' : ''),
      tanggal: dateInputValue(row.tanggal),
      nama: row.nama || '',
      nominal: String(row.nominal || ''),
      keterangan: noteForEdit(row, type, masterName),
    });
    setError('');
  }

  async function saveEdit() {
    if (!editForm) return;
    const amount = Number(editForm.nominal);
    if (!editForm.tanggal) { setError('Tanggal wajib diisi.'); return; }
    if (!editForm.masterId) { setError(type === 'DONASI' ? 'Pilih kategori donasi.' : 'Pilih grup jimpitan.'); return; }
    if (type === 'DONASI' && !editForm.nama.trim()) { setError('Nama donatur wajib diisi.'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError('Nominal harus lebih dari nol.'); return; }
    setSaving(true); setError('');
    try {
      if (type === 'DONASI') await updateDonasi({ id: editForm.id, masterId: editForm.masterId, tanggal: editForm.tanggal, namaDonatur: editForm.nama.trim(), nominal: amount, keterangan: editForm.keterangan.trim() });
      else await updateJimpitan({ id: editForm.id, masterId: editForm.masterId, tanggal: editForm.tanggal, nominal: amount, keterangan: editForm.keterangan.trim() });
      setEditForm(null); setReloadToken(token => token + 1);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Gagal memperbarui transaksi.'); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true); setError('');
    try {
      await deleteTransaksi(deleteTarget.id);
      setDeleteTarget(null); setReloadToken(token => token + 1);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Gagal menghapus transaksi.'); }
    finally { setSaving(false); }
  }

  return <section className="detailCard" aria-label={title}>
    <div className="detailHeader">
      <div><h2>{title}</h2><p>Riwayat transaksi {type === 'DONASI' ? 'donasi' : 'jimpitan'} dari APP_PEMASUKAN.</p></div>
      <div className="detailTools">
        <label className="detailSearch"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau keterangan..." /></label>
        <button type="button" className="detailRefresh" onClick={() => setReloadToken(token => token + 1)} title="Muat ulang detail"><RefreshCw size={15}/> Refresh</button>
      </div>
    </div>
    {error && !editForm && !deleteTarget && <div className="detailError">{error}</div>}
    {loading ? <div className="detailEmpty">Memuat detail...</div>
      : !filteredRows.length ? <div className="detailEmpty">Belum ada detail {type === 'DONASI' ? 'donasi' : 'jimpitan'}.</div>
      : <div className="detailTableWrap"><table className="detailTable">
        <thead><tr><th>Tanggal</th>{type === 'DONASI' ? <><th>Tipe</th><th>Kategori Donasi</th><th>Nama</th><th>Keterangan</th></> : <><th>Grup Jimpitan</th><th>Keterangan</th></>}<th className="detailAmount">Nominal</th><th>Aksi</th></tr></thead>
        <tbody>{filteredRows.map((row, index) => {
          const donationTypeName = donationTypes.find(master => master.id === row.masterId)?.nama || legacyDonationCategory(row) || '—';
          const jimpitanName = jimpitanMasters.find(master => master.id === row.masterId)?.namaItem || row.keterangan.split(' - ')[0] || row.masterId || '—';
          const note = type === 'DONASI' ? noteForEdit(row, type) || '—' : noteForEdit(row, type, jimpitanName) || '—';
          return <tr key={`${row.id}-${index}`}>
            <td>{displayDate(row.tanggal)}</td>
            {type === 'DONASI' ? <><td>DONASI</td><td>{donationTypeName}</td><td>{row.nama || '—'}</td><td>{note}</td></> : <><td>{jimpitanName}</td><td>{note}</td></>}
            <td className="detailAmount">{money(row.nominal)}</td>
            <td><div className="rowActions"><button type="button" onClick={() => beginEdit(row)} aria-label={`Edit ${row.id}`}><Pencil size={14}/> Edit</button><button type="button" className="deleteAction" onClick={() => setDeleteTarget(row)} aria-label={`Hapus ${row.id}`}><Trash2 size={14}/> Hapus</button></div></td>
          </tr>;
        })}</tbody>
      </table></div>}

    {(editForm || deleteTarget) && <div className="modalOverlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) { setEditForm(null); setDeleteTarget(null); setError(''); } }}>
      {editForm && <section className="modal" role="dialog" aria-modal="true" aria-labelledby="editTitle">
        <header><div><h3 id="editTitle">Edit {type === 'DONASI' ? 'Donasi' : 'Jimpitan'}</h3><p>ID transaksi: {editForm.id}</p></div><button type="button" className="closeButton" onClick={() => { setEditForm(null); setError(''); }} disabled={saving} aria-label="Tutup"><X size={18}/></button></header>
        {error && <div className="detailError">{error}</div>}
        <div className="modalGrid">
          <label>Tanggal<input type="date" value={editForm.tanggal} onChange={event => setEditForm({ ...editForm, tanggal: event.target.value })}/></label>
          {type === 'DONASI' ? <><label>Tipe<input value="DONASI" readOnly/></label><label>Kategori Donasi<select value={editForm.masterId} onChange={event => setEditForm({ ...editForm, masterId: event.target.value })}><option value="">Pilih kategori donasi</option>{donationTypes.map(master => <option key={master.id} value={master.id}>{master.nama}</option>)}</select></label><label>Nama Donatur<input value={editForm.nama} onChange={event => setEditForm({ ...editForm, nama: event.target.value })}/></label></> : <label>Grup Jimpitan<select value={editForm.masterId} onChange={event => setEditForm({ ...editForm, masterId: event.target.value })}><option value="">Pilih grup jimpitan</option>{jimpitanMasters.map(master => <option key={master.id} value={master.id}>{master.namaItem}</option>)}</select></label>}
          <label>Nominal (Rp)<input type="number" min="1" value={editForm.nominal} onChange={event => setEditForm({ ...editForm, nominal: event.target.value })}/></label>
          <label className="wide">Keterangan<input value={editForm.keterangan} onChange={event => setEditForm({ ...editForm, keterangan: event.target.value })}/></label>
        </div>
        <footer><button type="button" className="cancelButton" onClick={() => { setEditForm(null); setError(''); }} disabled={saving}>Batal</button><button type="button" className="saveButton" onClick={() => void saveEdit()} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button></footer>
      </section>}
      {deleteTarget && <section className="modal confirmModal" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
        <header><div><h3 id="deleteTitle">Hapus transaksi?</h3><p>Transaksi {deleteTarget.id} akan dihapus dari APP_PEMASUKAN.</p></div><button type="button" className="closeButton" onClick={() => { setDeleteTarget(null); setError(''); }} disabled={saving} aria-label="Tutup"><X size={18}/></button></header>
        {error && <div className="detailError">{error}</div>}
        <footer><button type="button" className="cancelButton" onClick={() => { setDeleteTarget(null); setError(''); }} disabled={saving}>Batal</button><button type="button" className="deleteConfirm" onClick={() => void confirmDelete()} disabled={saving}>{saving ? 'Menghapus...' : 'Ya, Hapus'}</button></footer>
      </section>}
    </div>}

    <style jsx>{`
      .detailCard{width:100%;margin-top:18px;padding:20px;background:#fff;border:1px solid #e5eaf0;border-radius:14px;box-shadow:0 2px 8px rgba(15,23,42,.03);color:#0f172a}
      .detailHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:15px}.detailHeader h2{margin:0;font-size:17px}.detailHeader p{margin:6px 0 0;color:#64748b;font-size:13px}
      .detailTools{display:flex;align-items:center;gap:9px}.detailSearch{height:38px;display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #dbe2ea;border-radius:9px;color:#94a3b8}.detailSearch input{width:230px;border:0;outline:0;font:inherit;font-size:13px;color:#334155}
      .detailRefresh,.rowActions button{height:36px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;border:1px solid #dbe2ea;border-radius:8px;background:#fff;color:#334155;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.detailTableWrap{overflow-x:auto;border:1px solid #e8edf3;border-radius:10px}
      .detailTable{width:100%;border-collapse:collapse;font-size:13px}.detailTable th{padding:11px 12px;background:#f8fafc;color:#64748b;text-align:left;font-size:11px;text-transform:uppercase;white-space:nowrap}.detailTable td{padding:11px 12px;border-top:1px solid #eef2f7;color:#334155;vertical-align:top}.detailTable tbody tr:hover{background:#fbfdff}.detailAmount{text-align:right!important;white-space:nowrap;font-weight:700}.detailEmpty{padding:28px 12px;color:#64748b;text-align:center}.detailError{margin-bottom:12px;padding:10px 12px;border:1px solid #fecaca;border-radius:9px;background:#fef2f2;color:#b91c1c;font-size:13px}
      .rowActions{display:flex;gap:6px}.rowActions .deleteAction{color:#b91c1c;border-color:#fecaca}.modalOverlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.48)}.modal{width:min(560px,100%);max-height:calc(100vh - 40px);overflow-y:auto;padding:20px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 20px 60px rgba(15,23,42,.25)}.modal header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}.modal h3{margin:0;font-size:18px}.modal header p{margin:5px 0 0;color:#64748b;font-size:12px}.closeButton{display:grid;place-items:center;width:34px;height:34px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;cursor:pointer}.modalGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.modalGrid label{display:grid;gap:6px;color:#475569;font-size:12px;font-weight:650}.modalGrid input,.modalGrid select{height:40px;min-width:0;padding:0 10px;border:1px solid #dbe2ea;border-radius:8px;background:#fff;color:#334155;font:inherit}.modalGrid .wide{grid-column:1/-1}.modal footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.modal footer button{height:38px;padding:0 13px;border:1px solid #dbe2ea;border-radius:8px;background:#fff;color:#334155;font:inherit;font-size:13px;font-weight:650;cursor:pointer}.modal footer .saveButton{border-color:#2563eb;background:#2563eb;color:#fff}.modal footer .deleteConfirm{border-color:#dc2626;background:#dc2626;color:#fff}.confirmModal{width:min(450px,100%)}
      @media(max-width:700px){.detailCard{padding:14px}.detailHeader,.detailTools{align-items:stretch;flex-direction:column}.detailSearch input{width:100%}.modalGrid{grid-template-columns:1fr}.modalGrid .wide{grid-column:auto}}
    `}</style>
  </section>;
}
