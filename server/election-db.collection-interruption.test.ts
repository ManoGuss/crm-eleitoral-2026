import { describe, expect, it, vi } from "vitest";

const update = vi.fn();
vi.mock("./db", () => ({ getDb: vi.fn(async () => ({ update })) }));

import { markElectionCollectionInterruptedForUser } from "./election-db";

describe("markElectionCollectionInterruptedForUser", () => {
  it("persiste um diagnóstico apenas em uma coleta vazia ainda em processamento", async () => {
    const where = vi.fn(async () => [{ affectedRows: 1 }]);
    const set = vi.fn(() => ({ where }));
    update.mockReturnValue({ set });
    await expect(markElectionCollectionInterruptedForUser(7, 99)).resolves.toBe(true);
    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ sourceStatus: "falhou", processStatus: "falhou", errorReport: [expect.objectContaining({ stage: "requisicao_interrompida" })] }));
    expect(where).toHaveBeenCalled();
  });
});
