import { useEffect, useRef, useState } from "react";
import type { Playlist } from "../types";

const STORAGE_KEY = "galada-library:v1";
const MAX_NAME_LENGTH = 60;

interface Library {
  version: 1;
  favorites: string[];
  playlists: Playlist[];
}

const emptyLibrary = (): Library => ({
  version: 1,
  favorites: [],
  playlists: [],
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const normalizeName = (name: string) => name.trim().slice(0, MAX_NAME_LENGTH);
const uniqueIds = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isId))] : [];

function loadLibrary(): Library {
  try {
    if (typeof window === "undefined") return emptyLibrary();
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyLibrary();
    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed) || parsed.version !== 1) return emptyLibrary();

    const playlists: Playlist[] = [];
    const playlistIds = new Set<string>();
    if (Array.isArray(parsed.playlists)) {
      for (const candidate of parsed.playlists) {
        if (
          !isRecord(candidate) ||
          !isId(candidate.id) ||
          typeof candidate.name !== "string" ||
          !Array.isArray(candidate.trackIds) ||
          playlistIds.has(candidate.id)
        )
          continue;
        const name = normalizeName(candidate.name);
        if (!name) continue;
        playlistIds.add(candidate.id);
        playlists.push({
          id: candidate.id,
          name,
          trackIds: uniqueIds(candidate.trackIds),
        });
      }
    }
    return { version: 1, favorites: uniqueIds(parsed.favorites), playlists };
  } catch {
    return emptyLibrary();
  }
}

function createId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Some browser contexts expose crypto but restrict UUID generation.
  }
  return `playlist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${++fallbackSequence}`;
}

let fallbackSequence = 0;

export function useLibrary() {
  const [library, setLibrary] = useState<Library>(loadLibrary);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const latest = useRef(library);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      setStorageAvailable(true);
    } catch {
      // Private browsing, disabled storage, or quota limits must not block listening.
      setStorageAvailable(false);
    }
  }, [library]);

  function updateLibrary(update: (current: Library) => Library) {
    // Keep synchronous operations consistent even before React renders a batch.
    latest.current = update(latest.current);
    setLibrary((current) => update(current));
  }

  function toggleFavorite(id: string) {
    if (!isId(id)) return;
    updateLibrary((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((favorite) => favorite !== id)
        : [...current.favorites, id],
    }));
  }

  function createPlaylist(input: string): Playlist | null {
    const name = normalizeName(input);
    if (!name) return null;
    let id = createId();
    while (latest.current.playlists.some((playlist) => playlist.id === id)) {
      id = `${createId()}-${++fallbackSequence}`;
    }
    const playlist: Playlist = { id, name, trackIds: [] };
    updateLibrary((current) => ({
      ...current,
      playlists: [...current.playlists, playlist],
    }));
    return playlist;
  }

  function renamePlaylist(id: string, input: string): boolean {
    const name = normalizeName(input);
    if (
      !name ||
      !latest.current.playlists.some((playlist) => playlist.id === id)
    )
      return false;
    updateLibrary((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) =>
        playlist.id === id ? { ...playlist, name } : playlist,
      ),
    }));
    return true;
  }

  function deletePlaylist(id: string) {
    updateLibrary((current) => ({
      ...current,
      playlists: current.playlists.filter((playlist) => playlist.id !== id),
    }));
  }

  function togglePlaylistTrack(playlistId: string, trackId: string) {
    if (!isId(trackId)) return;
    updateLibrary((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              trackIds: playlist.trackIds.includes(trackId)
                ? playlist.trackIds.filter((id) => id !== trackId)
                : [...playlist.trackIds, trackId],
            }
          : playlist,
      ),
    }));
  }

  return {
    storageAvailable,
    favorites: library.favorites,
    playlists: library.playlists,
    toggleFavorite,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    togglePlaylistTrack,
  };
}
