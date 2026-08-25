import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), getPersonalOwnerUser: vi.fn() }));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({ getPersonalOwnerUser: mocks.getPersonalOwnerUser }));

import { createContext } from "./_core/context";

const owner: User = { id: 9, openId: "owner", name: "Espaço pessoal", email: null, loginMethod: "acesso_pessoal", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("contexto de acesso pessoal", () => {
  beforeEach(() => { mocks.authenticateRequest.mockReset().mockRejectedValue(new Error("Sem sessão")); mocks.getPersonalOwnerUser.mockReset().mockResolvedValue(owner); });

  it("resolve o proprietário quando a requisição não possui login", async () => {
    const context = await createContext({ req: {} as never, res: {} as never });
    expect(context.user).toEqual(owner);
    expect(mocks.getPersonalOwnerUser).toHaveBeenCalledTimes(1);
  });
});
