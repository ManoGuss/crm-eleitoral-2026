export const commercialMarkers = [
  "sem_contato",
  "em_conversa",
  "aguardando_retorno",
  "negociacao",
  "follow_up",
  "proposta",
  "fechado",
  "perdido",
] as const;

export type CommercialMarker = typeof commercialMarkers[number];

export const commercialMarkerMeta: Record<CommercialMarker, { label: string; tone: string }> = {
  sem_contato: { label: "Sem contato", tone: "bg-slate-400/10 text-slate-300 ring-slate-300/20" },
  em_conversa: { label: "Em conversa", tone: "bg-sky-400/10 text-sky-200 ring-sky-300/20" },
  aguardando_retorno: { label: "Aguardando retorno", tone: "bg-amber-400/10 text-amber-200 ring-amber-300/20" },
  negociacao: { label: "Em negociação", tone: "bg-cyan-400/10 text-cyan-200 ring-cyan-300/20" },
  follow_up: { label: "Follow-up", tone: "bg-blue-400/10 text-blue-200 ring-blue-300/20" },
  proposta: { label: "Proposta enviada", tone: "bg-indigo-400/10 text-indigo-200 ring-indigo-300/20" },
  fechado: { label: "Projeto fechado", tone: "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20" },
  perdido: { label: "Oportunidade perdida", tone: "bg-rose-400/10 text-rose-200 ring-rose-300/20" },
};

export function commercialMarkerForLead(status: string, lastContactAt?: Date | number | null, followUpAt?: Date | number | null): CommercialMarker {
  if (status === "Fechado") return "fechado";
  if (status === "Perdido") return "perdido";
  if (status === "Proposta enviada") return "proposta";
  if (status === "Follow-up" || Boolean(followUpAt)) return "follow_up";
  if (status === "Interessado") return "negociacao";
  if (status === "Não respondeu") return "aguardando_retorno";
  if (status === "Abordado" || status === "Respondeu" || Boolean(lastContactAt)) return "em_conversa";
  return "sem_contato";
}
