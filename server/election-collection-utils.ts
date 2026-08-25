export const ELECTION_INSERT_BATCH_SIZE = 50;

export function collectionFailureForAudit(error: unknown): string {
  const message = error instanceof Error ? error.message : "Falha desconhecida ao processar a coleta oficial.";
  if (/Failed query:\s*insert into `electionCandidates`/i.test(message)) {
    return "A persistência de um lote de candidaturas foi interrompida pelo banco de dados. A coleta foi marcada como falha auditável e pode ser repetida com lotes menores.";
  }
  return message.slice(0, 700);
}

export function collectionInterruptedAudit() {
  return [{
    stage: "requisicao_interrompida",
    reason: "A coleta oficial foi interrompida antes de concluir a persistência. Nenhuma candidatura foi marcada como concluída; inicie uma nova coleta para repetir a consulta de forma auditável.",
  }];
}
