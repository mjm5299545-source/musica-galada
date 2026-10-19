import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLibrary } from "./useLibrary";

const STORAGE_KEY = "galada-library:v1";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useLibrary", () => {
  it("starts with an empty personal library and persists it across mounts", () => {
    const { result, unmount } = renderHook(useLibrary);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.playlists).toEqual([]);
    let playlistId = "";

    act(() => {
      result.current.toggleFavorite("aurora");
      const playlist = result.current.createPlaylist("  Viagem  ");
      expect(playlist?.name).toBe("Viagem");
      playlistId = playlist!.id;
      result.current.togglePlaylistTrack(playlistId, "aurora");
    });
    unmount();

    const reloaded = renderHook(useLibrary);
    expect(reloaded.result.current.favorites).toEqual(["aurora"]);
    expect(reloaded.result.current.playlists).toEqual([
      { id: playlistId, name: "Viagem", trackIds: ["aurora"] },
    ]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({
      version: 1,
      favorites: ["aurora"],
      playlists: [{ id: playlistId, name: "Viagem", trackIds: ["aurora"] }],
    });
  });

  it("recovers from invalid JSON and unsupported schemas", () => {
    for (const saved of ["{ broken", "null", "[]", '{"version":2}', '"text"']) {
      window.localStorage.setItem(STORAGE_KEY, saved);
      const { result, unmount } = renderHook(useLibrary);
      expect(result.current.favorites).toEqual([]);
      expect(result.current.playlists).toEqual([]);
      unmount();
    }
  });

  it("filters malformed stored entries without dropping valid library data", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: ["aurora", null, 42, "", " ", "aurora", "mar"],
        playlists: [
          null,
          { id: 3, name: "Invalid", trackIds: [] },
          { id: "empty", name: "  ", trackIds: [] },
          { id: "missing", name: "Missing tracks" },
          {
            id: "valid",
            name: "  Meu canto  ",
            trackIds: ["aurora", null, "aurora", ""],
          },
          { id: "valid", name: "Duplicate", trackIds: [] },
        ],
      }),
    );
    const { result } = renderHook(useLibrary);
    expect(result.current.favorites).toEqual(["aurora", "mar"]);
    expect(result.current.playlists).toEqual([
      { id: "valid", name: "Meu canto", trackIds: ["aurora"] },
    ]);
  });

  it("keeps working when browser storage is unavailable", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    const { result } = renderHook(useLibrary);
    act(() => {
      result.current.toggleFavorite("aurora");
      result.current.createPlaylist("Meu canto");
    });
    expect(result.current.favorites).toEqual(["aurora"]);
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.storageAvailable).toBe(false);
  });

  it("keeps in-memory changes when persistence exceeds the storage quota", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const { result } = renderHook(useLibrary);
    act(() => result.current.toggleFavorite("aurora"));
    expect(result.current.favorites).toEqual(["aurora"]);
  });

  it("applies rapid sequential mutations and exposes synchronous playlist results", () => {
    const { result } = renderHook(useLibrary);
    act(() => {
      const first = result.current.createPlaylist("Primeira")!;
      const second = result.current.createPlaylist("Segunda")!;
      result.current.toggleFavorite("aurora");
      result.current.toggleFavorite("mar");
      result.current.toggleFavorite("aurora");
      result.current.togglePlaylistTrack(first.id, "aurora");
      result.current.togglePlaylistTrack(first.id, "mar");
      result.current.togglePlaylistTrack(first.id, "aurora");
      expect(result.current.renamePlaylist(first.id, "  Favoritas  ")).toBe(
        true,
      );
      result.current.deletePlaylist(second.id);
      expect(result.current.renamePlaylist(second.id, "Já removida")).toBe(
        false,
      );
    });
    expect(result.current.favorites).toEqual(["mar"]);
    expect(result.current.playlists).toEqual([
      expect.objectContaining({ name: "Favoritas", trackIds: ["mar"] }),
    ]);
  });

  it("rejects empty names and trims and limits playlist names", () => {
    const { result } = renderHook(useLibrary);
    act(() => {
      expect(result.current.createPlaylist("   ")).toBeNull();
      const playlist = result.current.createPlaylist(`  ${"a".repeat(80)}  `)!;
      expect(playlist.name).toHaveLength(60);
      expect(result.current.renamePlaylist(playlist.id, " ")).toBe(false);
      expect(result.current.renamePlaylist("unknown", "Nome")).toBe(false);
    });
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.playlists[0].name).toHaveLength(60);
  });

  it("generates distinct playlist identifiers when UUID generation is unavailable", () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    vi.spyOn(Date, "now").mockReturnValue(123);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { result } = renderHook(useLibrary);
    act(() => {
      const first = result.current.createPlaylist("Primeira")!;
      const second = result.current.createPlaylist("Segunda")!;
      expect(first.id).not.toBe(second.id);
    });
    expect(result.current.playlists).toHaveLength(2);
  });
});
