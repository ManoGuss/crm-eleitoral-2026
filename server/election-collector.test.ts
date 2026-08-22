import { describe, expect, it } from "vitest";
import { csvRecords, INCLUDED_OFFICES, parseDelimitedCsv } from "./election-collector";

describe("coletor eleitoral oficial", () => {
  it("interpreta CSV com separador, aspas e quebras de linha sem deslocar colunas", () => {
    const rows = parseDelimitedCsv('A;B\n"Nome; composto";"linha 1\nlinha 2"\n');
    expect(rows).toEqual([["A", "B"], ["Nome; composto", "linha 1\nlinha 2"]]);
  });

  it("normaliza cabeçalhos para preservar os identificadores oficiais do candidato", () => {
    const records = csvRecords("SQ_CANDIDATO;NM_CANDIDATO\n123;Pessoa Exemplo\n");
    expect(records[0]).toMatchObject({ SQ_CANDIDATO: "123", NM_CANDIDATO: "Pessoa Exemplo" });
  });

  it("mantém apenas cargos estaduais e exclui Presidente e Vice-Presidente", () => {
    expect(INCLUDED_OFFICES.has("GOVERNADOR")).toBe(true);
    expect(INCLUDED_OFFICES.has("DEPUTADO FEDERAL")).toBe(true);
    expect(INCLUDED_OFFICES.has("PRESIDENTE")).toBe(false);
    expect(INCLUDED_OFFICES.has("VICE-PRESIDENTE")).toBe(false);
  });
});
