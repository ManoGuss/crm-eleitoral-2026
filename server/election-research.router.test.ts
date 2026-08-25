import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listReviewHistoryForUser: vi.fn(),
  getContactPreferenceForUser: vi.fn(),
  updateContactPreferenceForUser: vi.fn(),
  prepareCandidateContactForUser: vi.fn(),
  updateCandidateInteractionForUser: vi.fn(),
}));

vi.mock("./election-db", async importOriginal => {
  const actual = await importOriginal<typeof import("./election-db")>();
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const ctx: any = {
  user: { id: 7, openId: "reviewer-7", name: "Ana", email: "ana@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: {} },
  res: {},
};

describe("crm.electionResearch API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encaminha o filtro de revisor ao histórico protegido", async () => {
    mocks.listReviewHistoryForUser.mockResolvedValue({ items: [], total: 0 });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.crm.electionResearch.reviewHistory({ collectionId: 2, reviewerId: 7, page: 1, pageSize: 20 })).resolves.toEqual({ items: [], total: 0 });
    expect(mocks.listReviewHistoryForUser).toHaveBeenCalledWith(7, expect.objectContaining({ collectionId: 2, reviewerId: 7 }));
  });

  it("expõe preferência, contato preenchido e atualização de interação apenas para a sessão atual", async () => {
    mocks.getContactPreferenceForUser.mockResolvedValue({ userId: 7, whatsappTemplate: "Olá {nome}" });
    mocks.updateContactPreferenceForUser.mockResolvedValue({ userId: 7, whatsappTemplate: "Oi {nome}" });
    mocks.prepareCandidateContactForUser.mockResolvedValue({ url: "https://wa.me/5511999999999?text=Oi+Maria", targetUrl: "https://wa.me/5511999999999", channel: "whatsapp", preparedText: "Oi Maria" });
    mocks.updateCandidateInteractionForUser.mockResolvedValue(true);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.crm.electionResearch.contactPreference()).resolves.toMatchObject({ userId: 7 });
    await expect(caller.crm.electionResearch.updateContactPreference({ whatsappTemplate: "Oi {nome}" })).resolves.toMatchObject({ whatsappTemplate: "Oi {nome}" });
    await expect(caller.crm.electionResearch.prepareContact({ candidateId: 31, channel: "whatsapp" })).resolves.toMatchObject({ preparedText: "Oi Maria" });
    await expect(caller.crm.electionResearch.updateInteraction({ interactionId: 88, outcome: "respondida", note: "Retorno confirmado" })).resolves.toEqual({ success: true });
    expect(mocks.updateContactPreferenceForUser).toHaveBeenCalledWith(7, "Oi {nome}");
    expect(mocks.prepareCandidateContactForUser).toHaveBeenCalledWith(7, 31, "whatsapp");
    expect(mocks.updateCandidateInteractionForUser).toHaveBeenCalledWith(7, 88, expect.objectContaining({ outcome: "respondida" }));
  });
});
