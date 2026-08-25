import { describe, expect, it } from "vitest";
import { getElectionCandidateProfileForUser } from "./election-db";

describe("getElectionCandidateProfileForUser", () => {
  it("anexa os eventos imutáveis corretos a cada interação do perfil", async () => {
    const candidate = { id: 31, userId: 7, candidateName: "Maria Silva" };
    const reviews = [{ id: 1, decision: "aprovado", createdAt: new Date() }];
    const interactions = [{ id: 88, userId: 7, channel: "whatsapp", outcome: "iniciada", createdAt: new Date() }, { id: 89, userId: 7, channel: "instagram", outcome: "iniciada", createdAt: new Date() }];
    const events = [{ id: 4, interactionId: 89, userId: 7, outcome: "respondida", createdAt: new Date("2026-08-25T12:00:00Z") }, { id: 3, interactionId: 88, userId: 7, outcome: "enviada", createdAt: new Date("2026-08-25T11:00:00Z") }, { id: 2, interactionId: 88, userId: 7, outcome: "iniciada", createdAt: new Date("2026-08-25T10:00:00Z") }];
    const responses = [[candidate], reviews, interactions, events]; let index = 0;
    const next = () => responses[index++];
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => next(), orderBy: async () => next() }), leftJoin: () => ({ where: () => ({ orderBy: async () => next() }) }) }) }),
    };
    const result = await getElectionCandidateProfileForUser(7, 31, fakeDb);
    expect(result?.candidate).toEqual(candidate);
    expect(result?.reviews).toEqual(reviews);
    expect(result?.interactions[0]?.events.map(event => event.id)).toEqual([3, 2]);
    expect(result?.interactions[1]?.events.map(event => event.id)).toEqual([4]);
  });
});
