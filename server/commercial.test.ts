import { describe, expect, it } from "vitest";
import { commercialMarkerForLead } from "../shared/commercial";

describe("commercialMarkerForLead", () => {
  it("prioriza fechamento e perda sobre os demais estados", () => {
    expect(commercialMarkerForLead("Fechado", new Date(), new Date())).toBe("fechado");
    expect(commercialMarkerForLead("Perdido", new Date(), new Date())).toBe("perdido");
  });

  it("classifica conversa, retorno e follow-up para priorização comercial", () => {
    expect(commercialMarkerForLead("Novo", null, null)).toBe("sem_contato");
    expect(commercialMarkerForLead("Respondeu", new Date(), null)).toBe("em_conversa");
    expect(commercialMarkerForLead("Não respondeu", new Date(), null)).toBe("aguardando_retorno");
    expect(commercialMarkerForLead("Interessado", new Date(), null)).toBe("negociacao");
    expect(commercialMarkerForLead("Novo", null, new Date())).toBe("follow_up");
  });
});
