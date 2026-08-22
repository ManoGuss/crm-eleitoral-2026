import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("proteção do CRM", () => {
  it("bloqueia leitura de leads sem uma sessão autenticada", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.crm.leads.list({ page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("bloqueia análise de arquivo sem uma sessão autenticada", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.crm.imports.analyze({ fileName: "base.csv", mimeType: "text/csv", fileSize: 12, dataBase64: "bm9tZSxjb250YXRv" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
