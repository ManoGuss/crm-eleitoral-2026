import { candidateStatusPresentation } from "@/lib/election-candidate-status";
import React from "react";

export function CandidateStatusBadge({ status }: { status: string | null }) {
  const presentation = candidateStatusPresentation(status);
  return <span className={`inline-flex max-w-[152px] rounded-full border px-2 py-1 text-[10px] font-medium leading-tight ${presentation.tone}`}>{presentation.label}</span>;
}
