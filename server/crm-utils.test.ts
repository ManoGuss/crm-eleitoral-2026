import { describe, expect, it } from "vitest";
import { actionForValue, dedupeKeyForLead, normalizeHeader } from "./crm-utils";

describe("crm-utils", () => {
  it("normaliza cabeçalhos sem perder a capacidade de reconhecer variações previsíveis", () => {
    expect(normalizeHeader("Whats App")).toBe("whats_app");
    expect(normalizeHeader("PARTIDO/Federação")).toBe("partidofederacao");
  });

  it("prioriza SQ_CANDIDATO combinado com cargo na deduplicação", () => {
    expect(dedupeKeyForLead({ "SQ_CANDIDATO": "00123", Cargo: "Deputado Estadual", Nome: "Pessoa Exemplo" })).toBe("sq:00123|cargo:deputado_estadual");
  });

  it("cria ações externas apenas para valores seguros", () => {
    expect(actionForValue("Instagram", "@perfil_eleitoral")).toMatchObject({ kind: "instagram", href: "https://instagram.com/perfil_eleitoral" });
    expect(actionForValue("Site", "javascript:alert(1)")).toBeNull();
    expect(actionForValue("WhatsApp", "https://wa.me/5562999999999")).toMatchObject({ kind: "whatsapp" });
  });
});
