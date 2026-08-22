import { describe, expect, it } from "vitest";
import { extractPublicElectionContacts } from "./election-contact-utils";

describe("extractPublicElectionContacts", () => {
  it("normaliza canais públicos oficiais de WhatsApp, e-mail e telefone", () => {
    const result = extractPublicElectionContacts({ emailContato: "gabinete@campanha.org.br", telefoneContato: "(11) 98888-7777", whatsapp: "https://wa.me/5511988887777" }, "https://fonte.oficial/candidato");
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "email", href: "mailto:gabinete@campanha.org.br" }),
      expect.objectContaining({ type: "telefone", href: "tel:+5511988887777" }),
      expect.objectContaining({ type: "whatsapp", href: "https://wa.me/5511988887777" }),
    ]));
  });

  it("não infere telefone em campos sem indicação pública de contato", () => {
    const result = extractPublicElectionContacts({ numeroCandidato: "11988887777", sites: ["http://wa.me/5511988887777"] }, "https://fonte.oficial/candidato");
    expect(result).toEqual([]);
  });
});
