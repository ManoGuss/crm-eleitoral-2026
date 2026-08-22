import { and, count, eq, isNotNull } from "drizzle-orm";
import { electionCandidates, electionCollections } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const collectionId = Number(process.argv[2]);
if (!Number.isInteger(collectionId) || collectionId < 1) throw new Error("Informe o identificador de uma coleta eleitoral.");
const db = await getDb();
if (!db) throw new Error("DATABASE_URL não está disponível.");
const collection = (await db.select().from(electionCollections).where(eq(electionCollections.id, collectionId)).limit(1))[0];
if (!collection) throw new Error("Coleta não encontrada.");
const [checkedResult, totalResult, verifiedResult, probableResult, missingResult] = await Promise.all([
  db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), isNotNull(electionCandidates.lastVerifiedAt))),
  db.select({ total: count() }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId)),
  db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), eq(electionCandidates.instagramVerification, "Verificado"))),
  db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), eq(electionCandidates.instagramVerification, "Provável — requer revisão"))),
  db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), eq(electionCandidates.instagramVerification, "Não localizado"))),
]);
const checked = Number(checkedResult[0]?.total ?? 0);
const total = Number(totalResult[0]?.total ?? 0);
const verified = Number(verifiedResult[0]?.total ?? 0);
const probable = Number(probableResult[0]?.total ?? 0);
const notFound = Math.max(0, checked - verified - probable);
const pending = Math.max(0, total - checked);
await db.update(electionCollections).set({
  instagramCheckedCount: checked,
  instagramPendingCount: pending,
  verifiedInstagramCount: verified,
  probableInstagramCount: probable,
  notFoundInstagramCount: notFound,
  summary: { ...(collection.summary ?? {}), instagramVerification: { status: pending ? "incompleta" : "concluida", source: "Campo público sites do detalhe oficial DivulgaCandContas", checked, pending, reason: pending ? "A consulta individual foi interrompida para evitar carga excessiva na fonte oficial; registros pendentes não foram classificados como perfis encontrados ou não localizados." : null } },
  updatedAt: new Date(),
}).where(eq(electionCollections.id, collectionId));
console.log(JSON.stringify({ collectionId, total, checked, verified, probable, notFound }, null, 2));
process.exit(0);
