export type ElectionCollectionSnapshot = { id: number; totalCandidates: number; processStatus: string; createdAt: Date };

export function selectDisplayCollection<T extends ElectionCollectionSnapshot>(collections: T[]): T | undefined {
  return collections.find(collection => collection.totalCandidates > 0 && collection.processStatus !== "em_processamento")
    ?? collections.find(collection => collection.totalCandidates > 0)
    ?? collections[0];
}

export function findInterruptedEmptyCollection<T extends ElectionCollectionSnapshot>(collections: T[], displayed?: T): T | undefined {
  return collections.find(collection => collection.id !== displayed?.id && collection.totalCandidates === 0 && collection.processStatus === "em_processamento" && (!displayed || collection.createdAt > displayed.createdAt));
}
