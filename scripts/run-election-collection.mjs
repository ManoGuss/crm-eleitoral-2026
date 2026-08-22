import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { collectOfficial2026ForUser } from "../server/election-db.ts";

const db = await getDb();
if (!db) throw new Error("DATABASE_URL não está disponível para executar a coleta.");

const ownerOpenId = process.env.OWNER_OPEN_ID;
if (!ownerOpenId) throw new Error("OWNER_OPEN_ID não está disponível para identificar a conta proprietária.");

const owner = (await db.select().from(users).where(eq(users.openId, ownerOpenId)).limit(1))[0];
if (!owner) throw new Error("A conta proprietária ainda não possui uma sessão registrada no CRM.");

const result = await collectOfficial2026ForUser(owner.id);
console.log(JSON.stringify({ collectionId: result?.collection.id, sourceStatus: result?.collection.sourceStatus, processStatus: result?.collection.processStatus, totalCandidates: result?.collection.totalCandidates, errors: result?.collection.errorReport }, null, 2));
