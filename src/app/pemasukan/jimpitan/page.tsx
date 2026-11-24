"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HandCoins, LogOut, Save, Wallet, Search, LayoutDashboard, ReceiptText, Tags , BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { getMaster, simpanJimpitan } from "../../../lib/rt-api";

type MasterItem = { id: string; namaItem: string; tipe: string; status: boolean };

export default function JimpitanPage() {
  const router = useRouter();
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [masterId, setMasterId] = useState("");
  const [tanggal, setTanggal] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getMaster().then((result: any) => {
      const rows = (result.rows || []).filter((r: MasterItem) => r.tipe === "JIMPITAN" && r.status === true);
      setMasters(rows);
      if (rows.length) setMasterId(rows[0].id);
    }).catch((e) => setError(e instanceof Error ? e.message : "Gagal mengambil master jimpitan"))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    const value = Number(nominal);
    if (!masterId) return setError("Pilih grup jimpitan terlebih dahulu.");
    if (!tanggal) return setError("Tanggal wajib diisi.");
    if (!Number.isFinite(value) || value <= 0) return setError("Nominal harus lebih dari 0.");
    setSaving(true); setError(""); setSuccess("");
    try {
      await simpanJimpitan({ masterId, tanggal, nominal: value, keterangan: keterangan.trim() });
      setSuccess("Input jimpitan berhasil disimpan.");
      setNominal(""); setKeterangan("");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan jimpitan."); }
    finally { setSaving(false); }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      const r = await fetch("/api/pemasukan-auth/logout", { method: "POST", cache: "no-store" });
      if (!r.ok) throw new Error("Logout gagal.");
      router.replace("/kas"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Logout gagal."); setLoggingOut(false); }
  }

  return <main className="jpPage">
{error && <div className="jpAlert error">{error}</div>}
    {success && <div className="jpAlert success">{success}</div>}
    <section className="jpCard">
      <div className="jpCardTitle"><HandCoins size={20}/><div><h2>Data Jimpitan</h2><p>Masukkan tanggal, grup, dan nominal penerimaan.</p></div></div>
      {loading ? <p>Memuat grup jimpitan...</p> : <div className="jpGrid">
        <label>Tanggal<input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)}/></label>
        <label>Grup Jimpitan<select value={masterId} onChange={e=>setMasterId(e.target.value)}><option value="">Pilih grup jimpitan</option>{masters.map(m=><option key={m.id} value={m.id}>{m.namaItem}</option>)}</select></label>
        <label>Nominal (Rp)<input type="number" min="1" step="1" value={nominal} onChange={e=>setNominal(e.target.value)} placeholder="Contoh: 150000"/></label>
        <label>Keterangan (opsional)<input value={keterangan} onChange={e=>setKeterangan(e.target.value)} placeholder="Keterangan tambahan"/></label>
      </div>}
      {!loading && !masters.length && <p className="jpWarning">Belum ada master JIMPITAN aktif di APP_MASTER.</p>}
      <div className="jpActions"><button onClick={submit} disabled={saving || loading || !masters.length}><Save size={16}/>{saving ? "Menyimpan..." : "Simpan Jimpitan"}</button></div>
    </section>
    <style jsx>{`
      .jpPage{min-height:100vh;background:#f6f8fc;color:#0f172a;padding:28px 30px 50px}
      .jpHeader,.jpTabs,.jpCard,.jpAlert{max-width:1100px;margin-left:auto;margin-right:auto}
      .jpHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
      h1{font-size:27px;margin:0}.jpHeader p,.jpCardTitle p{color:#64748b;margin:6px 0 0}
      .jpLogout{display:flex;gap:8px;align-items:center;padding:10px 14px;border:1px solid #dbe2ea;background:#fff;border-radius:9px;cursor:pointer}
      .jpTabs{display:flex;align-items:center;gap:10px;padding:10px;background:#eef2f7;border:1px solid #e1e7f0;border-radius:16px;margin-bottom:22px;overflow-x:auto}
      .jpTabs :global(.tabItem){display:inline-flex;flex:0 0 auto;align-items:center;gap:9px;min-height:44px;padding:0 18px;border:1px solid #d8e0eb;border-radius:11px;background:#fff;color:#475569!important;text-decoration:none!important;font-size:14px;font-weight:650;white-space:nowrap;transition:all .15s ease}
      .jpTabs :global(.tabItem:hover){background:#f8fbff;border-color:#9db9e8;color:#1d4ed8!important}.jpTabs :global(.tabItem.active){background:#2563eb;border-color:#2563eb;color:#fff!important;box-shadow:0 3px 8px rgba(37,99,235,.20)}
      .jpTabs :global(.tabItem.active:hover){background:#1d4ed8;color:#fff!important}
      .jpCard{background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:22px}
      .jpCardTitle{display:flex;gap:12px;align-items:center;margin-bottom:20px}.jpCardTitle h2{font-size:19px;margin:0}
      .jpGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
      label{display:grid;gap:7px;font-size:13px;font-weight:650;color:#334155}
      input,select{height:43px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit}
      .jpActions{display:flex;justify-content:flex-end;margin-top:20px}
      .jpActions button{display:flex;gap:8px;align-items:center;border:0;border-radius:9px;padding:12px 18px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
      button:disabled{opacity:.55;cursor:not-allowed}
      .jpAlert{padding:12px 14px;border-radius:9px;margin-bottom:16px}.error{background:#fef2f2;color:#b91c1c}.success{background:#f0fdf4;color:#166534}
      .jpWarning{color:#b45309}
      @media(max-width:650px){.jpPage{padding:20px 15px}.jpHeader{flex-direction:column}.jpLogout{align-self:flex-end}.jpActions button{width:100%;justify-content:center}}
    `}</style>
  </main>;
}
