import { describe, expect, it } from "vitest";
import { candidateStatusPresentation, candidateStatusTone } from "./election-candidate-status";

describe("candidateStatusTone", () => {
  it("diferencia situações deferidas, pendentes e impeditivas", () => {
    expect(candidateStatusTone("Deferido")).toContain("emerald");
    expect(candidateStatusTone("Aguardando julgamento")).toContain("amber");
    expect(candidateStatusTone("Renúncia")).toContain("rose");
    expect(candidateStatusTone("Indeferido com recurso")).toContain("rose");
  });

  it("mantém uma cor neutra quando a situação oficial não foi publicada", () => {
    expect(candidateStatusTone(null)).toContain("slate");
  });

  it("entrega o rótulo e a classe de cor que são renderizados no badge", () => {
    expect(candidateStatusPresentation("Renúncia")).toEqual(expect.objectContaining({ label: "Renúncia", tone: expect.stringContaining("rose") }));
    expect(candidateStatusPresentation(undefined)).toEqual(expect.objectContaining({ label: "Não publicado", tone: expect.stringContaining("slate") }));
  });
});
