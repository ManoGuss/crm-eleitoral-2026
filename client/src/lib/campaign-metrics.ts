export const campaignStatusOrder = ["Novo", "Abordado", "Respondeu", "Interessado", "Follow-up", "Proposta enviada", "Fechado", "Perdido"] as const;

const statusLabels: Record<(typeof campaignStatusOrder)[number], string> = {
  Novo: "Novos",
  Abordado: "Abordados",
  Respondeu: "Responderam",
  Interessado: "Interessados",
  "Follow-up": "Follow-up",
  "Proposta enviada": "Propostas",
  Fechado: "Fechados",
  Perdido: "Perdidos",
};

export function campaignStatusData(byStatus: Record<string, number> | undefined) {
  return campaignStatusOrder.map(status => ({ status, label: statusLabels[status], total: Number(byStatus?.[status] ?? 0) }));
}

export function campaignSummary(byStatus: Record<string, number> | undefined, total: number | undefined) {
  const safeTotal = Number(total ?? 0);
  const closed = Number(byStatus?.Fechado ?? 0);
  const active = Number(byStatus?.Abordado ?? 0) + Number(byStatus?.Respondeu ?? 0) + Number(byStatus?.Interessado ?? 0) + Number(byStatus?.["Follow-up"] ?? 0) + Number(byStatus?.["Proposta enviada"] ?? 0);
  return {
    active,
    closed,
    conversionRate: safeTotal ? Math.round((closed / safeTotal) * 1000) / 10 : 0,
  };
}
