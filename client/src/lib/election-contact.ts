export type CandidatePublicContact = { instagram: string | null; whatsapp: string | null; email: string | null; telefone: string | null };
type PersistedPublicContact = { type: "whatsapp" | "email" | "telefone"; value: string; href: string; source: string };

function allowedUrl(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    return allowedHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`)) ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeEmail(value: string, href: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized) && href === `mailto:${normalized}` ? href : null;
}

function safePhone(value: string, href: string) {
  return /^\+55\d{10,11}$/.test(value) && href === `tel:${value}` ? href : null;
}

export function getCandidatePublicContacts(candidate: { primaryInstagram: string | null; declaredProfiles: string[] | null; publicContacts?: PersistedPublicContact[] | null }): CandidatePublicContact {
  const profiles = candidate.declaredProfiles ?? [];
  const contacts = candidate.publicContacts ?? [];
  const instagram = allowedUrl(candidate.primaryInstagram ?? "", ["instagram.com"]) || profiles.map(value => allowedUrl(value, ["instagram.com"])).find(Boolean) || null;
  const whatsapp = contacts.filter(contact => contact.type === "whatsapp").map(contact => allowedUrl(contact.href, ["wa.me", "whatsapp.com"])).find(Boolean) || profiles.map(value => allowedUrl(value, ["wa.me", "whatsapp.com"])).find(Boolean) || null;
  const email = contacts.filter(contact => contact.type === "email").map(contact => safeEmail(contact.value, contact.href)).find(Boolean) || null;
  const telefone = contacts.filter(contact => contact.type === "telefone").map(contact => safePhone(contact.value, contact.href)).find(Boolean) || null;
  return { instagram, whatsapp, email, telefone };
}
