'use client';



import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Check, LogOut, RefreshCw, Save, Search, Trash2, X, Wallet, HandCoins, LayoutDashboard, ReceiptText, Tags , BookOpen } from 'lucide-react';

import {

  getPiutang,
  deleteTransaksi,

  getPemasukan,

  getWarga,


  simpanPemasukan,


  type PiutangItem,

  type PemasukanRow,

  type Warga,

} from '../../lib/rt-api';



const money = (value: number) =>

  new Intl.NumberFormat('id-ID', {

    style: 'currency',

    currency: 'IDR',

    maximumFractionDigits: 0,

  }).format(Math.round(value || 0));



const today = () => {

  const d = new Date();

  const y = d.getFullYear();

  const m = String(d.getMonth() + 1).padStart(2, '0');

  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;

};



function typeLabel(type: string) {
  if (type === 'DANSOS' || type === 'DANA SOSIAL') return 'Dana Sosial';

  if (type === 'IURAN') return 'Iuran';
  if (type === 'DANSOS') return 'Dana Sosial';

  if (type === 'SANTUNAN') return 'Santunan';

  if (type === 'ACARA') return 'Acara';

  return type;

}

// Stable unique key for each payable item, including each monthly iuran.
function getItemKey(item: PiutangItem): string {
  return `${item.tipe}__${item.masterId}__${item.periodeTahun ?? ''}__${item.periodeBulan ?? ''}__${item.tanggal ?? ''}`;
}



export default function PemasukanPage() {

  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const [warga, setWarga] = useState<Warga[]>([]);

  const [nik, setNik] = useState('');

  const [tanggal, setTanggal] = useState(today());

  const [items, setItems] = useState<PiutangItem[]>([]);
  const [pemasukanRows, setPemasukanRows] = useState<PemasukanRow[]>([]);
  const [loadingPemasukan, setLoadingPemasukan] = useState(true);
  const [pemasukanError, setPemasukanError] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState('ALL');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  const [selected, setSelected] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [openYear, setOpenYear] = useState(String(new Date().getFullYear()));

  const [loadingWarga, setLoadingWarga] = useState(true);

  const [loadingItems, setLoadingItems] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PemasukanRow | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState(false);



  const selectedItems = useMemo(

    () => items.filter((item) => selected.includes(getItemKey(item))),

    [items, selected]

  );

  const filteredItems = useMemo(() => items.filter((item) => {
    if (typeFilter === 'ALL') return true;
    const type = String(item.tipe || '').trim().toUpperCase();
    return (type === 'DANA SOSIAL' ? 'DANSOS' : type) === typeFilter;
  }), [items, typeFilter]);

  const filteredPemasukanRows = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase('id');
    return pemasukanRows
      .filter((row) => {
        const type = String(row.tipe || '').trim().toUpperCase();
        if (type === 'JIMPITAN' || type === 'DONASI') return false;
        const normalizedType = type === 'DANA SOSIAL' ? 'DANSOS' : type;
        if (historyType !== 'ALL' && normalizedType !== historyType) return false;
        if (!query) return true;
        return [row.nama, row.nik, row.keterangan, row.id, row.masterId, row.periodeBulan, row.periodeTahun, normalizedType]
          .join(' ')
          .toLocaleLowerCase('id')
          .includes(query);
      })
      .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')) || String(b.id).localeCompare(String(a.id)));
  }, [pemasukanRows, historySearch, historyType]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredPemasukanRows.length / historyPageSize));
  const visiblePemasukanRows = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredPemasukanRows.slice(start, start + historyPageSize);
  }, [filteredPemasukanRows, historyPage]);

  const loadPemasukanHistory = useCallback(async () => {
    setLoadingPemasukan(true);
    setPemasukanError('');
    try {
      const result = await getPemasukan();
      setPemasukanRows(result.rows || []);
    } catch (exception) {
      setPemasukanError(exception instanceof Error ? exception.message : 'Gagal memuat detail pemasukan.');
    } finally {
      setLoadingPemasukan(false);
    }
  }, []);



  const total = useMemo(

    () => selectedItems.reduce((sum, item) => sum + Number(item.nominal || 0), 0),

    [selectedItems]

  );



  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError('');
    try {
      const response = await fetch('/api/pemasukan-auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Logout gagal. Silakan coba lagi.');
      router.replace('/kas');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout gagal. Silakan coba lagi.');
      setLoggingOut(false);
    }
  }

  async function loadWarga() {

    setLoadingWarga(true);

    setError('');



    try {

      const result = await getWarga();

      setWarga(result.rows || []);

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Gagal mengambil data warga');

    } finally {

      setLoadingWarga(false);

    }

  }



  async function loadItems(targetNik = nik, targetTanggal = tanggal) {

    if (!targetNik) {

      setItems([]);

      setSelected([]);

      return;

    }



    setLoadingItems(true);

    setError('');

    setSuccess('');



    try {

      const result = await getPiutang(targetNik, targetTanggal);

      setItems(result.rows || []);

      setSelected([]);

    } catch (e) {

      setItems([]);

      setSelected([]);

      setError(e instanceof Error ? e.message : 'Gagal mengambil tagihan');

    } finally {

      setLoadingItems(false);

    }

  }



  useEffect(() => {

    loadWarga();

  }, []);

  useEffect(() => {
    void loadPemasukanHistory();
  }, [loadPemasukanHistory]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyType]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) setHistoryPage(totalHistoryPages);
  }, [historyPage, totalHistoryPages]);



  useEffect(() => {

    if (nik) {

      loadItems(nik, tanggal);

    }

  }, [nik, tanggal]);



  function toggleItem(item: PiutangItem) {
    const key = getItemKey(item);
    setSelected((current) =>
      current.includes(key)
        ? current.filter((id) => id !== key)
        : [...current, key]
    );
  }

  function toggleAll() {
    const visibleKeys = filteredItems.map(getItemKey);
    if (!visibleKeys.length) return;
    const allVisibleSelected = visibleKeys.every((key) => selected.includes(key));
    setSelected((current) => allVisibleSelected
      ? current.filter((key) => !visibleKeys.includes(key))
      : Array.from(new Set([...current, ...visibleKeys]))
    );
  }



  async function handleSave() {

    if (!nik) {

      setError('Pilih warga terlebih dahulu.');

      return;

    }



    if (!selectedItems.length) {

      setError('Pilih minimal satu pembayaran.');

      return;

    }



    setSaving(true);

    setError('');

    setSuccess('');



    try {

      await simpanPemasukan({

        action: 'simpan_pemasukan',

        nik,

        items: selectedItems.map((item) => ({

          masterId: item.masterId,

          tanggal,

          periodeBulan: item.periodeBulan,

          periodeTahun: item.periodeTahun,

          keterangan: item.keterangan || item.namaItem,

        })),

      });



      setSuccess(

        `${selectedItems.length} pembayaran berhasil disimpan. Total ${money(total)}.`

      );



      await loadItems(nik, tanggal);
      await loadPemasukanHistory();

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Gagal menyimpan pembayaran');

    } finally {

      setSaving(false);

    }

  }

  async function confirmDeleteTransaction() {
    if (!deleteTarget) return;
    setDeletingTransaction(true); setError('');
    try {
      await deleteTransaksi(deleteTarget.id);
      setDeleteTarget(null);
      await Promise.all([loadPemasukanHistory(), nik ? loadItems(nik, tanggal) : Promise.resolve()]);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Gagal menghapus transaksi.');
    } finally { setDeletingTransaction(false); }
  }



  return (

    <main className="pemasukanPage">

      

      {error && <div className="alert error">{error}</div>}

      {success && <div className="alert success">{success}</div>}



      <section className="formCard">

        <div className="sectionTitle">

          <Wallet size={19} />

          Data Pembayaran
          <button
            type="button"
            className="refreshButton"
            onClick={() => loadItems()}
            disabled={!nik || loadingItems}
          >
            <RefreshCw size={16} className={loadingItems ? 'spin' : ''} />
            {loadingItems ? 'Memuat...' : 'Refresh Kewajiban'}
          </button>

        </div>



        <div className="formGrid">

          <div className="field">

            <label>Warga</label>

            <select

              value={nik}

              onChange={(e) => setNik(e.target.value)}

              disabled={loadingWarga}

            >

              <option value="">

                {loadingWarga ? 'Memuat warga...' : 'Pilih warga'}

              </option>

              {warga.map((item) => (

                <option key={item.nik} value={item.nik}>

                  {item.nama} — {item.nik}

                </option>

              ))}

            </select>

          </div>



          <div className="field">

            <label>Tanggal Pembayaran</label>

            <input

              type="date"

              value={tanggal}

              onChange={(e) => setTanggal(e.target.value)}

            />

          </div>

        </div>



        {nik && (

          <div className="selectedWarga">

            <div>

              <span>Warga dipilih</span>

              <strong>

                {warga.find((item) => item.nik === nik)?.nama || nik}

              </strong>

            </div>

            <div>

              <span>NIK</span>

              <strong>{nik}</strong>

            </div>

          </div>

        )}

      </section>



      <section className="listCard">

        <div className="listHeader">

          <div>

            <h2>Kewajiban Belum Dibayar</h2>

            <p>

              {nik

                ? 'Pilih pembayaran yang ingin dicatat.'

                : 'Pilih warga terlebih dahulu.'}

            </p>

          </div>



          <div className="listActions">
            <label className="typeFilterLabel">
              <span>Jenis Pembayaran</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="ALL">Semua jenis</option>
                <option value="IURAN">Iuran</option>
                <option value="DANSOS">Dana Sosial</option>
                <option value="SANTUNAN">Santunan</option>
                <option value="ACARA">Acara</option>
              </select>
            </label>
            {items.length > 0 && filteredItems.length > 0 && <button type="button" className="selectAll" onClick={toggleAll}>
              <Check size={16} />
              {filteredItems.every((item) => selected.includes(getItemKey(item))) ? 'Batal Semua' : 'Pilih Semua'}
            </button>}
          </div>

        </div>



        {loadingItems ? (

          <div className="empty">

            <RefreshCw size={22} className="spin" />

            <span>Mencari kewajiban...</span>

          </div>

        ) : !nik ? (

          <div className="empty">

            <Search size={22} />

            <span>Pilih warga untuk melihat kewajibannya.</span>

          </div>

        ) : !items.length ? (

          <div className="empty">

            <Check size={22} />

            <span>Tidak ada kewajiban yang belum dibayar.</span>

          </div>

        ) : !filteredItems.length ? (

          <div className="empty">
            <Search size={22} />
            <span>Tidak ada kewajiban untuk jenis ini.</span>
          </div>

        ) : (

          <div className="itemList">
            {Array.from(new Set(filteredItems.map(item => Number(item.periodeTahun)).filter(Boolean))).sort((a,b)=>a-b).map(year => {
              const yearItems = filteredItems.filter(item => Number(item.periodeTahun) === year);
              const yearOpen = openYear === String(year);
              const monthOrder = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
              yearItems.sort((a,b) => monthOrder.indexOf(a.periodeBulan)-monthOrder.indexOf(b.periodeBulan));
              return <div className="yearAccordion" key={year}>
                <button type="button" className="yearAccordionHead" aria-expanded={yearOpen} onClick={()=>setOpenYear(yearOpen ? '' : String(year))}>
                  <strong>{year}</strong><span>{yearItems.length} kewajiban</span><span>{yearOpen ? '−' : '+'}</span>
                </button>
                {yearOpen && <div className="yearAccordionBody">{yearItems.map(item => {
                  const checked = selected.includes(getItemKey(item));
                  return <label key={getItemKey(item)} className={`paymentItem ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={()=>toggleItem(item)} />
                    <div className="itemMain"><div className="itemTop"><strong>{item.namaItem}</strong><span className={`typeBadge ${item.tipe.toLowerCase()}`}>{typeLabel(item.tipe)}</span></div>
                    <div className="itemMeta"><span>Periode: {item.periodeBulan} {item.periodeTahun}</span>{item.penerimaNama && <span>Penerima: {item.penerimaNama}</span>}</div></div>
                    <strong className="itemNominal">{money(item.nominal)}</strong>
                  </label>;
                })}</div>}
              </div>;
            })}
          </div>

        )}



        <div className="saveBar">

          <div>

            <span>Total dipilih</span>

            <strong>{money(total)}</strong>

          </div>



          <button

            type="button"

            className="saveButton"

            onClick={handleSave}

            disabled={saving || selectedItems.length === 0}

          >

            <Save size={17} />

            {saving ? 'Menyimpan...' : 'Simpan Pemasukan'}

          </button>

        </div>

      </section>



      <section className="historyCard" aria-labelledby="pemasukan-history-title">
        <div className="historyHeader">
          <div>
            <h2 id="pemasukan-history-title">Detail Pemasukan</h2>
            <p>Riwayat iuran, dana sosial, santunan, dan acara. Donasi serta jimpitan tidak ditampilkan.</p>
            <span className="historyCount">{filteredPemasukanRows.length} transaksi</span>
          </div>
          <div className="historyControls">
            <label className="historyTypeFilter">
              <span>Jenis</span>
              <select value={historyType} onChange={(event) => setHistoryType(event.target.value)}>
                <option value="ALL">Semua jenis</option>
                <option value="IURAN">Iuran</option>
                <option value="DANSOS">Dana Sosial</option>
                <option value="SANTUNAN">Santunan</option>
                <option value="ACARA">Acara</option>
              </select>
            </label>
            <label className="historySearch">
              <Search size={16} />
              <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Cari nama, NIK, atau keterangan..." />
            </label>
            <button type="button" className="historyRefresh" onClick={() => void loadPemasukanHistory()} disabled={loadingPemasukan}>
              <RefreshCw size={15} className={loadingPemasukan ? 'spin' : ''} />
              {loadingPemasukan ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </div>

        {pemasukanError && <div className="historyError">{pemasukanError}</div>}
        {loadingPemasukan ? <div className="historyEmpty">Memuat detail pemasukan...</div>
          : filteredPemasukanRows.length === 0 ? <div className="historyEmpty">Tidak ada detail pemasukan untuk filter ini.</div>
          : <>
            <div className="historyTableWrap">
              <table className="historyTable">
                <thead><tr><th>Tanggal</th><th>Jenis</th><th>Periode</th><th>Warga</th><th>Keterangan</th><th className="historyAmount">Nominal</th><th>Aksi</th></tr></thead>
                <tbody>{visiblePemasukanRows.map((row, index) => {
                  const normalizedType = String(row.tipe || '').trim().toUpperCase() === 'DANA SOSIAL' ? 'DANSOS' : String(row.tipe || '').trim().toUpperCase();
                  return <tr key={`${row.id}-${row.nik}-${index}`}>
                    <td>{row.tanggal || '—'}</td>
                    <td><span className={`historyTypeBadge ${normalizedType.toLowerCase()}`}>{typeLabel(normalizedType)}</span></td>
                    <td>{row.periodeBulan && row.periodeTahun ? `${row.periodeBulan} ${row.periodeTahun}` : '—'}</td>
                    <td>{row.nama || '—'}</td>
                    <td className="historyDescription">{row.keterangan || '—'}</td>
                    <td className="historyAmount">{money(row.nominal)}</td>
                    <td>{['IURAN', 'DANSOS', 'DANA SOSIAL', 'SANTUNAN', 'ACARA'].includes(normalizedType) && <button type="button" className="historyDelete" onClick={() => setDeleteTarget(row)} aria-label={`Hapus transaksi ${row.id}`}><Trash2 size={14}/> Hapus</button>}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="historyPagination">
              <span>Menampilkan {((historyPage - 1) * historyPageSize) + 1}–{Math.min(historyPage * historyPageSize, filteredPemasukanRows.length)} dari {filteredPemasukanRows.length}</span>
              <div>
                <button type="button" onClick={() => setHistoryPage(page => Math.max(1, page - 1))} disabled={historyPage <= 1}>Sebelumnya</button>
                <span>Halaman {historyPage} / {totalHistoryPages}</span>
                <button type="button" onClick={() => setHistoryPage(page => Math.min(totalHistoryPages, page + 1))} disabled={historyPage >= totalHistoryPages}>Berikutnya</button>
              </div>
            </div>
          </>}
      </section>

      {deleteTarget && <div className="historyModalOverlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !deletingTransaction) setDeleteTarget(null); }}>
        <section className="historyModal" role="dialog" aria-modal="true" aria-labelledby="deleteIncomeTitle">
          <header><div><h3 id="deleteIncomeTitle">Hapus transaksi pemasukan?</h3><p>{deleteTarget.id} · {deleteTarget.nama || typeLabel(deleteTarget.tipe)} · {money(deleteTarget.nominal)}</p></div><button type="button" onClick={() => setDeleteTarget(null)} disabled={deletingTransaction} aria-label="Tutup"><X size={18}/></button></header>
          <p>Transaksi ini akan dihapus dari APP_PEMASUKAN dan dicatat di audit log.</p>
          {error && <div className="historyError">{error}</div>}
          <footer><button type="button" className="historyCancel" onClick={() => { setDeleteTarget(null); setError(''); }} disabled={deletingTransaction}>Batal</button><button type="button" className="historyDeleteConfirm" onClick={() => void confirmDeleteTransaction()} disabled={deletingTransaction}>{deletingTransaction ? 'Menghapus...' : 'Ya, Hapus'}</button></footer>
        </section>
      </div>}

      <style jsx>{`

        .pemasukanPage {
          width: 100%;
          min-height: 0;
          background: transparent;
          padding: 0 0 24px;
          color: #0f172a;
        }



        .pemasukanTabs {
          max-width: 1100px; margin: 0 auto 22px; display: flex; align-items: center;
          gap: 10px; padding: 10px; background: #eef2f7; border: 1px solid #e1e7f0;
          border-radius: 16px; overflow-x: auto;
        }
        .pemasukanTabs :global(.tabItem) {
          display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center;
          gap: 9px; min-height: 44px; padding: 0 18px; border: 1px solid #d8e0eb;
          border-radius: 11px; background: #fff; color: #475569 !important;
          text-decoration: none !important; font-size: 14px; font-weight: 650;
          white-space: nowrap; transition: background .15s, border-color .15s, color .15s;
        }
        .pemasukanTabs :global(.tabItem:hover) { background: #f8fbff; border-color: #9db9e8; color: #1d4ed8 !important; }
        .pemasukanTabs :global(.tabItem.active) { background: #2563eb; border-color: #2563eb; color: #fff !important; box-shadow: 0 3px 8px rgba(37,99,235,.20); }
        .pemasukanTabs :global(.tabItem.active:hover) { background: #1d4ed8; color: #fff !important; }

        .pemasukanHeader {
          max-width: none;
          margin-left: 0;
          margin-right: 0;
        }

        /* Samakan lebar Input Iuran dengan area Dashboard Kas/Jimpitan */
        .formCard,
        .listCard {
          width: 100%;
          max-width: none;
          margin-left: 0;
          margin-right: 0;
        }



        .historyCard { width: 100%; margin-top: 18px; padding: 20px; border: 1px solid #e5eaf0; border-radius: 14px; background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03); }
        .historyHeader { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 16px; }
        .historyHeader h2 { margin: 0; font-size: 17px; }
        .historyHeader p { margin: 6px 0; color: #64748b; font-size: 13px; }
        .historyCount { color: #64748b; font-size: 12px; }
        .historyControls { display: flex; align-items: flex-end; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
        .historyTypeFilter { display: grid; gap: 5px; color: #64748b; font-size: 11px; font-weight: 700; }
        .historyTypeFilter select, .historySearch input { height: 38px; border: 1px solid #dbe2ea; border-radius: 9px; background: #fff; color: #334155; font: inherit; font-size: 13px; }
        .historyTypeFilter select { min-width: 132px; padding: 0 10px; }
        .historySearch { display: flex; align-items: center; gap: 7px; height: 38px; padding-left: 10px; border: 1px solid #dbe2ea; border-radius: 9px; color: #94a3b8; }
        .historySearch input { width: 230px; height: 34px; padding: 0 8px 0 0; border: 0; outline: 0; }
        .historyRefresh, .historyPagination button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 0 11px; border: 1px solid #dbe2ea; border-radius: 9px; background: #fff; color: #334155; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .historyRefresh:disabled, .historyPagination button:disabled { opacity: .5; cursor: not-allowed; }
        .historyTableWrap { overflow-x: auto; border: 1px solid #e8edf3; border-radius: 10px; }
        .historyTable { width: 100%; border-collapse: collapse; font-size: 13px; }
        .historyTable th { padding: 11px 12px; background: #f8fafc; color: #64748b; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; white-space: nowrap; }
        .historyTable td { padding: 11px 12px; border-top: 1px solid #eef2f7; color: #334155; vertical-align: top; }
        .historyTable tbody tr:hover { background: #fbfdff; }
        .historyAmount { text-align: right !important; white-space: nowrap; font-weight: 700; }
        .historyTypeBadge { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .historyTypeBadge.dansos { background: #f0fdf4; color: #15803d; }
        .historyTypeBadge.santunan { background: #fff7ed; color: #c2410c; }
        .historyTypeBadge.acara { background: #faf5ff; color: #7e22ce; }
        .historyDescription { min-width: 200px; max-width: 360px; white-space: normal; }
        .historyEmpty { padding: 28px 12px; color: #64748b; text-align: center; }
        .historyError { margin-bottom: 12px; padding: 10px 12px; border: 1px solid #fecaca; border-radius: 9px; background: #fef2f2; color: #b91c1c; font-size: 13px; }
        .historyPagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; color: #64748b; font-size: 12px; }
        .historyPagination > div { display: flex; align-items: center; gap: 10px; }
        .historyDelete { display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px; border: 1px solid #fecaca; border-radius: 8px; background: #fff; color: #b91c1c; font-size: 12px; font-weight: 650; cursor: pointer; white-space: nowrap; }
        .historyModalOverlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15,23,42,.48); }
        .historyModal { width: min(460px,100%); padding: 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 20px 60px rgba(15,23,42,.25); }
        .historyModal header { display: flex; justify-content: space-between; gap: 12px; }
        .historyModal h3 { margin: 0; font-size: 18px; }
        .historyModal header p,.historyModal>p { color: #64748b; font-size: 13px; }
        .historyModal header button { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #dbe2ea; border-radius: 8px; background: white; cursor: pointer; }
        .historyModal footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
        .historyModal footer button { height: 38px; padding: 0 13px; border: 1px solid #dbe2ea; border-radius: 8px; background: white; font-weight: 650; cursor: pointer; }
        .historyModal footer .historyDeleteConfirm { border-color: #dc2626; background: #dc2626; color: white; }

        .pemasukanHeader {

          display: flex;

          justify-content: space-between;

          align-items: flex-start;

          gap: 20px;

          margin-bottom: 20px;

        }



        h1 {

          margin: 0;

          font-size: 27px;

        }



        .pemasukanHeader p,

        .listHeader p {

          margin: 6px 0 0;

          color: #64748b;

        }



        .refreshButton,

        .selectAll,

        .saveButton {

          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          border-radius: 9px;

          cursor: pointer;

          font-weight: 600;

        }



        .refreshButton {

          padding: 10px 14px;

          border: 1px solid #dbe2ea;

          background: #fff;

          color: #334155;

        }



        .refreshButton:disabled,

        .saveButton:disabled {

          opacity: 0.5;

          cursor: not-allowed;

        }



        .alert {

          max-width: 1100px;

          margin: 0 auto 16px;

          padding: 13px 15px;

          border-radius: 10px;

          font-size: 14px;

        }



        .alert.error {

          background: #fef2f2;

          border: 1px solid #fecaca;

          color: #b91c1c;

        }



        .alert.success {

          background: #f0fdf4;

          border: 1px solid #bbf7d0;

          color: #166534;

        }



        .formCard,

        .listCard {

          background: #fff;

          border: 1px solid #e5eaf0;

          border-radius: 14px;

          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);

        }



        .formCard {

          padding: 20px;

          margin-bottom: 18px;

        }



        .sectionTitle {

          display: flex;

          align-items: center;

          gap: 8px;

          justify-content: space-between;

          font-size: 16px;

          font-weight: 750;

          margin-bottom: 18px;

        }



        .formGrid {

          display: grid;

          grid-template-columns: 1.5fr 1fr;

          gap: 15px;

        }



        .field {

          display: flex;

          flex-direction: column;

          gap: 7px;

        }



        .field label {

          color: #475569;

          font-size: 13px;

          font-weight: 600;

        }



        .field select,

        .field input {

          width: 100%;

          height: 44px;

          padding: 0 12px;

          border: 1px solid #dbe2ea;

          border-radius: 9px;

          background: #fff;

          outline: none;

        }



        .field select:focus,

        .field input:focus {

          border-color: #2563eb;

          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);

        }



        .selectedWarga {

          display: flex;

          gap: 35px;

          margin-top: 16px;

          padding: 13px 15px;

          background: #f8fafc;

          border-radius: 9px;

        }



        .selectedWarga div {

          display: flex;

          flex-direction: column;

          gap: 3px;

        }



        .selectedWarga span {

          color: #64748b;

          font-size: 12px;

        }



        .selectedWarga strong {

          font-size: 14px;

        }



        .listCard {

          overflow: hidden;

        }



        .listHeader {

          padding: 20px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 15px;

          border-bottom: 1px solid #eef2f7;

        }



        .listActions {

          display: flex;

          align-items: flex-end;

          gap: 10px;

        }

        .typeFilterLabel {

          display: grid;

          gap: 5px;

          color: #64748b;

          font-size: 11px;

          font-weight: 700;

        }

        .typeFilterLabel select {

          min-width: 150px;

          height: 38px;

          padding: 0 10px;

          border: 1px solid #dbe2ea;

          border-radius: 9px;

          background: #fff;

          color: #334155;

          font: inherit;

          font-size: 13px;

        }

        .listHeader h2 {

          margin: 0;

          font-size: 17px;

        }



        .selectAll {

          border: 1px solid #dbe2ea;

          background: #fff;

          color: #334155;

          padding: 9px 12px;

          white-space: nowrap;

        }



        .itemList {
          padding: 10px 20px;
        }

        .yearAccordion { border: 1px solid #e2e8f0; border-radius: 11px; overflow: hidden; margin-bottom: 10px; }
        .yearAccordionHead { width: 100%; display: flex; align-items: center; gap: 12px; padding: 13px 15px; background: #f8fafc; border: 0; text-align: left; cursor: pointer; color: #0f172a; }
        .yearAccordionHead span:nth-child(2) { margin-left: auto; color: #64748b; font-size: 12px; }
        .yearAccordionBody { padding: 8px 14px; }



        .paymentItem {

          display: flex;

          align-items: center;

          gap: 14px;

          padding: 15px 4px;

          border-bottom: 1px solid #eef2f7;

          cursor: pointer;

        }



        .paymentItem:last-child {

          border-bottom: 0;

        }



        .paymentItem.checked {

          background: #f8fbff;

        }



        .paymentItem input {

          width: 18px;

          height: 18px;

          accent-color: #2563eb;

          flex: 0 0 auto;

        }



        .itemMain {

          flex: 1;

          min-width: 0;

        }



        .itemTop {

          display: flex;

          align-items: center;

          gap: 9px;

          flex-wrap: wrap;

        }



        .itemTop strong {

          font-size: 14px;

        }



        .typeBadge {

          padding: 3px 7px;

          border-radius: 999px;

          font-size: 10px;

          font-weight: 700;

        }



        .typeBadge.iuran {

          background: #eff6ff;

          color: #2563eb;

        }



        .typeBadge.santunan {

          background: #fff7ed;

          color: #c2410c;

        }



        .typeBadge.acara {

          background: #f5f3ff;

          color: #7c3aed;

        }



        .itemMeta {

          display: flex;

          gap: 15px;

          flex-wrap: wrap;

          color: #64748b;

          font-size: 12px;

          margin-top: 6px;

        }



        .itemNominal {

          white-space: nowrap;

          font-size: 14px;

        }



        .empty {

          min-height: 180px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 9px;

          color: #94a3b8;

        }



        .saveBar {

          border-top: 1px solid #eef2f7;

          padding: 16px 20px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 15px;

        }



        .saveBar > div {

          display: flex;

          flex-direction: column;

          gap: 3px;

        }



        .saveBar span {

          color: #64748b;

          font-size: 12px;

        }



        .saveBar strong {

          font-size: 20px;

        }



        .saveButton {

          border: 0;

          padding: 11px 16px;

          background: #2563eb;

          color: #fff;

        }



        .saveButton:hover:not(:disabled) {

          background: #1d4ed8;

        }



        .spin {

          animation: spin 0.9s linear infinite;

        }



        @keyframes spin {

          to {

            transform: rotate(360deg);

          }

        }



        @media (max-width: 700px) {

          .historyCard { padding: 14px; }
          .historyHeader { align-items: stretch; flex-direction: column; }
          .historyControls { align-items: stretch; flex-direction: column; }
          .historyTypeFilter select, .historySearch input { width: 100%; }
          .historyPagination { align-items: flex-start; flex-direction: column; }
          .historyPagination > div { width: 100%; justify-content: space-between; }

          .pemasukanPage {
            padding: 0 0 20px;
          }



          .pemasukanHeader {

            flex-direction: column;

          }



          .formGrid {

            grid-template-columns: 1fr;

          }

          .sectionTitle { flex-wrap: wrap; }



          .selectedWarga {

            flex-direction: column;

            gap: 10px;

          }



          .listHeader,

          .saveBar {

            align-items: stretch;

            flex-direction: column;

          }

          .listActions {

            width: 100%;

            align-items: stretch;

            flex-direction: column;

          }

          .typeFilterLabel select {

            width: 100%;

          }



          .saveButton,

          .selectAll {

            width: 100%;

          }



          .paymentItem {

            align-items: flex-start;

          }



          .itemNominal {

            margin-left: auto;

          }

        }

      `}</style>

    </main>

  );

}
