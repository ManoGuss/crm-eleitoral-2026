import { describe, expect, it } from "vitest";
import { getContactPreferenceForUser, prepareCandidateContactForUser, updateContactPreferenceForUser } from "./election-db";

function sequenceDb(selections: unknown[][]) {
  let selectionIndex = 0;
  const writes: Record<string, unknown>[] = [];
  let interactionInsert = 0;
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selections[selectionIndex++] ?? [] }) }) }),
      insert: () => ({ values: (values: Record<string, unknown>) => { writes.push(values); if ("whatsappTemplate" in values) return { onDuplicateKeyUpdate: async () => [] }; interactionInsert += 1; return Promise.resolve([{ insertId: interactionInsert === 1 ? 88 : 0 }]); } }),
  };
  return { db, writes };
}

describe("fluxo auditável de contato eleitoral", () => {
  it("prepara WhatsApp com preferência persistida e cria interação mais evento inicial", async () => {
    const preference = { id: 1, userId: 7, whatsappTemplate: "Olá {nome}, sou {seu_nome}. Vamos falar da sua campanha em {uf}?" };
    const candidate = { id: 31, userId: 7, candidateName: "Maria Silva", ballotName: "Maria", cargo: "Deputado Federal", state: "SP", primaryInstagram: null, declaredProfiles: ["https://wa.me/5511999999999"] };
    const { db, writes } = sequenceDb([[candidate], [preference], [{ name: "Ana" }]]);
    const result = await prepareCandidateContactForUser(7, 31, "whatsapp", db);
    expect(result?.url).toContain("https://wa.me/5511999999999?text=Ol%C3%A1+Maria%2C+sou+Ana");
    expect(writes).toEqual([expect.objectContaining({ candidateId: 31, userId: 7, channel: "whatsapp", outcome: "iniciada" }), expect.objectContaining({ interactionId: 88, userId: 7, outcome: "iniciada" })]);
  });

  it("cria a preferência padrão quando ela ainda não existe", async () => {
    const createdPreference = { id: 2, userId: 7, whatsappTemplate: "Olá, {nome}. Meu nome é {seu_nome} e gostaria de conversar sobre sua campanha para {cargo} em {uf}. Podemos falar por aqui?" };
    const { db, writes } = sequenceDb([[], [createdPreference]]);
    const result = await getContactPreferenceForUser(7, db);
    expect(result).toEqual(createdPreference);
    expect(writes[0]).toMatchObject({ userId: 7 });
  });

  it("atualiza o modelo por usuário antes de devolvê-lo", async () => {
    const savedPreference = { id: 1, userId: 7, whatsappTemplate: "Olá, {nome}!" };
    const { db, writes } = sequenceDb([[savedPreference]]);
    const result = await updateContactPreferenceForUser(7, "Olá, {nome}!", db);
    expect(result).toEqual(savedPreference);
    expect(writes[0]).toMatchObject({ userId: 7, whatsappTemplate: "Olá, {nome}!" });
  });
});
