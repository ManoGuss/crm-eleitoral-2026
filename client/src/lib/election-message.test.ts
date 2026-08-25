import { describe, expect, it } from "vitest";
import { electionMessageForCandidate } from "./election-message";

const candidate = { candidateName: "Maria da Silva", ballotName: "Maria Silva", cargo: "Deputado Federal", party: "ABC", state: "SP", city: "São Paulo" };

describe("electionMessageForCandidate", () => {
  it("personaliza a mensagem com os dados públicos da candidatura", () => {
    const message = electionMessageForCandidate(candidate, "apresentacao");
    expect(message).toContain("Maria Silva");
    expect(message).toContain("Deputado Federal");
    expect(message).toContain("ABC · SP");
  });

  it("altera o enfoque conforme a variante escolhida", () => {
    expect(electionMessageForCandidate(candidate, "presenca_digital")).toContain("páginas de propostas");
    expect(electionMessageForCandidate(candidate, "follow_up")).toContain("Retomando nosso contato");
  });
});
