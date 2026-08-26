import { cn } from "@/lib/utils";
import { BarChart3, Database, FileSpreadsheet, Landmark, LayoutDashboard, Menu, Plus, Search, ShieldCheck, Star, Users, X } from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "wouter";

const navigation = [
  { label: "Visão geral", path: "/", icon: LayoutDashboard },
  { label: "Leads", path: "/leads", icon: Users },
  { label: "Importar", path: "/importar", icon: Plus },
  { label: "Importações", path: "/importacoes", icon: FileSpreadsheet },
  { label: "Coleta eleitoral", path: "/coleta-eleitoral", icon: Landmark },
  { label: "Base eleitoral", path: "/base-eleitoral", icon: Database },
  { label: "Favoritos", path: "/favoritos", icon: Star },
  { label: "Revisar perfis", path: "/revisar-perfis", icon: ShieldCheck },
];

export function CrmShell({ children, title, subtitle, actions }: { children: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const go = (path: string) => { setLocation(path); setMobileMenuOpen(false); };

  return (
    <div className="min-h-screen bg-[#061329] text-slate-100 selection:bg-cyan-300/25">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_-10%,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_10%_100%,rgba(37,99,235,0.18),transparent_30%)]" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-white/8 bg-[#07172d]/88 px-4 py-5 backdrop-blur-xl lg:flex">
        <button onClick={() => go("/")} className="mb-10 flex items-center gap-3 px-2 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 font-display text-lg font-bold text-[#051329] shadow-[0_8px_28px_rgba(34,211,238,0.28)]">E</span>
          <span><span className="block font-display text-[15px] font-semibold tracking-[0.02em] text-white">Eleições</span><span className="block text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">CRM de prospecção</span></span>
        </button>
        <nav className="space-y-1.5" aria-label="Navegação principal">
          {navigation.map(item => {
            const active = item.path === "/" ? location === "/" : location.startsWith(item.path);
            return <button key={item.path} onClick={() => go(item.path)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition duration-200", active ? "bg-cyan-300/[0.12] font-medium text-cyan-100 shadow-inner shadow-cyan-200/5" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100")}><item.icon className={cn("h-4 w-4", active && "text-cyan-300")} />{item.label}</button>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-300 text-xs font-bold text-slate-950">E</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-100">Espaço pessoal</p><p className="truncate text-xs text-slate-500">Acesso direto</p></div></div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-white/8 bg-[#061329]/78 px-4 backdrop-blur-xl lg:ml-[252px] lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-200 lg:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate font-display text-xl font-semibold tracking-tight text-white">{title}</p>{subtitle && <p className="hidden text-xs text-slate-500 sm:block">{subtitle}</p>}</div></div>
        <div className="flex items-center gap-2">{actions}<button onClick={() => go("/leads")} className="hidden h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100 sm:flex"><Search className="h-3.5 w-3.5" /> Buscar</button></div>
      </header>
      <main className="relative mx-auto max-w-[1600px] p-4 pb-10 sm:p-6 lg:ml-[252px] lg:p-8">{children}</main>
      {isMobileMenuOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-[#020816]/75 backdrop-blur-sm" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} /><div className="relative h-full w-[290px] border-r border-white/10 bg-[#07172d] px-4 py-5 shadow-2xl"><div className="mb-9 flex items-center justify-between"><span className="font-display font-semibold text-white">Eleições CRM</span><button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-300"><X className="h-5 w-5" /></button></div><nav className="space-y-1.5">{navigation.map(item => <button key={item.path} onClick={() => go(item.path)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm", location === item.path ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400")}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav></div></div>}
    </div>
  );
}
