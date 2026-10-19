import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "../types";
import { useAudioPlayer } from "./useAudioPlayer";

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = "";
  currentTime = 0;
  duration = 120;
  volume = 1;
  muted = false;
  paused = true;
  preload = "";
  load = vi.fn();
  play = vi.fn<() => Promise<void>>(() => {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  });
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  constructor() {
    super();
    FakeAudio.instances.push(this);
  }
  finish() {
    this.paused = true;
    this.currentTime = this.duration;
    this.dispatchEvent(new Event("ended"));
  }
}

const tracks: Track[] = ["a", "b", "c"].map((id) => ({
  id,
  title: `Faixa ${id}`,
  artist: "Artista",
  album: "Álbum",
  genre: "Eletrônica",
  duration: 120,
  cover: "/cover.svg",
  src: `/${id}.wav`,
  source: "demo",
}));

const audio = () => FakeAudio.instances.at(-1)!;

beforeEach(() => {
  localStorage.clear();
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useAudioPlayer", () => {
  it("starts paused and reports a rejected play request without pretending to play", async () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    expect(result.current.currentTrack?.id).toBe("a");
    expect(result.current.isPlaying).toBe(false);
    expect(audio().play).not.toHaveBeenCalled();
    audio().play.mockRejectedValueOnce(
      new DOMException("Autoplay denied", "NotAllowedError"),
    );

    await act(async () => result.current.togglePlay());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toMatch(/permitir o áudio/);
    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("uses media events for playing state and ignores stale failures after a rapid track change", async () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    let rejectOld!: (reason: Error) => void;
    const previousAudio = audio();
    previousAudio.play.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject;
        }),
    );

    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.playTrack(tracks[1], tracks));
    expect(result.current.currentTrack?.id).toBe("b");
    expect(result.current.isPlaying).toBe(true);
    expect(previousAudio.src).toBe("");

    await act(async () => {
      rejectOld(new Error("Old source failed"));
      previousAudio.dispatchEvent(new Event("error"));
      previousAudio.dispatchEvent(new Event("pause"));
    });

    expect(result.current.currentTrack?.id).toBe("b");
    expect(result.current.error).toBeNull();
    expect(result.current.isPlaying).toBe(true);
    act(() => audio().pause());
    expect(result.current.isPlaying).toBe(false);
  });

  it("advances on natural endings and stops at the end with repeat off", () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    act(() => result.current.togglePlay());
    act(() => audio().finish());
    expect(result.current.currentTrack?.id).toBe("b");
    expect(result.current.isPlaying).toBe(true);
    act(() => audio().finish());
    act(() => audio().finish());
    expect(result.current.currentTrack?.id).toBe("c");
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.repeat).toBe("off");
  });

  it("wraps repeat all and restarts the same media element with repeat one", () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    act(() => {
      result.current.cycleRepeat();
      result.current.playTrack(tracks[2], tracks);
    });
    act(() => audio().finish());
    expect(result.current.currentTrack?.id).toBe("a");
    expect(result.current.repeat).toBe("all");
    const currentAudio = audio();
    act(() => result.current.cycleRepeat());
    act(() => currentAudio.finish());
    expect(result.current.repeat).toBe("one");
    expect(audio()).toBe(currentAudio);
    expect(currentAudio.currentTime).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it("adjusts queue indices without interrupting the current audio and selects a replacement when removed", () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    act(() => result.current.playTrack(tracks[1], tracks));
    const playingAudio = audio();
    act(() => result.current.removeFromQueue(0));
    expect(result.current.queue.map((track) => track.id)).toEqual(["b", "c"]);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentTrack?.id).toBe("b");
    expect(audio()).toBe(playingAudio);
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.removeFromQueue(0));
    expect(result.current.currentTrack?.id).toBe("c");
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(true);
    act(() => result.current.removeFromQueue(0));
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.queue).toEqual([]);
    expect(result.current.isPlaying).toBe(false);
  });

  it("selects the exact queue occurrence when the same track appears several times", () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    act(() => {
      result.current.addToQueue(tracks[0]);
      result.current.addToQueue(tracks[0]);
    });
    expect(result.current.queue.map((track) => track.id)).toEqual([
      "a",
      "b",
      "c",
      "a",
      "a",
    ]);
    act(() => result.current.playAtIndex(4));
    expect(result.current.currentIndex).toBe(4);
    expect(result.current.currentTrack?.id).toBe("a");
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.queue).toHaveLength(5);

    const playingAudio = audio();
    act(() => {
      result.current.playAtIndex(-1);
      result.current.playAtIndex(5);
      result.current.playAtIndex(1.5);
    });
    expect(result.current.currentIndex).toBe(4);
    expect(audio()).toBe(playingAudio);
    act(() => result.current.removeFromQueue(0));
    expect(result.current.currentIndex).toBe(3);
    expect(audio()).toBe(playingAudio);
  });

  it("clears upcoming tracks while preserving playback and clamps seek and volume", () => {
    const { result } = renderHook(() => useAudioPlayer(tracks));
    act(() => result.current.playTrack(tracks[1], tracks));
    const currentAudio = audio();
    act(() => {
      result.current.clearQueue();
      result.current.seek(900);
      result.current.changeVolume(2);
      result.current.toggleMute();
    });
    expect(result.current.queue.map((track) => track.id)).toEqual(["b"]);
    expect(result.current.currentIndex).toBe(0);
    expect(audio()).toBe(currentAudio);
    expect(result.current.isPlaying).toBe(true);
    expect(currentAudio.currentTime).toBe(120);
    expect(currentAudio.volume).toBe(1);
    expect(currentAudio.muted).toBe(true);
    expect(localStorage.getItem("galada.player.volume")).toBe("1");
    expect(localStorage.getItem("galada.player.muted")).toBe("true");
    act(() => result.current.previous());
    expect(currentAudio.currentTime).toBe(0);
    act(() => result.current.seek(-40));
    expect(currentAudio.currentTime).toBe(0);
    act(() => result.current.changeVolume(0.5));
    expect(currentAudio.volume).toBe(0.5);
    expect(currentAudio.muted).toBe(false);
    expect(result.current.muted).toBe(false);
  });

  it("shuffle visits each other track once before stopping with repeat off", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { result } = renderHook(() => useAudioPlayer(tracks));
    act(() => {
      result.current.toggleShuffle();
      result.current.togglePlay();
    });
    act(() => audio().finish());
    expect(result.current.currentTrack?.id).toBe("b");
    act(() => audio().finish());
    expect(result.current.currentTrack?.id).toBe("c");
    act(() => audio().finish());
    expect(result.current.isPlaying).toBe(false);
  });

  it("releases all media resources during StrictMode remount and final unmount", () => {
    const { result, unmount } = renderHook(() => useAudioPlayer(tracks), {
      wrapper: StrictMode,
    });
    const abandonedAudio = FakeAudio.instances[0];
    expect(abandonedAudio.src).toBe("");
    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);
    const currentAudio = audio();
    unmount();
    expect(currentAudio.paused).toBe(true);
    expect(currentAudio.src).toBe("");
    expect(currentAudio.load).toHaveBeenCalledTimes(2);
  });
});
