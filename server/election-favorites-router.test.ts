import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const electionMocks = vi.hoisted(() => ({
  listElectionCandidatesForUser: vi.fn(),
  listFavoriteElectionCandidatesForUser: vi.fn(),
  setElectionCandidateFavoriteForUser: vi.fn(),
  updateElectionCandidateFavoriteForUser: vi.fn(),
}));

vi.mock("./election-db", async () => {
  const actual = await vi.importActual<typeof import("./election-db")>("./election-db");
  return {
    ...actual,
    listElectionCandidatesForUser: electionMocks.listElectionCandidatesForUser,
    listFavoriteElectionCandidatesForUser: electionMocks.listFavoriteElectionCandidatesForUser,
    setElectionCandidateFavoriteForUser: electionMocks.setElectionCandidateFavoriteForUser,
    updateElectionCandidateFavoriteForUser: electionMocks.updateElectionCandidateFavoriteForUser,
  };
});

import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 29, openId: "favorite-user", name: "Favorite User", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("favoritos eleitorais", () => {
  beforeEach(() => {
    electionMocks.listElectionCandidatesForUser.mockReset().mockResolvedValue({ items: [], total: 0 });
    electionMocks.listFavoriteElectionCandidatesForUser.mockReset().mockResolvedValue({ items: [], total: 0 });
    electionMocks.setElectionCandidateFavoriteForUser.mockReset().mockResolvedValue({ id: 3, candidateId: 77, userId: 29, status: "Novo" });
    electionMocks.updateElectionCandidateFavoriteForUser.mockReset().mockResolvedValue({ id: 3, candidateId: 77, userId: 29, status: "Abordado" });
  });

  it("encaminha filtros de favoritos e marcador comercial à consulta protegida", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.crm.electionResearch.listCandidates({ collectionId: 60001, page: 1, pageSize: 25, favoritesOnly: true, commercialMarker: "em_conversa" });
    expect(electionMocks.listElectionCandidatesForUser).toHaveBeenCalledWith(29, expect.objectContaining({ favoritesOnly: true, commercialMarker: "em_conversa" }));
  });

  it("salva e atualiza o favorito apenas para a conta autenticada", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.crm.electionResearch.setFavorite({ candidateId: 77, favorite: true });
    await caller.crm.electionResearch.updateFavorite({ candidateId: 77, status: "Abordado", lastContactAt: 1_770_000_000_000, followUpAt: 1_770_172_800_000, note: "Retornar com proposta." });
    expect(electionMocks.setElectionCandidateFavoriteForUser).toHaveBeenCalledWith(29, 77, true);
    expect(electionMocks.updateElectionCandidateFavoriteForUser).toHaveBeenCalledWith(29, 77, expect.objectContaining({ status: "Abordado", lastContactAt: new Date(1_770_000_000_000), followUpAt: new Date(1_770_172_800_000), note: "Retornar com proposta." }));
  });

  it("lista os favoritos em uma consulta exclusiva e isolada da conta autenticada", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.crm.electionResearch.listFavorites({ page: 2, pageSize: 12, status: "Follow-up", query: "Ana" });
    expect(electionMocks.listFavoriteElectionCandidatesForUser).toHaveBeenCalledWith(29, { page: 2, pageSize: 12, status: "Follow-up", query: "Ana" });
  });
});
