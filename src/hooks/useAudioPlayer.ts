import { useCallback, useEffect, useRef, useState } from "react";
import type { RepeatMode, Track } from "../types";

const VOLUME_KEY = "galada.player.volume";
const MUTED_KEY = "galada.player.muted";

function storedVolume() {
  try {
    const value = localStorage.getItem(VOLUME_KEY);
    const number = value === null ? 0.75 : Number(value);
    return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0.75;
  } catch {
    return 0.75;
  }
}

function storedMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Playback remains available when storage is disabled or full.
  }
}

/** Owns the media element. The UI's playing state follows media events. */
export function useAudioPlayer(initialTracks: Track[]) {
  const [queue, setQueue] = useState<Track[]>(() => [...initialTracks]);
  const [currentIndex, setCurrentIndex] = useState(
    initialTracks.length ? 0 : -1,
  );
  const [currentTrack, setCurrentTrack] = useState<Track | null>(
    initialTracks[0] ?? null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialTracks[0]?.duration ?? 0);
  const [volume, setVolume] = useState(storedVolume);
  const [muted, setMuted] = useState(storedMuted);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);
  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  const trackRef = useRef(currentTrack);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const desiredPlayingRef = useRef(false);
  const requestRef = useRef(0);
  const visitedRef = useRef(new Set(initialTracks.length ? [0] : []));
  const historyRef = useRef<number[]>(initialTracks.length ? [0] : []);
  const endedRef = useRef<() => void>(() => {});

  const requestPlayback = useCallback((audio: HTMLAudioElement) => {
    const request = ++requestRef.current;
    desiredPlayingRef.current = true;
    setError(null);
    const failed = (reason: unknown) => {
      if (
        !mountedRef.current ||
        audioRef.current !== audio ||
        requestRef.current !== request
      )
        return;
      desiredPlayingRef.current = false;
      setIsPlaying(false);
      const name =
        typeof reason === "object" && reason !== null && "name" in reason
          ? reason.name
          : undefined;
      if (name === "AbortError") return;
      setError(
        name === "NotAllowedError"
          ? "Clique em reproduzir para permitir o áudio no navegador."
          : "Não foi possível reproduzir esta faixa. Tente outra música.",
      );
    };
    try {
      // Older browsers can return undefined; current browsers return a Promise.
      const pending = audio.play();
      if (pending) void pending.catch(failed);
    } catch (reason) {
      failed(reason);
    }
  }, []);

  const replaceAudio = useCallback(
    (track: Track | null, autoplay: boolean) => {
      ++requestRef.current;
      cleanupRef.current?.();
      cleanupRef.current = null;
      audioRef.current = null;
      desiredPlayingRef.current = autoplay && track !== null;
      setIsPlaying(false);
      setCurrentTime(0);
      durationRef.current = track?.duration ?? 0;
      setDuration(durationRef.current);
      setError(null);
      if (!track || !mountedRef.current) return;

      // A fresh element isolates queued events and play promises from the old source.
      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.volume = volumeRef.current;
      audio.muted = mutedRef.current;
      const active = () => mountedRef.current && audioRef.current === audio;
      const metadata = () => {
        if (!active()) return;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          durationRef.current = audio.duration;
          setDuration(audio.duration);
        }
      };
      const timeupdate = () => {
        if (active())
          setCurrentTime(
            Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
          );
      };
      const play = () => {
        if (active() && desiredPlayingRef.current && !audio.paused)
          setIsPlaying(true);
      };
      const pause = () => {
        if (active() && audio.paused) setIsPlaying(false);
      };
      const ended = () => {
        if (active()) {
          setCurrentTime(audio.currentTime);
          setIsPlaying(false);
          endedRef.current();
        }
      };
      const failed = () => {
        if (!active()) return;
        ++requestRef.current;
        desiredPlayingRef.current = false;
        setIsPlaying(false);
        setError(
          "Não foi possível carregar o áudio desta faixa. Tente outra música.",
        );
      };
      const listeners: [string, EventListener][] = [
        ["loadedmetadata", metadata],
        ["durationchange", metadata],
        ["timeupdate", timeupdate],
        ["play", play],
        ["playing", play],
        ["pause", pause],
        ["ended", ended],
        ["error", failed],
      ];
      listeners.forEach(([event, listener]) =>
        audio.addEventListener(event, listener),
      );
      cleanupRef.current = () => {
        listeners.forEach(([event, listener]) =>
          audio.removeEventListener(event, listener),
        );
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      };
      audio.src = track.src;
      audio.load();
      if (autoplay) requestPlayback(audio);
    },
    [requestPlayback],
  );

  const updateQueue = useCallback((tracks: Track[]) => {
    queueRef.current = tracks;
    setQueue(tracks);
  }, []);

  const selectIndex = useCallback(
    (index: number, autoplay: boolean, remember = true) => {
      const track = queueRef.current[index] ?? null;
      indexRef.current = track ? index : -1;
      trackRef.current = track;
      setCurrentIndex(indexRef.current);
      setCurrentTrack(track);
      if (track) {
        visitedRef.current.add(index);
        if (remember && historyRef.current.at(-1) !== index)
          historyRef.current.push(index);
      }
      replaceAudio(track, autoplay);
    },
    [replaceAudio],
  );

  const stopAtEnd = useCallback(() => {
    desiredPlayingRef.current = false;
    ++requestRef.current;
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const advance = useCallback(
    (natural: boolean) => {
      const tracks = queueRef.current;
      const index = indexRef.current;
      if (!tracks.length || index < 0) return;
      if (natural && repeatRef.current === "one") {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          setCurrentTime(0);
          requestPlayback(audio);
        }
        return;
      }
      let nextIndex: number;
      if (shuffleRef.current) {
        let candidates = tracks
          .map((_, candidate) => candidate)
          .filter((candidate) => !visitedRef.current.has(candidate));
        if (!candidates.length && repeatRef.current === "all") {
          visitedRef.current = new Set([index]);
          candidates = tracks
            .map((_, candidate) => candidate)
            .filter((candidate) => candidate !== index);
          if (!candidates.length) candidates = [index];
        }
        if (!candidates.length) {
          stopAtEnd();
          return;
        }
        nextIndex = candidates[Math.floor(Math.random() * candidates.length)];
      } else if (index + 1 < tracks.length) {
        nextIndex = index + 1;
      } else if (repeatRef.current === "all") {
        nextIndex = 0;
      } else {
        stopAtEnd();
        return;
      }
      selectIndex(nextIndex, natural || desiredPlayingRef.current);
    },
    [requestPlayback, selectIndex, stopAtEnd],
  );

  useEffect(() => {
    endedRef.current = () => advance(true);
  }, [advance]);

  useEffect(() => {
    mountedRef.current = true;
    replaceAudio(trackRef.current, desiredPlayingRef.current);
    return () => {
      mountedRef.current = false;
      ++requestRef.current;
      cleanupRef.current?.();
      cleanupRef.current = null;
      audioRef.current = null;
    };
  }, [replaceAudio]);

  const playTrack = useCallback(
    (track: Track, context?: Track[]) => {
      const tracks = context ? [...context] : [...queueRef.current];
      let index = tracks.findIndex((candidate) => candidate.id === track.id);
      if (index < 0) {
        index = tracks.length;
        tracks.push(track);
      }
      updateQueue(tracks);
      visitedRef.current = new Set([index]);
      historyRef.current = [index];
      if (
        trackRef.current?.id === track.id &&
        trackRef.current.src === track.src &&
        audioRef.current
      ) {
        indexRef.current = index;
        trackRef.current = tracks[index];
        setCurrentIndex(index);
        setCurrentTrack(tracks[index]);
        requestPlayback(audioRef.current);
      } else {
        selectIndex(index, true);
      }
    },
    [requestPlayback, selectIndex, updateQueue],
  );

  const playAtIndex = useCallback(
    (index: number) => {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= queueRef.current.length
      )
        return;
      visitedRef.current = new Set([index]);
      historyRef.current = [index];
      selectIndex(index, true);
    },
    [selectIndex],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (desiredPlayingRef.current || !audio.paused) {
      desiredPlayingRef.current = false;
      ++requestRef.current;
      audio.pause();
      setIsPlaying(false);
    } else {
      requestPlayback(audio);
    }
  }, [requestPlayback]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    const limit = durationRef.current;
    const value = Math.max(0, limit > 0 ? Math.min(limit, seconds) : seconds);
    try {
      audio.currentTime = value;
      setCurrentTime(audio.currentTime);
    } catch {
      // Some browsers cannot seek until the first metadata event.
    }
  }, []);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || indexRef.current < 0) return;
    if (audio.currentTime > 3) {
      seek(0);
      return;
    }
    let index = Math.max(0, indexRef.current - 1);
    if (shuffleRef.current && historyRef.current.length > 1) {
      historyRef.current.pop();
      index = historyRef.current.at(-1) ?? 0;
    } else if (indexRef.current === 0 && repeatRef.current === "all") {
      index = queueRef.current.length - 1;
    }
    selectIndex(index, desiredPlayingRef.current, !shuffleRef.current);
  }, [seek, selectIndex]);

  const changeVolume = useCallback((value: number) => {
    if (!Number.isFinite(value)) return;
    const nextVolume = Math.min(1, Math.max(0, value));
    volumeRef.current = nextVolume;
    setVolume(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
    persist(VOLUME_KEY, String(nextVolume));
    if (nextVolume > 0 && mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
      persist(MUTED_KEY, "false");
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (audioRef.current) audioRef.current.muted = nextMuted;
    persist(MUTED_KEY, String(nextMuted));
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current;
    setShuffle(shuffleRef.current);
    visitedRef.current = new Set(
      indexRef.current < 0 ? [] : [indexRef.current],
    );
    historyRef.current = indexRef.current < 0 ? [] : [indexRef.current];
  }, []);

  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    repeatRef.current =
      modes[(modes.indexOf(repeatRef.current) + 1) % modes.length];
    setRepeat(repeatRef.current);
  }, []);

  const addToQueue = useCallback(
    (track: Track) => {
      updateQueue([...queueRef.current, track]);
      if (indexRef.current < 0) selectIndex(0, false);
    },
    [selectIndex, updateQueue],
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      if (index < 0 || index >= queueRef.current.length) return;
      const selected = indexRef.current;
      const autoplay = desiredPlayingRef.current;
      const tracks = queueRef.current.filter(
        (_, candidate) => candidate !== index,
      );
      updateQueue(tracks);
      visitedRef.current = new Set(
        [...visitedRef.current]
          .filter((candidate) => candidate !== index)
          .map((candidate) => (candidate > index ? candidate - 1 : candidate)),
      );
      historyRef.current = historyRef.current
        .filter((candidate) => candidate !== index)
        .map((candidate) => (candidate > index ? candidate - 1 : candidate));
      if (index === selected) {
        selectIndex(Math.min(index, tracks.length - 1), autoplay);
      } else if (index < selected) {
        indexRef.current = selected - 1;
        setCurrentIndex(selected - 1);
      }
    },
    [selectIndex, updateQueue],
  );

  const clearQueue = useCallback(() => {
    const track = trackRef.current;
    updateQueue(track ? [track] : []);
    indexRef.current = track ? 0 : -1;
    setCurrentIndex(indexRef.current);
    visitedRef.current = new Set(track ? [0] : []);
    historyRef.current = track ? [0] : [];
  }, [updateQueue]);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    queue,
    currentIndex,
    error,
    playTrack,
    playAtIndex,
    togglePlay,
    next: useCallback(() => advance(false), [advance]),
    previous,
    seek,
    changeVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    addToQueue,
    removeFromQueue,
    clearQueue,
  };
}
