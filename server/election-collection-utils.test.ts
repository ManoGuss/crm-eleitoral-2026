import { describe, expect, it } from "vitest";
import { collectionFailureForAudit, collectionInterruptedAudit, ELECTION_INSERT_BATCH_SIZE } from "./election-collection-utils";

describe("proteções da coleta eleitoral", () => {
  it("usa lotes conservadores para a persistência da base oficial", () => {
    expect(ELECTION_INSERT_BATCH_SIZE).toBe(50);
  });

  it("substitui consultas de inserção extensas por um motivo auditável", () => {
    expect(collectionFailureForAudit(new Error("Failed query: insert into `electionCandidates` (...) values (...)"))).toContain("lotes menores");
  });

  it("gera um diagnóstico explícito quando a execução é interrompida antes da persistência", () => {
    expect(collectionInterruptedAudit()).toEqual([expect.objectContaining({ stage: "requisicao_interrompida", reason: expect.stringContaining("interrompida") })]);
  });
});
