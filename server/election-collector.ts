import AdmZip from "adm-zip";

export const TSE_CANDIDATES_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
export const TSE_SOCIAL_NETWORKS_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/rede_social_candidato_2026.zip";
export const DIVULGACAND_API_BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";
export const ELECTION_2026_ID = 20322002026;

export const INCLUDED_OFFICES = new Set(["GOVERNADOR", "VICE-GOVERNADOR", "SENADOR", "1º SUPLENTE", "2º SUPLENTE", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL"]);
const STATE_CODES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const OFFICE_CODES = [3, 4, 5, 6, 7, 9, 10];

type CsvRecord = Record<string, string>;
type ApiCandidate = Record<string, unknown>;
type ApiListResponse = { unidadeEleitoral?: { nome?: string }; cargo?: { nome?: string }; candidatos?: ApiCandidate[] };

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim(); }

export function parseDelimitedCsv(content: string, delimiter = ";"): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  const text = content.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted; }
    else if (char === delimiter && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(field); field = ""; if (row.some(value => value !== "")) rows.push(row); row = []; }
    else field += char;
  }
  row.push(field); if (row.some(value => value !== "")) rows.push(row); return rows;
}

export function csvRecords(content: string) { const rows = parseDelimitedCsv(content); const headers = rows.shift()?.map(header => normalize(header)) ?? []; return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? "").trim()]))); }
function first(record: CsvRecord, keys: string[]) { for (const key of keys) { const value = record[normalize(key)]; if (value?.trim()) return value.trim(); } return ""; }
function text(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""; }

function availabilityForStatus(status: string, candidateApto?: unknown) {
  if (candidateApto === true) return "Sim" as const;
  const value = normalize(status);
  if (/INDEFER|RENUN|SUBSTITU|CANCEL|FALECID|NAO APTO/.test(value)) return "Não" as const;
  if (/DEFER/.test(value) && !/RECURSO|SUB JUDICE/.test(value)) return "Sim" as const;
  return "Em análise" as const;
}

function csvFilesInZip(bytes: Buffer) { const zip = new AdmZip(bytes); const entries = zip.getEntries().filter(item => !item.isDirectory && item.entryName.toLowerCase().endsWith(".csv")); if (!entries.length) throw new Error("O arquivo oficial não contém um CSV legível."); return entries.map(entry => entry.getData().toString("latin1")); }
async function downloadOfficialFile(url: string) { const response = await fetch(url, { headers: { "User-Agent": "CRM-Eleitoral-2026/1.0 (public-data-audit)" } }); if (!response.ok) throw new Error(`Fonte oficial indisponível: HTTP ${response.status} em ${url}`); return Buffer.from(await response.arrayBuffer()); }

function sanitizeSource(record: Record<string, unknown>) {
  const blocked = new Set(["NR_CPF_CANDIDATO", "NR_TITULO_ELEITORAL_CANDIDATO", "cpf", "tituloEleitor"]);
  return Object.fromEntries(Object.entries(record).filter(([key]) => !blocked.has(key)).map(([key, value]) => [key, text(value)]));
}

export type OfficialElectionCandidate = {
  officialCandidateId: string; state: string; cargo: string; candidateName: string; ballotName: string | null; candidateNumber: string | null; party: string | null; federation: string | null; candidateStatus: string | null; ballotAvailability: "Sim" | "Não" | "Em análise"; city: string | null; declaredProfiles: string[]; primaryInstagram: string | null; secondaryInstagrams: string[]; instagramVerification: "Verificado" | "Provável — requer revisão" | "Não localizado"; verificationSignals: Array<{ signal: string; source: string; url?: string }>; sourceRecord: Record<string, string>;
};
export type OfficialLoadResult = { candidates: OfficialElectionCandidate[]; officialTotals: Record<string, number>; sourceUrl: string; sourceMode: "arquivo_tse" | "api_divulgacand"; notes: string[] };

function buildCandidateFromCsv(record: CsvRecord, declaredProfiles: string[]): OfficialElectionCandidate | null {
  const cargo = first(record, ["DS_CARGO"]); const officialCandidateId = first(record, ["SQ_CANDIDATO"]); const state = first(record, ["SG_UF"]); const candidateName = first(record, ["NM_CANDIDATO"]);
  if (!INCLUDED_OFFICES.has(normalize(cargo)) || !officialCandidateId || !state || !candidateName) return null;
  const instagramProfiles = declaredProfiles.filter(profile => /(^|\.)instagram\.com\//i.test(profile) || /instagram/i.test(profile)); const primaryInstagram = instagramProfiles[0] ?? null; const candidateStatus = first(record, ["DS_SITUACAO_CANDIDATURA", "DS_SITUACAO"]);
  return { officialCandidateId, state, cargo, candidateName, ballotName: first(record, ["NM_URNA_CANDIDATO"]) || null, candidateNumber: first(record, ["NR_CANDIDATO"]) || null, party: first(record, ["SG_PARTIDO", "NM_PARTIDO"]) || null, federation: first(record, ["NM_FEDERACAO", "DS_FEDERACAO"]) || null, candidateStatus: candidateStatus || null, ballotAvailability: availabilityForStatus(candidateStatus), city: first(record, ["NM_UE", "NM_MUNICIPIO"]) || null, declaredProfiles, primaryInstagram, secondaryInstagrams: instagramProfiles.slice(1), instagramVerification: primaryInstagram ? "Verificado" : "Não localizado", verificationSignals: primaryInstagram ? [{ signal: "Rede social declarada na base oficial do TSE", source: TSE_SOCIAL_NETWORKS_URL, url: primaryInstagram }] : [], sourceRecord: sanitizeSource(record) };
}

async function loadFromOfficialFiles(): Promise<OfficialLoadResult> {
  const candidateFile = await downloadOfficialFile(TSE_CANDIDATES_URL);
  let socialRows: CsvRecord[] = []; const notes: string[] = [];
  try { socialRows = csvFilesInZip(await downloadOfficialFile(TSE_SOCIAL_NETWORKS_URL)).flatMap(csvRecords); } catch (error) { notes.push(error instanceof Error ? error.message : "Arquivo oficial de redes sociais indisponível."); }
  const socialByCandidate = new Map<string, string[]>();
  socialRows.forEach(row => { const candidateId = first(row, ["SQ_CANDIDATO"]); const network = first(row, ["DS_REDE_SOCIAL", "NM_REDE_SOCIAL", "DS_URL"]); if (candidateId && network) socialByCandidate.set(candidateId, [...(socialByCandidate.get(candidateId) ?? []), network]); });
  const candidates = csvFilesInZip(candidateFile).flatMap(csvRecords).map(record => buildCandidateFromCsv(record, Array.from(new Set(socialByCandidate.get(first(record, ["SQ_CANDIDATO"])) ?? [])))).filter((candidate): candidate is OfficialElectionCandidate => Boolean(candidate));
  const officialTotals = Object.fromEntries(Object.entries(candidates.reduce<Record<string, number>>((totals, candidate) => ({ ...totals, [candidate.cargo]: (totals[candidate.cargo] ?? 0) + 1 }), {})));
  return { candidates, officialTotals, sourceUrl: TSE_CANDIDATES_URL, sourceMode: "arquivo_tse", notes };
}

function buildCandidateFromApi(candidate: ApiCandidate, state: string, cargo: string, city: string): OfficialElectionCandidate | null {
  const officialCandidateId = text(candidate.id); const candidateName = text(candidate.nomeCompleto); if (!officialCandidateId || !candidateName || !INCLUDED_OFFICES.has(normalize(cargo))) return null;
  const party = candidate.partido && typeof candidate.partido === "object" ? text((candidate.partido as Record<string, unknown>).sigla) : "";
  const candidateStatus = text(candidate.descricaoSituacao); const availability = availabilityForStatus(candidateStatus, candidate.candidatoApto);
  return { officialCandidateId, state, cargo, candidateName, ballotName: text(candidate.nomeUrna) || null, candidateNumber: text(candidate.numero) || null, party: party || null, federation: text(candidate.nomeColigacao) || null, candidateStatus: candidateStatus || null, ballotAvailability: availability, city: text(candidate.localCandidatura) || city || null, declaredProfiles: [], primaryInstagram: null, secondaryInstagrams: [], instagramVerification: "Não localizado", verificationSignals: [], sourceRecord: sanitizeSource({ id: candidate.id, nomeUrna: candidate.nomeUrna, nomeCompleto: candidate.nomeCompleto, numero: candidate.numero, descricaoSituacao: candidate.descricaoSituacao, descricaoTotalizacao: candidate.descricaoTotalizacao, candidatoApto: candidate.candidatoApto, ufCandidatura: candidate.ufCandidatura, partido: party, nomeColigacao: candidate.nomeColigacao, cargo, state }) };
}

async function loadFromDivulgaCandApi(): Promise<OfficialLoadResult> {
  const jobs = STATE_CODES.flatMap(state => OFFICE_CODES.map(cargoCode => ({ state, cargoCode })));
  const notes: string[] = []; const candidates: OfficialElectionCandidate[] = [];
  for (let start = 0; start < jobs.length; start += 8) {
    const batch = jobs.slice(start, start + 8);
    const responses = await Promise.all(batch.map(async job => {
      const url = `${DIVULGACAND_API_BASE}/candidatura/listar/2026/${job.state}/${ELECTION_2026_ID}/${job.cargoCode}/candidatos`;
      const response = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "CRM-Eleitoral-2026/1.0 (public-data-audit)" } });
      if (!response.ok) { notes.push(`API indisponível para ${job.state}, cargo ${job.cargoCode}: HTTP ${response.status}`); return null; }
      return response.json() as Promise<ApiListResponse>;
    }));
    responses.forEach((payload, index) => { if (!payload?.cargo?.nome) return; const job = batch[index]; const cargo = payload.cargo.nome; const city = payload.unidadeEleitoral?.nome ?? ""; (payload.candidatos ?? []).forEach(item => { const parsed = buildCandidateFromApi(item, job.state, cargo, city); if (parsed) candidates.push(parsed); }); });
  }
  const deduplicated = Array.from(new Map(candidates.map(candidate => [candidate.officialCandidateId, candidate])).values());
  const officialTotals = deduplicated.reduce<Record<string, number>>((totals, candidate) => ({ ...totals, [candidate.cargo]: (totals[candidate.cargo] ?? 0) + 1 }), {});
  return { candidates: deduplicated, officialTotals, sourceUrl: `${DIVULGACAND_API_BASE}/candidatura/listar/2026/{UF}/${ELECTION_2026_ID}/{cargo}/candidatos`, sourceMode: "api_divulgacand", notes };
}

export async function loadOfficial2026Candidates(): Promise<OfficialLoadResult> {
  try {
    const archive = await loadFromOfficialFiles();
    if (new Set(archive.candidates.map(candidate => candidate.state)).size >= STATE_CODES.length) return archive;
    archive.notes.push(`O arquivo oficial retornou somente ${new Set(archive.candidates.map(candidate => candidate.state)).size} unidade(s) eleitoral(is); aplicada consulta complementar pela API oficial.`);
    const fallback = await loadFromDivulgaCandApi(); return { ...fallback, notes: [...archive.notes, ...fallback.notes] };
  } catch (error) {
    const fallback = await loadFromDivulgaCandApi(); return { ...fallback, notes: [error instanceof Error ? error.message : "Arquivo oficial indisponível.", ...fallback.notes] };
  }
}
