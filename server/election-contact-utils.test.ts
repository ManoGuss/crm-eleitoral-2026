import { describe, expect, it } from "vitest";
import { buildPublicWhatsAppUrl, renderWhatsAppTemplate } from "./election-contact-utils";

describe("contato eleitoral por WhatsApp", () => {
  it("substitui apenas os campos conhecidos no modelo personalizável", () => {
    const text = renderWhatsAppTemplate("Olá {nome}, sou {seu_nome}. Sua campanha para {cargo} em {uf} está no meu radar.", { candidateName: "Maria da Silva", ballotName: "Maria", cargo: "Deputado Federal", state: "SP" }, "Ana");
    expect(text).toBe("Olá Maria, sou Ana. Sua campanha para Deputado Federal em SP está no meu radar.");
  });

  it("adiciona a mensagem apenas a URLs HTTPS públicas do WhatsApp", () => {
    expect(buildPublicWhatsAppUrl("https://wa.me/5511999999999", "Olá Maria")).toContain("text=Ol%C3%A1+Maria");
    expect(buildPublicWhatsAppUrl("http://wa.me/5511999999999", "Olá")).toBeNull();
    expect(buildPublicWhatsAppUrl("https://whatsapp.example/5511999999999", "Olá")).toBeNull();
  });
});
