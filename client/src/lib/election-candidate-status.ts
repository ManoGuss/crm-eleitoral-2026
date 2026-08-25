export function candidateStatusTone(status: string | null | undefined) {
  const normalized = (status ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/indefer|renunc|cancel|falec|inapt/.test(normalized)) return "border-rose-300/25 bg-rose-300/[0.1] text-rose-100";
  if (/defer|apto/.test(normalized)) return "border-emerald-300/25 bg-emerald-300/[0.1] text-emerald-100";
  if (/aguard|penden|sub judice|recurso|analise/.test(normalized)) return "border-amber-300/25 bg-amber-300/[0.1] text-amber-100";
  return "border-slate-300/15 bg-slate-300/[0.07] text-slate-300";
}

export function candidateStatusPresentation(status: string | null | undefined) {
  return { label: status || "Não publicado", tone: candidateStatusTone(status) };
}
