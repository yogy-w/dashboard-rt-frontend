"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandCoins, LayoutDashboard, LogOut, Plus, ReceiptText, Search, Tags, Wallet, BookOpen } from "lucide-react";
import { getKategoriPengeluaran, tambahKategoriPengeluaran, type KategoriPengeluaran } from "../../../lib/rt-api";

export default function MasterKategoriPage(){
 const router=useRouter();
 const [rows,setRows]=useState<KategoriPengeluaran[]>([]);
 const [nama,setNama]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [loggingOut,setLoggingOut]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await getKategoriPengeluaran();setRows(r.rows||[]);}catch(e){setError(e instanceof Error?e.message:"Gagal memuat master kategori.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 async function add(){if(!nama.trim())return setError("Nama kategori wajib diisi.");setSaving(true);setError("");setSuccess("");try{await tambahKategoriPengeluaran(nama.trim());setNama("");setSuccess("Kategori berhasil ditambahkan.");await load();}catch(e){setError(e instanceof Error?e.message:"Gagal menambahkan kategori.");}finally{setSaving(false);}}
 async function logout(){setLoggingOut(true);try{const r=await fetch("/api/pemasukan-auth/logout",{method:"POST",cache:"no-store"});if(!r.ok)throw new Error("Logout gagal.");router.replace("/kas");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Logout gagal.");setLoggingOut(false);}}
 return <main className="mkPage">
  
  
  {error&&<div className="mkAlert error">{error}</div>}{success&&<div className="mkAlert success">{success}</div>}
  <section className="mkCard">
   <div className="mkTitle"><Tags size={21}/><div><h2>Tambah Kategori</h2><p>Kategori baru akan langsung tersedia di Input Pengeluaran.</p></div></div>
   <div className="mkAdd"><label>Nama Kategori<input value={nama} onChange={e=>setNama(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void add();}} placeholder="Contoh: Perbaikan saluran air"/></label><button onClick={add} disabled={saving}><Plus size={16}/>{saving?"Menyimpan...":"Tambah Kategori"}</button></div>
  </section>
  <section className="mkCard">
   <div className="mkListHead"><div><h2>Daftar Kategori</h2><p>{rows.length} kategori · {rows.filter(x=>x.status).length} aktif</p></div><button className="mkRefresh" onClick={()=>void load()}>Refresh</button></div>
   {loading?<p>Memuat kategori...</p>:rows.length===0?<p>Belum ada kategori.</p>:<div className="mkTableWrap"><table><thead><tr><th>Nama Kategori</th><th>Status</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.nama}</strong><small>{row.id}</small></td><td><span className={row.status?"status active":"status inactive"}>{row.status?"Aktif":"Nonaktif"}</span></td></tr>)}</tbody></table></div>}
  </section>
  <style jsx>{`
   .mkPage{min-height:100vh;background:#f6f8fc;color:#0f172a;padding:28px 30px 50px}.mkHeader,.mkTabs,.mkCard,.mkAlert{max-width:1100px;margin-left:auto;margin-right:auto}.mkHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}h1{font-size:27px;margin:0}.mkHeader p,.mkTitle p,.mkListHead p{color:#64748b;margin:6px 0 0}.mkLogout,.mkRefresh{display:flex;gap:8px;align-items:center;padding:10px 14px;border:1px solid #dbe2ea;background:#fff;border-radius:9px;cursor:pointer}
   .mkTabs{display:flex;gap:9px;align-items:center;padding:10px;background:#eef2f7;border:1px solid #e1e7f0;border-radius:15px;margin-bottom:20px;overflow-x:auto}.mkTabs :global(.tabItem){display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;min-height:42px;padding:0 14px;border:1px solid #d8e0eb;border-radius:10px;background:#fff;color:#475569!important;text-decoration:none!important;font-size:13px;font-weight:650;white-space:nowrap}.mkTabs :global(.tabItem.active){background:#2563eb;border-color:#2563eb;color:#fff!important;box-shadow:0 3px 8px #2563eb33}
   .mkCard{background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:22px;margin-bottom:18px}.mkTitle{display:flex;gap:12px;align-items:center;margin-bottom:18px}.mkTitle h2,.mkListHead h2{font-size:19px;margin:0}.mkAdd{display:flex;align-items:flex-end;gap:12px}.mkAdd label{display:grid;gap:7px;flex:1;font-size:13px;font-weight:650;color:#334155}.mkAdd input{height:43px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.mkAdd button{height:43px;display:flex;align-items:center;gap:8px;border:0;border-radius:9px;padding:0 18px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
   .mkListHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.mkTableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #e8edf3}th{background:#f8fafc;color:#475569}td small{display:block;color:#94a3b8;margin-top:3px}.status{display:inline-block;padding:4px 9px;border-radius:99px;font-size:12px;font-weight:700}.status.active{background:#dcfce7;color:#166534}.status.inactive{background:#f1f5f9;color:#64748b}.toggle{display:inline-flex;align-items:center;gap:6px;border:1px solid #dbe2ea;border-radius:8px;background:#fff;padding:7px 10px;cursor:pointer;font-weight:600}.toggle.on{color:#15803d}.toggle.off{color:#b45309}.mkAlert{padding:12px 14px;border-radius:9px;margin-bottom:16px}.error{background:#fef2f2;color:#b91c1c}.success{background:#f0fdf4;color:#166534}
   @media(max-width:650px){.mkPage{padding:20px 15px}.mkHeader{flex-direction:column}.mkLogout{align-self:flex-end}.mkAdd{align-items:stretch;flex-direction:column}.mkAdd button{justify-content:center}}
  `}</style>
 </main>;
}
