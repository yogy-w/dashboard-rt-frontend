"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Minus, RefreshCw, Search } from "lucide-react";
import type { ReportMatrixResult } from "../lib/rt-api";

type Props = {
  title: string;
  description: string;
  loader: (year: number) => Promise<ReportMatrixResult>;
  receiverLabel?: string;
};

const statusLabel: Record<string,string> = {
  PAID: "Sudah bayar",
  MIGRATED: "Pembayaran historis",
  UNPAID: "Belum bayar",
  NOT_DUE: "Belum aktif / tidak wajib",
  RECEIVER: "Penerima santunan",
};

function StatusMark({ status }: { status: string }) {
  if (status === "PAID") return <Check size={17} strokeWidth={3}/>;
  if (status === "MIGRATED") return <span style={{fontSize:18,color:"#d49a00"}}>●</span>;
  if (status === "UNPAID") return <X size={18} strokeWidth={3}/>;
  if (status === "RECEIVER") return <span style={{fontSize:17}}>🟡</span>;
  return <Minus size={18} strokeWidth={3}/>;
}

export default function ReportMatrix({ title, description, loader }: Props) {
  const [year,setYear] = useState(new Date().getFullYear());
  const [data,setData] = useState<ReportMatrixResult | null>(null);
  const [search,setSearch] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await loader(year)); }
    catch (e) { setData(null); setError(e instanceof Error ? e.message : "Gagal memuat report."); }
    finally { setLoading(false); }
  },[loader,year]);
  useEffect(()=>{ void load(); },[load]);

  const rows = useMemo(()=>{
    const q=search.trim().toLocaleLowerCase("id");
    return (data?.rows || []).filter(r=>!q || r.nama.toLocaleLowerCase("id").includes(q) || r.nik.includes(q));
  },[data,search]);

  const counts = useMemo(()=>{
    const c={PAID:0,MIGRATED:0,UNPAID:0,NOT_DUE:0,RECEIVER:0};
    rows.forEach(r=>r.cells.forEach(cell=>{ c[cell.status as keyof typeof c]=(c[cell.status as keyof typeof c]||0)+1; }));
    return c;
  },[rows]);

  return <main className="reportPage">
    <section className="reportHero">
      <div><div style={{fontSize:10,fontWeight:800,letterSpacing:1.2,opacity:.75}}>ADMIN RT 05 · KEUANGAN</div><h1>{title}</h1><p>{description}</p></div>
      <label className="reportYear">Tahun <select value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:7},(_,i)=>new Date().getFullYear()-3+i).map(y=><option key={y} value={y}>{y}</option>)}</select></label>
    </section>
    <section className="reportToolbar">
      <div className="reportLegend">
        <span><b style={{color:"#07854f"}}>✓</b> Sudah bayar <strong>{counts.PAID}</strong></span>
        <span><b style={{color:"#d49a00"}}>●</b> Migrasi <strong>{counts.MIGRATED}</strong></span>
        <span><b style={{color:"#e34461"}}>×</b> Belum bayar <strong>{counts.UNPAID}</strong></span>
        <span><b style={{color:"#8b5bd6"}}>−</b> Tidak wajib <strong>{counts.NOT_DUE}</strong></span>
        {counts.RECEIVER>0 && <span>🟡 Penerima <strong>{counts.RECEIVER}</strong></span>}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <label className="reportSearch"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau NIK..."/></label>
        <button type="button" className="refreshButton" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> {loading?"Memuat...":"Muat ulang"}</button>
      </div>
    </section>
    {error && <div className="reportError">{error}</div>}
    <section className="reportTableWrap">
      <table className="reportTable">
        <thead><tr><th className="stickyNo">NO</th><th className="stickyNik">NIK</th><th className="stickyName">NAMA</th>{(data?.columns||[]).map(col=><th key={col.id}>{col.label}{col.subtitle && <div style={{fontSize:10,fontWeight:500,opacity:.8}}>{col.subtitle}</div>}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td className="reportEmpty" colSpan={(data?.columns.length||0)+3}>Memuat data report...</td></tr> :
          rows.length===0 ? <tr><td className="reportEmpty" colSpan={(data?.columns.length||0)+3}>{search?"Warga tidak ditemukan.":"Tidak ada data untuk ditampilkan."}</td></tr> :
          rows.map((row,index)=><tr key={row.nik}><td className="stickyNo">{index+1}</td><td className="stickyNik">{row.nik}</td><td className="stickyName">{row.nama}</td>{row.cells.map((cell,i)=><td key={`${row.nik}-${i}`} className={`reportStatus ${cell.status}`} title={statusLabel[cell.status]||cell.status}><StatusMark status={cell.status}/></td>)}</tr>)}
        </tbody>
      </table>
    </section>
    <div style={{fontSize:11,color:"#718096"}}>{rows.length} warga · Tahun {year} · Data diperbarui saat report dimuat.</div>
  </main>;
}
