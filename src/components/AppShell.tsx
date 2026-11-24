"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Wallet, HandCoins, ReceiptText, Search,
  BookOpen, Tags, ShieldCheck, LogIn, LogOut, Menu, X
} from "lucide-react";

const dashboardItems = [
  { href: "/kas", label: "Dashboard Kas", icon: Wallet },
  { href: "/jimpitan", label: "Dashboard Jimpitan", icon: HandCoins },
];

const mainItems = [
  { href: "/pemasukan", label: "Input Iuran", icon: Wallet },
  { href: "/pemasukan/jimpitan", label: "Input Jimpitan", icon: HandCoins },
  { href: "/pemasukan/pengeluaran", label: "Input Pengeluaran", icon: ReceiptText },
  { href: "/pemasukan/tunggakan", label: "Data Tunggakan", icon: Search },
];

const masterItems = [
  { href: "/pemasukan/master-pemasukan", label: "Master Pemasukan", icon: BookOpen },
  { href: "/pemasukan/master-kategori", label: "Master Kategori Pengeluaran", icon: Tags },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLogin = pathname === "/pemasukan/login";

  useEffect(() => {
    let alive = true;
    fetch("/api/pemasukan-auth/status", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => { if (alive) setIsAdmin(Boolean(data.authenticated)); })
      .catch(() => { if (alive) setIsAdmin(false); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/pemasukan-auth/logout", { method: "POST", cache: "no-store" });
      setIsAdmin(false);
      router.replace("/kas");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (isLogin) return <>{children}</>;

  const linkClass = (href: string) => `appNavLink${pathname === href ? " active" : ""}`;

  return (
    <div className="appShell">
      <button className="mobileMenuButton" onClick={() => setMobileOpen(v => !v)} aria-label="Buka menu">
        {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
      </button>
      <aside className={`appSidebar${mobileOpen ? " mobileOpen" : ""}`}>
        <Link href="/kas" className="appBrand">
          <span className="appBrandMark"><LayoutDashboard size={21}/></span>
          <span><strong>RT 05</strong><small>Sistem Keuangan RW 031</small></span>
        </Link>

        <div className="appNavSection">
          <div className="appNavLabel">DASHBOARD</div>
          {dashboardItems.map(item => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <Icon size={18}/><span>{item.label}</span>
            </Link>;
          })}
        </div>

        {isAdmin && <>
          <div className="appNavDivider"/>
          <div className="appNavSection">
            <div className="appNavLabel"><ShieldCheck size={14}/> ADMIN</div>
            <div className="appNavSubLabel">MENU UTAMA</div>
            {mainItems.map(item => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <Icon size={18}/><span>{item.label}</span>
              </Link>;
            })}
            <div className="appNavSubLabel masterLabel">MASTER DATA</div>
            {masterItems.map(item => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <Icon size={18}/><span>{item.label}</span>
              </Link>;
            })}
          </div>
        </>}

        <div className="appSidebarBottom">
          {!checking && (isAdmin
            ? <button className="appAuthButton logout" onClick={logout} disabled={loggingOut}>
                <LogOut size={17}/>{loggingOut ? "Keluar..." : "Logout"}
              </button>
            : <Link className="appAuthButton login" href="/pemasukan/login">
                <LogIn size={17}/>Login Admin
              </Link>
          )}
        </div>
      </aside>

      <div className="appMain">
        <header className="appTopbar">
          <div>
            <div className="appTopTitle">Sistem Keuangan RT 05</div>
            <div className="appTopSubtitle">RT 005 / RW 031</div>
          </div>
          {isAdmin && <span className="appAdminPill"><ShieldCheck size={14}/> Admin</span>}
        </header>
        <main className="appContent">{children}</main>
      </div>
      {mobileOpen && <button className="appMobileBackdrop" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"/>}
    </div>
  );
}
