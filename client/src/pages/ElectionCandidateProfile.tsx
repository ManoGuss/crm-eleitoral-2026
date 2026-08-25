import { CrmShell } from "@/components/CrmShell";
import { getCandidatePublicContacts } from "@/lib/election-contact";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Clock3, History, Instagram, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const outcomes = ["iniciada", "enviada", "respondida", "sem_resposta", "sem_interesse", "agendada", "outro"] as const;
const outcomeLabel: Record<(typeof outcomes)[number], string> = { iniciada: "Iniciada", enviada: "Enviada", respondida: "Respondida", sem_resposta: "Sem resposta", sem_interesse: "Sem interesse", agendada: "Agendada", outro: "Outro" };

export default function ElectionCandidateProfile({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.electionResearch.candidateProfile.useQuery({ candidateId: id });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const prepareContact = trpc.crm.electionResearch.prepareContact.useMutation({
    onSuccess: result => {
      utils.crm.electionResearch.candidateProfile.invalidate({ candidateId: id });
      window.open(result.url, "_blank", "noopener,noreferrer");
      toast.success(result.channel === "whatsapp" ? "WhatsApp aberto com mensagem preenchida." : "Instagram aberto e interação registrada.");
    },
    onError: error => toast.error(error.message),
  });
  const updateInteraction = trpc.crm.electionResearch.updateInteraction.useMutation({
    onSuccess: () => { utils.crm.electionResearch.candidateProfile.invalidate({ candidateId: id }); toast.success("Novo evento de interação registrado."); },
    onError: error => toast.error(error.message),
  });

  if (isLoading || !data) return <CrmShell title="Perfil da candidatura"><div className="grid min-h-80 place-items-center text-slate-500">Carregando perfil...</div></CrmShell>;
  const { candidate, reviews, interactions } = data;
  const contacts = getCandidatePublicContacts(candidate);

  return <CrmShell title="Perfil da candidatura" subtitle="Revisões e contatos em uma linha do tempo auditável" actions={<button onClick={() => setLocation("/base-eleitoral")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs text-slate-200"><ArrowLeft className="h-3.5 w-3.5" /> Voltar à base</button>}>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span className="inline-flex rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">{candidate.state} · {candidate.cargo}</span><h2 className="mt-3 font-display text-2xl font-semibold text-white">{candidate.candidateName}</h2><p className="mt-1 text-sm text-slate-400">{candidate.ballotName || "Nome de urna não publicado"} · {candidate.party || "Partido não publicado"}</p><p className="mt-2 text-xs text-slate-500">ID oficial {candidate.officialCandidateId} · Situação: {candidate.candidateStatus || "não publicada"}</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ${candidate.instagramVerification === "Verificado" ? "bg-emerald-300/10 text-emerald-200" : candidate.instagramVerification === "Provável — requer revisão" ? "bg-amber-300/10 text-amber-200" : "bg-white/[0.05] text-slate-400"}`}>{candidate.instagramVerification}</span></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={() => prepareContact.mutate({ candidateId: candidate.id, channel: "instagram" })} disabled={prepareContact.isPending || !contacts.instagram} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/[0.06] text-xs font-semibold text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-35"><Instagram className="h-4 w-4" /> Contatar pelo Instagram</button><button onClick={() => prepareContact.mutate({ candidateId: candidate.id, channel: "whatsapp" })} disabled={prepareContact.isPending || !contacts.whatsapp} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 text-xs font-semibold text-[#052318] disabled:cursor-not-allowed disabled:opacity-35"><MessageCircle className="h-4 w-4" /> WhatsApp com mensagem</button></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Os botões usam somente canais públicos declarados. Cada abertura cria uma interação e cada atualização de resultado preserva o evento anterior.</p>
        </section>
        <Timeline title="Histórico de revisões" icon={<ShieldCheck className="h-4 w-4" />} empty="Ainda não há revisão manual registrada.">{reviews.map((review: any) => <article key={review.id} className="relative pl-5 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-cyan-300"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${review.decision === "aprovado" ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{review.decision === "aprovado" ? "Aprovado" : "Rejeitado"}</span><span className="text-xs text-slate-400">{review.reviewerName || review.reviewerEmail || "Revisor não identificado"}</span></div>{review.note && <p className="mt-2 text-xs leading-5 text-slate-300">{review.note}</p>}<p className="mt-1 text-[11px] text-slate-500">{new Date(review.createdAt).toLocaleString("pt-BR")}</p></article>)}</Timeline>
      </div>
      <div className="space-y-5">
        <Timeline title="Histórico de interações" icon={<History className="h-4 w-4" />} empty="Nenhuma tentativa de contato foi registrada.">{interactions.map((interaction: any) => <InteractionCard key={interaction.id} interaction={interaction} draft={drafts[interaction.id] ?? ""} onDraftChange={value => setDrafts(current => ({ ...current, [interaction.id]: value }))} onUpdate={(outcome, note) => updateInteraction.mutate({ interactionId: interaction.id, outcome, note })} />)}</Timeline>
        <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><div className="flex items-center gap-2 text-sm font-medium text-slate-100"><UserRound className="h-4 w-4 text-cyan-200" /> Dados oficiais</div><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">UF</dt><dd className="mt-1 text-slate-200">{candidate.state}</dd></div><div><dt className="text-slate-500">Disponível na urna</dt><dd className="mt-1 text-slate-200">{candidate.ballotAvailability}</dd></div><div><dt className="text-slate-500">Número</dt><dd className="mt-1 text-slate-200">{candidate.candidateNumber || "—"}</dd></div><div><dt className="text-slate-500">Federação</dt><dd className="mt-1 text-slate-200">{candidate.federation || "—"}</dd></div></dl></section>
      </div>
    </div>
  </CrmShell>;
}

function InteractionCard({ interaction, draft, onDraftChange, onUpdate }: { interaction: any; draft: string; onDraftChange: (value: string) => void; onUpdate: (outcome: (typeof outcomes)[number], note: string) => void }) {
  const events = interaction.events as Array<{ id: number; outcome: (typeof outcomes)[number]; note: string | null; createdAt: Date }>;
  const latest = events[0] ?? { outcome: interaction.outcome as (typeof outcomes)[number], note: interaction.note, createdAt: interaction.createdAt };
  return <article className="rounded-xl border border-white/[0.07] bg-[#031126]/60 p-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${interaction.channel === "whatsapp" ? "bg-emerald-300/10 text-emerald-200" : "bg-fuchsia-300/10 text-fuchsia-200"}`}>{interaction.channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : <Instagram className="h-3.5 w-3.5" />}</span><div><p className="text-xs font-medium text-slate-100">{interaction.channel === "whatsapp" ? "WhatsApp" : "Instagram"}</p><p className="text-[11px] text-slate-500">Iniciada em {new Date(interaction.createdAt).toLocaleString("pt-BR")}</p></div></div><span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-slate-300">{outcomeLabel[latest.outcome]}</span></div><div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><textarea value={draft} onChange={event => onDraftChange(event.target.value)} placeholder="Adicionar resultado ou observação" className="min-h-16 w-full resize-y rounded-lg border border-white/8 bg-[#061329] px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35" /><select defaultValue="" onChange={event => { const value = event.target.value as (typeof outcomes)[number]; if (value) { onUpdate(value, draft); onDraftChange(""); event.currentTarget.value = ""; } }} className="rounded-lg border border-white/8 bg-[#061329] px-2 py-1 text-[11px] text-slate-200 outline-none"><option value="">Registrar</option>{outcomes.filter(outcome => outcome !== "iniciada").map(outcome => <option key={outcome} value={outcome}>{outcomeLabel[outcome]}</option>)}</select></div>{events.length > 0 && <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">{events.map(event => <div key={event.id} className="flex gap-2 text-[11px] leading-4"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan-200" /><div><span className="text-slate-300">{outcomeLabel[event.outcome]}</span>{event.note && <span className="text-slate-500"> · {event.note}</span>}<span className="block text-slate-600">{new Date(event.createdAt).toLocaleString("pt-BR")}</span></div></div>)}</div>}</article>;
}

function Timeline({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode[] }) { return <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center gap-2 text-sm font-medium text-slate-100">{icon}{title}</div><div className="mt-4 space-y-4">{children.length ? children : <div className="flex min-h-28 flex-col items-center justify-center text-center"><Clock3 className="h-5 w-5 text-slate-600" /><p className="mt-2 text-xs text-slate-500">{empty}</p></div>}</div></section>; }
