import type { ReactNode } from "react";
import type { useAudioPlayer } from "../hooks/useAudioPlayer";
import type { useLibrary } from "../hooks/useLibrary";
import type { Track } from "../types";

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;
export type LibraryModel = ReturnType<typeof useLibrary>;
export type TrackRows = (items: Track[], emptyText?: string) => ReactNode;
