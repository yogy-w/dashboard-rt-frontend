'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import { getMasterDonasi, tambahMasterDonasi, type MasterDonasiRow } from '../../../lib/rt-api';

export default function MasterDonasiPage() {
  const [rows, setRows] = useState<MasterDonasiRow[]>([]);
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await getMasterDonasi(); setRows(result.rows || []); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Gagal memuat master donasi.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function add() {
    if (!nama.trim()) { setError('Kategori donasi wajib diisi.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await tambahMasterDonasi(nama.trim());
      setNama(''); setSuccess(result.message || 'Tipe donasi berhasil ditambahkan.');
      await load();
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Gagal menambahkan kategori donasi.'); }
    finally { setSaving(false); }
  }

  return <main className="mdPage">
    {error && <div className="mdAlert error">{error}</div>}
    {success && <div className="mdAlert success">{success}</div>}
    <section className="mdCard">
      <div className="mdTitle"><Tags size={21}/><div><h1>Master Donasi</h1><p>Kategori yang ditambahkan akan tersedia sebagai pilihan di form Donasi.</p></div></div>
      <div className="mdAdd"><label>Kategori Donasi<input value={nama} onChange={event => setNama(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void add(); }} placeholder="Contoh: Sosial, Kegiatan RT" /></label><button type="button" onClick={() => void add()} disabled={saving}><Plus size={16}/>{saving ? 'Menyimpan...' : 'Tambah Kategori'}</button></div>
    </section>
    <section className="mdCard">
      <div className="mdListHead"><div><h2>Daftar Kategori Donasi</h2><p>{rows.length} kategori · master hanya dapat ditambahkan.</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
      {loading ? <p>Memuat kategori donasi...</p> : !rows.length ? <p>Belum ada kategori donasi.</p> : <div className="mdTableWrap"><table><thead><tr><th>ID</th><th>Kategori Donasi</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.id}</strong></td><td>{row.nama}</td></tr>)}</tbody></table></div>}
    </section>
    <style jsx>{`
      .mdPage{width:100%;color:#0f172a;padding:0 0 24px}.mdCard{width:100%;margin-bottom:16px;padding:20px;background:#fff;border:1px solid #e5eaf0;border-radius:14px;box-shadow:0 2px 8px rgba(15,23,42,.03)}
      .mdTitle{display:flex;align-items:center;gap:12px;margin-bottom:18px}.mdTitle h1,.mdListHead h2{margin:0;font-size:19px}.mdTitle p,.mdListHead p{margin:6px 0 0;color:#64748b;font-size:13px}
      .mdAdd{display:flex;align-items:flex-end;gap:12px}.mdAdd label{display:grid;flex:1;gap:7px;color:#334155;font-size:13px;font-weight:650}.mdAdd input{height:42px;padding:0 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.mdAdd button,.mdListHead button{height:42px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border:0;border-radius:9px;background:#2563eb;color:white;font-weight:700;cursor:pointer}.mdListHead button{height:36px;border:1px solid #dbe2ea;background:white;color:#334155}
      .mdListHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.mdTableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:11px 10px;border-bottom:1px solid #e8edf3;text-align:left}th{background:#f8fafc;color:#475569}.mdAlert{padding:12px 14px;margin-bottom:14px;border-radius:9px}.error{background:#fef2f2;color:#b91c1c}.success{background:#f0fdf4;color:#166534}
      @media(max-width:650px){.mdCard{padding:15px}.mdAdd{align-items:stretch;flex-direction:column}.mdAdd button{width:100%}.mdListHead{align-items:flex-start}}
    `}</style>
  </main>;
}
