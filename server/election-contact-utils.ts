export const DEFAULT_WHATSAPP_TEMPLATE = "Olá, {nome}. Meu nome é {seu_nome} e gostaria de conversar sobre sua campanha para {cargo} em {uf}. Podemos falar por aqui?";

export function renderWhatsAppTemplate(template: string, candidate: { candidateName: string; ballotName: string | null; cargo: string; state: string }, reviewerName?: string | null) {
  const values: Record<string, string> = {
    nome: candidate.ballotName || candidate.candidateName,
    nome_completo: candidate.candidateName,
    cargo: candidate.cargo,
    uf: candidate.state,
    seu_nome: reviewerName?.trim() || "",
  };
  return template.replace(/\{(nome|nome_completo|cargo|uf|seu_nome)\}/g, (_, key: string) => values[key] ?? "");
}

export function buildPublicWhatsAppUrl(target: string, message: string) {
  const url = new URL(target);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !(host === "wa.me" || host.endsWith(".whatsapp.com") || host === "whatsapp.com")) return null;
  url.searchParams.set("text", message);
  return url.toString();
}
