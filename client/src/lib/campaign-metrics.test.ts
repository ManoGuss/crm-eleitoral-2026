import { describe, expect, it } from "vitest";
import { campaignStatusData, campaignSummary } from "./campaign-metrics";

describe("campaign metrics", () => {
  it("organiza os status comerciais sem criar dados de demonstração", () => {
    expect(campaignStatusData({ Novo: 3, Fechado: 2 }).filter(item => item.total > 0)).toEqual([
      { status: "Novo", label: "Novos", total: 3 },
      { status: "Fechado", label: "Fechados", total: 2 },
    ]);
  });

  it("calcula contatos ativos e conversão a partir do funil real", () => {
    expect(campaignSummary({ Abordado: 2, Interessado: 1, Fechado: 1 }, 8)).toEqual({ active: 3, closed: 1, conversionRate: 12.5 });
  });
});
