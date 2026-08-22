import { describe, expect, it } from "vitest";
import { candidateForStorage, csvRecords, INCLUDED_OFFICES, parseDelimitedCsv, uniqueOfficialCandidates, type OfficialElectionCandidate } from "./election-collector";

describe("coletor eleitoral oficial", () => {
  it("interpreta CSV com separador, aspas e quebras de linha sem deslocar colunas", () => {
    const rows = parseDelimitedCsv('A;B\n"Nome; composto";"linha 1\nlinha 2"\n');
    expect(rows).toEqual([["A", "B"], ["Nome; composto", "linha 1\nlinha 2"]]);
  });

  it("normaliza cabeçalhos para preservar os identificadores oficiais do candidato", () => {
    const records = csvRecords("SQ_CANDIDATO;NM_CANDIDATO\n123;Pessoa Exemplo\n");
    expect(records[0]).toMatchObject({ SQ_CANDIDATO: "123", NM_CANDIDATO: "Pessoa Exemplo" });
  });

  it("mantém apenas cargos estaduais e exclui Presidente e Vice-Presidente", () => {
    expect(INCLUDED_OFFICES.has("GOVERNADOR")).toBe(true);
    expect(INCLUDED_OFFICES.has("DEPUTADO FEDERAL")).toBe(true);
    expect(INCLUDED_OFFICES.has("PRESIDENTE")).toBe(false);
    expect(INCLUDED_OFFICES.has("VICE-PRESIDENTE")).toBe(false);
  });
});

describe("normalização para persistência eleitoral", () => {
  it("limita apenas campos com teto físico e preserva o registro-fonte oficial", () => {
    const candidate: OfficialElectionCandidate = { officialCandidateId: "1".repeat(180), state: "MINAS", cargo: "C".repeat(130), candidateName: "N".repeat(520), ballotName: "U".repeat(520), candidateNumber: "7".repeat(40), party: "P".repeat(140), federation: "F".repeat(270), candidateStatus: "S".repeat(190), ballotAvailability: "Em análise", city: "C".repeat(260), declaredProfiles: ["https://instagram.com/" + "i".repeat(1300)], primaryInstagram: "https://instagram.com/" + "i".repeat(1300), secondaryInstagrams: ["https://instagram.com/" + "j".repeat(1300)], instagramVerification: "Não localizado", verificationSignals: [], sourceRecord: { original: "valor oficial" } };
    const normalized = candidateForStorage(candidate);
    expect(normalized.officialCandidateId).toHaveLength(128);
    expect(normalized.candidateName).toHaveLength(500);
    expect(normalized.declaredProfiles[0]).toHaveLength(1200);
    expect(normalized.sourceRecord).toEqual({ original: "valor oficial" });
  });

  it("remove duplicidade pelo identificador oficial antes de cada lote de inserção", () => {
    const base: OfficialElectionCandidate = { officialCandidateId: "123", state: "SP", cargo: "DEPUTADO FEDERAL", candidateName: "Pessoa", ballotName: null, candidateNumber: null, party: null, federation: null, candidateStatus: null, ballotAvailability: "Em análise", city: null, declaredProfiles: [], primaryInstagram: null, secondaryInstagrams: [], instagramVerification: "Não localizado", verificationSignals: [], sourceRecord: {} };
    expect(uniqueOfficialCandidates([base, { ...base, candidateName: "Pessoa atualizada" }])).toEqual([{ ...base, candidateName: "Pessoa atualizada" }]);
  });
});
