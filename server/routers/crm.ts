import * as XLSX from "xlsx";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, importSheets, imports } from "../../drizzle/schema";
import {
  addContactForUser,
  addNoteForUser,
  createActivitiesInBatches,
  createContactsInBatches,
  createImportForUser,
  createImportSheetsForUser,
  createLeadForUser,
  deleteImportForUser,
  deleteContactForUser,
  createLeadsInBatches,
  deleteLeadForUser,
  deleteNoteForUser,
  ensureFieldDefinitions,
  findExistingLeadsByDedupeKeys,
  getDashboardForUser,
  getDb,
  getImportForUser,
  getLeadDetail,
  getLeadsBySourceImport,
  listFieldDefinitions,
  listImportsForUser,
  listLeadsForUser,
  updateImportForUser,
  updateLeadForUser,
} from "../db";
import {
  CRM_STATUSES,
  dedupeKeyForLead,
  extractContacts,
  inferFieldType,
  isCrmStatus,
  mergeNonEmptyFields,
  normalizeHeader,
} from "../crm-utils";
import { storageGetSignedUrl, storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

const statusSchema = z.enum(CRM_STATUSES);
const contactTypeSchema = z.enum(["whatsapp", "telefone", "email", "instagram", "facebook", "site", "outro"]);
const customFieldsSchema = z.record(z.string(), z.string());

function asDate(value?: number | null) {
  return value ? new Date(value) : null;
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function uniqueHeaders(values: unknown[]) {
  const used = new Map<string, number>();
  return values.map((value, index) => {
    const base = textValue(value) || `Coluna sem nome ${index + 1}`;
    const current = used.get(base) ?? 0;
    used.set(base, current + 1);
    return current ? `${base} (${current + 1})` : base;
  });
}

type ImportedSheetRow = { record: Record<string, string>; originalRowNumber: number };

function rowsForSheet(workbook: XLSX.WorkBook, sheetName: string, headerRow: number, mappedHeaders?: string[]): { headers: string[]; rows: ImportedSheetRow[] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false, blankrows: false });
  const sourceHeaders = matrix[headerRow - 1] ?? [];
  const headers = mappedHeaders?.length === sourceHeaders.length ? mappedHeaders : uniqueHeaders(sourceHeaders);
  const rows = matrix.slice(headerRow).map((values, rowOffset) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = textValue(values[index]);
    });
    return { record, originalRowNumber: headerRow + rowOffset + 1 };
  }).filter(row => Object.values(row.record).some(value => value.trim()));
  return { headers, rows };
}

function firstNonEmptyHeaderRow(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return 1;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false, blankrows: false });
  const index = matrix.findIndex(row => row.some(value => textValue(value)));
  return index < 0 ? 1 : index + 1;
}

function importedStatus(customFields: Record<string, string>) {
  const entry = Object.entries(customFields).find(([header]) => normalizeHeader(header) === "status");
  return entry && isCrmStatus(entry[1]) ? entry[1] : "Novo";
}

const acceptedExtensions = ["xlsx", "xls", "csv"];

export const crmRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => getDashboardForUser(ctx.user.id)),
  fieldDefinitions: protectedProcedure.query(({ ctx }) => listFieldDefinitions(ctx.user.id)),
  leads: router({
    list: protectedProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(10).max(100).default(25),
      status: statusSchema.optional(),
      query: z.string().max(200).optional(),
      sourceImportId: z.number().int().positive().optional(),
      followUp: z.enum(["overdue", "upcoming"]).optional(),
    })).query(({ ctx, input }) => listLeadsForUser(ctx.user.id, input)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const detail = await getLeadDetail(ctx.user.id, input.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado." });
      return detail;
    }),
    create: protectedProcedure.input(z.object({
      status: statusSchema.default("Novo"),
      description: z.string().max(20000).nullable().optional(),
      followUpAt: z.number().int().nullable().optional(),
      lastContactAt: z.number().int().nullable().optional(),
      lostReason: z.string().max(2000).nullable().optional(),
      servicesOfInterest: z.array(z.string().max(100)).max(10).optional(),
      customFields: customFieldsSchema,
    })).mutation(async ({ ctx, input }) => {
      const definitions = Object.entries(input.customFields).map(([displayName, value], index) => ({
        displayName,
        normalizedKey: normalizeHeader(displayName),
        inferredType: inferFieldType(displayName, [value]),
        columnOrder: index,
      }));
      await ensureFieldDefinitions(ctx.user.id, definitions);
      return createLeadForUser(ctx.user.id, {
        ...input,
        followUpAt: asDate(input.followUpAt),
        lastContactAt: asDate(input.lastContactAt),
        dedupeKey: dedupeKeyForLead(input.customFields),
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      status: statusSchema.optional(),
      description: z.string().max(20000).nullable().optional(),
      followUpAt: z.number().int().nullable().optional(),
      lastContactAt: z.number().int().nullable().optional(),
      lostReason: z.string().max(2000).nullable().optional(),
      servicesOfInterest: z.array(z.string().max(100)).max(10).optional(),
      customFields: customFieldsSchema.optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, followUpAt, lastContactAt, customFields, ...values } = input;
      if (customFields) {
        await ensureFieldDefinitions(ctx.user.id, Object.entries(customFields).map(([displayName, value], index) => ({
          displayName,
          normalizedKey: normalizeHeader(displayName),
          inferredType: inferFieldType(displayName, [value]),
          columnOrder: index,
        })));
      }
      const updateValues = {
        ...values,
        ...(followUpAt !== undefined ? { followUpAt: asDate(followUpAt) } : {}),
        ...(lastContactAt !== undefined ? { lastContactAt: asDate(lastContactAt) } : {}),
        ...(customFields ? { customFields } : {}),
      };
      const detail = await updateLeadForUser(ctx.user.id, id, updateValues, { type: "lead_updated", message: "Informações do lead atualizadas." });
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado." });
      return detail;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await deleteLeadForUser(ctx.user.id, input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado." });
      return { success: true };
    }),
    updateStatusBulk: protectedProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), status: statusSchema })).mutation(async ({ ctx, input }) => {
      const updated = await Promise.all(input.ids.map(id => updateLeadForUser(ctx.user.id, id, { status: input.status }, { type: "status_changed", message: `Status alterado para ${input.status}.` })));
      return { updated: updated.filter(Boolean).length };
    }),
    contacts: router({
      create: protectedProcedure.input(z.object({ leadId: z.number().int().positive(), name: z.string().max(255).nullable().optional(), type: contactTypeSchema, value: z.string().min(1).max(2000), note: z.string().max(2000).nullable().optional(), isPrimary: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
        const contact = await addContactForUser(ctx.user.id, input.leadId, input);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado." });
        return contact;
      }),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ success: await deleteContactForUser(ctx.user.id, input.id) })),
    }),
    notes: router({
      create: protectedProcedure.input(z.object({ leadId: z.number().int().positive(), content: z.string().min(1).max(20000) })).mutation(async ({ ctx, input }) => {
        const note = await addNoteForUser(ctx.user.id, input.leadId, input.content);
        if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado." });
        return note;
      }),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ success: await deleteNoteForUser(ctx.user.id, input.id) })),
    }),
  }),
  imports: router({
    list: protectedProcedure.query(({ ctx }) => listImportsForUser(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const result = await getImportForUser(ctx.user.id, input.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Importação não encontrada." });
      return result;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive(), deleteLinkedLeads: z.boolean() })).mutation(async ({ ctx, input }) => {
      const deleted = await deleteImportForUser(ctx.user.id, input.id, input.deleteLinkedLeads);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Importação não encontrada." });
      return { success: true };
    }),
    analyze: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(500),
      mimeType: z.string().max(160),
      fileSize: z.number().int().positive().max(50 * 1024 * 1024),
      dataBase64: z.string().min(10).max(70 * 1024 * 1024),
    })).mutation(async ({ ctx, input }) => {
      const extension = input.fileName.split(".").pop()?.toLowerCase();
      if (!extension || !acceptedExtensions.includes(extension)) throw new TRPCError({ code: "BAD_REQUEST", message: "Envie um arquivo XLSX, XLS ou CSV." });
      const fileBuffer = Buffer.from(input.dataBase64, "base64");
      if (fileBuffer.length !== input.fileSize) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível validar o arquivo enviado." });
      const { key, url } = await storagePut(`crm-eleitoral/${ctx.user.id}/imports/${input.fileName}`, fileBuffer, input.mimeType || "application/octet-stream");
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(fileBuffer, { type: "buffer", raw: false, cellDates: false, dense: true });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível ler a planilha. Verifique o arquivo e tente novamente." });
      }
      const sheetSummaries = workbook.SheetNames.map(name => {
        const headerRow = firstNonEmptyHeaderRow(workbook, name);
        const { headers, rows } = rowsForSheet(workbook, name, headerRow);
        return { name, headerRow, totalRows: rows.length, headers, previewRows: rows.slice(0, 8).map(row => row.record), isSelected: name.toLowerCase() === "candidatos" };
      });
      const preferredIndex = sheetSummaries.findIndex(sheet => sheet.isSelected);
      if (preferredIndex === -1) {
        const largest = sheetSummaries.reduce((best, sheet, index) => sheet.totalRows > (sheetSummaries[best]?.totalRows ?? -1) ? index : best, 0);
        if (sheetSummaries[largest]) sheetSummaries[largest].isSelected = true;
      }
      const importId = await createImportForUser(ctx.user.id, {
        fileName: input.fileName,
        fileKey: key,
        fileUrl: url,
        mimeType: input.mimeType || "application/octet-stream",
        fileSize: input.fileSize,
        status: "analisando",
        sheetCount: sheetSummaries.length,
        totalRows: sheetSummaries.reduce((sum, sheet) => sum + sheet.totalRows, 0),
        metadata: { originalFileName: input.fileName },
      });
      await createImportSheetsForUser(ctx.user.id, sheetSummaries.map(sheet => ({
        importId,
        name: sheet.name,
        isSelected: sheet.isSelected,
        headerRow: sheet.headerRow,
        totalRows: sheet.totalRows,
        columnNames: sheet.headers,
        previewRows: sheet.previewRows,
      })));
      return { importId, fileName: input.fileName, sheetCount: sheetSummaries.length, sheets: sheetSummaries };
    }),
    confirm: protectedProcedure.input(z.object({
      importId: z.number().int().positive(),
      strategy: z.enum(["create_all", "ignore_duplicates", "update_existing"]),
      sheets: z.array(z.object({ name: z.string().min(1), headerRow: z.number().int().min(1), columnNames: z.array(z.string().min(1)).min(1), isSelected: z.boolean() })).min(1),
    })).mutation(async ({ ctx, input }) => {
      const importDetail = await getImportForUser(ctx.user.id, input.importId);
      if (!importDetail) throw new TRPCError({ code: "NOT_FOUND", message: "Importação não encontrada." });
      const selected = input.sheets.filter(sheet => sheet.isSelected);
      if (!selected.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione pelo menos uma aba para importar." });
      await updateImportForUser(ctx.user.id, input.importId, { status: "em_processamento", metadata: { ...(importDetail.import.metadata ?? {}), strategy: input.strategy, selectedSheets: selected.map(sheet => sheet.name) } });
      try {
        const signedUrl = await storageGetSignedUrl(importDetail.import.fileKey);
        const fileResponse = await fetch(signedUrl);
        if (!fileResponse.ok) throw new Error("Falha ao recuperar o arquivo original.");
        const workbook = XLSX.read(Buffer.from(await fileResponse.arrayBuffer()), { type: "buffer", raw: false, cellDates: false, dense: true });
        const preparedRows = selected.flatMap(sheet => {
          const parsed = rowsForSheet(workbook, sheet.name, sheet.headerRow, uniqueHeaders(sheet.columnNames));
          return parsed.rows.map(row => ({ ...row, sourceSheet: sheet.name }));
        });
        const definitionMap = new Map<string, { displayName: string; samples: string[]; order: number }>();
        preparedRows.forEach(row => Object.entries(row.record).forEach(([displayName, value], order) => {
          const normalizedKey = normalizeHeader(displayName);
          const current = definitionMap.get(normalizedKey) ?? { displayName, samples: [], order };
          if (current.samples.length < 10 && value) current.samples.push(value);
          definitionMap.set(normalizedKey, current);
        }));
        const { created: newFields } = await ensureFieldDefinitions(ctx.user.id, Array.from(definitionMap.entries()).map(([normalizedKey, field]) => ({
          normalizedKey,
          displayName: field.displayName,
          inferredType: inferFieldType(field.displayName, field.samples),
          columnOrder: field.order,
        })));
        const candidates = preparedRows.map(row => ({ ...row, dedupeKey: dedupeKeyForLead(row.record) }));
        const existing = await findExistingLeadsByDedupeKeys(ctx.user.id, candidates.map(row => row.dedupeKey).filter((key): key is string => Boolean(key)));
        const existingByKey = new Map(existing.filter(lead => lead.dedupeKey).map(lead => [lead.dedupeKey!, lead]));
        const newRows = [] as typeof candidates;
        const toUpdate = [] as Array<{ id: number; customFields: Record<string, string> }>;
        let skippedDuplicates = 0;
        for (const candidate of candidates) {
          const matched = candidate.dedupeKey ? existingByKey.get(candidate.dedupeKey) : undefined;
          if (matched && input.strategy === "ignore_duplicates") { skippedDuplicates += 1; continue; }
          if (matched && input.strategy === "update_existing") {
            toUpdate.push({ id: matched.id, customFields: mergeNonEmptyFields(matched.customFields, candidate.record) });
            continue;
          }
          newRows.push(candidate);
        }
        await createLeadsInBatches(ctx.user.id, newRows.map(row => ({
          status: importedStatus(row.record),
          customFields: row.record,
          sourceImportId: input.importId,
          sourceSheet: row.sourceSheet,
          originalRowNumber: row.originalRowNumber,
          dedupeKey: row.dedupeKey,
          servicesOfInterest: [],
        })));
        for (const updated of toUpdate) {
          await updateLeadForUser(ctx.user.id, updated.id, { customFields: updated.customFields }, { type: "import_updated", message: "Registro atualizado por nova importação.", metadata: { importId: input.importId } });
        }
        const createdLeads = await getLeadsBySourceImport(ctx.user.id, input.importId);
        const leadBySource = new Map(createdLeads.map(lead => [`${lead.sourceSheet}:${lead.originalRowNumber}`, lead]));
        const contactRows: Array<Omit<typeof contacts.$inferInsert, "userId">> = [];
        const activityRows: Array<{ leadId: number; type: string; message: string; metadata: Record<string, unknown> }> = [];
        newRows.forEach(row => {
          const lead = leadBySource.get(`${row.sourceSheet}:${row.originalRowNumber}`);
          if (!lead) return;
          activityRows.push({ leadId: lead.id, type: "imported", message: "Lead importado de planilha.", metadata: { importId: input.importId, sheet: row.sourceSheet, row: row.originalRowNumber } });
          extractContacts(row.record).forEach((contact, index) => contactRows.push({ leadId: lead.id, type: contact.type, value: contact.value, isPrimary: index === 0, source: "importado" }));
        });
        await Promise.all([createContactsInBatches(ctx.user.id, contactRows), createActivitiesInBatches(ctx.user.id, activityRows)]);
        const summary = { totalRows: preparedRows.length, createdLeads: newRows.length, updatedLeads: toUpdate.length, skippedDuplicates, failedRows: 0, status: "concluida" as const, metadata: { ...(importDetail.import.metadata ?? {}), strategy: input.strategy, selectedSheets: selected.map(sheet => sheet.name), newFields: newFields.map(field => field.displayName) } };
        await updateImportForUser(ctx.user.id, input.importId, summary);
        const db = await getDb();
        if (db) {
          for (const sheet of selected) {
            await db.update(importSheets).set({ isSelected: true, headerRow: sheet.headerRow, columnNames: uniqueHeaders(sheet.columnNames) }).where(and(eq(importSheets.importId, input.importId), eq(importSheets.userId, ctx.user.id), eq(importSheets.name, sheet.name)));
          }
        }
        return { importId: input.importId, fieldsCreated: newFields.map(field => field.displayName), ...summary };
      } catch (error) {
        await updateImportForUser(ctx.user.id, input.importId, { status: "falhou", errorReport: [{ row: 0, reason: error instanceof Error ? error.message : "Falha desconhecida durante a importação." }] });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "A importação foi interrompida. Nenhum resultado parcial será apresentado como concluído." });
      }
    }),
  }),
});
