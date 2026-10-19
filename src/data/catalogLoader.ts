import type { Track } from "../types";

// Camada de catálogo do usuário: lê /catalog.json (public/catalog.json).
// Hoje é um arquivo estático; no futuro basta trocar CATALOG_URL por uma API.
export const CATALOG_URL = "/catalog.json";
export const DEFAULT_COVER = "/artwork/hero.svg";

export interface CatalogResult {
  tracks: Track[];
  skipped: string[];
}

const isText = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
// Só caminhos do próprio site ("/media/x.mp3") ou https. Bloqueia javascript:, data:, http:.
const isSafeUrl = (value: unknown): value is string => {
  if (!isText(value)) return false;
  const url = value.trim();
  if (Array.from(url).some(character => character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const base = "https://galada.invalid";
    const parsed = new URL(url, base);
    return url.startsWith("/") && !url.startsWith("//")
      ? parsed.origin === base
      : /^https:\/\//i.test(url) && parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};

export function parseCatalog(data: unknown): CatalogResult {
  const list =
    typeof data === "object" && data !== null && "tracks" in data
      ? (data as { tracks: unknown }).tracks
      : null;
  if (!Array.isArray(list)) throw new Error("catalog.json inválido: falta a lista \"tracks\".");

  const tracks: Track[] = [];
  const skipped: string[] = [];
  const ids = new Set<string>();

  list.forEach((raw, index) => {
    const t = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const label = isText(t.title) ? t.title : `item ${index + 1}`;
    if (!isText(t.title) || !isText(t.artist))
      return void skipped.push(`${label}: título e artista são obrigatórios.`);
    if (!isSafeUrl(t.src))
      return void skipped.push(`${label}: "src" deve começar com "/" ou "https://".`);
    if (!isText(t.rights))
      return void skipped.push(`${label}: informe "rights" (ex.: "Obra própria").`);
    if (t.cover !== undefined && !isSafeUrl(t.cover))
      return void skipped.push(`${label}: "cover" inválida.`);

    const slug = isText(t.id)
      ? t.id.trim().replace(/[^a-z0-9-_]/gi, "-")
      : `${t.artist}-${t.title}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
    const id = `catalog-${slug}`;
    if (ids.has(id)) return void skipped.push(`${label}: id duplicado.`);
    ids.add(id);

    tracks.push({
      id,
      title: t.title.trim(),
      artist: t.artist.trim(),
      album: isText(t.album) ? t.album.trim() : "Single",
      genre: isText(t.genre) ? t.genre.trim() : "Outros",
      duration:
        typeof t.duration === "number" && Number.isFinite(t.duration) && t.duration > 0
          ? t.duration
          : 0, // 0 = o player descobre pelos metadados do áudio
      cover: isSafeUrl(t.cover) ? t.cover.trim() : DEFAULT_COVER,
      src: t.src.trim(),
      source: "catalog",
    });
  });
  return { tracks, skipped };
}

export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogResult> {
  const response = await fetch(CATALOG_URL, { cache: "no-cache", signal });
  if (response.status === 404) return { tracks: [], skipped: [] }; // sem arquivo = sem faixas próprias
  if (!response.ok) throw new Error(`Não foi possível carregar o catálogo (HTTP ${response.status}).`);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("catalog.json não é um JSON válido.");
  }
  return parseCatalog(json);
}
