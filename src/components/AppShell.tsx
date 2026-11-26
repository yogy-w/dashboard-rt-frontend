"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Wallet, HandCoins, ReceiptText, Search,
  BookOpen, Tags, ShieldCheck, LogIn, LogOut, Menu, X, ChevronLeft, ChevronRight,
  FileText, HeartHandshake
} from "lucide-react";

const dashboardItems = [
  { href: "/kas", label: "Dashboard Kas", icon: Wallet },
  { href: "/jimpitan", label: "Dashboard Jimpitan", icon: HandCoins },
];

const mainItems = [
  { href: "/pemasukan", label: "Input Iuran", icon: Wallet },
  { href: "/pemasukan/donasi", label: "Input Donasi", icon: HandCoins },
  { href: "/pemasukan/jimpitan", label: "Input Jimpitan", icon: HandCoins },
  { href: "/pemasukan/pengeluaran", label: "Input Pengeluaran", icon: ReceiptText },
  { href: "/pemasukan/tunggakan", label: "Data Tunggakan", icon: Search },
];

const reportItems = [
  { href: "/pemasukan/report/iuran", label: "Report Iuran", icon: FileText },
  { href: "/pemasukan/report/dansos", label: "Report Dansos", icon: FileText },
  { href: "/pemasukan/report/santunan", label: "Report Santunan", icon: HeartHandshake },
];

const masterItems = [
  { href: "/pemasukan/master-pemasukan", label: "Master Pemasukan", icon: BookOpen },
  { href: "/pemasukan/master-kategori", label: "Master Pengeluaran", icon: Tags },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username:string;role:string}|null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isLogin = pathname === "/pemasukan/login";

  useEffect(() => {
    let alive = true;
    fetch("/api/pemasukan-auth/status", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => { if (alive) { setIsAdmin(Boolean(data.authenticated)); setCurrentUser(data.user || null); } })
      .catch(() => { if (alive) setIsAdmin(false); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); setAccountMenuOpen(false); }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/pemasukan-auth/logout", { method: "POST", cache: "no-store" });
      setIsAdmin(false);
      setCurrentUser(null);
      setAccountMenuOpen(false);
      router.replace("/kas");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (isLogin) return <>{children}</>;

  const linkClass = (href: string) => `appNavLink${pathname === href ? " active" : ""}`;

  return (
    <div className={`appShell${sidebarCollapsed ? " sidebarCollapsed" : ""}`}>
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
            <div className="appNavSubLabel masterLabel">REPORT</div>
            {reportItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname === "/pemasukan/checklist-iuran" && item.href.endsWith("/iuran");
              return <Link key={item.href} href={item.href} className={`appNavLink${active ? " active" : ""}`}>
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

      </aside>

      <div className="appMain">
        <header className="appTopbar">
          <div className="appTopbarLeft">
            <button className="sidebarToggle" type="button" onClick={() => setSidebarCollapsed(v => !v)} aria-label={sidebarCollapsed ? "Perbesar sidebar" : "Perkecil sidebar"} title={sidebarCollapsed ? "Perbesar sidebar" : "Perkecil sidebar"}>
              {sidebarCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
            </button>
            <div>
            <div className="appTopTitle">Sistem Keuangan RT 05</div>
            <div className="appTopSubtitle">RT 005 / RW 031</div>
            </div>
          </div>
          {!checking && <div className="appAccountArea">
            {isAdmin ? <div className="appAccountMenu">
              <button
                className="appAdminPill"
                type="button"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                onClick={() => setAccountMenuOpen(value => !value)}
              >
                <ShieldCheck size={14}/>
                <span>{currentUser ? `${currentUser.username} · ${currentUser.role}` : "Pengurus"}</span>
              </button>
              {accountMenuOpen && <div className="appAccountDropdown" role="menu">
                <button type="button" role="menuitem" onClick={logout} disabled={loggingOut}>
                  <LogOut size={16}/>{loggingOut ? "Keluar..." : "Logout"}
                </button>
              </div>}
            </div> : <Link className="appLoginButton" href="/pemasukan/login">
              <LogIn size={16}/>Login
            </Link>}
          </div>}
        </header>
        <main className="appContent">{children}</main>
      </div>
      {mobileOpen && <button className="appMobileBackdrop" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"/>}
    </div>
  );
}
