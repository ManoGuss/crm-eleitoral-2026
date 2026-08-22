import { and, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { electionCandidates, electionCollections } from "../drizzle/schema";
import { loadOfficial2026Candidates, TSE_CANDIDATES_URL, TSE_SOCIAL_NETWORKS_URL } from "./election-collector";
import { buildManualReviewValues } from "./election-review-utils";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível no momento.");
  return db;
}

const DIVULGACAND_API_BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";
const ELECTION_2026_ID = 20322002026;

function normalizeInstagramUrl(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
    const handle = url.pathname.split("/").filter(Boolean)[0];
    return handle ? `https://instagram.com/${handle.toLowerCase()}` : null;
  } catch {
    return null;
  }
}

export async function listElectionCollectionsForUser(userId: number) {
  const db = await requireDb();
  return db.select().from(electionCollections).where(eq(electionCollections.userId, userId)).orderBy(desc(electionCollections.createdAt));
}

export async function getElectionCollectionForUser(userId: number, id: number) {
  const db = await requireDb();
  const collection = (await db.select().from(electionCollections).where(and(eq(electionCollections.id, id), eq(electionCollections.userId, userId))).limit(1))[0];
  if (!collection) return null;
  const [byCargo, byInstagram, byState] = await Promise.all([
    db.select({ cargo: electionCandidates.cargo, total: count() }).from(electionCandidates).where(and(eq(electionCandidates.userId, userId), eq(electionCandidates.collectionId, id))).groupBy(electionCandidates.cargo),
    db.select({ verification: electionCandidates.instagramVerification, total: count() }).from(electionCandidates).where(and(eq(electionCandidates.userId, userId), eq(electionCandidates.collectionId, id))).groupBy(electionCandidates.instagramVerification),
    db.select({ state: electionCandidates.state, total: count() }).from(electionCandidates).where(and(eq(electionCandidates.userId, userId), eq(electionCandidates.collectionId, id))).groupBy(electionCandidates.state).orderBy(electionCandidates.state),
  ]);
  return { collection, byCargo, byInstagram, byState };
}

export async function getElectionCollectionByInstagramTask(taskUid: string) {
  const db = await requireDb();
  return (await db.select().from(electionCollections).where(eq(electionCollections.instagramVerificationTaskUid, taskUid)).limit(1))[0] ?? null;
}

export async function setInstagramVerificationTaskForUser(userId: number, collectionId: number, taskUid: string | null) {
  const db = await requireDb();
  const result = await db.update(electionCollections).set({ instagramVerificationTaskUid: taskUid }).where(and(eq(electionCollections.id, collectionId), eq(electionCollections.userId, userId)));
  return result[0]?.affectedRows === 1;
}

export async function listElectionCandidatesForUser(userId: number, input: { collectionId: number; page: number; pageSize: number; state?: string; cargo?: string; party?: string; city?: string; instagramVerification?: string; manualReviewStatus?: "pendente" | "aprovado" | "rejeitado"; query?: string }) {
  const db = await requireDb();
  const conditions = [eq(electionCandidates.userId, userId), eq(electionCandidates.collectionId, input.collectionId)];
  if (input.state) conditions.push(eq(electionCandidates.state, input.state));
  if (input.cargo) conditions.push(eq(electionCandidates.cargo, input.cargo));
  if (input.party) conditions.push(eq(electionCandidates.party, input.party));
  if (input.city) conditions.push(eq(electionCandidates.city, input.city));
  if (input.instagramVerification) conditions.push(eq(electionCandidates.instagramVerification, input.instagramVerification as typeof electionCandidates.instagramVerification.enumValues[number]));
  if (input.manualReviewStatus) conditions.push(eq(electionCandidates.manualReviewStatus, input.manualReviewStatus));
  if (input.query?.trim()) {
    const term = `%${input.query.trim()}%`;
    conditions.push(sql`(${electionCandidates.candidateName} like ${term} OR ${electionCandidates.ballotName} like ${term} OR ${electionCandidates.primaryInstagram} like ${term})`);
  }
  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [items, totalResult] = await Promise.all([
    db.select().from(electionCandidates).where(where).orderBy(electionCandidates.state, electionCandidates.cargo, electionCandidates.candidateName).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(electionCandidates).where(where),
  ]);
  return { items, total: totalResult[0]?.total ?? 0 };
}

export async function reviewElectionCandidateForUser(userId: number, candidateId: number, decision: "aprovado" | "rejeitado", note?: string | null, dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  const candidate = (await db.select().from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0];
  if (!candidate) return null;
  if (candidate.instagramVerification !== "Provável — requer revisão" || candidate.manualReviewStatus !== "pendente") return null;
  const values = buildManualReviewValues(decision, note, candidate.verificationSignals);
  await db.update(electionCandidates).set({
    ...values,
    manualReviewedBy: userId,
    manualReviewedAt: new Date(),
  }).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId)));
  return (await db.select().from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0] ?? null;
}

export async function verifyInstagramChunkForCollection(collectionId: number, limit = 64) {
  const db = await requireDb();
  const collection = (await db.select().from(electionCollections).where(eq(electionCollections.id, collectionId)).limit(1))[0];
  if (!collection) throw new Error("Coleta eleitoral não encontrada.");
  const candidates = await db.select({ id: electionCandidates.id, officialCandidateId: electionCandidates.officialCandidateId, state: electionCandidates.state }).from(electionCandidates)
    .where(and(eq(electionCandidates.collectionId, collectionId), isNull(electionCandidates.lastVerifiedAt))).orderBy(electionCandidates.id).limit(limit);
  let verifiedInRun = 0;
  let failedInRun = 0;
  for (let start = 0; start < candidates.length; start += 8) {
    const batch = candidates.slice(start, start + 8);
    await Promise.all(batch.map(async candidate => {
      const source = `${DIVULGACAND_API_BASE}/candidatura/buscar/2026/${candidate.state}/${ELECTION_2026_ID}/candidato/${candidate.officialCandidateId}`;
      try {
        const response = await fetch(source, { headers: { Accept: "application/json", "User-Agent": "CRM-Eleitoral-2026/1.0 (public-data-audit)" } });
        if (!response.ok) { failedInRun += 1; return; }
        const detail = await response.json() as { sites?: unknown };
        const declaredProfiles = Array.isArray(detail.sites) ? detail.sites.filter((site): site is string => typeof site === "string") : [];
        const instagrams = Array.from(new Set(declaredProfiles.map(normalizeInstagramUrl).filter((value): value is string => Boolean(value))));
        if (instagrams.length) verifiedInRun += 1;
        await db.update(electionCandidates).set({
          declaredProfiles,
          primaryInstagram: instagrams[0] ?? null,
          secondaryInstagrams: instagrams.slice(1),
          instagramVerification: instagrams.length ? "Verificado" : "Não localizado",
          verificationSignals: instagrams.length ? [
            { signal: "Registro oficial de candidatura no DivulgaCandContas", source },
            { signal: "Instagram declarado no campo público de sites da candidatura", source, url: instagrams[0] },
          ] : [],
          lastVerifiedAt: new Date(),
        }).where(and(eq(electionCandidates.id, candidate.id), eq(electionCandidates.collectionId, collectionId)));
      } catch {
        failedInRun += 1;
      }
    }));
  }
  const [checkedResult, verifiedResult, probableResult, totalResult] = await Promise.all([
    db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), isNotNull(electionCandidates.lastVerifiedAt))),
    db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), eq(electionCandidates.instagramVerification, "Verificado"))),
    db.select({ total: count() }).from(electionCandidates).where(and(eq(electionCandidates.collectionId, collectionId), eq(electionCandidates.instagramVerification, "Provável — requer revisão"))),
    db.select({ total: count() }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId)),
  ]);
  const checked = Number(checkedResult[0]?.total ?? 0);
  const verified = Number(verifiedResult[0]?.total ?? 0);
  const probable = Number(probableResult[0]?.total ?? 0);
  const total = Number(totalResult[0]?.total ?? 0);
  const pending = Math.max(0, total - checked);
  const notFound = Math.max(0, checked - verified - probable);
  await db.update(electionCollections).set({
    instagramCheckedCount: checked,
    instagramPendingCount: pending,
    verifiedInstagramCount: verified,
    probableInstagramCount: probable,
    notFoundInstagramCount: notFound,
    summary: { ...(collection.summary ?? {}), instagramVerification: { status: pending ? "em_processamento" : "concluida", source: "Campo público sites do detalhe oficial DivulgaCandContas", checked, pending, lastRun: { at: new Date().toISOString(), attempted: candidates.length, verified: verifiedInRun, failed: failedInRun } } },
  }).where(eq(electionCollections.id, collectionId));
  return { collectionId, attempted: candidates.length, verifiedInRun, failedInRun, checked, pending, complete: pending === 0 };
}

export async function collectOfficial2026ForUser(userId: number) {
  const db = await requireDb();
  const created = await db.insert(electionCollections).values({
    userId,
    label: "Coleta oficial TSE — Eleições Gerais 2026",
    sourceUrl: TSE_CANDIDATES_URL,
    sourceStatus: "disponivel",
    processStatus: "em_processamento",
    dataCutoffAt: new Date(),
    summary: { candidatesUrl: TSE_CANDIDATES_URL, socialNetworksUrl: TSE_SOCIAL_NETWORKS_URL, scope: ["Governador", "Vice-governador", "Senador", "1º Suplente", "2º Suplente", "Deputado Federal", "Deputado Estadual"] },
  });
  const collectionId = Number(created[0].insertId);
  try {
    const { candidates, officialTotals, sourceUrl, sourceMode, notes } = await loadOfficial2026Candidates();
    for (let start = 0; start < candidates.length; start += 250) {
      const batch = candidates.slice(start, start + 250);
      if (batch.length) await db.insert(electionCandidates).values(batch.map(candidate => ({ ...candidate, collectionId, userId })));
    }
    const verifiedInstagramCount = candidates.filter(candidate => candidate.instagramVerification === "Verificado").length;
    const probableInstagramCount = candidates.filter(candidate => candidate.instagramVerification === "Provável — requer revisão").length;
    const notFoundInstagramCount = candidates.filter(candidate => candidate.instagramVerification === "Não localizado").length;
    const coveredUfs = Array.from(new Set(candidates.map(candidate => candidate.state))).sort();
    const coverageIssue = coveredUfs.length < 26;
    await db.update(electionCollections).set({
      sourceUrl,
      sourceStatus: "processado",
      processStatus: coverageIssue ? "incompleta" : "concluida",
      processedAt: new Date(),
      totalCandidates: candidates.length,
      instagramCheckedCount: 0,
      instagramPendingCount: candidates.length,
      verifiedInstagramCount,
      probableInstagramCount,
      notFoundInstagramCount: 0,
      officialTotals,
      summary: { candidatesUrl: TSE_CANDIDATES_URL, socialNetworksUrl: TSE_SOCIAL_NETWORKS_URL, sourceMode, sourceNotes: notes, coveredUfs, scope: ["Governador", "Vice-governador", "Senador", "1º Suplente", "2º Suplente", "Deputado Federal", "Deputado Estadual"] },
      errorReport: coverageIssue ? [{ stage: "conferencia_cobertura_uf", reason: `A fonte retornou ${coveredUfs.length} UF(s): ${coveredUfs.join(", ")}. A coleta não foi marcada como completa.` }] : null,
    }).where(and(eq(electionCollections.id, collectionId), eq(electionCollections.userId, userId)));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha desconhecida ao acessar a fonte oficial.";
    await db.update(electionCollections).set({
      sourceStatus: "indisponivel",
      processStatus: "incompleta",
      processedAt: new Date(),
      errorReport: [{ stage: "download_fonte_oficial", reason }],
    }).where(and(eq(electionCollections.id, collectionId), eq(electionCollections.userId, userId)));
  }
  return getElectionCollectionForUser(userId, collectionId);
}
