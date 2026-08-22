import { describe, expect, it } from "vitest";
import { getCandidatePublicContacts } from "./election-contact";

describe("getCandidatePublicContacts", () => {
  it("retém apenas canais públicos seguros de Instagram e WhatsApp", () => {
    const result = getCandidatePublicContacts({ primaryInstagram: "https://instagram.com/campanha.oficial", declaredProfiles: ["https://wa.me/5511999999999", "https://site.example/campanha"] });
    expect(result).toEqual({ instagram: "https://instagram.com/campanha.oficial", whatsapp: "https://wa.me/5511999999999" });
  });

  it("rejeita protocolos e domínios que não correspondem aos canais permitidos", () => {
    const result = getCandidatePublicContacts({ primaryInstagram: "javascript:alert(1)", declaredProfiles: ["https://instagram.com.evil.example/perfil", "http://wa.me/5511999999999"] });
    expect(result).toEqual({ instagram: null, whatsapp: null });
  });
});
