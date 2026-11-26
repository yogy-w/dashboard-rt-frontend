"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { simpanDonasi } from "../../../lib/rt-api";
import PemasukanDetailTable from "../../../components/pemasukan/PemasukanDetailTable";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const money = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value || 0);

export default function DonasiPage() {
  const [tanggal, setTanggal] = useState(today());
  const [nama, setNama] = useState("");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  async function save() {
    const amount = Number(nominal);
    if (!tanggal) return setError("Tanggal donasi wajib diisi.");
    if (!nama.trim()) return setError("Nama donatur wajib diisi.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Nominal donasi harus lebih dari nol.");

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await simpanDonasi({
        tanggal,
        namaDonatur: nama.trim(),
        nominal: amount,
        keterangan: keterangan.trim(),
      });
      setSuccess(`Donasi ${money(amount)} berhasil dicatat.`);
      setDetailRefreshToken(token => token + 1);
      setNama("");
      setNominal("");
      setKeterangan("");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Gagal menyimpan donasi.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="donPage">
    <header className="donHeader">
      <span className="donIcon"><HandCoins size={22}/></span>
      <div><h1>Input Donasi</h1><p>Catat donasi sukarela tanpa membuat kewajiban atau tunggakan warga.</p></div>
    </header>
    {error && <div className="alert error">{error}</div>}
    {success && <div className="alert success">{success}</div>}
    <section className="card">
      <div className="grid">
        <label>Tanggal Donasi<input type="date" value={tanggal} onChange={event => setTanggal(event.target.value)} /><small>Periode: {new Date(`${tanggal}T12:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</small></label>
        <label>Tipe<input value="DONASI" readOnly /></label>
        <label>Nama Donatur<input value={nama} onChange={event => setNama(event.target.value)} placeholder="Nama donatur" /></label>
        <label>Nominal Donasi (Rp)<input type="number" min="1" value={nominal} onChange={event => setNominal(event.target.value)} placeholder="Contoh: 100000" /></label>
        <label className="wide">Keterangan<input value={keterangan} onChange={event => setKeterangan(event.target.value)} placeholder="Keterangan tambahan (opsional)" /></label>
      </div>
      <div className="actions"><button disabled={busy} onClick={save}>{busy ? "Menyimpan..." : "Simpan Donasi"}</button></div>
    </section>
    <PemasukanDetailTable type="DONASI" refreshToken={detailRefreshToken} />
    <style jsx>{`
      .donPage{width:100%;margin:0;padding:0 0 24px;color:#0f172a}
      .donPage header{margin-bottom:12px}
      .donHeader{display:flex;align-items:center;gap:13px;padding:16px 18px;border:1px solid #dbe7f5;border-radius:14px;background:linear-gradient(110deg,#fff 0%,#f3f8ff 100%);box-shadow:0 2px 8px rgba(15,23,42,.03)}
      .donIcon{width:44px;height:44px;display:grid;place-items:center;flex:none;border-radius:12px;background:#e8f0ff;color:#2563eb}
      .donPage h1{font-size:22px;margin:0}
      .donPage p{color:#64748b;margin:6px 0}
      .card{width:100%;background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(15,23,42,.03)}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .grid label{display:grid;gap:5px;font-size:13px;font-weight:650}.grid small{color:#64748b;font-size:11px;font-weight:500}
      .grid input{height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font:inherit;min-width:0}
      .wide{grid-column:1/-1}
      .actions{display:flex;justify-content:flex-end;margin-top:12px}
      .actions button{background:#2563eb;color:#fff;border:0;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer}
      .actions button:disabled{opacity:.6;cursor:wait}
      .alert{padding:12px;border-radius:8px;margin-bottom:12px}
      .error{background:#fef2f2;color:#b91c1c}
      .success{background:#f0fdf4;color:#166534}
      @media(max-width:650px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}}
    `}</style>
  </main>;
}
