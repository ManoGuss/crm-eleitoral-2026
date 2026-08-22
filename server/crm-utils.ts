export type ContactKind = "whatsapp" | "telefone" | "email" | "instagram" | "facebook" | "site" | "outro";

export const CRM_STATUSES = [
  "Novo",
  "Abordado",
  "Respondeu",
  "Não respondeu",
  "Interessado",
  "Follow-up",
  "Proposta enviada",
  "Fechado",
  "Perdido",
] as const;

export function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function isMeaningfulValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function inferFieldType(header: string, values: string[] = []) {
  const key = normalizeHeader(header);
  const sample = values.filter(isMeaningfulValue).join(" ").toLowerCase();
  if (/whats|celular/.test(key) || /wa\.me|whatsapp/.test(sample)) return "whatsapp" as const;
  if (/instagram|insta/.test(key) || /instagram\.com|^@\w+/.test(sample)) return "instagram" as const;
  if (/facebook|fb/.test(key) || /facebook\.com|fb\.me|fb\.com/.test(sample)) return "facebook" as const;
  if (/e.?mail|correio/.test(key) || /[\w.+-]+@[\w-]+\.[\w.-]+/.test(sample)) return "email" as const;
  if (/telefone|fone|contato|tel/.test(key)) return "telefone" as const;
  if (/site|perfil|fonte|url|link/.test(key) || /https?:\/\//.test(sample)) return "url" as const;
  if (/data|verificado/.test(key)) return "data" as const;
  if (/numero|qtd|quantidade/.test(key) && /^\d+$/.test(sample.replace(/\s/g, ""))) return "numero" as const;
  return "texto" as const;
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function actionForValue(header: string, rawValue: string): { kind: ContactKind | "link"; href: string; label: string } | null {
  const value = rawValue.trim();
  if (!value || /^(nao |não |nao$|não$|n\/a|sem |indisponivel|indisponível|não encontrado|nao encontrado|não confirmado|nao confirmado)/i.test(value)) {
    return null;
  }

  const headerKey = normalizeHeader(header);
  const lower = value.toLowerCase();
  const emailMatch = value.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch && (/email|mail/.test(headerKey) || value === emailMatch[0])) {
    return { kind: "email", href: `mailto:${emailMatch[0]}`, label: "Enviar e-mail" };
  }

  if (/wa\.me|api\.whatsapp\.com|whatsapp\.com/.test(lower) && isSafeHttpUrl(value)) {
    return { kind: "whatsapp", href: value, label: "Abrir WhatsApp" };
  }

  const digits = sanitizePhone(value);
  if ((/whats|telefone|celular|contato|fone|tel/.test(headerKey) || /^\+?\d[\d\s().-]{7,}$/.test(value)) && digits.length >= 10) {
    const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    if (/whats|celular|contato/.test(headerKey)) {
      return { kind: "whatsapp", href: `https://wa.me/55${national}`, label: "Abrir WhatsApp" };
    }
    return { kind: "telefone", href: `tel:+${digits.startsWith("55") ? digits : `55${national}`}`, label: "Ligar" };
  }

  if (/instagram\.com\//.test(lower) && isSafeHttpUrl(value)) return { kind: "instagram", href: value, label: "Abrir Instagram" };
  if (/^@[a-z0-9._]+$/i.test(value) && /instagram|insta/.test(headerKey)) {
    return { kind: "instagram", href: `https://instagram.com/${value.slice(1)}`, label: "Abrir Instagram" };
  }
  if (/(facebook\.com|fb\.com|fb\.me)/.test(lower) && isSafeHttpUrl(value)) return { kind: "facebook", href: value, label: "Abrir Facebook" };
  if (isSafeHttpUrl(value)) return { kind: /site/.test(headerKey) ? "site" : "link", href: value, label: "Abrir link" };
  return null;
}

export function splitContactValues(value: string) {
  return value
    .split(/[\n;,]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function extractContacts(customFields: Record<string, string>) {
  const found = new Map<string, { type: ContactKind; value: string }>();
  for (const [header, rawValue] of Object.entries(customFields)) {
    for (const value of splitContactValues(rawValue)) {
      const action = actionForValue(header, value);
      if (!action || action.kind === "link") continue;
      const key = `${action.kind}:${value.toLowerCase()}`;
      found.set(key, { type: action.kind, value });
    }
  }
  return Array.from(found.values());
}

function findByHeader(fields: Record<string, string>, candidates: string[]) {
  const entries = Object.entries(fields);
  for (const candidate of candidates) {
    const match = entries.find(([header]) => normalizeHeader(header) === candidate || normalizeHeader(header).includes(candidate));
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "";
}

export function dedupeKeyForLead(fields: Record<string, string>) {
  const sq = findByHeader(fields, ["sq_candidato"]);
  const cargo = findByHeader(fields, ["cargo"]);
  if (sq && cargo) return `sq:${normalizeHeader(sq)}|cargo:${normalizeHeader(cargo)}`;

  const email = findByHeader(fields, ["email"]);
  if (email) return `email:${email.toLowerCase().replace(/\s/g, "")}`;
  const phone = findByHeader(fields, ["whatsapp", "telefone", "celular", "contato"]);
  if (phone && sanitizePhone(phone).length >= 10) return `phone:${sanitizePhone(phone)}`;
  const instagram = findByHeader(fields, ["instagram"]);
  if (instagram) return `instagram:${instagram.toLowerCase().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "")}`;
  const name = findByHeader(fields, ["nome_completo", "nome_de_urna", "candidato", "nome"]);
  const location = findByHeader(fields, ["cidade", "estado"]);
  return name && location ? `name:${normalizeHeader(name)}|location:${normalizeHeader(location)}` : null;
}

export function titleForLead(fields: Record<string, string>) {
  return findByHeader(fields, ["nome_de_urna", "nome_completo", "candidato", "nome"]) || "Lead sem nome";
}

export function mergeNonEmptyFields(existing: Record<string, string>, incoming: Record<string, string>) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (!merged[key]?.trim() && value.trim()) merged[key] = value;
  }
  return merged;
}

export function isCrmStatus(value: string): value is (typeof CRM_STATUSES)[number] {
  return CRM_STATUSES.includes(value as (typeof CRM_STATUSES)[number]);
}
