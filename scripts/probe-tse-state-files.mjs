import AdmZip from "adm-zip";

const states = ["AC", "ES", "SP"];
for (const state of states) {
  const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026_${state}.zip`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "CRM-Eleitoral-2026/1.0 (public-data-audit)" } });
    const bytes = Buffer.from(await response.arrayBuffer());
    const entries = response.ok ? new AdmZip(bytes).getEntries().map(entry => entry.entryName).slice(0, 3) : [];
    console.log(JSON.stringify({ state, status: response.status, bytes: bytes.length, entries }));
  } catch (error) {
    console.log(JSON.stringify({ state, error: error instanceof Error ? error.message : "unknown" }));
  }
}
