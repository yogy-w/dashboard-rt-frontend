"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Check, X, Minus } from "lucide-react";
import { getChecklistIuran, type ChecklistIuranRow } from "../../../../lib/rt-api";
import styles from "./report.module.css";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function ReportIuranPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<ChecklistIuranRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await getChecklistIuran(year); setRows(result.rows || []); }
    catch (err) { setRows([]); setError(err instanceof Error ? err.message : "Gagal memuat report iuran."); }
    finally { setLoading(false); }
  }, [year]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("id");
    if (!q) return rows;
    return rows.filter(row => row.nama.toLocaleLowerCase("id").includes(q) || row.nik.includes(q));
  }, [rows, search]);
  const counts = useMemo(() => {
    const result = { paid: 0, migrated: 0, unpaid: 0, notDue: 0 };
    filtered.forEach(row => row.bulan.forEach(cell => {
      if (cell.status === "PAID") result.paid++; else if (cell.status === "MIGRATED") result.migrated++; else if (cell.status === "UNPAID") result.unpaid++; else result.notDue++;
    }));
    return result;
  }, [filtered]);

  return <main className={styles.page}>
    <section className={styles.titleBar}>
      <div><div className={styles.eyebrow}>ADMIN RT 05 · KEUANGAN</div><h1>Report Iuran</h1><p>Pemantauan pembayaran iuran warga per bulan.</p></div>
      <div className={styles.yearPicker}><label htmlFor="checklist-year">Tahun</label><select id="checklist-year" value={year} onChange={event => setYear(Number(event.target.value))}>{Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => <option key={y} value={y}>{y}</option>)}</select></div>
    </section>
    <section className={styles.toolbar}>
      <div className={styles.stats}><span><i className={styles.greenDot}/> Lunas <strong>{counts.paid}</strong></span><span><i className={styles.yellowDot}/> Migrasi <strong>{counts.migrated}</strong></span><span><i className={styles.redDot}/> Belum bayar <strong>{counts.unpaid}</strong></span><span><i className={styles.purpleDot}/> Belum wajib <strong>{counts.notDue}</strong></span></div>
      <div className={styles.actions}><label className={styles.search}><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau NIK..." /></label><button className={styles.refresh} onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? styles.spin : ""}/> Muat ulang</button></div>
    </section>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.tableCard}>
      <div className={styles.tableMeta}><strong>{filtered.length} warga</strong><span>·</span><span>Tahun {year}</span><span className={styles.mobileHint}>Geser tabel ke samping untuk melihat semua bulan</span></div>
      <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th className={styles.noCol}>No</th><th className={styles.nikCol}>NIK</th><th className={styles.nameCol}>Nama Warga</th>{MONTHS.map(month => <th key={month}>{month}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={15} className={styles.empty}>Memuat report iuran...</td></tr> : filtered.length === 0 ? <tr><td colSpan={15} className={styles.empty}>{search ? "Warga tidak ditemukan." : "Belum ada data warga."}</td></tr> : filtered.map((row, index) => <tr key={row.nik}><td className={styles.noCol}>{index + 1}</td><td className={styles.nikCol}>{row.nik}</td><td className={styles.nameCol}>{row.nama}</td>{row.bulan.map((cell, monthIndex) => <td key={`${row.nik}-${monthIndex}`} className={`${styles.statusCell} ${cell.status === "PAID" ? styles.paid : cell.status === "MIGRATED" ? styles.migrated : cell.status === "UNPAID" ? styles.unpaid : styles.notDue}`} title={`${MONTHS[monthIndex]} ${year}: ${cell.status === "PAID" ? "Lunas" : cell.status === "MIGRATED" ? "Migrasi / pembayaran historis" : cell.status === "UNPAID" ? "Belum bayar" : "Tidak wajib iuran"}`}>{cell.status === "PAID" ? <Check size={17} strokeWidth={3}/> : cell.status === "MIGRATED" ? <span className={styles.migratedMark}>●</span> : cell.status === "UNPAID" ? <X size={18} strokeWidth={3}/> : <Minus size={18} strokeWidth={3}/>}</td>)}</tr>)}</tbody>
      </table></div>
      <footer className={styles.footer}>Data dihitung dari APP_WARGA_STATUS, APP_WARGA_BEBAS_IURAN, APP_PEMASUKAN, dan APP_PEMASUKAN_HIST.</footer>
    </section>
  </main>;
}
