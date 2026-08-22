import { describe, expect, it } from "vitest";
import { buildManualReviewValues } from "./election-review-utils";

describe("buildManualReviewValues", () => {
  it("aprova um perfil provável preservando as evidências anteriores", () => {
    const result = buildManualReviewValues("aprovado", "Campanha e nome confirmados.", [{ signal: "Fonte oficial", source: "TSE" }]);
    expect(result).toMatchObject({ instagramVerification: "Verificado", manualReviewStatus: "aprovado", manualReviewNote: "Campanha e nome confirmados." });
    expect(result.verificationSignals).toHaveLength(2);
    expect(result.verificationSignals[1]).toMatchObject({ signal: "Perfil aprovado em revisão manual" });
  });

  it("rejeita um perfil sem inventar vínculo e normaliza uma nota vazia", () => {
    const result = buildManualReviewValues("rejeitado", "   ", []);
    expect(result).toMatchObject({ instagramVerification: "Não localizado", manualReviewStatus: "rejeitado", manualReviewNote: null });
    expect(result.verificationSignals[0]).toMatchObject({ signal: "Perfil rejeitado em revisão manual" });
  });
});
