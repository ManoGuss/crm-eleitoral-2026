import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("configuração da Vercel", () => {
  it("publica o artefato estático e reescreve a API para a origem do CRM", async () => {
    const raw = await readFile(path.resolve(import.meta.dirname, "..", "vercel.json"), "utf8");
    const config = JSON.parse(raw) as { outputDirectory?: string; rewrites?: Array<{ source: string; destination: string }> };
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites).toContainEqual({ source: "/api/:path*", destination: "https://crmelet2026-vabvhm48.manus.space/api/:path*" });
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
