'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { Wallet, Utensils, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getKas, getJimpitan } from '../lib/api';

type Row = {
  tanggal: string | number;
  tahun: number;
  bulan: string;
  kategori: string;
  keterangan: string;
  tipe: string;
  jumlah: number;
};

const COLORS = { income:'#16a34a', expense:'#ef4444', balance:'#2563eb', jimpitan:'#f59e0b' };
const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const money = (n:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.round(n||0));

function numberValue(v:any):number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null || v === '') return 0;
  let s = String(v).trim().replace(/\s/g,'').replace(/Rp/gi,'');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
  else s = s.replace(/[^\d.-]/g,'');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function unwrap(payload:any):any[] {
  let x = payload;
  for (let i=0;i<6;i++) {
    if (Array.isArray(x)) return x;
    if (!x || typeof x !== 'object') return [];
    x = x.data ?? x.rows ?? x.items ?? x.result ?? x.records;
  }
  return Array.isArray(x) ? x : [];
}

function excelDate(v:any):Date|null {
  if (typeof v === 'number' && v > 20000 && v < 70000) {
    return new Date(Date.UTC(1899,11,30) + v * 86400000);
  }
  if (v == null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalize(payload:any):Row[] {
  return unwrap(payload).map((r:any) => {
    const rawDate = r.tanggal ?? r.date ?? r.Tanggal ?? '';
    const d = excelDate(rawDate);
    let year = Number(r.tahun ?? r.year ?? r.Tahun);
    let month = String(r.bulan ?? r.month ?? r.Bulan ?? '');
    if (!year && d) year = d.getFullYear();
    if (!month && d) month = months[d.getMonth()];
    return {
      tanggal: rawDate,
      tahun: year || 0,
      bulan: month,
      kategori: String(r.kategori ?? r.category ?? r.Kategori ?? ''),
      keterangan: String(r.keterangan ?? r.description ?? r.Keterangan ?? ''),
      tipe: String(r.tipe ?? r.type ?? r.Tipe ?? '').trim().toUpperCase(),
      jumlah: numberValue(r.jumlah ?? r.nominal ?? r.total ?? r.Jumlah ?? r.Nominal ?? r.Total)
    };
  }).filter(r => r.kategori || r.tipe || r.jumlah || r.tanggal);
}

export default function Dashboard({ kind='kas' }:{kind?:'kas'|'jimpitan'}) {
  const [rows,setRows] = useState<Row[]>([]);
  const [mode,setMode] = useState<'month'|'all'|'range'>('month');
  const [year,setYear] = useState(new Date().getFullYear());
  const [month,setMonth] = useState(months[new Date().getMonth()]);
  const [rangeStart,setRangeStart] = useState('');
  const [rangeEnd,setRangeEnd] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [page,setPage] = useState(1);
  const [pageSize,setPageSize] = useState(10);

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await (kind === 'kas' ? getKas() : getJimpitan());
      setRows(normalize(response));
    } catch(e:any) {
      setRows([]);
      setError(e?.message || 'Gagal mengambil data Google Sheets');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[kind]);

  const years = useMemo(()=>[...new Set(rows.map(r=>r.tahun).filter(Boolean))].sort((a,b)=>b-a),[rows]);

  const filtered = useMemo(()=>rows.filter(r=>{
    if(mode==='all') return true;
    if(mode==='month') return r.tahun===year && r.bulan.toLowerCase()===month.toLowerCase();
    if(!rangeStart || !rangeEnd) return false;
    if(kind==='jimpitan'){
      const d=excelDate(r.tanggal);
      if(!d) return false;
      return d>=new Date(rangeStart+'-01T00:00:00') && d<=new Date(rangeEnd+'-01T23:59:59');
    }
    const start = rangeStart; const end = rangeEnd;
    const ym = `${r.tahun}-${String(months.indexOf(r.bulan)+1).padStart(2,'0')}`;
    return ym>=start && ym<=end;
  }),[rows,mode,year,month,rangeStart,rangeEnd]);

  useEffect(()=>{ setPage(1); },[mode,year,month,rangeStart,rangeEnd,kind]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(()=>{ if(page > totalPages) setPage(totalPages); },[page,totalPages]);

  const detailRows = useMemo(()=>{
    const reversed = filtered.slice().reverse();
    const start = (page-1) * pageSize;
    return reversed.slice(start, start + pageSize);
  },[filtered,page,pageSize]);

  const summary = useMemo(()=>{
    let opening=0,income=0,expense=0;
    filtered.forEach(r=>{
      if(r.tipe==='SALDO AWAL') opening+=r.jumlah;
      else if(r.tipe==='PEMASUKAN') income+=r.jumlah;
      else if(r.tipe==='PENGELUARAN') expense+=r.jumlah;
    });
    return {opening,income,expense,balance:opening+income-expense};
  },[filtered]);

  function categoryData(type:string) {
    const m=new Map<string,number>();
    filtered.forEach(r=>{
      if(r.tipe===type) m.set(r.kategori,(m.get(r.kategori)||0)+r.jumlah);
    });
    return [...m].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,8);
  }

  const incomeCategories = useMemo(()=>categoryData('PEMASUKAN'),[filtered]);
  const expenseCategories = useMemo(()=>categoryData('PENGELUARAN'),[filtered]);

  const monthly = useMemo(()=>{
    const m=new Map<string,{name:string,income:number,expense:number,order:number}>();
    filtered.forEach(r=>{
      const name=r.bulan || '-';
      if(!m.has(name)) m.set(name,{name,income:0,expense:0,order:months.indexOf(name)});
      const x=m.get(name)!;
      if(r.tipe==='PEMASUKAN') x.income+=r.jumlah;
      if(r.tipe==='PENGELUARAN') x.expense+=r.jumlah;
    });
    return [...m.values()].sort((a,b)=>a.order-b.order);
  },[filtered]);

  const title=kind==='kas'?'Dashboard Kas RT':'Dashboard Jimpitan';

  return <div style={{minHeight:'100vh',background:'#f6f8fc',color:'#0f172a'}}>
    <header className="topbar">
      <div className="topbarInner">
        <div className="brand">Dashboard RT</div>
        <nav className="topNav">
          <a href="/kas" className={kind==='kas'?'active':''}>Kas RT</a>
          <a href="/jimpitan" className={kind==='jimpitan'?'active':''}>Jimpitan</a>
        </nav>
        <button onClick={load} style={{border:'1px solid #dbe2ea',background:'#fff',borderRadius:10,padding:'10px 14px',display:'flex',gap:8,alignItems:'center'}}><RefreshCw size={16}/> Refresh</button>
      </div>
    </header>

    <main>
      <div style={{background:'#fff',border:'1px solid #e5eaf0',borderRadius:14,padding:16,display:'flex',gap:12,flexWrap:'wrap',marginBottom:18}}>
        <select value={mode} onChange={e=>setMode(e.target.value as any)} style={selectStyle}><option value="month">Per Bulan</option><option value="all">Sepanjang Waktu</option><option value="range">Range Bulan</option></select>
        {mode==='month' && <>
          <select value={year} onChange={e=>setYear(Number(e.target.value))} style={selectStyle}>{(years.length?years:[new Date().getFullYear()]).map(y=><option key={y}>{y}</option>)}</select>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={selectStyle}>{months.map(m=><option key={m}>{m}</option>)}</select>
        </>}
        {mode==='range' && <>
          {kind==='kas' ? <>
            <input type="month" value={rangeStart} onChange={e=>setRangeStart(e.target.value)} style={selectStyle}/>
            <span style={{alignSelf:'center'}}>s/d</span>
            <input type="month" value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} style={selectStyle}/>
          </> : <>
            <input type="date" value={rangeStart} onChange={e=>setRangeStart(e.target.value)} style={selectStyle}/>
            <span style={{alignSelf:'center'}}>s/d</span>
            <input type="date" value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} style={selectStyle}/>
          </>}
        </>}
      </div>

      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#b91c1c',padding:14,borderRadius:12,marginBottom:18}}>{error}</div>}

      <div className="kpis">
        <Kpi title="Saldo Awal" value={summary.opening} color={COLORS.balance} icon={<Wallet size={20}/>}/>
        <Kpi title="Total Pemasukan" value={summary.income} color={COLORS.income} icon={<TrendingUp size={20}/>}/>
        <Kpi title="Total Pengeluaran" value={summary.expense} color={COLORS.expense} icon={<TrendingDown size={20}/>}/>
        <Kpi title="Saldo Saat Ini" value={summary.balance} color={kind==='jimpitan'?COLORS.jimpitan:COLORS.balance} icon={kind==='jimpitan'?<Utensils size={20}/>:<Wallet size={20}/>}/>
      </div>

      {/* BARIS 1: DONUT + BULANAN */}
      <div className="rowCharts">
        <section className="card"><div className="title">Pemasukan vs Pengeluaran</div><div className="chart donutChart">
          {summary.income+summary.expense>0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{name:'Pemasukan',value:summary.income},{name:'Pengeluaran',value:summary.expense}]} dataKey="value" innerRadius={52} outerRadius={105} paddingAngle={3} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}><Cell fill={COLORS.income}/><Cell fill={COLORS.expense}/></Pie><Tooltip formatter={(v:any)=>money(Number(v))}/><Legend/></PieChart></ResponsiveContainer> : <Empty text={loading?'Memuat data...':'Tidak ada data untuk filter ini'}/>}
        </div></section>

        <section className="card"><div className="title">Pemasukan & Pengeluaran per Bulan</div><div className="monthlyChart">
          {monthly.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{top:28,right:25,left:10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="name"/><YAxis tickFormatter={v=>new Intl.NumberFormat('id-ID',{notation:'compact'}).format(v)}/><Tooltip formatter={(v:any)=>money(Number(v))}/><Legend/><Bar dataKey="income" name="Pemasukan" fill={COLORS.income} radius={[6,6,0,0]}><LabelList dataKey="income" position="top" formatter={(v:any)=>money(Number(v))}/></Bar><Bar dataKey="expense" name="Pengeluaran" fill={COLORS.expense} radius={[6,6,0,0]}><LabelList dataKey="expense" position="top" formatter={(v:any)=>money(Number(v))}/></Bar></BarChart></ResponsiveContainer> : <Empty text={loading?'Memuat data...':'Tidak ada data untuk filter ini'}/>}
        </div></section>
      </div>

      {/* BARIS 2: KATEGORI PEMASUKAN + PENGELUARAN */}
      <div className="categoryCharts">
        <CategoryCard title="Pemasukan per Kategori" data={incomeCategories} color={COLORS.income} loading={loading}/>
        <CategoryCard title="Pengeluaran per Kategori" data={expenseCategories} color={COLORS.expense} loading={loading}/>
      </div>

      <section className="card wide">
        <div className="title">{kind==='kas'?'Rekap Transaksi Kas':'Detail Jimpitan'}</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{(kind==='kas'
              ? ['Bulan','Tahun','Kategori','Keterangan','Tipe','Jumlah']
              : ['Tanggal','Bulan','Tahun','Kategori','Keterangan','Tipe','Jumlah']
            ).map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {detailRows.map((r,i)=><tr key={`${r.tanggal}-${r.kategori}-${r.keterangan}-${i}`}>
                {kind==='jimpitan' && <td style={td}>{formatDate(r.tanggal)}</td>}
                <td style={td}>{r.bulan||'-'}</td>
                <td style={td}>{r.tahun||'-'}</td>
                <td style={td}>{r.kategori||'-'}</td>
                <td style={td}>{r.keterangan||'-'}</td>
                <td style={td}><span style={badge(r.tipe)}>{r.tipe||'-'}</span></td>
                <td style={{...td,textAlign:'right',fontWeight:700}}>{money(r.jumlah)}</td>
              </tr>)}
              {!filtered.length&&<tr><td colSpan={kind==='kas'?6:7} style={{padding:35,textAlign:'center',color:'#94a3b8'}}>Tidak ada data untuk filter ini.</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="pagination">
            <div className="pageInfo">
              Menampilkan {((page-1)*pageSize)+1}–{Math.min(page*pageSize, filtered.length)} dari {filtered.length} data
            </div>

            <div className="pageControls">
              <label className="pageSize">
                <span>Data:</span>
                <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}} style={selectStyle}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <button className="pageBtn" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹ Sebelumnya</button>

              <div className="pageNumbers">
                {Array.from({length: totalPages},(_,i)=>i+1)
                  .filter(p=>p===1 || p===totalPages || Math.abs(p-page)<=2)
                  .map((p,i,arr)=>{
                    const prev=arr[i-1];
                    return <span key={p} style={{display:'contents'}}>
                      {prev && p-prev>1 && <span className="dots">…</span>}
                      <button className={`pageBtn number ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
                    </span>
                  })}
              </div>

              <button className="pageBtn" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Berikutnya ›</button>
            </div>
          </div>
        )}
      </section>
    </main>

    <style jsx global>{`
      .topbar{height:76px;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:20}
      .topbarInner{height:100%;max-width:1500px;margin:0 auto;padding:0 30px;display:flex;align-items:center;gap:30px}
      .brand{font-size:22px;font-weight:800;white-space:nowrap}
      .topNav{display:flex;align-items:center;gap:6px;flex:1}
      .topNav a{text-decoration:none;color:#475569;padding:10px 16px;border-radius:9px;font-weight:500}
      .topNav a.active{color:#2563eb;background:#eff6ff;font-weight:700}
      main{max-width:1500px;margin:0 auto;padding:24px 30px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
      .rowCharts{display:grid;grid-template-columns:0.9fr 1.6fr;gap:18px;margin-top:18px;align-items:stretch}
      .categoryCharts{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
      .card{background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:18px;box-shadow:0 2px 8px rgba(15,23,42,.03);min-width:0}
      .title{font-size:16px;font-weight:750;margin-bottom:8px}
      .chart{height:330px}
      .donutChart{height:330px}
      .monthlyChart{height:330px}
      .wide{margin-top:18px}
      .widechart{height:350px}
      .pagination{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:16px;padding-top:14px;border-top:1px solid #eef2f7;flex-wrap:wrap}
      .pageInfo{font-size:13px;color:#64748b}
      .pageControls{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .pageSize{display:flex;align-items:center;gap:7px;color:#64748b;font-size:13px;margin-right:4px}
      .pageBtn{border:1px solid #dbe2ea;background:#fff;color:#334155;border-radius:8px;padding:8px 11px;font-size:13px;cursor:pointer}
      .pageBtn:hover:not(:disabled){background:#f8fafc;border-color:#cbd5e1}
      .pageBtn:disabled{opacity:.45;cursor:not-allowed}
      .pageBtn.number{min-width:34px;padding:8px 9px}
      .pageBtn.number.active{background:#2563eb;border-color:#2563eb;color:#fff;font-weight:700}
      .pageNumbers{display:flex;align-items:center;gap:4px}
      .dots{color:#94a3b8;padding:0 2px}
      @media(max-width:1200px){.kpis{grid-template-columns:repeat(2,1fr)}.rowCharts{grid-template-columns:1fr}.categoryCharts{grid-template-columns:1fr 1fr}}
      @media(max-width:800px){.topbarInner{padding:0 18px;gap:15px}.brand{font-size:20px}main{padding:18px}.categoryCharts{grid-template-columns:1fr}}
      @media(max-width:600px){.pagination{align-items:flex-start}.pageControls{width:100%}.pageInfo{width:100%}.topbarInner{flex-wrap:wrap;height:auto;min-height:76px;padding:12px 16px}.topbar{height:auto}.topNav{order:3;flex-basis:100%}.kpis{grid-template-columns:1fr}.rowCharts,.categoryCharts{grid-template-columns:1fr}.chart,.donutChart,.monthlyChart{height:300px}}
    `}</style>
  </div>;
}

function CategoryCard({title,data,color,loading}:{title:string,data:{name:string,value:number}[],color:string,loading:boolean}){
  return <section className="card"><div className="title" style={{color}}>{title}</div><div className="chart">
    {data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{left:8,right:92,top:5,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis type="number" tickFormatter={v=>new Intl.NumberFormat('id-ID',{notation:'compact'}).format(v)}/><YAxis type="category" dataKey="name" width={135} tick={{fontSize:12}}/><Tooltip formatter={(v:any)=>money(Number(v))}/><Bar dataKey="value" fill={color} radius={[0,7,7,0]}><LabelList dataKey="value" position="right" formatter={(v:any)=>money(Number(v))}/></Bar></BarChart></ResponsiveContainer> : <Empty text={loading?'Memuat data...':'Tidak ada data untuk filter ini'}/>}
  </div></section>
}

function Kpi({title,value,color,icon}:{title:string,value:number,color:string,icon:any}){return <div style={{background:'#fff',border:'1px solid #e5eaf0',borderRadius:14,padding:18,position:'relative',overflow:'hidden'}}><div style={{position:'absolute',left:0,top:0,bottom:0,width:4,background:color}}/><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#64748b'}}>{title}</span><span style={{width:38,height:38,borderRadius:10,display:'grid',placeItems:'center',background:color+'18',color}}>{icon}</span></div><div style={{fontSize:25,fontWeight:800,marginTop:12}}>{money(value)}</div></div>}
function Empty({text}:{text:string}){return <div style={{height:'100%',display:'grid',placeItems:'center',color:'#94a3b8'}}>{text}</div>}
const selectStyle:any={height:42,border:'1px solid #dbe2ea',borderRadius:9,padding:'0 12px',background:'#fff'};
const th:any={textAlign:'left',padding:'12px 10px',background:'#f8fafc',borderBottom:'1px solid #e5e7eb',color:'#475569'};
const td:any={padding:'12px 10px',borderBottom:'1px solid #eef2f7',verticalAlign:'top'};
function navStyle(active:boolean):any{return {textDecoration:'none',padding:'10px 16px',borderRadius:9,fontWeight:active?700:500,color:active?'#2563eb':'#475569',background:active?'#eff6ff':'transparent'}}
function badge(t:string){const c=t==='PEMASUKAN'?COLORS.income:t==='PENGELUARAN'?COLORS.expense:COLORS.balance;return {display:'inline-block',padding:'4px 8px',borderRadius:999,background:c+'18',color:c,fontSize:11,fontWeight:700}}
function formatDate(v:any){const d=excelDate(v);return d?d.toLocaleDateString('id-ID'):String(v||'-')}
