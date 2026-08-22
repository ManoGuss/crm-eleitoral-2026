import { and, count, eq } from "drizzle-orm";
import { electionCandidates, electionCollections } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const API_BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";
const ELECTION_ID = 20322002026;
const collectionId = Number(process.argv[2]);
if (!Number.isInteger(collectionId) || collectionId < 1) throw new Error("Informe o identificador de uma coleta eleitoral.");

const db = await getDb();
if (!db) throw new Error("DATABASE_URL não está disponível.");
const collection = (await db.select().from(electionCollections).where(eq(electionCollections.id, collectionId)).limit(1))[0];
if (!collection) throw new Error("Coleta não encontrada.");

const candidates = await db.select({ id: electionCandidates.id, officialCandidateId: electionCandidates.officialCandidateId, state: electionCandidates.state }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId));
const normalizeInstagram = value => {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
    const handle = url.pathname.split("/").filter(Boolean)[0];
    return handle ? `https://instagram.com/${handle.toLowerCase()}` : null;
  } catch { return null; }
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let verified = 0;
let checked = 0;
let failed = 0;
const concurrency = 8;
for (let start = 0; start < candidates.length; start += concurrency) {
  const batch = candidates.slice(start, start + concurrency);
  await Promise.all(batch.map(async candidate => {
    const source = `${API_BASE}/candidatura/buscar/2026/${candidate.state}/${ELECTION_ID}/candidato/${candidate.officialCandidateId}`;
    try {
      const response = await fetch(source, { headers: { Accept: "application/json", "User-Agent": "CRM-Eleitoral-2026/1.0 (public-data-audit)" } });
      if (!response.ok) { failed += 1; return; }
      const detail = await response.json();
      const declaredProfiles = Array.isArray(detail.sites) ? detail.sites.filter(site => typeof site === "string") : [];
      const instagrams = Array.from(new Set(declaredProfiles.map(normalizeInstagram).filter(Boolean)));
      if (instagrams.length) verified += 1;
      await db.update(electionCandidates).set({
        declaredProfiles,
        primaryInstagram: instagrams[0] || null,
        secondaryInstagrams: instagrams.slice(1),
        instagramVerification: instagrams.length ? "Verificado" : "Não localizado",
        verificationSignals: instagrams.length ? [
          { signal: "Registro oficial de candidatura no DivulgaCandContas", source },
          { signal: "Instagram declarado no campo público de sites da candidatura", source, url: instagrams[0] },
        ] : [],
        lastVerifiedAt: new Date(),
      }).where(and(eq(electionCandidates.id, candidate.id), eq(electionCandidates.collectionId, collectionId)));
      checked += 1;
    } catch { failed += 1; }
  }));
  if (start % 400 === 0) console.log(JSON.stringify({ progress: Math.min(start + batch.length, candidates.length), total: candidates.length, verified, failed }));
  await wait(90);
}

const stats = await db.select({ verification: electionCandidates.instagramVerification, total: count() }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId)).groupBy(electionCandidates.instagramVerification);
const amount = label => Number(stats.find(item => item.verification === label)?.total ?? 0);
await db.update(electionCollections).set({
  verifiedInstagramCount: amount("Verificado"),
  probableInstagramCount: amount("Provável — requer revisão"),
  notFoundInstagramCount: amount("Não localizado"),
  summary: { ...(collection.summary ?? {}), instagramVerification: { source: "Campo público sites do detalhe oficial DivulgaCandContas", checked, failed, verified, completedAt: new Date().toISOString() } },
  updatedAt: new Date(),
}).where(eq(electionCollections.id, collectionId));
console.log(JSON.stringify({ collectionId, total: candidates.length, checked, verified, failed, stats }, null, 2));
process.exit(0);
