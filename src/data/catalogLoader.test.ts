import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCatalog, parseCatalog, DEFAULT_COVER } from "./catalogLoader";

const ok = { title: "Minha faixa", artist: "Eu", src: "/media/a.mp3", rights: "Obra própria" };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("parseCatalog", () => {
  it("aceita faixa válida e aplica padrões", () => {
    const { tracks, skipped } = parseCatalog({ tracks: [ok] });
    expect(skipped).toEqual([]);
    expect(tracks[0]).toMatchObject({
      id: "catalog-eu-minha-faixa", album: "Single", genre: "Outros",
      duration: 0, cover: DEFAULT_COVER, source: "catalog",
    });
  });
  it("ignora itens sem rights, sem título ou com URL insegura", () => {
    const { tracks, skipped } = parseCatalog({
      tracks: [
        { ...ok, rights: "" },
        { ...ok, title: "" },
        { ...ok, src: "javascript:alert(1)" },
        { ...ok, src: "//evil.com/a.mp3" },
        { ...ok, src: "http://x.com/a.mp3" },
        { ...ok, cover: "data:text/html,x" },
      ],
    });
    expect(tracks).toHaveLength(0);
    expect(skipped).toHaveLength(6);
  });
  it("rejeita ids duplicados e estrutura inválida", () => {
    expect(parseCatalog({ tracks: [ok, ok] }).tracks).toHaveLength(1);
    expect(() => parseCatalog({})).toThrow();
  });
});

describe("fetchCatalog", () => {
  it("404 vira catálogo vazio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    expect((await fetchCatalog()).tracks).toEqual([]);
  });
  it("resposta que não é JSON gera erro claro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    await expect(fetchCatalog()).rejects.toThrow(/JSON/);
  });
});

it("rejects malformed HTTPS, credentials and paths that escape the current host", () => {
  const sources = ["https://", "/\\evil.example/a.mp3", "https://name:password@example.com/a.mp3", "/\n/evil.example/a.mp3"];
  for (const src of sources) {
    expect(parseCatalog({ tracks: [{ ...ok, src }] }).tracks).toHaveLength(0);
  }
  expect(parseCatalog({ tracks: [{ ...ok, src: "https://example.com/a.mp3" }] }).tracks).toHaveLength(1);
});
