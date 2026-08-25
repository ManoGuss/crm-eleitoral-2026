// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({
  profile: null as any,
  setFavorite: vi.fn(),
  updateFavorite: vi.fn(),
  invalidateProfile: vi.fn(),
  invalidateList: vi.fn(),
}));

vi.mock("@/components/CrmShell", () => ({ CrmShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ crm: { electionResearch: { candidateProfile: { invalidate: controls.invalidateProfile }, listCandidates: { invalidate: controls.invalidateList } } } }),
    crm: {
      electionResearch: {
        candidateProfile: { useQuery: () => ({ data: controls.profile, isLoading: false }) },
        prepareContact: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        updateInteraction: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        setFavorite: { useMutation: () => ({ mutate: controls.setFavorite, isPending: false }) },
        updateFavorite: { useMutation: () => ({ mutate: controls.updateFavorite, isPending: false }) },
      },
    },
  },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/candidaturas/1", vi.fn()] }));

import ElectionCandidateProfile from "./ElectionCandidateProfile";

const candidate = { id: 1, state: "SP", cargo: "Deputado Federal", candidateName: "Candidatura de Teste", ballotName: "Teste", party: "PT", officialCandidateId: "ABC-1", candidateStatus: "Deferido", instagramVerification: "Não localizado", declaredProfiles: null, primaryInstagram: null, publicContacts: null, ballotAvailability: "Sim", candidateNumber: "1313", federation: null };

describe("fluxo de favorito no perfil da candidatura", () => {
  beforeEach(() => {
    controls.setFavorite.mockReset();
    controls.updateFavorite.mockReset();
    controls.invalidateProfile.mockReset();
    controls.invalidateList.mockReset();
    controls.profile = { candidate, favorite: null, reviews: [], interactions: [] };
  });

  it("permite favoritar, exibe o painel e salva o acompanhamento em estado controlado", () => {
    const view = render(<ElectionCandidateProfile id={1} />);
    expect(screen.getByText("Acompanhe esta candidatura")).toBeTruthy();
    fireEvent.click(screen.getByTitle("Adicionar aos favoritos"));
    expect(controls.setFavorite).toHaveBeenCalledWith({ candidateId: 1, favorite: true });

    controls.profile = { ...controls.profile, favorite: { id: 10, candidateId: 1, userId: 99, status: "Novo", lastContactAt: null, followUpAt: null, note: null, updatedAt: new Date("2026-08-25T00:00:00Z") } };
    view.rerender(<ElectionCandidateProfile id={1} />);
    expect(screen.getByText("Acompanhamento comercial")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Status comercial"), { target: { value: "Interessado" } });
    fireEvent.change(screen.getByLabelText("Observação comercial"), { target: { value: "Enviar proposta até sexta." } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar acompanhamento" }));
    expect(controls.updateFavorite).toHaveBeenCalledWith(expect.objectContaining({ candidateId: 1, status: "Interessado", note: "Enviar proposta até sexta." }));

    fireEvent.click(screen.getByTitle("Remover dos favoritos"));
    expect(controls.setFavorite).toHaveBeenCalledWith({ candidateId: 1, favorite: false });
  });
});
