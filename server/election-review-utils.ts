export type ReviewDecision = "aprovado" | "rejeitado";
export type ReviewSignal = { signal: string; source: string; url?: string };

export function buildManualReviewValues(decision: ReviewDecision, note: string | null | undefined, existingSignals: ReviewSignal[] | null | undefined) {
  const approved = decision === "aprovado";
  return {
    instagramVerification: approved ? "Verificado" as const : "Não localizado" as const,
    manualReviewStatus: decision,
    manualReviewNote: note?.trim() || null,
    verificationSignals: [...(existingSignals ?? []), { signal: approved ? "Perfil aprovado em revisão manual" : "Perfil rejeitado em revisão manual", source: "Revisão manual do CRM" }],
  };
}
