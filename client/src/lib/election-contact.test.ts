import { describe, expect, it } from "vitest";
import { getCandidatePublicContacts } from "./election-contact";

describe("getCandidatePublicContacts", () => {
  it("retém apenas canais públicos seguros de Instagram e WhatsApp", () => {
    const result = getCandidatePublicContacts({ primaryInstagram: "https://instagram.com/campanha.oficial", declaredProfiles: ["https://wa.me/5511999999999", "https://site.example/campanha"] });
    expect(result).toEqual({ instagram: "https://instagram.com/campanha.oficial", whatsapp: "https://wa.me/5511999999999", email: null, telefone: null });
  });

  it("rejeita protocolos e domínios que não correspondem aos canais permitidos", () => {
    const result = getCandidatePublicContacts({ primaryInstagram: "javascript:alert(1)", declaredProfiles: ["https://instagram.com.evil.example/perfil", "http://wa.me/5511999999999"] });
    expect(result).toEqual({ instagram: null, whatsapp: null, email: null, telefone: null });
  });

  it("prioriza canais públicos alternativos validados quando a candidatura não tem Instagram", () => {
    const result = getCandidatePublicContacts({ primaryInstagram: null, declaredProfiles: [], publicContacts: [{ type: "whatsapp", value: "https://wa.me/5511988887777", href: "https://wa.me/5511988887777", source: "TSE" }, { type: "email", value: "contato@campanha.org.br", href: "mailto:contato@campanha.org.br", source: "TSE" }, { type: "telefone", value: "+5511988887777", href: "tel:+5511988887777", source: "TSE" }] });
    expect(result).toEqual({ instagram: null, whatsapp: "https://wa.me/5511988887777", email: "mailto:contato@campanha.org.br", telefone: "tel:+5511988887777" });
  });
});
