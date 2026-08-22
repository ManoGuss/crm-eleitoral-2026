// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElectionMessageComposer } from "./ElectionMessageComposer";

const candidate = { candidateName: "Maria da Silva", ballotName: "Maria Silva", cargo: "Deputado Federal", party: "ABC", state: "SP", city: "São Paulo", primaryInstagram: null, declaredProfiles: null, publicContacts: [{ type: "whatsapp" as const, value: "+5511999999999", href: "https://wa.me/5511999999999", source: "declarado" }] };

describe("ElectionMessageComposer", () => {
  beforeEach(() => { Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }); vi.spyOn(window, "open").mockImplementation(() => null); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("abre uma variante personalizada e copia somente após a Clipboard API confirmar", async () => {
    render(<ElectionMessageComposer candidate={candidate} />);
    fireEvent.click(screen.getByTitle("Preparar mensagem de WhatsApp"));
    expect(screen.getByText("Mensagem para Maria Silva")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Variante"), { target: { value: "follow_up" } });
    expect((screen.getByLabelText("Mensagem personalizada") as HTMLTextAreaElement).value).toContain("Retomando nosso contato");
    fireEvent.click(screen.getByText("Copiar mensagem"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Copiada")).toBeTruthy();
  });

  it("abre somente o WhatsApp público validado com a mensagem revisável", () => {
    render(<ElectionMessageComposer candidate={candidate} />);
    fireEvent.click(screen.getByTitle("Preparar mensagem de WhatsApp"));
    fireEvent.click(screen.getByText("Abrir WhatsApp"));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("wa.me/5511999999999"), "_blank", "noopener,noreferrer");
  });

  it("informa quando não existe WhatsApp público para abrir", () => {
    render(<ElectionMessageComposer candidate={{ ...candidate, publicContacts: [] }} />);
    fireEvent.click(screen.getByTitle("Preparar mensagem de WhatsApp"));
    expect((screen.getByText("Sem WhatsApp público") as HTMLButtonElement).disabled).toBe(true);
  });
});
