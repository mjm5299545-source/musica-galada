import { useEffect, useRef, useState } from "react";
import { loadLocalAudio, saveLocalAudio } from "../data/localAudioStore";
import { audioDuration, localAudioId } from "../utils/localAudio";
import type { Track } from "../types";

const STORAGE_WARNING = "Não foi possível salvar ou recuperar seus áudios neste navegador. Os arquivos abertos continuam disponíveis nesta sessão. Verifique o espaço e as permissões de armazenamento.";

export function useLocalTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [storageError, setStorageError] = useState("");
  const urls = useRef(new Map<string, string>());
  const savedIds = useRef(new Set<string>());
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadLocalAudio().then(records => {
      if (cancelled) return;
      const restored = records.map(({ id, track, file }) => {
        const src = URL.createObjectURL(file);
        urls.current.set(id, src);
        savedIds.current.add(id);
        return { ...track, id, src, source: "local" as const };
      });
      setTracks(restored);
    }).catch(() => {
      if (!cancelled) setStorageError(STORAGE_WARNING);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    const ownedUrls = urls.current;
    return () => {
      cancelled = true;
      ownedUrls.forEach(url => URL.revokeObjectURL(url));
      ownedUrls.clear();
    };
  }, []);

  async function importFiles(files: File[]) {
    if (busy.current || loading) return { opened: 0, saved: 0, rejected: 0 };
    busy.current = true;
    setImporting(true);
    const imported: Track[] = [];
    let opened = 0;
    let saved = 0;
    let rejected = Math.max(0, files.length - 30);
    try {
      for (const file of files.slice(0, 30)) {
        if ((!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) || file.size > 100 * 1024 * 1024) {
          rejected++;
          continue;
        }
        const id = localAudioId(file);
        if (urls.current.has(id)) {
          opened++;
          if (savedIds.current.has(id)) saved++;
          continue;
        }
        const src = URL.createObjectURL(file);
        let duration: number;
        try {
          duration = await audioDuration(src);
        } catch {
          URL.revokeObjectURL(src);
          rejected++;
          continue;
        }
        const track: Track = {
          id, title: file.name.replace(/\.[^.]+$/, ""), artist: "Arquivo local",
          album: "Seus arquivos", genre: "Local", duration,
          cover: "/artwork/antes-do-sol.svg", src, source: "local",
        };
        urls.current.set(id, src);
        imported.push(track);
        opened++;
        try {
          await saveLocalAudio(track, file);
          savedIds.current.add(id);
          saved++;
        } catch {
          setStorageError(STORAGE_WARNING);
        }
      }
      setTracks(current => [...current, ...imported]);
      return { opened, saved, rejected };
    } finally {
      busy.current = false;
      setImporting(false);
    }
  }

  return { tracks, loading, importing, storageError, importFiles };
}
