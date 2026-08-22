import { Facebook, Globe2, Instagram, Link2, Mail, Phone, Send, type LucideIcon } from "lucide-react";

export const crmStatuses = ["Novo", "Abordado", "Respondeu", "Não respondeu", "Interessado", "Follow-up", "Proposta enviada", "Fechado", "Perdido"] as const;

export const services = ["Site", "Gestão de tráfego", "Gestão de redes sociais", "Jingle", "Vídeo de campanha", "Material gráfico", "Outros"];

export const statusTone: Record<string, string> = {
  Novo: "bg-slate-400/10 text-slate-200 ring-slate-300/20",
  Abordado: "bg-sky-400/10 text-sky-300 ring-sky-300/20",
  Respondeu: "bg-violet-400/10 text-violet-300 ring-violet-300/20",
  "Não respondeu": "bg-amber-400/10 text-amber-300 ring-amber-300/20",
  Interessado: "bg-cyan-400/10 text-cyan-300 ring-cyan-300/20",
  "Follow-up": "bg-blue-400/10 text-blue-300 ring-blue-300/20",
  "Proposta enviada": "bg-indigo-400/10 text-indigo-300 ring-indigo-300/20",
  Fechado: "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20",
  Perdido: "bg-rose-400/10 text-rose-300 ring-rose-300/20",
};

export function statusClass(status: string) {
  return statusTone[status] ?? "bg-white/8 text-slate-200 ring-white/10";
}

export function leadName(fields: Record<string, string>) {
  const candidates = ["Nome de urna", "Nome completo", "Candidato", "Nome"];
  const entry = Object.entries(fields).find(([header]) => candidates.some(candidate => header.toLowerCase().includes(candidate.toLowerCase())));
  return entry?.[1] || "Lead sem nome";
}

export function fieldValue(fields: Record<string, string>, label: string) {
  const normalized = label.toLowerCase();
  return Object.entries(fields).find(([header]) => header.toLowerCase().includes(normalized))?.[1] || "—";
}

export type LeadAction = { label: string; href: string; icon: LucideIcon };

export function actionLinks(fields: Record<string, string>): LeadAction[] {
  const links: LeadAction[] = [];
  const add = (label: string, href: string, icon: LucideIcon) => {
    if (!links.some(link => link.href === href)) links.push({ label, href, icon });
  };
  Object.entries(fields).forEach(([header, raw]) => {
    raw.split(/[\n;,]+/).map(value => value.trim()).filter(Boolean).forEach(value => {
      const lower = value.toLowerCase();
      const headerLower = header.toLowerCase();
      if (/^(javascript|data|vbscript):/i.test(value)) return;
      if (/wa\.me|api\.whatsapp\.com|whatsapp\.com/.test(lower) && /^https?:\/\//.test(value)) return add("WhatsApp", value, Send);
      if (/instagram\.com/.test(lower) && /^https?:\/\//.test(value)) return add("Instagram", value, Instagram);
      if (/^@[a-z0-9._]+$/i.test(value) && /instagram|insta/.test(headerLower)) return add("Instagram", `https://instagram.com/${value.slice(1)}`, Instagram);
      if (/(facebook\.com|fb\.com|fb\.me)/.test(lower) && /^https?:\/\//.test(value)) return add("Facebook", value, Facebook);
      if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return add("E-mail", `mailto:${value}`, Mail);
      const digits = value.replace(/\D/g, "");
      if ((/telefone|celular|whats|contato|fone/.test(headerLower) || /^\+?\d[\d\s().-]{7,}$/.test(value)) && digits.length >= 10) {
        if (/whats|celular/.test(headerLower)) return add("WhatsApp", `https://wa.me/55${digits.startsWith("55") ? digits.slice(2) : digits}`, Send);
        return add("Telefone", `tel:+${digits.startsWith("55") ? digits : `55${digits}`}`, Phone);
      }
      if (/^https?:\/\//.test(value)) add(/site/.test(headerLower) ? "Site" : "Link", value, /site/.test(headerLower) ? Globe2 : Link2);
    });
  });
  return links;
}

export function formatDate(value?: Date | number | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
