import { and, desc, eq } from "drizzle-orm";
import { electionCollections, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { verifyInstagramChunkForCollection } from "../server/election-db.ts";

const db = await getDb();
if (!db) throw new Error("DATABASE_URL não está disponível para verificar contatos públicos.");
const ownerOpenId = process.env.OWNER_OPEN_ID;
if (!ownerOpenId) throw new Error("OWNER_OPEN_ID não está disponível para identificar a conta proprietária.");
const owner = (await db.select().from(users).where(eq(users.openId, ownerOpenId)).limit(1))[0];
if (!owner) throw new Error("A conta proprietária ainda não possui uma sessão registrada no CRM.");
const collection = (await db.select().from(electionCollections).where(and(eq(electionCollections.userId, owner.id), eq(electionCollections.processStatus, "concluida"))).orderBy(desc(electionCollections.createdAt)).limit(1))[0];
if (!collection) throw new Error("Nenhuma coleta eleitoral concluída foi encontrada para a conta proprietária.");

const result = await verifyInstagramChunkForCollection(collection.id, 64);
console.log(JSON.stringify({ collectionId: collection.id, attempted: result.attempted, verifiedInRun: result.verifiedInRun, failedInRun: result.failedInRun, pending: result.pending, message: "Lote limitado processado para enriquecer canais públicos declarados." }, null, 2));
