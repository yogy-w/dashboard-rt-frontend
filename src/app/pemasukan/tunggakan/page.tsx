"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Wallet, Users, HandCoins, ReceiptText, LogOut, LayoutDashboard, Tags , BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTunggakan, refreshTunggakan, type TunggakanWarga, type TunggakanDetail } from "../../../lib/rt-api";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

function DetailList({ title, details }: { title: string; details: TunggakanDetail[] }) {
  if (!details.length) return <span className="muted">—</span>;
  return (
    <details className="detailBox">
      <summary>{details.length} item · Lihat rincian</summary>
      <div className="detailList">
        {details.map((item, index) => (
          <div className="detailItem" key={`${item.namaItem}-${item.tanggal}-${index}`}>
            <div>
              <strong>{item.namaItem || title}</strong>
              <small>
                {item.periodeBulan} {item.periodeTahun}
                {item.penerimaNama ? ` · Penerima: ${item.penerimaNama}` : ""}
              </small>
              {item.keterangan && item.keterangan !== item.namaItem && <small>{item.keterangan}</small>}
            </div>
            <strong>{money(item.nominal)}</strong>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function TunggakanPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [period, setPeriod] = useState(currentMonth());
  const [rows, setRows] = useState<TunggakanWarga[]>([]);
  const [jumlahWarga, setJumlahWarga] = useState(0);
  const [totalTunggakan, setTotalTunggakan] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshingCache, setRefreshingCache] = useState(false);

  const load = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    setError("");
    try {
      const result = await getTunggakan(monthEnd(period));
      setRows(result.rows || []);
      setJumlahWarga(Number(result.jumlahWarga || 0));
      setTotalTunggakan(Number(result.totalTunggakan || 0));
    } catch (err) {
      setRows([]);
      setJumlahWarga(0);
      setTotalTunggakan(0);
      setError(err instanceof Error ? err.message : "Gagal mengambil data tunggakan.");
    } finally {
      setLoading(false);
    }
  }, [period]);


  async function handleRefresh() {
    setRefreshingCache(true);
    setError("");
    try {
      const result = await refreshTunggakan();
      if (!result?.success) throw new Error("Refresh cache tunggakan gagal.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui cache tunggakan.");
    } finally {
      setRefreshingCache(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/pemasukan-auth/logout", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("Logout gagal.");
      router.replace("/kas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout gagal.");
      setLoggingOut(false);
    }
  }

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("id");
    if (!q) return rows;
    return rows.filter((row) =>
      row.nama.toLocaleLowerCase("id").includes(q) ||
      row.nik.toLocaleLowerCase("id").includes(q)
    );
  }, [rows, search]);

  const summary = useMemo(() => ({
    iuran: rows.reduce((sum, row) => sum + Number(row.iuran?.total || 0), 0),
    santunan: rows.reduce((sum, row) => sum + Number(row.santunan?.total || 0), 0),
    other: rows.reduce((sum, row) => sum + Number(row.other?.total || 0), 0),
  }), [rows]);

  return (
    <main className="page">
<section className="filters">
        <label htmlFor="period">Periode sampai dengan</label>
        <input id="period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
        <div className="filterHint">Perhitungan menggunakan batas akhir bulan yang dipilih.</div>
        <button className="refresh" onClick={handleRefresh} disabled={refreshingCache || loading}>
          <RefreshCw size={15} className={refreshingCache ? "spin" : ""}/>
          {refreshingCache ? "Memperbarui..." : "Refresh Data"}
        </button>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="kpis">
        <article className="kpi">
          <div className="kpiTop"><span>Warga Menunggak</span><span className="kpiIcon blue"><Users size={19}/></span></div>
          <strong>{loading ? "—" : jumlahWarga.toLocaleString("id-ID")}</strong>
        </article>
        <article className="kpi">
          <div className="kpiTop"><span>Total Tunggakan</span><span className="kpiIcon purple"><Wallet size={19}/></span></div>
          <strong>{loading ? "—" : money(totalTunggakan)}</strong>
        </article>
        <article className="kpi">
          <div className="kpiTop"><span>Total Iuran</span><span className="kpiIcon blue"><HandCoins size={19}/></span></div>
          <strong>{loading ? "—" : money(summary.iuran)}</strong>
        </article>
        <article className="kpi">
          <div className="kpiTop"><span>Santunan + Other</span><span className="kpiIcon orange"><ReceiptText size={19}/></span></div>
          <strong>{loading ? "—" : money(summary.santunan + summary.other)}</strong>
        </article>
      </section>

      <section className="tableCard">
        <div className="tableHeader">
          <div><h2>Daftar Tunggakan Warga</h2><p>{filtered.length} dari {rows.length} warga</p></div>
          <label className="search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIK..." /></label>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Nama Warga</th><th>Iuran</th><th>Santunan</th><th>Other</th><th className="right">Total</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="empty">Memuat data tunggakan...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="empty">{search ? "Warga tidak ditemukan." : "Tidak ada tunggakan pada periode ini."}</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.nik}>
                  <td><div className="resident"><strong>{row.nama}</strong><small>{row.nik}</small></div></td>
                  <td><div className="amount">{money(row.iuran?.total || 0)}</div><DetailList title="Iuran" details={row.iuran?.detail || []}/></td>
                  <td><div className="amount">{money(row.santunan?.total || 0)}</div><DetailList title="Santunan" details={row.santunan?.detail || []}/></td>
                  <td><div className="amount">{money(row.other?.total || 0)}</div><DetailList title="Other" details={row.other?.detail || []}/></td>
                  <td className="right total">{money(row.total || 0)}</td>
                </tr>
              ))}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot><tr><td colSpan={4}>Total dari seluruh warga yang ditampilkan</td><td className="right total">{money(filtered.reduce((sum, row) => sum + Number(row.total || 0), 0))}</td></tr></tfoot>
            )}
          </table>
        </div>
        <div className="tableNote">Other mencakup seluruh kewajiban selain Iuran dan Santunan, termasuk Acara.</div>
      </section>

      <style jsx>{`
        .page{min-height:0;background:transparent;padding:4px 4px 24px;color:#0f172a}
        .header{max-width:1100px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:flex-end;gap:18px}
        .pemasukanTabs{max-width:1100px;margin:0 auto 22px;display:flex;align-items:center;gap:10px;padding:10px;background:#eef2f7;border:1px solid #e1e7f0;border-radius:16px;overflow-x:auto}
        .pemasukanTabs :global(.tabItem){display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;gap:9px;min-height:44px;padding:0 18px;border:1px solid #d8e0eb;border-radius:11px;background:#fff;color:#475569!important;text-decoration:none!important;font-size:14px;font-weight:650;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
        .pemasukanTabs :global(.tabItem:hover){background:#f8fbff;border-color:#9db9e8;color:#1d4ed8!important}
        .pemasukanTabs :global(.tabItem.active){background:#2563eb;border-color:#2563eb;color:#fff!important;box-shadow:0 3px 8px rgba(37,99,235,.20)}
        .pemasukanTabs :global(.tabItem.active:hover){background:#1d4ed8;color:#fff!important}
        .backLink{display:inline-flex;align-items:center;gap:7px;color:#2563eb;text-decoration:none;font-size:13px;font-weight:650;margin-bottom:14px}
        h1{font-size:27px;margin:0}.header p{margin:7px 0 0;color:#64748b;font-size:14px}
        .refresh{display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 13px;border:1px solid #dbe2ea;border-radius:9px;background:white;color:#334155;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;margin-left:auto}
        .refresh:disabled{opacity:.55;cursor:wait}.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .filters,.kpis,.tableCard,.error{max-width:1100px;margin-left:auto;margin-right:auto}
        .filters{background:white;border:1px solid #e5eaf0;border-radius:13px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .filters label{font-size:13px;font-weight:700;color:#475569}.filters input{height:40px;border:1px solid #dbe2ea;border-radius:8px;padding:0 11px;background:white}
        .filterHint{font-size:12px;color:#94a3b8;flex:1 1 240px}
        .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:18px}
        .kpi{background:white;border:1px solid #e5eaf0;border-radius:13px;padding:17px 18px;min-width:0}
        .kpiTop{display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:13px;gap:8px}
        .kpiIcon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center}.blue{background:#eff6ff;color:#2563eb}.purple{background:#f5f3ff;color:#7c3aed}.orange{background:#fff7ed;color:#c2410c}
        .kpi>strong{display:block;font-size:clamp(18px,2vw,24px);margin-top:12px;overflow-wrap:anywhere}
        .tableCard{background:white;border:1px solid #e5eaf0;border-radius:14px;overflow:hidden}
        .tableHeader{padding:19px 20px;display:flex;justify-content:space-between;align-items:center;gap:15px;border-bottom:1px solid #eef2f7}
        h2{font-size:17px;margin:0}.tableHeader p{font-size:12px;color:#64748b;margin:5px 0 0}
        .search{display:flex;align-items:center;gap:8px;border:1px solid #dbe2ea;border-radius:9px;padding:0 11px;height:40px;color:#94a3b8;min-width:250px}
        .search input{border:0;outline:0;width:100%;min-width:0;color:#0f172a}
        .tableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:850px}
        th{text-align:left;background:#f8fafc;color:#475569;font-size:12px;padding:13px 14px;border-bottom:1px solid #e5eaf0}
        td{padding:14px;border-bottom:1px solid #eef2f7;vertical-align:top;font-size:13px}
        .resident{display:flex;flex-direction:column;gap:4px}.resident strong{font-size:13px}.resident small,.detailItem small{font-size:11px;color:#94a3b8}
        .amount{font-weight:700;margin-bottom:6px;white-space:nowrap}.muted{color:#cbd5e1}
        .right{text-align:right;white-space:nowrap}.total{font-weight:800;color:#0f172a}
        .detailBox{font-size:11px;color:#64748b}.detailBox summary{cursor:pointer;white-space:nowrap;list-style:none}.detailBox summary::-webkit-details-marker{display:none}.detailBox summary:after{content:"⌄";margin-left:5px}
        .detailList{min-width:220px;max-width:310px;padding:7px 0}.detailItem{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eef2f7}.detailItem>div{display:flex;flex-direction:column;gap:3px}.detailItem>strong{white-space:nowrap;color:#334155}
        .empty{text-align:center!important;color:#94a3b8;padding:35px!important}.tableNote{padding:12px 18px;color:#94a3b8;font-size:11px;background:#fcfdff}
        tfoot td{background:#f8fafc;font-weight:700}
        .error{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:13px 15px;border-radius:10px;margin-bottom:18px}
        @media(max-width:1000px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:650px){.page{padding:4px 0 20px}.pemasukanTabs a{padding:10px 13px;font-size:13px}.header{align-items:flex-start;flex-direction:column}.kpis{grid-template-columns:1fr 1fr}.tableHeader{align-items:stretch;flex-direction:column}.search{min-width:0;width:100%}.filters{align-items:flex-start;flex-direction:column}.filterHint{line-height:1.4}}
      `}</style>
    </main>
  );
}
