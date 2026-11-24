"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandCoins, LayoutDashboard, LogOut, ReceiptText, Save, Search, Tags, Wallet, RefreshCw , BookOpen } from "lucide-react";
import { getKategoriPengeluaran, getPengeluaran, simpanPengeluaran, type KategoriPengeluaran, type PengeluaranRow } from "../../../lib/rt-api";

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const money = (n:number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);

export default function PengeluaranPage() {
  const router = useRouter();
  const [categories,setCategories] = useState<KategoriPengeluaran[]>([]);
  const [rows,setRows] = useState<PengeluaranRow[]>([]);
  const [tanggal,setTanggal] = useState(today());
  const [kategori,setKategori] = useState("");
  const [keterangan,setKeterangan] = useState("");
  const [nominal,setNominal] = useState("");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [loggingOut,setLoggingOut] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [c,r] = await Promise.all([getKategoriPengeluaran(),getPengeluaran()]);
      const active = (c.rows||[]).filter(x=>x.status);
      setCategories(active);
      setRows((r.rows||[]).slice().reverse().slice(0,12));
      setKategori(current => active.some(x=>x.nama===current) ? current : (active[0]?.nama || ""));
    } catch(e) { setError(e instanceof Error ? e.message : "Gagal memuat data pengeluaran."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void load(); },[load]);

  async function submit() {
    const value = Number(nominal);
    if(!tanggal) return setError("Tanggal wajib diisi.");
    if(!kategori) return setError("Pilih kategori pengeluaran.");
    if(!keterangan.trim()) return setError("Keterangan wajib diisi.");
    if(!Number.isFinite(value)||value<=0) return setError("Nominal harus lebih dari 0.");
    setSaving(true);setError("");setSuccess("");
    try {
      await simpanPengeluaran({tanggal,kategori,keterangan:keterangan.trim(),nominal:value});
      setSuccess("Pengeluaran berhasil disimpan.");
      setKeterangan("");setNominal("");
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Gagal menyimpan pengeluaran."); }
    finally { setSaving(false); }
  }
  async function logout() {
    setLoggingOut(true);
    try { const r=await fetch("/api/pemasukan-auth/logout",{method:"POST",cache:"no-store"}); if(!r.ok) throw new Error("Logout gagal."); router.replace("/kas");router.refresh(); }
    catch(e){setError(e instanceof Error?e.message:"Logout gagal.");setLoggingOut(false);}
  }
  return <main className="epPage">
{error&&<div className="epAlert error">{error}</div>}{success&&<div className="epAlert success">{success}</div>}
    <section className="epCard">
      <div className="epTitle"><ReceiptText size={21}/><div><h2>Form Pengeluaran</h2><p>Data akan disimpan ke APP_PENGELUARAN.</p></div></div>
      {loading?<p>Memuat kategori...</p>:<div className="epGrid">
        <label>Tanggal<input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)}/></label>
        <label>Kategori<select value={kategori} onChange={e=>setKategori(e.target.value)}><option value="">Pilih kategori</option>{categories.map(c=><option key={c.id} value={c.nama}>{c.nama}</option>)}</select></label>
        <label className="wide">Keterangan<input value={keterangan} onChange={e=>setKeterangan(e.target.value)} placeholder="Contoh: Pembelian gembok lemari RT"/></label>
        <label>Nominal (Rp)<input type="number" min="1" step="1" value={nominal} onChange={e=>setNominal(e.target.value)} placeholder="Contoh: 108000"/></label>
      </div>}
      {!loading&&!categories.length&&<p className="epWarning">Belum ada kategori aktif. Tambahkan melalui menu Master Kategori.</p>}
      <div className="epActions"><button onClick={submit} disabled={saving||loading||!categories.length}><Save size={16}/>{saving?"Menyimpan...":"Simpan Pengeluaran"}</button></div>
    </section>
    <section className="epCard epHistory"><div className="epHistoryHead"><div><h2>Pengeluaran Terakhir</h2><p>12 transaksi terbaru</p></div><button onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
      {loading?<p>Memuat transaksi...</p>:rows.length===0?<p>Belum ada transaksi pengeluaran.</p>:<div className="epTableWrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.rowNumber||i}-${i}`}><td>{r.tanggal||"-"}</td><td>{r.kategori}</td><td>{r.keterangan}</td><td>{money(r.nominal)}</td></tr>)}</tbody></table></div>}
    </section>
    <style jsx>{`
      .epPage{min-height:100vh;background:#f6f8fc;color:#0f172a;padding:28px 30px 50px}.epHeader,.epTabs,.epCard,.epAlert{max-width:1100px;margin-left:auto;margin-right:auto}
      .epHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}h1{font-size:27px;margin:0}.epHeader p,.epTitle p,.epHistoryHead p{color:#64748b;margin:6px 0 0}
      .epLogout,.epHistoryHead button{display:flex;gap:8px;align-items:center;padding:10px 14px;border:1px solid #dbe2ea;background:#fff;border-radius:9px;cursor:pointer}
      .epTabs{display:flex;gap:9px;align-items:center;padding:10px;background:#eef2f7;border:1px solid #e1e7f0;border-radius:15px;margin-bottom:20px;overflow-x:auto}
      .epTabs :global(.tabItem){display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;min-height:42px;padding:0 14px;border:1px solid #d8e0eb;border-radius:10px;background:#fff;color:#475569!important;text-decoration:none!important;font-size:13px;font-weight:650;white-space:nowrap}
      .epTabs :global(.tabItem.active){background:#2563eb;border-color:#2563eb;color:#fff!important;box-shadow:0 3px 8px #2563eb33}
      .epCard{background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:22px;margin-bottom:18px}.epTitle{display:flex;gap:12px;align-items:center;margin-bottom:20px}.epTitle h2,.epHistoryHead h2{font-size:19px;margin:0}
      .epGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.epGrid label{display:grid;gap:7px;font-size:13px;font-weight:650;color:#334155}.epGrid .wide{grid-column:1/-1}
      input,select{height:43px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;min-width:0}
      .epActions{display:flex;justify-content:flex-end;margin-top:20px}.epActions button{display:flex;gap:8px;align-items:center;border:0;border-radius:9px;padding:12px 18px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
      button:disabled{opacity:.55;cursor:not-allowed}.epAlert{padding:12px 14px;border-radius:9px;margin-bottom:16px}.error{background:#fef2f2;color:#b91c1c}.success{background:#f0fdf4;color:#166534}.epWarning{color:#b45309}
      .epHistoryHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.epTableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid #e8edf3;white-space:nowrap}th{background:#f8fafc;color:#475569}td:last-child,th:last-child{text-align:right}
      @media(max-width:650px){.epPage{padding:20px 15px}.epHeader{flex-direction:column}.epLogout{align-self:flex-end}.epGrid{grid-template-columns:1fr}.epGrid .wide{grid-column:auto}.epActions button{width:100%;justify-content:center}}
    `}</style>
  </main>;
}
