"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Download, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTunggakan, refreshTunggakan, type TunggakanWarga, type TunggakanDetail } from "../../../lib/rt-api";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

function DetailList({
  title,
  details,
  checked,
  onToggle,
}: {
  title: string;
  details: TunggakanDetail[];
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  if (!details.length) return <span className="muted">—</span>;
  return (
    <details className="detailBox" open>
      <summary>{details.length} item · Lihat daftar</summary>
      <div className="detailList">
        {details.map((item, index) => {
          const key = `${title}|${item.namaItem}|${item.periodeBulan}|${item.periodeTahun}|${item.penerimaNama || ""}|${index}`;
          const period = item.periodeBulan && item.periodeTahun
            ? `${item.periodeBulan} ${item.periodeTahun}`
            : "";
          const label = title === "Santunan"
            ? (item.namaItem || item.keterangan || "Santunan")
            : title === "Iuran"
              ? `${period || item.namaItem}`
              : `${item.namaItem || item.keterangan || "Lainnya"}${period ? ` · ${period}` : ""}`;
          return (
            <label className="checkItem" key={key}>
              <input type="checkbox" checked={!!checked[key]} onChange={() => onToggle(key)} />
              <span>
                <strong>{label}</strong>
                {title === "Santunan" && item.penerimaNama && <small>Penerima: {item.penerimaNama}</small>}
                {title !== "Iuran" && title !== "Santunan" && period && <small>{period}</small>}
              </span>
            </label>
          );
        })}
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    setError("");
    try {
      const result = await getTunggakan(monthEnd(period));
      setRows(result.rows || []);
      setJumlahWarga(Number(result.jumlahWarga || 0));
    } catch (err) {
      setRows([]);
      setJumlahWarga(0);
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


  const toggleChecked = (key: string) =>
    setChecked((current) => ({ ...current, [key]: !current[key] }));

  function downloadChecklist() {
    const groups = new Map<string, Array<{ jenis: string; uraian: string }>>();
    filtered.forEach((row) => {
      const key = `${row.nama} · ${row.nik}`;
      const details = [
        ...(row.iuran?.detail || []).map((item) => ({
          jenis: "Iuran Bulanan",
          uraian: item.periodeBulan && item.periodeTahun
            ? `${item.periodeBulan} ${item.periodeTahun}` : (item.namaItem || "Iuran"),
        })),
        ...(row.other?.detail || []).map((item) => {
          const isDansos = /DANSOS|DANA SOSIAL/i.test(`${item.namaItem || ""} ${item.keterangan || ""}`);
          const periodText = item.periodeBulan && item.periodeTahun
            ? `${item.periodeBulan} ${item.periodeTahun}` : "";
          return {
            jenis: isDansos ? "Dana Sosial" : "Lainnya",
            uraian: isDansos
              ? (periodText || item.namaItem || "Dana Sosial")
              : `${item.namaItem || item.keterangan || "Lainnya"}${periodText ? ` · ${periodText}` : ""}`,
          };
        }),
        ...(row.santunan?.detail || []).map((item) => ({
          jenis: "Santunan",
          uraian: `${item.namaItem || item.keterangan || "Santunan"}${item.penerimaNama ? ` · Penerima: ${item.penerimaNama}` : ""}`,
        })),
      ];
      if (details.length) groups.set(key, details);
    });

    const escapeHtml = (value: string) => value
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const residentSections = Array.from(groups.entries()).map(([resident, items]) => `
      <section class="resident">
        <h2>${escapeHtml(resident)}</h2>
        <table>
          <thead><tr><th class="check-col">Cek</th><th class="type-col">Jenis</th><th>Periode / Keterangan</th></tr></thead>
          <tbody>${items.map((item) => `
            <tr><td class="check-col"><span class="checkbox"></span></td>
            <td class="type-col">${escapeHtml(item.jenis)}</td>
            <td>${escapeHtml(item.uraian)}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>`).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup diblokir browser. Izinkan popup untuk membuat PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="id"><head><meta charset="utf-8" />
      <title>Checklist Tunggakan ${escapeHtml(period)}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; }
        .top { border-bottom: 2px solid #244d78; padding-bottom: 7mm; margin-bottom: 7mm; }
        h1 { margin: 0 0 4px; font-size: 19pt; color: #173f70; }
        .subtitle { margin: 0; color: #526174; font-size: 9pt; }
        .instruction { margin-top: 8px; font-size: 8.5pt; color: #64748b; }
        .resident { margin: 0 0 7mm; break-inside: avoid; page-break-inside: avoid; }
        .resident h2 { margin: 0; padding: 7px 9px; background: #edf3f9; color: #173f70; font-size: 10.5pt; border: 1px solid #d8e3ef; border-bottom: 0; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th, td { border: 1px solid #d9e1ea; padding: 7px 8px; text-align: left; vertical-align: middle; }
        th { background: #f7f9fc; color: #42536a; font-size: 8pt; }
        td { font-size: 9pt; line-height: 1.35; }
        .check-col { width: 13mm; text-align: center; }
        .type-col { width: 35mm; }
        .checkbox { display: inline-block; width: 4.5mm; height: 4.5mm; border: 1.2px solid #475569; }
        .empty { padding: 12mm 0; text-align: center; color: #64748b; }
        .footer { margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #d9e1ea; color: #64748b; font-size: 8pt; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <header class="top"><h1>CHECKLIST TUNGGAKAN WARGA</h1>
      <p class="subtitle">RT 05 · Periode sampai ${escapeHtml(period)} · ${groups.size} warga</p>
      <p class="instruction">Beri tanda centang setelah tunggakan ditindaklanjuti atau diselesaikan.</p></header>
      ${residentSections || '<p class="empty">Tidak ada tunggakan pada periode ini.</p>'}
      <footer class="footer">Dicetak: ${new Date().toLocaleDateString("id-ID")}</footer>
      <script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},300);});</script>
      </body></html>`);
    printWindow.document.close();
  }


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



      <section className="tableCard">
        <div className="tableHeader">
          <div><h2>Checklist Tunggakan Warga</h2><p>{filtered.length} dari {rows.length} warga · tanpa nominal</p></div>
          <div className="headerActions">
            <button className="download" onClick={downloadChecklist}><Download size={15}/> Download PDF</button>
            <label className="search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIK..." /></label>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Nama Warga</th><th>Iuran Bulanan</th><th>Dana Sosial</th><th>Santunan</th><th>Lainnya</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="empty">Memuat data tunggakan...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="empty">{search ? "Warga tidak ditemukan." : "Tidak ada tunggakan pada periode ini."}</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.nik}>
                  <td><div className="resident"><strong>{row.nama}</strong><small>{row.nik}</small></div></td>
                  <td><DetailList title="Iuran" details={row.iuran?.detail || []} checked={checked} onToggle={toggleChecked}/></td>
                  <td><DetailList title="Lainnya" details={(row.other?.detail || []).filter((item) => /DANSOS|DANA SOSIAL/i.test(`${item.namaItem} ${item.keterangan}`))} checked={checked} onToggle={toggleChecked}/></td>
                  <td><DetailList title="Santunan" details={row.santunan?.detail || []} checked={checked} onToggle={toggleChecked}/></td>
                  <td><DetailList title="Other" details={(row.other?.detail || []).filter((item) => !/DANSOS|DANA SOSIAL/i.test(`${item.namaItem} ${item.keterangan}`))} checked={checked} onToggle={toggleChecked}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tableNote">Unduh checklist PDF ukuran A4. Jika daftar panjang, otomatis berlanjut ke halaman berikutnya.</div>
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
        .filters,.tableCard,.error{max-width:1100px;margin-left:auto;margin-right:auto}
        .filters{background:white;border:1px solid #e5eaf0;border-radius:13px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .filters label{font-size:13px;font-weight:700;color:#475569}.filters input{height:40px;border:1px solid #dbe2ea;border-radius:8px;padding:0 11px;background:white}
        .filterHint{font-size:12px;color:#94a3b8;flex:1 1 240px}
                .tableCard{background:white;border:1px solid #e5eaf0;border-radius:14px;overflow:hidden}
        .tableHeader{padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #eef2f7}
        h2{font-size:17px;margin:0}.tableHeader p{font-size:12px;color:#64748b;margin:5px 0 0}
        .search{display:flex;align-items:center;gap:8px;border:1px solid #dbe2ea;border-radius:9px;padding:0 11px;height:40px;color:#94a3b8;min-width:250px}
        .search input{border:0;outline:0;width:100%;min-width:0;color:#0f172a}
        .tableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:900px}
        th{text-align:left;background:#f8fafc;color:#475569;font-size:12px;padding:13px 14px;border-bottom:1px solid #e5eaf0}
        td{padding:14px;border-bottom:1px solid #eef2f7;vertical-align:top;font-size:13px}
        .resident{display:flex;flex-direction:column;gap:4px}.resident strong{font-size:13px}.resident small,.detailItem small{font-size:11px;color:#94a3b8}
        .amount{font-weight:700;margin-bottom:6px;white-space:nowrap}.muted{color:#cbd5e1}
        .right{text-align:right;white-space:nowrap}.total{font-weight:800;color:#0f172a}
        .detailBox{font-size:11px;color:#64748b}.detailBox summary{cursor:pointer;white-space:nowrap;list-style:none}.detailBox summary::-webkit-details-marker{display:none}.detailBox summary:after{content:"⌄";margin-left:5px}
        .detailList{min-width:180px;max-width:320px;padding:6px 0}.checkItem{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #eef2f7;cursor:pointer}.checkItem input{margin:2px 0 0;accent-color:#2563eb}.checkItem span{display:flex;flex-direction:column;gap:3px}.checkItem strong{font-size:12px;font-weight:600;color:#1e293b}.checkItem small{font-size:11px;color:#94a3b8}
        .empty{text-align:center!important;color:#94a3b8;padding:35px!important}.tableNote{padding:10px 16px;color:#94a3b8;font-size:11px;background:#fcfdff}.headerActions{display:flex;align-items:center;gap:10px}.download{display:inline-flex;align-items:center;gap:7px;border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;background:#fff;color:#334155;font-size:12px;font-weight:700;cursor:pointer}.download:hover{background:#f8fafc}
        tfoot td{background:#f8fafc;font-weight:700}
        .error{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:13px 15px;border-radius:10px;margin-bottom:18px}
        @media(max-width:1000px){}
        @media(max-width:650px){.page{padding:4px 0 20px}.pemasukanTabs a{padding:10px 13px;font-size:13px}.header{align-items:flex-start;flex-direction:column}.tableHeader{align-items:stretch;flex-direction:column}.headerActions{align-items:stretch;flex-direction:column}.search{min-width:0;width:100%}.filters{align-items:flex-start;flex-direction:column}.filterHint{line-height:1.4}}
      `}</style>
    </main>
  );
}
