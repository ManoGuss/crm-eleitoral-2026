import { describe, expect, it } from "vitest";
import { findInterruptedEmptyCollection, selectDisplayCollection } from "./election-collection-selection";

describe("seleção da coleta eleitoral exibida", () => {
  it("prioriza a última base com registros quando uma execução mais recente ficou vazia em processamento", () => {
    const completed = { id: 60001, totalCandidates: 20253, processStatus: "concluida", createdAt: new Date("2026-08-22") };
    const interrupted = { id: 150002, totalCandidates: 0, processStatus: "em_processamento", createdAt: new Date("2026-08-24") };
    expect(selectDisplayCollection([interrupted, completed])).toEqual(completed);
    expect(findInterruptedEmptyCollection([interrupted, completed], completed)).toEqual(interrupted);
  });

  it("não alerta sobre uma tentativa vazia que é mais antiga que a coleta atual concluída", () => {
    const oldInterrupted = { id: 150002, totalCandidates: 0, processStatus: "em_processamento", createdAt: new Date("2026-08-24") };
    const current = { id: 180001, totalCandidates: 20264, processStatus: "concluida", createdAt: new Date("2026-08-25") };
    expect(findInterruptedEmptyCollection([current, oldInterrupted], current)).toBeUndefined();
  });
});
