export const electionMessageVariants = ["apresentacao", "presenca_digital", "follow_up"] as const;
export type ElectionMessageVariant = (typeof electionMessageVariants)[number];

export const electionMessageVariantMeta: Record<ElectionMessageVariant, { label: string; description: string }> = {
  apresentacao: { label: "Apresentação", description: "Abre uma conversa profissional e objetiva." },
  presenca_digital: { label: "Presença digital", description: "Foca em site e canais oficiais de campanha." },
  follow_up: { label: "Follow-up", description: "Retoma uma conversa já iniciada com cordialidade." },
};

export type ElectionMessageCandidate = { candidateName: string; ballotName: string | null; cargo: string; party: string | null; state: string; city: string | null };

export function electionMessageForCandidate(candidate: ElectionMessageCandidate, variant: ElectionMessageVariant) {
  const name = candidate.ballotName || candidate.candidateName;
  const affiliation = [candidate.party, candidate.state].filter(Boolean).join(" · ");
  const cityReference = candidate.city ? ` em ${candidate.city}` : "";
  const intro = `Olá, ${name}! Tudo bem?`;
  const signature = "Posso enviar uma sugestão breve e sem compromisso?";
  if (variant === "presenca_digital") return `${intro}\n\nVi sua candidatura a ${candidate.cargo}${cityReference}${affiliation ? ` (${affiliation})` : ""}. Trabalho com presença digital para campanhas, incluindo sites objetivos, páginas de propostas e canais de contato oficiais.\n\n${signature}`;
  if (variant === "follow_up") return `${intro}\n\nRetomando nosso contato sobre a sua candidatura a ${candidate.cargo}${cityReference}. Posso compartilhar uma proposta enxuta para fortalecer a presença digital da campanha e facilitar o acesso do eleitor às informações oficiais?\n\nFico à disposição.`;
  return `${intro}\n\nAcompanhei sua candidatura a ${candidate.cargo}${cityReference}${affiliation ? ` (${affiliation})` : ""}. Desenvolvo sites e páginas institucionais que ajudam a organizar propostas, contatos e canais oficiais de campanha.\n\n${signature}`;
}
