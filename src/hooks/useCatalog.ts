import { useEffect, useState } from "react";
import type { Track } from "../types";
import { fetchCatalog } from "../data/catalogLoader";

export function useCatalog() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setTracks(result.tracks);
        setSkipped(result.skipped);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Falha ao carregar o catálogo.");
        setStatus("error"); // a demo continua funcionando
      });
    return () => controller.abort();
  }, []);

  return { tracks, skipped, status, error };
}
