import { describe, expect, it } from "vitest";
import { favoriteTrackingPresentation } from "./election-favorite";

describe("favoriteTrackingPresentation", () => {
  it("não exibe acompanhamento antes de a candidatura ser favoritada", () => {
    expect(favoriteTrackingPresentation(null)).toBeNull();
  });

  it("deriva o marcador visual da situação comercial do favorito", () => {
    expect(favoriteTrackingPresentation({ status: "Novo", lastContactAt: null, followUpAt: null })?.marker).toBe("sem_contato");
    expect(favoriteTrackingPresentation({ status: "Respondeu", lastContactAt: new Date(), followUpAt: null })?.label).toBe("Em conversa");
    expect(favoriteTrackingPresentation({ status: "Novo", lastContactAt: null, followUpAt: new Date() })?.marker).toBe("follow_up");
  });
});
