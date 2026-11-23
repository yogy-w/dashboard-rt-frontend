'use client';



import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Check, LogOut, RefreshCw, Save, Search, Wallet, HandCoins } from 'lucide-react';

import {

  getPiutang,

  getWarga,

  getMaster,

  simpanPemasukan,

  simpanJimpitan,

  type PiutangItem,

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

  if (type === 'IURAN') return 'Iuran';

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

  const [selected, setSelected] = useState<string[]>([]);

  const [loadingWarga, setLoadingWarga] = useState(true);

  const [loadingItems, setLoadingItems] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');
  const [masterJimpitan, setMasterJimpitan] = useState<Array<{id:string; namaItem:string; status:boolean}>>([]);
  const [jimpitanMasterId, setJimpitanMasterId] = useState('');
  const [jimpitanTanggal, setJimpitanTanggal] = useState(today());
  const [jimpitanKeterangan, setJimpitanKeterangan] = useState('');
  const [jimpitanNominal, setJimpitanNominal] = useState('');
  const [savingJimpitan, setSavingJimpitan] = useState(false);



  const selectedItems = useMemo(

    () => items.filter((item) => selected.includes(getItemKey(item))),

    [items, selected]

  );



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
      router.replace('/pemasukan/login');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout gagal. Silakan coba lagi.');
      setLoggingOut(false);
    }
  }

  async function loadMasterJimpitan() {
    try {
      const result = await getMaster() as { rows?: Array<{id:string; tipe:string; namaItem:string; status:boolean}> };
      const rows = (result.rows || []).filter((r) => r.tipe === 'JIMPITAN' && r.status === true);
      setMasterJimpitan(rows);
      if (!jimpitanMasterId && rows.length) setJimpitanMasterId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil master jimpitan');
    }
  }

  async function handleSaveJimpitan() {
    const nominal = Number(jimpitanNominal);
    if (!jimpitanMasterId) { setError('Pilih grup jimpitan terlebih dahulu.'); return; }
    if (!jimpitanTanggal) { setError('Tanggal wajib diisi.'); return; }
    if (!Number.isFinite(nominal) || nominal <= 0) { setError('Nominal harus lebih dari 0.'); return; }
    setSavingJimpitan(true); setError(''); setSuccess('');
    try {
      await simpanJimpitan({ masterId: jimpitanMasterId, tanggal: jimpitanTanggal, keterangan: jimpitanKeterangan.trim(), nominal });
      setSuccess('Input jimpitan berhasil disimpan.');
      setJimpitanKeterangan(''); setJimpitanNominal('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan jimpitan');
    } finally { setSavingJimpitan(false); }
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
    loadMasterJimpitan();

  }, []);



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

    if (items.length > 0 && items.every((item) => selected.includes(getItemKey(item)))) {

      setSelected([]);

    } else {

      setSelected(items.map(getItemKey));

    }

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

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Gagal menyimpan pembayaran');

    } finally {

      setSaving(false);

    }

  }



  return (

    <main className="pemasukanPage">

      <div className="pemasukanHeader">

        <div>

          <h1>Input Pemasukan</h1>

          <p>Catat pembayaran warga berdasarkan kewajiban yang masih belum dibayar.</p>

        </div>



        <div className="pemasukanHeaderActions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="refreshButton"
            onClick={() => loadItems()}
            disabled={!nik || loadingItems}
          >
            <RefreshCw size={16} className={loadingItems ? 'spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="refreshButton"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout dari halaman pemasukan"
          >
            <LogOut size={16} />
            {loggingOut ? 'Keluar...' : 'Logout'}
          </button>
        </div>

      </div>



      {error && <div className="alert error">{error}</div>}

      {success && <div className="alert success">{success}</div>}



      <section className="formCard" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <HandCoins size={22} />
          <div><h2 style={{ margin: 0 }}>Input Jimpitan</h2><p style={{ margin: '4px 0 0', color: '#64748b' }}>Catat jimpitan berdasarkan grup dari APP_MASTER.</p></div>
        </div>
        <div className="formGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <label style={{ display: 'grid', gap: 6 }}>Tanggal
            <input type="date" value={jimpitanTanggal} onChange={(e) => setJimpitanTanggal(e.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>Grup Jimpitan
            <select value={jimpitanMasterId} onChange={(e) => setJimpitanMasterId(e.target.value)}>
              <option value="">Pilih grup jimpitan</option>
              {masterJimpitan.map((m) => <option key={m.id} value={m.id}>{m.namaItem}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>Nominal (Rp)
            <input type="number" min="1" step="1" value={jimpitanNominal} onChange={(e) => setJimpitanNominal(e.target.value)} placeholder="Contoh: 150000" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>Keterangan (opsional)
            <input value={jimpitanKeterangan} onChange={(e) => setJimpitanKeterangan(e.target.value)} placeholder="Keterangan tambahan" />
          </label>
        </div>
        {masterJimpitan.length === 0 && <p style={{ color: '#b45309' }}>Belum ada master JIMPITAN aktif di APP_MASTER.</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="saveButton" onClick={handleSaveJimpitan} disabled={savingJimpitan || masterJimpitan.length === 0}>
            <Save size={16} /> {savingJimpitan ? 'Menyimpan...' : 'Simpan Jimpitan'}
          </button>
        </div>
      </section>

      <section className="formCard">

        <div className="sectionTitle">

          <Wallet size={19} />

          Data Pembayaran

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



          {items.length > 0 && (

            <button type="button" className="selectAll" onClick={toggleAll}>

              <Check size={16} />

              {items.length > 0 && items.every((item) => selected.includes(getItemKey(item))) ? 'Batal Semua' : 'Pilih Semua'}

            </button>

          )}

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

        ) : (

          <div className="itemList">

            {items.map((item) => {

              const checked = selected.includes(getItemKey(item));



              return (

                <label

                  key={getItemKey(item)}

                  className={`paymentItem ${checked ? 'checked' : ''}`}

                >

                  <input

                    type="checkbox"

                    checked={checked}

                    onChange={() => toggleItem(item)}

                  />



                  <div className="itemMain">

                    <div className="itemTop">

                      <strong>{item.namaItem}</strong>

                      <span className={`typeBadge ${item.tipe.toLowerCase()}`}>

                        {typeLabel(item.tipe)}

                      </span>

                    </div>



                    <div className="itemMeta">

                      <span>

                        Periode: {item.periodeBulan} {item.periodeTahun}

                      </span>

                      {item.penerimaNama && (

                        <span>

                          Penerima: {item.penerimaNama}

                        </span>

                      )}

                    </div>

                  </div>



                  <strong className="itemNominal">

                    {money(item.nominal)}

                  </strong>

                </label>

              );

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



      <style jsx>{`

        .pemasukanPage {

          min-height: calc(100vh - 76px);

          background: #f6f8fc;

          padding: 28px 30px 50px;

          color: #0f172a;

        }



        .pemasukanHeader,

        .formCard,

        .listCard {

          max-width: 1100px;

          margin-left: auto;

          margin-right: auto;

        }



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

          .pemasukanPage {

            padding: 20px 15px 40px;

          }



          .pemasukanHeader {

            flex-direction: column;

          }



          .formGrid {

            grid-template-columns: 1fr;

          }



          .selectedWarga {

            flex-direction: column;

            gap: 10px;

          }



          .listHeader,

          .saveBar {

            align-items: stretch;

            flex-direction: column;

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
