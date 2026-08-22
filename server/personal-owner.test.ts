import { describe, expect, it } from "vitest";
import { selectPersonalWorkspaceUser } from "./db";

describe("selectPersonalWorkspaceUser", () => {
  it("prioriza administrador e usa o espaço pessoal mais recente se não houver administrador", () => {
    expect(selectPersonalWorkspaceUser([{ id: 1 }], [{ id: 2 }])).toEqual({ id: 1 });
    expect(selectPersonalWorkspaceUser([], [{ id: 2 }])).toEqual({ id: 2 });
    expect(selectPersonalWorkspaceUser([], [])).toBeUndefined();
  });
});
