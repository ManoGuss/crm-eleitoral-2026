import { and, count, desc, eq, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { electionCandidateFavorites, electionCandidateInteractions, electionCandidates, electionCollections, electionContactPreferences, electionInteractionEvents, electionReviewDecisions, users } from "../drizzle/schema";
import type { CommercialMarker } from "../shared/commercial";
import { candidateForStorage, loadOfficial2026Candidates, TSE_CANDIDATES_URL, TSE_SOCIAL_NETWORKS_URL } from "./election-collector";
import { collectionFailureForAudit, collectionInterruptedAudit, ELECTION_INSERT_BATCH_SIZE } from "./election-collection-utils";
import { buildManualReviewValues } from "./election-review-utils";
import { buildPublicWhatsAppUrl, DEFAULT_WHATSAPP_TEMPLATE, renderWhatsAppTemplate } from "./election-contact-utils";
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

function safePublicContact(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    return allowedHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`)) ? url.toString() : null;
  } catch {
    return null;
  }
}

function candidatePublicContacts(candidate: { primaryInstagram: string | null; declaredProfiles: string[] | null; publicContacts?: Array<{ channel: "instagram" | "whatsapp" | "email" | "phone"; value: string; source: string }> | null }) {
  const profiles = candidate.declaredProfiles ?? [];
  const publicContacts = candidate.publicContacts ?? [];
  const instagram = publicContacts.filter(contact => contact.channel === "instagram").map(contact => safePublicContact(contact.value, ["instagram.com"])).find(Boolean) || safePublicContact(candidate.primaryInstagram ?? "", ["instagram.com"]) || profiles.map(value => safePublicContact(value, ["instagram.com"])).find(Boolean) || null;
  const whatsapp = publicContacts.filter(contact => contact.channel === "whatsapp").map(contact => safePublicContact(contact.value, ["wa.me", "whatsapp.com"])).find(Boolean) || profiles.map(value => safePublicContact(value, ["wa.me", "whatsapp.com"])).find(Boolean) || null;
  return { instagram, whatsapp };
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

export async function listElectionCandidatesForUser(userId: number, input: { collectionId: number; page: number; pageSize: number; state?: string; cargo?: string; party?: string; city?: string; instagramVerification?: string; manualReviewStatus?: "pendente" | "aprovado" | "rejeitado"; favoritesOnly?: boolean; commercialMarker?: CommercialMarker; query?: string }) {
  const db = await requireDb();
  const conditions = [eq(electionCandidates.userId, userId), eq(electionCandidates.collectionId, input.collectionId)];
  if (input.state) conditions.push(eq(electionCandidates.state, input.state));
  if (input.cargo) conditions.push(eq(electionCandidates.cargo, input.cargo));
  if (input.party) conditions.push(eq(electionCandidates.party, input.party));
  if (input.city) conditions.push(eq(electionCandidates.city, input.city));
  if (input.instagramVerification) conditions.push(eq(electionCandidates.instagramVerification, input.instagramVerification as typeof electionCandidates.instagramVerification.enumValues[number]));
  if (input.manualReviewStatus) conditions.push(eq(electionCandidates.manualReviewStatus, input.manualReviewStatus));
  if (input.favoritesOnly) conditions.push(isNotNull(electionCandidateFavorites.id));
  if (input.commercialMarker === "sem_contato") conditions.push(and(eq(electionCandidateFavorites.status, "Novo"), isNull(electionCandidateFavorites.lastContactAt))!);
  if (input.commercialMarker === "em_conversa") conditions.push(or(inArray(electionCandidateFavorites.status, ["Abordado", "Respondeu"]), isNotNull(electionCandidateFavorites.lastContactAt))!);
  if (input.commercialMarker === "aguardando_retorno") conditions.push(eq(electionCandidateFavorites.status, "Não respondeu"));
  if (input.commercialMarker === "negociacao") conditions.push(eq(electionCandidateFavorites.status, "Interessado"));
  if (input.commercialMarker === "follow_up") conditions.push(or(eq(electionCandidateFavorites.status, "Follow-up"), and(isNotNull(electionCandidateFavorites.followUpAt), notInArray(electionCandidateFavorites.status, ["Fechado", "Perdido"])))!);
  if (input.commercialMarker === "proposta") conditions.push(eq(electionCandidateFavorites.status, "Proposta enviada"));
  if (input.commercialMarker === "fechado") conditions.push(eq(electionCandidateFavorites.status, "Fechado"));
  if (input.commercialMarker === "perdido") conditions.push(eq(electionCandidateFavorites.status, "Perdido"));
  if (input.query?.trim()) {
    const term = `%${input.query.trim()}%`;
    conditions.push(sql`(${electionCandidates.candidateName} like ${term} OR ${electionCandidates.ballotName} like ${term} OR ${electionCandidates.primaryInstagram} like ${term})`);
  }
  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [rows, totalResult] = await Promise.all([
    db.select({ candidate: electionCandidates, favorite: electionCandidateFavorites }).from(electionCandidates).leftJoin(electionCandidateFavorites, and(eq(electionCandidateFavorites.candidateId, electionCandidates.id), eq(electionCandidateFavorites.userId, userId))).where(where).orderBy(electionCandidateFavorites.createdAt, electionCandidates.state, electionCandidates.cargo, electionCandidates.candidateName).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(electionCandidates).leftJoin(electionCandidateFavorites, and(eq(electionCandidateFavorites.candidateId, electionCandidates.id), eq(electionCandidateFavorites.userId, userId))).where(where),
  ]);
  return { items: rows.map(row => ({ ...row.candidate, favorite: row.favorite })), total: totalResult[0]?.total ?? 0 };
}

export async function listFavoriteElectionCandidatesForUser(userId: number, input: { page: number; pageSize: number; status?: typeof electionCandidateFavorites.status.enumValues[number]; query?: string }) {
  const db = await requireDb();
  const conditions = [eq(electionCandidateFavorites.userId, userId)];
  if (input.status) conditions.push(eq(electionCandidateFavorites.status, input.status));
  if (input.query?.trim()) {
    const term = `%${input.query.trim()}%`;
    conditions.push(sql`(${electionCandidates.candidateName} like ${term} OR ${electionCandidates.ballotName} like ${term} OR ${electionCandidates.cargo} like ${term} OR ${electionCandidates.party} like ${term})`);
  }
  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [rows, totalResult] = await Promise.all([
    db.select({ candidate: electionCandidates, favorite: electionCandidateFavorites }).from(electionCandidateFavorites).innerJoin(electionCandidates, eq(electionCandidateFavorites.candidateId, electionCandidates.id)).where(where).orderBy(desc(electionCandidateFavorites.followUpAt), desc(electionCandidateFavorites.updatedAt), electionCandidates.candidateName).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(electionCandidateFavorites).innerJoin(electionCandidates, eq(electionCandidateFavorites.candidateId, electionCandidates.id)).where(where),
  ]);
  return { items: rows.map(row => ({ ...row.candidate, favorite: row.favorite })), total: totalResult[0]?.total ?? 0 };
}

export async function setElectionCandidateFavoriteForUser(userId: number, candidateId: number, favorite: boolean) {
  const db = await requireDb();
  const candidate = (await db.select({ id: electionCandidates.id }).from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0];
  if (!candidate) return null;
  if (favorite) await db.insert(electionCandidateFavorites).values({ userId, candidateId, status: "Novo" }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  else await db.delete(electionCandidateFavorites).where(and(eq(electionCandidateFavorites.userId, userId), eq(electionCandidateFavorites.candidateId, candidateId)));
  return favorite ? (await db.select().from(electionCandidateFavorites).where(and(eq(electionCandidateFavorites.userId, userId), eq(electionCandidateFavorites.candidateId, candidateId))).limit(1))[0] ?? null : null;
}

export async function updateElectionCandidateFavoriteForUser(userId: number, candidateId: number, values: { status?: typeof electionCandidateFavorites.status.enumValues[number]; lastContactAt?: Date | null; followUpAt?: Date | null; note?: string | null }) {
  const db = await requireDb();
  const result = await db.update(electionCandidateFavorites).set(values).where(and(eq(electionCandidateFavorites.userId, userId), eq(electionCandidateFavorites.candidateId, candidateId)));
  if (!result[0]?.affectedRows) return null;
  return (await db.select().from(electionCandidateFavorites).where(and(eq(electionCandidateFavorites.userId, userId), eq(electionCandidateFavorites.candidateId, candidateId))).limit(1))[0] ?? null;
}

export async function reviewElectionCandidateForUser(userId: number, candidateId: number, decision: "aprovado" | "rejeitado", note?: string | null, dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  const candidate = (await db.select().from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0];
  if (!candidate) return null;
  if (candidate.instagramVerification !== "Provável — requer revisão" || candidate.manualReviewStatus !== "pendente") return null;
  const values = buildManualReviewValues(decision, note, candidate.verificationSignals);
  await db.insert(electionReviewDecisions).values({
    candidateId,
    userId,
    decision,
    previousVerification: candidate.instagramVerification,
    resultingVerification: values.instagramVerification,
    note: values.manualReviewNote,
  });
  await db.update(electionCandidates).set({
    ...values,
    manualReviewedBy: userId,
    manualReviewedAt: new Date(),
  }).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId)));
  return (await db.select().from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0] ?? null;
}

export async function listReviewersForUser(userId: number) {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email }).from(electionReviewDecisions)
    .innerJoin(users, eq(electionReviewDecisions.userId, users.id))
    .where(eq(electionReviewDecisions.userId, userId)).groupBy(users.id, users.name, users.email);
}

export async function listReviewHistoryForUser(userId: number, input: { collectionId: number; page: number; pageSize: number; reviewerId?: number; candidateId?: number }) {
  const db = await requireDb();
  const conditions = [eq(electionReviewDecisions.userId, userId), eq(electionCandidates.collectionId, input.collectionId)];
  if (input.reviewerId) conditions.push(eq(electionReviewDecisions.userId, input.reviewerId));
  if (input.candidateId) conditions.push(eq(electionReviewDecisions.candidateId, input.candidateId));
  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [items, totalResult] = await Promise.all([
    db.select({ id: electionReviewDecisions.id, candidateId: electionReviewDecisions.candidateId, decision: electionReviewDecisions.decision, previousVerification: electionReviewDecisions.previousVerification, resultingVerification: electionReviewDecisions.resultingVerification, note: electionReviewDecisions.note, createdAt: electionReviewDecisions.createdAt, candidateName: electionCandidates.candidateName, ballotName: electionCandidates.ballotName, cargo: electionCandidates.cargo, state: electionCandidates.state, reviewerName: users.name, reviewerEmail: users.email }).from(electionReviewDecisions)
      .innerJoin(electionCandidates, eq(electionReviewDecisions.candidateId, electionCandidates.id)).leftJoin(users, eq(electionReviewDecisions.userId, users.id)).where(where).orderBy(desc(electionReviewDecisions.createdAt)).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(electionReviewDecisions).innerJoin(electionCandidates, eq(electionReviewDecisions.candidateId, electionCandidates.id)).where(where),
  ]);
  return { items, total: Number(totalResult[0]?.total ?? 0) };
}

export async function getElectionCandidateProfileForUser(userId: number, candidateId: number, dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  const candidate = (await db.select().from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0];
  if (!candidate) return null;
  const [reviews, interactions, interactionEvents, favoriteRows] = await Promise.all([
    db.select({ id: electionReviewDecisions.id, decision: electionReviewDecisions.decision, note: electionReviewDecisions.note, createdAt: electionReviewDecisions.createdAt, reviewerName: users.name, reviewerEmail: users.email }).from(electionReviewDecisions).leftJoin(users, eq(electionReviewDecisions.userId, users.id)).where(and(eq(electionReviewDecisions.candidateId, candidateId), eq(electionReviewDecisions.userId, userId))).orderBy(desc(electionReviewDecisions.createdAt)),
    db.select().from(electionCandidateInteractions).where(and(eq(electionCandidateInteractions.candidateId, candidateId), eq(electionCandidateInteractions.userId, userId))).orderBy(desc(electionCandidateInteractions.createdAt)),
    db.select().from(electionInteractionEvents).where(eq(electionInteractionEvents.userId, userId)).orderBy(desc(electionInteractionEvents.createdAt)),
    db.select().from(electionCandidateFavorites).where(and(eq(electionCandidateFavorites.candidateId, candidateId), eq(electionCandidateFavorites.userId, userId))).limit(1),
  ]);
  const typedInteractions = interactions as Array<{ id: number; [key: string]: unknown }>;
  const typedEvents = interactionEvents as Array<{ interactionId: number; [key: string]: unknown }>;
  const interactionIds = new Set(typedInteractions.map(interaction => interaction.id));
  return { candidate, favorite: favoriteRows[0] ?? null, reviews, interactions: typedInteractions.map(interaction => ({ ...interaction, events: typedEvents.filter(event => interactionIds.has(event.interactionId) && event.interactionId === interaction.id) })) };
}

export async function getContactPreferenceForUser(userId: number, dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  const preference = (await db.select().from(electionContactPreferences).where(eq(electionContactPreferences.userId, userId)).limit(1))[0];
  if (preference) return preference;
  await db.insert(electionContactPreferences).values({ userId, whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE });
  return (await db.select().from(electionContactPreferences).where(eq(electionContactPreferences.userId, userId)).limit(1))[0]!;
}

export async function updateContactPreferenceForUser(userId: number, whatsappTemplate: string, dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  await db.insert(electionContactPreferences).values({ userId, whatsappTemplate }).onDuplicateKeyUpdate({ set: { whatsappTemplate } });
  return getContactPreferenceForUser(userId, db);
}

export async function prepareCandidateContactForUser(userId: number, candidateId: number, channel: "instagram" | "whatsapp", dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  const candidate = (await db.select().from(electionCandidates).where(and(eq(electionCandidates.id, candidateId), eq(electionCandidates.userId, userId))).limit(1))[0];
  if (!candidate) return null;
  const contacts = candidatePublicContacts(candidate);
  const target = contacts[channel];
  if (!target) return null;
  const preference = await getContactPreferenceForUser(userId, db);
  const reviewer = (await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const preparedText = channel === "whatsapp" ? renderWhatsAppTemplate(preference.whatsappTemplate, candidate, reviewer?.name) : null;
  const preparedUrl = channel === "whatsapp" && preparedText ? buildPublicWhatsAppUrl(target, preparedText) : target;
  if (!preparedUrl) return null;
  const initialNote = channel === "whatsapp" ? "Mensagem padrão preparada para contato." : "Contato por Instagram iniciado.";
  const created = await db.insert(electionCandidateInteractions).values({ candidateId, userId, channel, outcome: "iniciada", targetUrl: target, note: initialNote });
  const interactionId = Number(created[0].insertId);
  await db.insert(electionInteractionEvents).values({ interactionId, userId, outcome: "iniciada", note: initialNote });
  return { url: preparedUrl, targetUrl: target, channel, preparedText };
}

export async function updateCandidateInteractionForUser(userId: number, interactionId: number, input: { outcome: "iniciada" | "enviada" | "respondida" | "sem_resposta" | "sem_interesse" | "agendada" | "outro"; note?: string | null }, dbOverride?: any) {
  const db = dbOverride ?? await requireDb();
  const interaction = (await db.select({ id: electionCandidateInteractions.id }).from(electionCandidateInteractions).where(and(eq(electionCandidateInteractions.id, interactionId), eq(electionCandidateInteractions.userId, userId))).limit(1))[0];
  if (!interaction) return false;
  await db.insert(electionInteractionEvents).values({ interactionId, userId, outcome: input.outcome, note: input.note?.trim() || null });
  return true;
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

export async function markElectionCollectionInterruptedForUser(userId: number, collectionId: number) {
  const db = await requireDb();
  const result = await db.update(electionCollections).set({
    sourceStatus: "falhou",
    processStatus: "falhou",
    processedAt: new Date(),
    errorReport: collectionInterruptedAudit(),
  }).where(and(
    eq(electionCollections.id, collectionId),
    eq(electionCollections.userId, userId),
    eq(electionCollections.processStatus, "em_processamento"),
    eq(electionCollections.totalCandidates, 0),
  ));
  return result[0]?.affectedRows === 1;
}

export async function collectOfficial2026ForUser(userId: number, onCollectionCreated?: (collectionId: number) => void) {
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
  onCollectionCreated?.(collectionId);
  try {
    const { candidates, officialTotals, sourceUrl, sourceMode, notes } = await loadOfficial2026Candidates();
    for (let start = 0; start < candidates.length; start += ELECTION_INSERT_BATCH_SIZE) {
      const batch = candidates.slice(start, start + ELECTION_INSERT_BATCH_SIZE);
      if (batch.length) await db.insert(electionCandidates).values(batch.map(candidate => ({ ...candidateForStorage(candidate), collectionId, userId })));
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
    const reason = collectionFailureForAudit(error);
    await db.update(electionCollections).set({
      sourceStatus: "falhou",
      processStatus: "falhou",
      processedAt: new Date(),
      errorReport: [{ stage: "download_fonte_oficial", reason }],
    }).where(and(eq(electionCollections.id, collectionId), eq(electionCollections.userId, userId)));
  }
  return getElectionCollectionForUser(userId, collectionId);
}
