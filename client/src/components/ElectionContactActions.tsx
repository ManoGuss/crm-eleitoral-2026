import { getCandidatePublicContacts } from "@/lib/election-contact";
import { Instagram, Mail, MessageCircle, Phone } from "lucide-react";

type CandidateContactSource = { primaryInstagram: string | null; declaredProfiles: string[] | null; publicContacts?: Array<{ type: "whatsapp" | "email" | "telefone"; value: string; href: string; source: string }> | null };

export function ElectionContactActions({ candidate, compact = false }: { candidate: CandidateContactSource; compact?: boolean }) {
  const { instagram, whatsapp, email, telefone } = getCandidatePublicContacts(candidate);
  const size = compact ? "h-8 w-8" : "h-9 px-3";
  const channels = [
    whatsapp ? { href: whatsapp, label: "WhatsApp", icon: MessageCircle, className: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100 hover:bg-emerald-300/[0.12]" } : null,
    email ? { href: email, label: "E-mail", icon: Mail, className: "border-sky-300/20 bg-sky-300/[0.06] text-sky-100 hover:bg-sky-300/[0.12]" } : null,
    telefone ? { href: telefone, label: "Telefone", icon: Phone, className: "border-violet-300/20 bg-violet-300/[0.06] text-violet-100 hover:bg-violet-300/[0.12]" } : null,
    instagram ? { href: instagram, label: "Instagram", icon: Instagram, className: "border-fuchsia-300/20 bg-fuchsia-300/[0.06] text-fuchsia-100 hover:bg-fuchsia-300/[0.12]" } : null,
  ].filter((channel): channel is NonNullable<typeof channel> => Boolean(channel));

  if (!channels.length) return <span className="text-xs text-slate-600">—</span>;
  return <span className="flex flex-wrap gap-1.5">{channels.map(channel => <a key={`${channel.label}-${channel.href}`} href={channel.href} target={channel.href.startsWith("http") ? "_blank" : undefined} rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined} title={`Abrir ${channel.label} público`} className={`inline-flex items-center justify-center gap-2 rounded-lg border text-xs font-medium transition ${size} ${channel.className}`}>{<channel.icon className="h-3.5 w-3.5" />}{!compact && channel.label}</a>)}</span>;
}
