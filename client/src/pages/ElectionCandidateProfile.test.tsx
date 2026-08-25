// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { FavoriteTrackingPanel } from "./ElectionCandidateProfile";

describe("FavoriteTrackingPanel", () => {
  it("envia status, datas e observação editados ao salvar o acompanhamento", () => {
    const onSave = vi.fn();
    render(<FavoriteTrackingPanel favorite={{ status: "Novo", lastContactAt: null, followUpAt: null, note: null }} saving={false} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Status comercial"), { target: { value: "Interessado" } });
    fireEvent.change(screen.getByLabelText("Último contato"), { target: { value: "2026-08-25T09:30" } });
    fireEvent.change(screen.getByLabelText("Próximo follow-up"), { target: { value: "2026-08-29T14:00" } });
    fireEvent.change(screen.getByLabelText("Observação comercial"), { target: { value: "Retornar com proposta de conteúdo." } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar acompanhamento" }));

    expect(onSave).toHaveBeenCalledWith({ status: "Interessado", lastContactAt: new Date("2026-08-25T09:30").getTime(), followUpAt: new Date("2026-08-29T14:00").getTime(), note: "Retornar com proposta de conteúdo." });
  });
});
