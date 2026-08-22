export type PublicElectionContact = { type: "whatsapp" | "email" | "telefone"; value: string; href: string; source: string };

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

function httpsUrl(value: string, hosts: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    return hosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`)) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizedBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
  return local.length === 10 || local.length === 11 ? `+55${local}` : null;
}

function collectStrings(value: unknown, key = "", depth = 0): Array<{ key: string; value: string }> {
  if (depth > 3 || value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number") return [{ key, value: String(value).trim() }];
  if (Array.isArray(value)) return value.flatMap(item => collectStrings(item, key, depth + 1));
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) => collectStrings(childValue, `${key} ${childKey}`.trim(), depth + 1));
  return [];
}

export function extractPublicElectionContacts(detail: Record<string, unknown>, source: string): PublicElectionContact[] {
  const entries = collectStrings(detail);
  const contacts: PublicElectionContact[] = [];
  const add = (contact: PublicElectionContact) => { if (!contacts.some(item => item.type === contact.type && item.href === contact.href)) contacts.push(contact); };
  for (const entry of entries) {
    const key = entry.key.toLowerCase();
    const value = entry.value;
    for (const email of value.match(EMAIL_PATTERN) ?? []) add({ type: "email", value: email.toLowerCase(), href: `mailto:${email.toLowerCase()}`, source });
    for (const url of value.match(URL_PATTERN) ?? []) {
      const whatsapp = httpsUrl(url, ["wa.me", "whatsapp.com"]);
      if (whatsapp) add({ type: "whatsapp", value: whatsapp, href: whatsapp, source });
    }
    if (/(whatsapp|telefone|celular|fone|contato)/i.test(key)) {
      const phone = normalizedBrazilianPhone(value);
      if (phone) add({ type: /whatsapp/i.test(key) ? "whatsapp" : "telefone", value: phone, href: /whatsapp/i.test(key) ? `https://wa.me/${phone.slice(1)}` : `tel:${phone}`, source });
    }
  }
  return contacts;
}
