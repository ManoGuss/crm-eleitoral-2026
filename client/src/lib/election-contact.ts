export type CandidatePublicContact = { instagram: string | null; whatsapp: string | null };

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

export function getCandidatePublicContacts(candidate: { primaryInstagram: string | null; declaredProfiles: string[] | null }): CandidatePublicContact {
  const profiles = candidate.declaredProfiles ?? [];
  const instagram = allowedUrl(candidate.primaryInstagram ?? "", ["instagram.com"]) || profiles.map(value => allowedUrl(value, ["instagram.com"])).find(Boolean) || null;
  const whatsapp = profiles.map(value => allowedUrl(value, ["wa.me", "whatsapp.com"])).find(Boolean) || null;
  return { instagram, whatsapp };
}
