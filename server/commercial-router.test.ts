import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listLeadsForUser: vi.fn(),
  updateLeadForUser: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, listLeadsForUser: dbMocks.listLeadsForUser, updateLeadForUser: dbMocks.updateLeadForUser };
});

import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 17, openId: "commercial-user", name: "Commercial User", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("marcadores comerciais no CRM", () => {
  beforeEach(() => {
    dbMocks.listLeadsForUser.mockReset().mockResolvedValue({ items: [], total: 0 });
    dbMocks.updateLeadForUser.mockReset().mockResolvedValue({ lead: { id: 41 } });
  });

  it("encaminha o marcador de follow-up para a consulta protegida de leads", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.crm.leads.list({ page: 1, pageSize: 25, commercialMarker: "follow_up" });
    expect(dbMocks.listLeadsForUser).toHaveBeenCalledWith(17, expect.objectContaining({ commercialMarker: "follow_up" }));
  });

  it("converte a marcação de conversa em horário persistível e mantém o escopo do usuário", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.crm.leads.update({ id: 41, status: "Abordado", lastContactAt: 1_770_000_000_000 });
    expect(dbMocks.updateLeadForUser).toHaveBeenCalledWith(17, 41, expect.objectContaining({ status: "Abordado", lastContactAt: new Date(1_770_000_000_000) }), expect.objectContaining({ type: "lead_updated" }));
  });
});
