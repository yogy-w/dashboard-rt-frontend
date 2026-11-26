'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { getPemasukan, type PemasukanRow } from '../../lib/rt-api';

type DetailType = 'DONASI' | 'JIMPITAN';

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

function category(row: PemasukanRow, type: DetailType) {
  if (type === 'DONASI') {
    return row.keterangan.match(/(?:^|\|\s*)Kategori:\s*([^|]+)/i)?.[1]?.trim() || '—';
  }
  return row.keterangan.split(' - ')[0]?.trim() || row.masterId || '—';
}

export default function PemasukanDetailTable({ type, refreshToken = 0 }: { type: DetailType; refreshToken?: number }) {
  const [rows, setRows] = useState<PemasukanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getPemasukan()
      .then(result => {
        if (active) setRows((result.rows || []).filter(row => String(row.tipe || '').trim().toUpperCase() === type));
      })
      .catch(exception => {
        if (active) setError(exception instanceof Error ? exception.message : 'Gagal memuat detail pemasukan.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, refreshToken, reloadToken]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return rows.filter(row => !query || [row.nama, row.nik, row.keterangan, row.id, row.masterId, category(row, type)]
      .join(' ').toLocaleLowerCase('id').includes(query))
      .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')) || String(b.id).localeCompare(String(a.id)));
  }, [rows, search, type]);

  const title = type === 'DONASI' ? 'Detail Donasi' : 'Detail Jimpitan';

  return <section className="detailCard" aria-label={title}>
    <div className="detailHeader">
      <div><h2>{title}</h2><p>Riwayat transaksi {type === 'DONASI' ? 'donasi' : 'jimpitan'} dari APP_PEMASUKAN.</p></div>
      <div className="detailTools">
        <label className="detailSearch"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau keterangan..." /></label>
        <button type="button" className="detailRefresh" onClick={() => setReloadToken(token => token + 1)} title="Muat ulang detail">
          <RefreshCw size={15}/> Refresh
        </button>
      </div>
    </div>
    {error && <div className="detailError">{error}</div>}
    {loading ? <div className="detailEmpty">Memuat detail...</div>
      : !filteredRows.length ? <div className="detailEmpty">Belum ada detail {type === 'DONASI' ? 'donasi' : 'jimpitan'}.</div>
      : <div className="detailTableWrap"><table className="detailTable">
        <thead><tr><th>Tanggal</th><th>{type === 'DONASI' ? 'Tipe' : 'Grup Jimpitan'}</th><th>Nama</th>{type === 'JIMPITAN' && <th>NIK</th>}<th>Keterangan</th><th className="detailAmount">Nominal</th></tr></thead>
        <tbody>{filteredRows.map((row, index) => <tr key={`${row.id}-${index}`}>
          <td>{displayDate(row.tanggal)}</td><td>{type === 'DONASI' ? 'DONASI' : category(row, type)}</td><td>{row.nama || '—'}</td>{type === 'JIMPITAN' && <td>{row.nik || '—'}</td>}
          <td>{type === 'DONASI' ? row.keterangan.replace(/(?:^|\|\s*)Kategori:\s*[^|]+\s*(?:\|\s*)?/i, '').trim() || '—' : row.keterangan.split(' - ').slice(1).join(' - ').trim() || '—'}</td>
          <td className="detailAmount">{money(row.nominal)}</td>
        </tr>)}</tbody>
      </table></div>}
    <style jsx>{`
      .detailCard{width:100%;margin-top:18px;padding:20px;background:#fff;border:1px solid #e5eaf0;border-radius:14px;box-shadow:0 2px 8px rgba(15,23,42,.03);color:#0f172a}
      .detailHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:15px}.detailHeader h2{margin:0;font-size:17px}.detailHeader p{margin:6px 0 0;color:#64748b;font-size:13px}
      .detailTools{display:flex;align-items:center;gap:9px}.detailSearch{height:38px;display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #dbe2ea;border-radius:9px;color:#94a3b8}.detailSearch input{width:230px;border:0;outline:0;font:inherit;font-size:13px;color:#334155}
      .detailRefresh{height:38px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;color:#334155;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
      .detailTableWrap{overflow-x:auto;border:1px solid #e8edf3;border-radius:10px}.detailTable{width:100%;border-collapse:collapse;font-size:13px}.detailTable th{padding:11px 12px;background:#f8fafc;color:#64748b;text-align:left;font-size:11px;text-transform:uppercase;white-space:nowrap}.detailTable td{padding:11px 12px;border-top:1px solid #eef2f7;color:#334155;vertical-align:top}.detailTable tbody tr:hover{background:#fbfdff}.detailAmount{text-align:right!important;white-space:nowrap;font-weight:700}.detailEmpty{padding:28px 12px;color:#64748b;text-align:center}.detailError{margin-bottom:12px;padding:10px 12px;border:1px solid #fecaca;border-radius:9px;background:#fef2f2;color:#b91c1c;font-size:13px}
      @media(max-width:700px){.detailCard{padding:14px}.detailHeader,.detailTools{align-items:stretch;flex-direction:column}.detailSearch input{width:100%}}
    `}</style>
  </section>;
}
