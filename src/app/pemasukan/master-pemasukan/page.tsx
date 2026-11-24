"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, Wallet, HandCoins, ReceiptText, Tags, Search, Plus, Power, LogOut } from "lucide-react";
import { getMaster, getWargaAktifPenerima, tambahMasterPemasukan, ubahStatusMasterPemasukan, type MasterPemasukanRow, type WargaAktifPenerima } from "../../../lib/rt-api";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const money = (n:number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
const TYPES = [
  { value:"IURAN", label:"Iuran" },
  { value:"JIMPITAN", label:"Jimpitan" },
  { value:"SANTUNAN", label:"Santunan" },
  { value:"ACARA", label:"Acara" },
];

export default function MasterPemasukanPage() {
  const router = useRouter();
  const [rows,setRows] = useState<MasterPemasukanRow[]>([]);
  const [tipe,setTipe] = useState("IURAN");
  const [namaItem,setNamaItem] = useState("");
  const [nikPenerima,setNikPenerima] = useState("");
  const [namaPenerima,setNamaPenerima] = useState("");
  const [wargaAktif,setWargaAktif] = useState<WargaAktifPenerima[]>([]);
  const [loadingPenerima,setLoadingPenerima] = useState(false);
  const [kodeRef,setKodeRef] = useState("");
  const [tanggal,setTanggal] = useState(today());
  const [nominal,setNominal] = useState("0");
  const [keterangan,setKeterangan] = useState("");
  const [filter,setFilter] = useState("ALL");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [busyId,setBusyId] = useState("");
  const [loggingOut,setLoggingOut] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result:any = await getMaster();
      setRows((result.rows || []) as MasterPemasukanRow[]);
    } catch(e) { setError(e instanceof Error ? e.message : "Gagal memuat APP_MASTER."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void load(); },[load]);

  useEffect(() => {
    if (tipe !== "SANTUNAN") {
      setNikPenerima("");
      setNamaPenerima("");
      return;
    }
    let cancelled = false;
    setLoadingPenerima(true);
    getWargaAktifPenerima()
      .then(result => { if (!cancelled) setWargaAktif(result.rows || []); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat warga aktif."); })
      .finally(() => { if (!cancelled) setLoadingPenerima(false); });
    return () => { cancelled = true; };
  }, [tipe]);

  async function add() {
    if (!namaItem.trim()) return setError("Nama item wajib diisi.");
    if (!tanggal) return setError("Tanggal berlaku wajib diisi.");
    const amount = Number(nominal);
    if (!Number.isFinite(amount) || amount < 0) return setError("Nominal harus angka nol atau lebih.");
    if (tipe === "SANTUNAN" && !nikPenerima) return setError("Pilih penerima santunan dari daftar warga aktif.");
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await tambahMasterPemasukan({
        tipe, namaItem: namaItem.trim(), nikPenerima: nikPenerima.trim(),
        namaPenerima: namaPenerima.trim(), kodeRef: kodeRef.trim(), tanggal,
        nominal: amount, keterangan: keterangan.trim()
      });
      setSuccess(`Master ${result.row?.id || ""} berhasil ditambahkan.`);
      setNamaItem(""); setNikPenerima(""); setNamaPenerima(""); setKodeRef(""); setKeterangan(""); setNominal("0");
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Gagal menambahkan master."); }
    finally { setSaving(false); }
  }

  async function toggle(row:MasterPemasukanRow) {
    setBusyId(row.id); setError(""); setSuccess("");
    try {
      await ubahStatusMasterPemasukan(row.id,!row.status);
      setSuccess(`${row.id} berhasil ${row.status ? "dinonaktifkan" : "diaktifkan"}.`);
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Gagal mengubah status master."); }
    finally { setBusyId(""); }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      const response=await fetch("/api/pemasukan-auth/logout",{method:"POST",cache:"no-store"});
      if(!response.ok) throw new Error("Logout gagal.");
      router.replace("/kas"); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Logout gagal."); setLoggingOut(false); }
  }

  const shown=rows.filter(r=>filter==="ALL" || r.tipe===filter);
  return <main className="mpPage">
{error&&<div className="mpAlert error">{error}</div>}
    {success&&<div className="mpAlert success">{success}</div>}
    <section className="mpCard">
      <div className="mpTitle"><Plus size={20}/><div><h2>Tambah Master Baru</h2><p>ID dibuat otomatis oleh sistem berdasarkan tipe. ID yang sudah pernah dipakai tidak digunakan ulang.</p></div></div>
      <div className="mpGrid">
        <label>Tipe<select value={tipe} onChange={e=>setTipe(e.target.value)}>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <label>Nama Item<input value={namaItem} onChange={e=>setNamaItem(e.target.value)} placeholder="Contoh: Iuran Bulanan / Isra Mi'raj"/></label>
        <label>Tanggal Berlaku<input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)}/></label>
        <label>Nominal (Rp)<input type="number" min="0" value={nominal} onChange={e=>setNominal(e.target.value)}/></label>
        <label>Kode / Ref<input value={kodeRef} onChange={e=>setKodeRef(e.target.value)} placeholder="Contoh: IURAN, SAKIT, MAULID"/></label>
        {tipe==="SANTUNAN"&&<>
          <label className="wide">Penerima Santunan
            <select value={nikPenerima} disabled={loadingPenerima || wargaAktif.length===0} onChange={e=>{
              const selected = wargaAktif.find(w=>w.nik===e.target.value);
              setNikPenerima(selected?.nik || "");
              setNamaPenerima(selected?.nama || "");
            }}>
              <option value="">{loadingPenerima?"Memuat warga aktif...":wargaAktif.length?"Pilih warga penerima santunan":"Tidak ada warga aktif"}</option>
              {wargaAktif.map(w=><option key={w.nik} value={w.nik}>{w.nama} — {w.nik}</option>)}
            </select>
            <small>Daftar otomatis diambil dari APP_WARGA_STATUS dengan status kolom E = AKTIF.</small>
          </label>
          <label>NIK Penerima<input value={nikPenerima} readOnly placeholder="Terisi otomatis dari pilihan warga"/></label>
          <label>Nama Penerima<input value={namaPenerima} readOnly placeholder="Terisi otomatis dari pilihan warga"/></label>
        </>}
        <label className="wide">Keterangan<input value={keterangan} onChange={e=>setKeterangan(e.target.value)} placeholder="Catatan tambahan"/></label>
      </div>
      <div className="mpActions"><button onClick={add} disabled={saving}><Plus size={16}/>{saving?"Menyimpan...":"Simpan Master"}</button></div>
    </section>
    <section className="mpCard">
      <div className="mpListHead"><div><h2>Data APP_MASTER</h2><p>{rows.length} data · {rows.filter(r=>r.status).length} aktif</p></div><div className="mpFilter"><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Semua tipe</option>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select><button onClick={()=>void load()}>Refresh</button></div></div>
      {loading?<p>Memuat APP_MASTER...</p>:shown.length===0?<p>Belum ada data master.</p>:<div className="mpTableWrap"><table><thead><tr><th>ID</th><th>Tipe</th><th>Nama Item</th><th>Tanggal</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{shown.map(row=><tr key={row.id}><td><strong className="mpId">{row.id}</strong></td><td>{row.tipe}</td><td><strong>{row.namaItem}</strong>{row.nikPenerima&&<small>Penerima: {row.namaPenerima||row.nikPenerima}</small>}{row.keterangan&&<small>{row.keterangan}</small>}</td><td>{row.tanggal||"—"}</td><td>{money(row.nominal)}</td><td><span className={row.status?"mpStatus active":"mpStatus inactive"}>{row.status?"Aktif":"Nonaktif"}</span></td><td><button className="mpToggle" disabled={busyId===row.id} onClick={()=>void toggle(row)}><Power size={14}/>{busyId===row.id?"Memproses...":row.status?"Nonaktifkan":"Aktifkan"}</button></td></tr>)}</tbody></table></div>}
    </section>
    <style jsx>{`
      .mpPage{min-height:100vh;background:#f6f8fc;color:#0f172a;padding:28px 30px 50px}.mpHeader,.mpTabs,.mpCard,.mpAlert{max-width:1200px;margin-left:auto;margin-right:auto}.mpHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}h1{font-size:27px;margin:0}.mpHeader p,.mpTitle p,.mpListHead p{color:#64748b;margin:6px 0 0}.mpLogout,.mpFilter button{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #dbe2ea;background:#fff;border-radius:9px;cursor:pointer}.mpTabs{display:flex;gap:9px;align-items:center;padding:10px;background:#eef2f7;border:1px solid #e1e7f0;border-radius:15px;margin-bottom:20px;overflow-x:auto}.mpTabs :global(.tabItem){display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;min-height:42px;padding:0 14px;border:1px solid #d8e0eb;border-radius:10px;background:#fff;color:#475569!important;text-decoration:none!important;font-size:13px;font-weight:650;white-space:nowrap}.mpTabs :global(.tabItem.active){background:#2563eb;border-color:#2563eb;color:#fff!important;box-shadow:0 3px 8px #2563eb33}.mpCard{background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:22px;margin-bottom:18px}.mpTitle{display:flex;align-items:center;gap:12px;margin-bottom:18px}.mpTitle h2,.mpListHead h2{font-size:19px;margin:0}.mpGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mpGrid label{display:grid;gap:7px;font-size:13px;font-weight:650;color:#334155}.mpGrid input,.mpGrid select,.mpFilter select{height:42px;padding:0 11px;border:1px solid #cbd5e1;border-radius:8px;background:white;font:inherit}.mpGrid .wide{grid-column:1/-1}.mpActions{display:flex;justify-content:flex-end;margin-top:16px}.mpActions button{display:flex;align-items:center;gap:8px;height:42px;padding:0 18px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}.mpListHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.mpFilter{display:flex;gap:8px}.mpTableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:11px 9px;border-bottom:1px solid #e8edf3;white-space:nowrap}th{background:#f8fafc;color:#475569}td small{display:block;color:#94a3b8;margin-top:3px;white-space:normal}.mpId{color:#2563eb}.mpStatus{display:inline-block;padding:4px 9px;border-radius:99px;font-size:12px;font-weight:700}.mpStatus.active{background:#dcfce7;color:#166534}.mpStatus.inactive{background:#f1f5f9;color:#64748b}.mpToggle{display:inline-flex;align-items:center;gap:6px;border:1px solid #dbe2ea;border-radius:8px;background:#fff;padding:7px 10px;cursor:pointer}@media(max-width:700px){.mpPage{padding:18px 14px 36px}.mpGrid{grid-template-columns:1fr}.mpGrid .wide{grid-column:auto}.mpListHead{align-items:flex-start;flex-direction:column}.mpHeader h1{font-size:23px}}
      .mpAlert{padding:12px 14px;border-radius:9px;margin-bottom:14px}.mpAlert.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}.mpAlert.success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
    `}</style>
  </main>;
}
