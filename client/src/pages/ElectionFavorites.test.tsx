// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyFavorites } from "./ElectionFavorites";

describe("EmptyFavorites", () => {
  afterEach(cleanup);

  it("orienta a favoritar candidaturas quando a lista está vazia", () => {
    render(<EmptyFavorites filtered={false} />);
    expect(screen.getByRole("heading", { name: "Sua lista de favoritos está vazia" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir para Base Eleitoral" }).getAttribute("href")).toBe("/base-eleitoral");
  });

  it("diferencia uma busca sem resultados de uma lista sem favoritos", () => {
    render(<EmptyFavorites filtered />);
    expect(screen.getByRole("heading", { name: "Nenhuma favorita corresponde aos filtros" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ir para Base Eleitoral" })).toBeNull();
  });
});
