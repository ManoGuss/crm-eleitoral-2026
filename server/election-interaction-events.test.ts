import { describe, expect, it } from "vitest";
import { updateCandidateInteractionForUser } from "./election-db";

describe("updateCandidateInteractionForUser", () => {
  it("cria um novo evento para cada resultado sem atualizar registros anteriores", async () => {
    const eventWrites: Record<string, unknown>[] = [];
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 41 }] }) }) }),
      insert: () => ({ values: async (values: Record<string, unknown>) => { eventWrites.push(values); } }),
    };
    const result = await updateCandidateInteractionForUser(7, 41, { outcome: "respondida", note: "Assessoria retornou o contato." }, fakeDb);
    expect(result).toBe(true);
    expect(eventWrites).toEqual([expect.objectContaining({ interactionId: 41, userId: 7, outcome: "respondida", note: "Assessoria retornou o contato." })]);
  });
});
