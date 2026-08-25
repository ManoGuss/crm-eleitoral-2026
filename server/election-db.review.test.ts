import { describe, expect, it } from "vitest";
import { reviewElectionCandidateForUser } from "./election-db";

describe("reviewElectionCandidateForUser", () => {
  it("persiste uma aprovação com auditoria, sem usar a base oficial de produção", async () => {
    const writes: Record<string, unknown>[] = [];
    const historyWrites: Record<string, unknown>[] = [];
    const candidate = { id: 91, userId: 7, instagramVerification: "Provável — requer revisão", manualReviewStatus: "pendente", verificationSignals: [{ signal: "Fonte pública", source: "TSE" }] };
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [candidate] }) }) }),
      insert: () => ({ values: async (values: Record<string, unknown>) => { historyWrites.push(values); } }),
      update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { writes.push(values); return [{ affectedRows: 1 }]; } }) }),
    };

    const result = await reviewElectionCandidateForUser(7, 91, "aprovado", "Evidências conferidas.", fakeDb);

    expect(result).toEqual(candidate);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ instagramVerification: "Verificado", manualReviewStatus: "aprovado", manualReviewNote: "Evidências conferidas.", manualReviewedBy: 7 });
    expect(writes[0]?.manualReviewedAt).toBeInstanceOf(Date);
    expect(writes[0]?.verificationSignals).toEqual(expect.arrayContaining([expect.objectContaining({ signal: "Perfil aprovado em revisão manual" })]));
    expect(historyWrites).toEqual([expect.objectContaining({ candidateId: 91, userId: 7, decision: "aprovado", previousVerification: "Provável — requer revisão", resultingVerification: "Verificado" })]);
  });

  it("recusa uma decisão fora da fila pendente sem gravar alterações", async () => {
    const writes: Record<string, unknown>[] = [];
    const candidate = { id: 92, userId: 7, instagramVerification: "Verificado", manualReviewStatus: "pendente", verificationSignals: [] };
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [candidate] }) }) }),
      update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { writes.push(values); return [{ affectedRows: 1 }]; } }) }),
    };

    const result = await reviewElectionCandidateForUser(7, 92, "rejeitado", null, fakeDb);

    expect(result).toBeNull();
    expect(writes).toEqual([]);
  });
});
