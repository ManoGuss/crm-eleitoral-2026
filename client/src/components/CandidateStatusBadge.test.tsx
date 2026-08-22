// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { CandidateStatusBadge } from "./CandidateStatusBadge";

describe("CandidateStatusBadge", () => {
  it("renderiza rótulo e cor para as principais situações oficiais", () => {
    const { rerender } = render(<CandidateStatusBadge status="Deferido" />);
    expect(screen.getByText("Deferido").className).toContain("emerald");

    rerender(<CandidateStatusBadge status="Aguardando julgamento" />);
    expect(screen.getByText("Aguardando julgamento").className).toContain("amber");

    rerender(<CandidateStatusBadge status="Renúncia" />);
    expect(screen.getByText("Renúncia").className).toContain("rose");

    rerender(<CandidateStatusBadge status={null} />);
    expect(screen.getByText("Não publicado").className).toContain("slate");
  });
});
