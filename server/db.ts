import { and, count, desc, eq, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activities,
  contacts,
  fieldDefinitions,
  imports,
  importSheets,
  leads,
  notes,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível no momento.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export function selectPersonalWorkspaceUser<T>(admins: T[], recentUsers: T[]) {
  return admins[0] ?? recentUsers[0];
}

export async function getPersonalOwnerUser() {
  const db = await getDb();
  if (!db) return undefined;
  if (ENV.ownerOpenId) {
    const existing = await getUserByOpenId(ENV.ownerOpenId);
    if (existing) return existing;
    await upsertUser({ openId: ENV.ownerOpenId, name: ENV.ownerName, loginMethod: "acesso_pessoal", role: "admin" });
    return getUserByOpenId(ENV.ownerOpenId);
  }

  // No deploy pessoal publicado, a variável do proprietário pode não estar
  // exposta ao runtime. Nesse caso, usa-se o último espaço pessoal registrado,
  // com preferência por um administrador, para que as consultas protegidas não
  // fiquem sem contexto e não retornem 401 para a interface estática.
  const admins = await db.select().from(users).where(eq(users.role, "admin")).orderBy(desc(users.lastSignedIn), desc(users.id)).limit(1);
  const recentUsers = await db.select().from(users).orderBy(desc(users.lastSignedIn), desc(users.id)).limit(1);
  return selectPersonalWorkspaceUser(admins, recentUsers);
}

export async function listFieldDefinitions(userId: number) {
  const db = await requireDb();
  return db.select().from(fieldDefinitions).where(eq(fieldDefinitions.userId, userId)).orderBy(fieldDefinitions.columnOrder, fieldDefinitions.id);
}

export async function ensureFieldDefinitions(
  userId: number,
  definitions: Array<{ normalizedKey: string; displayName: string; inferredType: "texto" | "numero" | "data" | "email" | "telefone" | "whatsapp" | "url" | "instagram" | "facebook"; columnOrder: number }>
) {
  const db = await requireDb();
  const existing = await listFieldDefinitions(userId);
  const known = new Set(existing.map(field => field.normalizedKey));
  const newDefinitions = definitions.filter(definition => !known.has(definition.normalizedKey));
  if (newDefinitions.length) {
    await db.insert(fieldDefinitions).values(newDefinitions.map(definition => ({ ...definition, userId, isVisible: true, aliases: [] })));
  }
  return { existing, created: newDefinitions };
}

type LeadFilters = {
  page: number;
  pageSize: number;
  status?: string;
  query?: string;
  cargo?: string;
  party?: string;
  state?: string;
  city?: string;
  sourceImportId?: number;
  followUp?: "overdue" | "upcoming";
  commercialMarker?: "sem_contato" | "em_conversa" | "aguardando_retorno" | "negociacao" | "follow_up" | "proposta" | "fechado" | "perdido";
};

export async function listLeadsForUser(userId: number, filters: LeadFilters) {
  const db = await requireDb();
  const conditions = [eq(leads.userId, userId)];
  if (filters.status) conditions.push(eq(leads.status, filters.status as typeof leads.status.enumValues[number]));
  if (filters.sourceImportId) conditions.push(eq(leads.sourceImportId, filters.sourceImportId));
  if (filters.followUp === "overdue") conditions.push(sql`${leads.followUpAt} < now()`);
  if (filters.followUp === "upcoming") conditions.push(sql`${leads.followUpAt} >= now()`);
  if (filters.commercialMarker === "sem_contato") conditions.push(and(eq(leads.status, "Novo"), isNull(leads.lastContactAt))!);
  if (filters.commercialMarker === "em_conversa") conditions.push(or(inArray(leads.status, ["Abordado", "Respondeu"]), isNotNull(leads.lastContactAt))!);
  if (filters.commercialMarker === "aguardando_retorno") conditions.push(eq(leads.status, "Não respondeu"));
  if (filters.commercialMarker === "negociacao") conditions.push(eq(leads.status, "Interessado"));
  if (filters.commercialMarker === "follow_up") conditions.push(or(eq(leads.status, "Follow-up"), and(isNotNull(leads.followUpAt), notInArray(leads.status, ["Fechado", "Perdido"])))!);
  if (filters.commercialMarker === "proposta") conditions.push(eq(leads.status, "Proposta enviada"));
  if (filters.commercialMarker === "fechado") conditions.push(eq(leads.status, "Fechado"));
  if (filters.commercialMarker === "perdido") conditions.push(eq(leads.status, "Perdido"));
  if (filters.query?.trim()) {
    const term = `%${filters.query.trim()}%`;
    conditions.push(sql`(cast(${leads.customFields} as char) like ${term} OR ${leads.description} like ${term})`);
  }
  const electionPaths = {
    cargo: ["$.[\"Cargo\"]", "$.[\"DS_CARGO\"]"],
    party: ["$.[\"Partido\"]", "$.[\"Partido/Federação\"]", "$.[\"SG_PARTIDO\"]", "$.[\"NM_PARTIDO\"]", "$.[\"Federação\"]", "$.[\"NM_FEDERACAO\"]"],
    state: ["$.[\"Estado\"]", "$.[\"UF\"]", "$.[\"SG_UF\"]", "$.[\"UF da eleição\"]", "$.[\"SG_UE\"]"],
    city: ["$.[\"Cidade\"]", "$.[\"Município\"]", "$.[\"NM_MUNICIPIO\"]", "$.[\"NM_UE\"]"],
  } as const;
  for (const [field, value] of Object.entries({ cargo: filters.cargo, party: filters.party, state: filters.state, city: filters.city }) as Array<[keyof typeof electionPaths, string | undefined]>) {
    if (value?.trim()) {
      const paths = electionPaths[field].map(path => sql`${path}`);
      conditions.push(sql`json_search(${leads.customFields}, 'one', ${value.trim()}, NULL, ${sql.join(paths, sql`, `)}) is not null`);
    }
  }
  const where = and(...conditions);
  const offset = (filters.page - 1) * filters.pageSize;
  const [items, totalResult] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.updatedAt)).limit(filters.pageSize).offset(offset),
    db.select({ total: count() }).from(leads).where(where),
  ]);
  return { items, total: totalResult[0]?.total ?? 0 };
}

export async function getLeadElectionFilterOptions(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ customFields: leads.customFields }).from(leads).where(eq(leads.userId, userId));
  const values = { cargo: new Set<string>(), party: new Set<string>(), state: new Set<string>(), city: new Set<string>() };
  const keyForHeader = (header: string) => header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  rows.forEach(row => Object.entries(row.customFields).forEach(([header, value]) => {
    const key = keyForHeader(header);
    const cleaned = value.trim();
    if (!cleaned) return;
    if (key.includes("cargo")) values.cargo.add(cleaned);
    else if (key.includes("partido") || key.includes("federacao")) values.party.add(cleaned);
    else if (key === "estado" || key === "uf" || key.includes("ufeleicao")) values.state.add(cleaned);
    else if (key.includes("cidade") || key.includes("municipio")) values.city.add(cleaned);
  }));
  const sort = (items: Set<string>) => Array.from(items).sort((a, b) => a.localeCompare(b, "pt-BR")).slice(0, 1000);
  return { cargo: sort(values.cargo), party: sort(values.party), state: sort(values.state), city: sort(values.city) };
}

export async function getLeadDetail(userId: number, leadId: number) {
  const db = await requireDb();
  const lead = (await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.userId, userId))).limit(1))[0];
  if (!lead) return null;
  const [leadContacts, leadNotes, leadActivities] = await Promise.all([
    db.select().from(contacts).where(and(eq(contacts.leadId, leadId), eq(contacts.userId, userId))).orderBy(desc(contacts.isPrimary), desc(contacts.updatedAt)),
    db.select().from(notes).where(and(eq(notes.leadId, leadId), eq(notes.userId, userId))).orderBy(desc(notes.createdAt)),
    db.select().from(activities).where(and(eq(activities.leadId, leadId), eq(activities.userId, userId))).orderBy(desc(activities.createdAt)).limit(100),
  ]);
  return { lead, contacts: leadContacts, notes: leadNotes, activities: leadActivities };
}

export async function createLeadForUser(
  userId: number,
  values: {
    status: typeof leads.status.enumValues[number];
    description?: string | null;
    followUpAt?: Date | null;
    lastContactAt?: Date | null;
    lostReason?: string | null;
    servicesOfInterest?: string[];
    customFields: Record<string, string>;
    sourceImportId?: number | null;
    sourceSheet?: string | null;
    originalRowNumber?: number | null;
    dedupeKey?: string | null;
  }
) {
  const db = await requireDb();
  const result = await db.insert(leads).values({ ...values, userId });
  const leadId = Number(result[0].insertId);
  await db.insert(activities).values({ userId, leadId, type: "lead_created", message: "Lead criado." });
  return getLeadDetail(userId, leadId);
}

export async function updateLeadForUser(
  userId: number,
  leadId: number,
  values: Partial<{
    status: typeof leads.status.enumValues[number];
    description: string | null;
    followUpAt: Date | null;
    lastContactAt: Date | null;
    lostReason: string | null;
    servicesOfInterest: string[];
    customFields: Record<string, string>;
  }>,
  activity?: { type: string; message: string; metadata?: Record<string, unknown> }
) {
  const db = await requireDb();
  const result = await db.update(leads).set(values).where(and(eq(leads.id, leadId), eq(leads.userId, userId)));
  if (result[0].affectedRows === 0) return null;
  if (activity) await db.insert(activities).values({ userId, leadId, ...activity });
  return getLeadDetail(userId, leadId);
}

export async function deleteLeadForUser(userId: number, leadId: number) {
  const db = await requireDb();
  const result = await db.delete(leads).where(and(eq(leads.id, leadId), eq(leads.userId, userId)));
  return result[0].affectedRows > 0;
}

export async function addContactForUser(userId: number, leadId: number, values: { name?: string | null; type: typeof contacts.type.enumValues[number]; value: string; note?: string | null; isPrimary?: boolean }) {
  const db = await requireDb();
  const ownLead = await getLeadDetail(userId, leadId);
  if (!ownLead) return null;
  if (values.isPrimary) await db.update(contacts).set({ isPrimary: false }).where(and(eq(contacts.leadId, leadId), eq(contacts.userId, userId)));
  const result = await db.insert(contacts).values({ userId, leadId, ...values, source: "manual", isPrimary: values.isPrimary ?? false });
  await db.insert(activities).values({ userId, leadId, type: "contact_added", message: "Contato adicionado." });
  return (await db.select().from(contacts).where(and(eq(contacts.id, Number(result[0].insertId)), eq(contacts.userId, userId))).limit(1))[0];
}

export async function deleteContactForUser(userId: number, contactId: number) {
  const db = await requireDb();
  const contact = (await db.select().from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.userId, userId))).limit(1))[0];
  if (!contact) return false;
  await db.delete(contacts).where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
  await db.insert(activities).values({ userId, leadId: contact.leadId, type: "contact_deleted", message: "Contato removido." });
  return true;
}

export async function addNoteForUser(userId: number, leadId: number, content: string) {
  const db = await requireDb();
  const ownLead = await getLeadDetail(userId, leadId);
  if (!ownLead) return null;
  const result = await db.insert(notes).values({ userId, leadId, content });
  await db.insert(activities).values({ userId, leadId, type: "note_created", message: "Anotação criada." });
  return (await db.select().from(notes).where(and(eq(notes.id, Number(result[0].insertId)), eq(notes.userId, userId))).limit(1))[0];
}

export async function deleteNoteForUser(userId: number, noteId: number) {
  const db = await requireDb();
  const note = (await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId))).limit(1))[0];
  if (!note) return false;
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  await db.insert(activities).values({ userId, leadId: note.leadId, type: "note_deleted", message: "Anotação removida." });
  return true;
}

export async function getDashboardForUser(userId: number) {
  const db = await requireDb();
  const [totalResult, grouped, overdueResult, recentLeads, recentImports] = await Promise.all([
    db.select({ total: count() }).from(leads).where(eq(leads.userId, userId)),
    db.select({ status: leads.status, total: count() }).from(leads).where(eq(leads.userId, userId)).groupBy(leads.status),
    db.select({ total: count() }).from(leads).where(and(eq(leads.userId, userId), sql`${leads.followUpAt} < now()`)),
    db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.updatedAt)).limit(5),
    db.select().from(imports).where(eq(imports.userId, userId)).orderBy(desc(imports.createdAt)).limit(5),
  ]);
  return {
    total: totalResult[0]?.total ?? 0,
    byStatus: Object.fromEntries(grouped.map(item => [item.status, item.total])),
    overdueFollowUps: overdueResult[0]?.total ?? 0,
    recentLeads,
    recentImports,
  };
}

export async function listImportsForUser(userId: number) {
  const db = await requireDb();
  return db.select().from(imports).where(eq(imports.userId, userId)).orderBy(desc(imports.createdAt));
}

export async function getImportForUser(userId: number, importId: number) {
  const db = await requireDb();
  const importRecord = (await db.select().from(imports).where(and(eq(imports.id, importId), eq(imports.userId, userId))).limit(1))[0];
  if (!importRecord) return null;
  const [sheets, createdLeads, updateEvents] = await Promise.all([
    db.select().from(importSheets).where(and(eq(importSheets.importId, importId), eq(importSheets.userId, userId))),
    db.select().from(leads).where(and(eq(leads.sourceImportId, importId), eq(leads.userId, userId))).orderBy(desc(leads.createdAt)).limit(100),
    db.select({ leadId: activities.leadId }).from(activities).where(and(eq(activities.userId, userId), eq(activities.type, "import_updated"), sql`json_extract(${activities.metadata}, '$.importId') = ${importId}`)),
  ]);
  const updatedLeadIds = Array.from(new Set(updateEvents.map(event => event.leadId)));
  const updatedLeads = updatedLeadIds.length
    ? await db.select().from(leads).where(and(eq(leads.userId, userId), inArray(leads.id, updatedLeadIds))).orderBy(desc(leads.updatedAt)).limit(100)
    : [];
  const leadMap = new Map([...createdLeads, ...updatedLeads].map(lead => [lead.id, lead]));
  return { import: importRecord, sheets, leads: Array.from(leadMap.values()), createdLeadCount: createdLeads.length, updatedLeadCount: updatedLeads.length };
}

export async function deleteImportForUser(userId: number, importId: number, deleteLinkedLeads: boolean) {
  const db = await requireDb();
  const importRecord = (await db.select().from(imports).where(and(eq(imports.id, importId), eq(imports.userId, userId))).limit(1))[0];
  if (!importRecord) return false;
  if (deleteLinkedLeads) {
    await db.delete(leads).where(and(eq(leads.userId, userId), eq(leads.sourceImportId, importId)));
  }
  const result = await db.delete(imports).where(and(eq(imports.id, importId), eq(imports.userId, userId)));
  return result[0].affectedRows > 0;
}

export async function updateImportForUser(userId: number, importId: number, values: Partial<typeof imports.$inferInsert>) {
  const db = await requireDb();
  await db.update(imports).set(values).where(and(eq(imports.id, importId), eq(imports.userId, userId)));
}

export async function createImportForUser(userId: number, values: Omit<typeof imports.$inferInsert, "userId">) {
  const db = await requireDb();
  const result = await db.insert(imports).values({ ...values, userId });
  return Number(result[0].insertId);
}

export async function createImportSheetsForUser(userId: number, rows: Array<Omit<typeof importSheets.$inferInsert, "userId">>) {
  const db = await requireDb();
  if (rows.length) await db.insert(importSheets).values(rows.map(row => ({ ...row, userId })));
}

export async function findExistingLeadsByDedupeKeys(userId: number, keys: string[]) {
  const db = await requireDb();
  const output: Array<typeof leads.$inferSelect> = [];
  for (let start = 0; start < keys.length; start += 250) {
    const chunk = keys.slice(start, start + 250);
    if (chunk.length) output.push(...(await db.select().from(leads).where(and(eq(leads.userId, userId), inArray(leads.dedupeKey, chunk)))));
  }
  return output;
}

export async function createLeadsInBatches(userId: number, values: Array<Omit<typeof leads.$inferInsert, "userId">>) {
  const db = await requireDb();
  for (let start = 0; start < values.length; start += 250) {
    const chunk = values.slice(start, start + 250);
    if (chunk.length) await db.insert(leads).values(chunk.map(value => ({ ...value, userId })));
  }
}

export async function getLeadsBySourceImport(userId: number, importId: number) {
  const db = await requireDb();
  return db.select().from(leads).where(and(eq(leads.userId, userId), eq(leads.sourceImportId, importId)));
}

export async function createContactsInBatches(userId: number, values: Array<Omit<typeof contacts.$inferInsert, "userId">>) {
  const db = await requireDb();
  for (let start = 0; start < values.length; start += 250) {
    const chunk = values.slice(start, start + 250);
    if (chunk.length) await db.insert(contacts).values(chunk.map(value => ({ ...value, userId })));
  }
}

export async function createActivitiesInBatches(userId: number, values: Array<Omit<typeof activities.$inferInsert, "userId">>) {
  const db = await requireDb();
  for (let start = 0; start < values.length; start += 250) {
    const chunk = values.slice(start, start + 250);
    if (chunk.length) await db.insert(activities).values(chunk.map(value => ({ ...value, userId })));
  }
}
