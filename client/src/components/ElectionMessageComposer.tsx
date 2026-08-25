import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getCandidatePublicContacts } from "@/lib/election-contact";
import { electionMessageForCandidate, electionMessageVariantMeta, type ElectionMessageVariant } from "@/lib/election-message";
import { Check, Copy, MessageCircle } from "lucide-react";
import React, { useMemo, useState } from "react";

type Candidate = {
  candidateName: string; ballotName: string | null; cargo: string; party: string | null; state: string; city: string | null;
  primaryInstagram: string | null; declaredProfiles: string[] | null;
  publicContacts: Array<{ type: "whatsapp" | "email" | "telefone"; value: string; href: string; source: string }> | null;
};

export function ElectionMessageComposer({ candidate }: { candidate: Candidate }) {
  const [variant, setVariant] = useState<ElectionMessageVariant>("apresentacao");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const message = useMemo(() => electionMessageForCandidate(candidate, variant), [candidate, variant]);
  const whatsapp = getCandidatePublicContacts(candidate).whatsapp;
  const copy = async () => { try { if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível"); await navigator.clipboard.writeText(message); setCopyState("copied"); window.setTimeout(() => setCopyState("idle"), 1800); } catch { setCopyState("failed"); } };
  const openWhatsapp = () => { if (!whatsapp) return; const url = new URL(whatsapp); url.searchParams.set("text", message); window.open(url.toString(), "_blank", "noopener,noreferrer"); };
  return <Dialog><DialogTrigger asChild><button type="button" title="Preparar mensagem de WhatsApp" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] px-2 text-[10px] font-medium text-emerald-100 transition hover:bg-emerald-300/[0.14]"><MessageCircle className="h-3.5 w-3.5" /> Mensagem</button></DialogTrigger><DialogContent className="max-w-xl border-white/10 bg-[#07162c] text-slate-100"><DialogHeader><DialogTitle>Mensagem para {candidate.ballotName || candidate.candidateName}</DialogTitle><DialogDescription className="text-slate-400">Personalizada com dados públicos da candidatura. Revise antes de copiar ou abrir no WhatsApp.</DialogDescription></DialogHeader><div className="space-y-4"><label className="block text-xs text-slate-400">Variante<select value={variant} onChange={event => setVariant(event.target.value as ElectionMessageVariant)} className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#041126] px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">{Object.entries(electionMessageVariantMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label} — {meta.description}</option>)}</select></label><textarea aria-label="Mensagem personalizada" value={message} onChange={() => undefined} readOnly className="min-h-48 w-full resize-y rounded-xl border border-white/10 bg-[#041126] p-3 text-sm leading-6 text-slate-200 outline-none" /><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-200 transition hover:bg-white/[0.06]">{copyState === "copied" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}{copyState === "copied" ? "Copiada" : copyState === "failed" ? "Não foi possível copiar" : "Copiar mensagem"}</button><button type="button" onClick={openWhatsapp} disabled={!whatsapp} title={whatsapp ? "Abrir o WhatsApp público declarado" : "Nenhum WhatsApp público declarado"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-300 px-3 text-xs font-semibold text-[#052219] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-slate-500"><MessageCircle className="h-3.5 w-3.5" />{whatsapp ? "Abrir WhatsApp" : "Sem WhatsApp público"}</button></div></div></DialogContent></Dialog>;
}
