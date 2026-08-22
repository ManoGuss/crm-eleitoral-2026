import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const crmStatuses = [
  "Novo",
  "Abordado",
  "Respondeu",
  "Não respondeu",
  "Interessado",
  "Follow-up",
  "Proposta enviada",
  "Fechado",
  "Perdido",
] as const;

export const contactTypes = [
  "whatsapp",
  "telefone",
  "email",
  "instagram",
  "facebook",
  "site",
  "outro",
] as const;

export const imports = mysqlTable(
  "imports",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    fileName: varchar("fileName", { length: 500 }).notNull(),
    fileKey: varchar("fileKey", { length: 1000 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 1200 }).notNull(),
    mimeType: varchar("mimeType", { length: 160 }).notNull(),
    fileSize: int("fileSize").notNull(),
    status: mysqlEnum("status", ["analisando", "em_processamento", "concluida", "incompleta", "falhou"]).default("analisando").notNull(),
    sheetCount: int("sheetCount").default(0).notNull(),
    totalRows: int("totalRows").default(0).notNull(),
    createdLeads: int("createdLeads").default(0).notNull(),
    updatedLeads: int("updatedLeads").default(0).notNull(),
    skippedDuplicates: int("skippedDuplicates").default(0).notNull(),
    failedRows: int("failedRows").default(0).notNull(),
    errorReport: json("errorReport").$type<Array<{ row: number; reason: string }>>(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("imports_user_created_idx").on(table.userId, table.createdAt)]
);

export const importSheets = mysqlTable(
  "importSheets",
  {
    id: int("id").autoincrement().primaryKey(),
    importId: int("importId").notNull().references(() => imports.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    isSelected: boolean("isSelected").default(false).notNull(),
    headerRow: int("headerRow").default(1).notNull(),
    totalRows: int("totalRows").default(0).notNull(),
    columnNames: json("columnNames").$type<string[]>().notNull(),
    previewRows: json("previewRows").$type<Array<Record<string, string>>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("import_sheets_import_idx").on(table.importId), index("import_sheets_user_idx").on(table.userId)]
);

export const fieldDefinitions = mysqlTable(
  "fieldDefinitions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    normalizedKey: varchar("normalizedKey", { length: 255 }).notNull(),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    inferredType: mysqlEnum("inferredType", ["texto", "numero", "data", "email", "telefone", "whatsapp", "url", "instagram", "facebook"]).default("texto").notNull(),
    columnOrder: int("columnOrder").default(0).notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    aliases: json("aliases").$type<string[]>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("field_definitions_user_key_unique").on(table.userId, table.normalizedKey),
    index("field_definitions_user_order_idx").on(table.userId, table.columnOrder),
  ]
);

export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", crmStatuses).default("Novo").notNull(),
    description: text("description"),
    followUpAt: timestamp("followUpAt"),
    lastContactAt: timestamp("lastContactAt"),
    lostReason: text("lostReason"),
    servicesOfInterest: json("servicesOfInterest").$type<string[]>(),
    customFields: json("customFields").$type<Record<string, string>>().notNull(),
    sourceImportId: int("sourceImportId").references(() => imports.id, { onDelete: "set null" }),
    sourceSheet: varchar("sourceSheet", { length: 255 }),
    originalRowNumber: int("originalRowNumber"),
    dedupeKey: varchar("dedupeKey", { length: 600 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("leads_user_updated_idx").on(table.userId, table.updatedAt),
    index("leads_user_status_idx").on(table.userId, table.status),
    index("leads_user_import_idx").on(table.userId, table.sourceImportId),
    index("leads_user_dedupe_idx").on(table.userId, table.dedupeKey),
    index("leads_user_followup_idx").on(table.userId, table.followUpAt),
  ]
);

export const contacts = mysqlTable(
  "contacts",
  {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    type: mysqlEnum("type", contactTypes).default("outro").notNull(),
    value: text("value").notNull(),
    note: text("note"),
    isPrimary: boolean("isPrimary").default(false).notNull(),
    source: mysqlEnum("source", ["importado", "manual"]).default("manual").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("contacts_user_lead_idx").on(table.userId, table.leadId), index("contacts_user_type_idx").on(table.userId, table.type)]
);

export const notes = mysqlTable(
  "notes",
  {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("notes_user_lead_created_idx").on(table.userId, table.leadId, table.createdAt)]
);

export const activities = mysqlTable(
  "activities",
  {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    message: text("message").notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("activities_user_lead_created_idx").on(table.userId, table.leadId, table.createdAt)]
);

export const electionCollections = mysqlTable(
  "electionCollections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 1200 }).notNull(),
    sourceStatus: mysqlEnum("sourceStatus", ["disponivel", "indisponivel", "processado", "falhou"]).default("disponivel").notNull(),
    processStatus: mysqlEnum("processStatus", ["pendente", "em_processamento", "concluida", "incompleta", "falhou"]).default("pendente").notNull(),
    instagramVerificationTaskUid: varchar("instagramVerificationTaskUid", { length: 65 }),
    dataCutoffAt: timestamp("dataCutoffAt"),
    processedAt: timestamp("processedAt"),
    totalCandidates: int("totalCandidates").default(0).notNull(),
    instagramCheckedCount: int("instagramCheckedCount").default(0).notNull(),
    instagramPendingCount: int("instagramPendingCount").default(0).notNull(),
    verifiedInstagramCount: int("verifiedInstagramCount").default(0).notNull(),
    probableInstagramCount: int("probableInstagramCount").default(0).notNull(),
    notFoundInstagramCount: int("notFoundInstagramCount").default(0).notNull(),
    officialTotals: json("officialTotals").$type<Record<string, number>>(),
    summary: json("summary").$type<Record<string, unknown>>(),
    errorReport: json("errorReport").$type<Array<{ stage: string; reason: string }>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("election_collections_user_created_idx").on(table.userId, table.createdAt),
    index("election_collections_instagram_task_idx").on(table.instagramVerificationTaskUid),
  ]
);

export const electionCandidates = mysqlTable(
  "electionCandidates",
  {
    id: int("id").autoincrement().primaryKey(),
    collectionId: int("collectionId").notNull().references(() => electionCollections.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    officialCandidateId: varchar("officialCandidateId", { length: 128 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    cargo: varchar("cargo", { length: 120 }).notNull(),
    candidateName: varchar("candidateName", { length: 500 }).notNull(),
    ballotName: varchar("ballotName", { length: 500 }),
    candidateNumber: varchar("candidateNumber", { length: 32 }),
    party: varchar("party", { length: 120 }),
    federation: varchar("federation", { length: 255 }),
    candidateStatus: varchar("candidateStatus", { length: 180 }),
    ballotAvailability: mysqlEnum("ballotAvailability", ["Sim", "Não", "Em análise"]).default("Em análise").notNull(),
    city: varchar("city", { length: 255 }),
    declaredProfiles: json("declaredProfiles").$type<string[]>(),
    primaryInstagram: varchar("primaryInstagram", { length: 1200 }),
    secondaryInstagrams: json("secondaryInstagrams").$type<string[]>(),
    instagramVerification: mysqlEnum("instagramVerification", ["Verificado", "Provável — requer revisão", "Não localizado"]).default("Não localizado").notNull(),
    verificationSignals: json("verificationSignals").$type<Array<{ signal: string; source: string; url?: string }>>(),
    sourceRecord: json("sourceRecord").$type<Record<string, string>>().notNull(),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("election_candidate_collection_official_unique").on(table.collectionId, table.officialCandidateId),
    index("election_candidates_user_filter_idx").on(table.userId, table.state, table.cargo),
    index("election_candidates_user_party_idx").on(table.userId, table.party),
    index("election_candidates_user_instagram_idx").on(table.userId, table.instagramVerification),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type ImportRecord = typeof imports.$inferSelect;
export type ElectionCollection = typeof electionCollections.$inferSelect;
export type ElectionCandidate = typeof electionCandidates.$inferSelect;
