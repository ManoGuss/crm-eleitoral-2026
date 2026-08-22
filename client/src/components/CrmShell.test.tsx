// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { CrmShell } from "./CrmShell";

describe("CrmShell", () => {
  it("renderiza imediatamente o conteúdo do CRM sem consultar autenticação", () => {
    render(<CrmShell title="Visão geral">Conteúdo do CRM</CrmShell>);
    expect(screen.getByText("Conteúdo do CRM")).toBeTruthy();
    expect(screen.getByText("Espaço pessoal")).toBeTruthy();
  });
});
