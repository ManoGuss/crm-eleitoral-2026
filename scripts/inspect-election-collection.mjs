import { asc, eq, sql } from "drizzle-orm";
import { electionCandidates, electionCollections } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const db = await getDb();
if (!db) throw new Error("DATABASE_URL não está disponível.");
const collectionId = Number(process.argv[2] || 1);
const collection = (await db.select().from(electionCollections).where(eq(electionCollections.id, collectionId)).limit(1))[0];
const byState = await db.select({ state: electionCandidates.state, total: sql`count(*)`.as("total") }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId)).groupBy(electionCandidates.state).orderBy(asc(electionCandidates.state));
const byCargo = await db.select({ cargo: electionCandidates.cargo, total: sql`count(*)`.as("total") }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId)).groupBy(electionCandidates.cargo).orderBy(asc(electionCandidates.cargo));
const sample = (await db.select({ state: electionCandidates.state, cargo: electionCandidates.cargo, sourceRecord: electionCandidates.sourceRecord }).from(electionCandidates).where(eq(electionCandidates.collectionId, collectionId)).limit(1))[0];
console.log(JSON.stringify({ collection, byState, byCargo, sample }, null, 2));
process.exit(0);
