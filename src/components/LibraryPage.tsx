import { FolderOpen, Heart, ListMusic, Play, Plus } from "lucide-react";
import type { Track } from "../types";
import type { AudioPlayer, LibraryModel, TrackRows } from "./model";
import { EmptyState } from "./EmptyState";

interface Props {
  library: LibraryModel;
  libraryTab: string;
  setLibraryTab: (tab: string) => void;
  favoriteTracks: Track[];
  localTracks: Track[];
  tracks: Track[];
  player: AudioPlayer;
  trackRows: TrackRows;
  go: (route: string) => void;
  onCreatePlaylist: () => void;
  onImport: () => void;
  importing: boolean;
}

export function LibraryPage({
  library,
  libraryTab,
  setLibraryTab,
  favoriteTracks,
  localTracks,
  tracks,
  player,
  trackRows,
  go,
  onCreatePlaylist,
  onImport,
  importing,
}: Props) {
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">SEU PEQUENO UNIVERSO</p>
          <h1>
            Sua biblioteca<span>.</span>
          </h1>
          <p>As descobertas que merecem ficar por perto.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => onCreatePlaylist()}
        >
          <Plus size={17} />
          Criar playlist
        </button>
      </div>
      <div className="library-tabs" aria-label="Seções da biblioteca">
        {[
          ["favorites", "Músicas curtidas", favoriteTracks.length],
          ["playlists", "Playlists", library.playlists.length],
          ["local", "Arquivos locais", localTracks.length],
        ].map(([id, name, count]) => (
          <button
            key={id}
            className={libraryTab === id ? "active" : ""}
            aria-pressed={libraryTab === id}
            onClick={() => setLibraryTab(String(id))}
          >
            {name}
            <span>{count}</span>
          </button>
        ))}
      </div>
      {libraryTab === "favorites" && (
        <>
          <div className="collection-banner">
            <div className="big-favorite">
              <Heart size={42} fill="currentColor" />
            </div>
            <div>
              <p className="eyebrow">ESCOLHIDAS POR VOCÊ</p>
              <h2>Músicas curtidas</h2>
              <p>
                {favoriteTracks.length} faixas · Salvas neste navegador
              </p>
            </div>
            {favoriteTracks.length > 0 && (
              <button
                className="round-play"
                aria-label="Ouvir músicas curtidas"
                onClick={() =>
                  player.playTrack(favoriteTracks[0], favoriteTracks)
                }
              >
                <Play size={24} fill="currentColor" />
              </button>
            )}
          </div>
          {trackRows(
            favoriteTracks,
            "Sua próxima favorita está por aí",
          )}
        </>
      )}
      {libraryTab === "playlists" &&
        (library.playlists.length ? (
          <div className="playlist-grid">
            {library.playlists.map((p) => (
              <button
                key={p.id}
                className="playlist-card"
                onClick={() => go(`playlist/${p.id}`)}
              >
                <span>
                  <ListMusic size={46} />
                </span>
                <strong>{p.name}</strong>
                <small>
                  {
                    tracks.filter((t) => p.trackIds.includes(t.id))
                      .length
                  }{" "}
                  faixas disponíveis
                </small>
              </button>
            ))}
            <button
              className="playlist-card add-playlist-card"
              onClick={() => onCreatePlaylist()}
            >
              <span>
                <Plus size={42} />
              </span>
              <strong>Uma nova história</strong>
              <small>Crie uma playlist</small>
            </button>
          </div>
        ) : (
          <EmptyState
            icon={ListMusic}
            title="Cada momento merece uma playlist"
            description="Dê um nome à sua seleção e adicione suas faixas preferidas."
            action="Criar minha primeira playlist"
            onAction={() => onCreatePlaylist()}
          />
        ))}
      {libraryTab === "local" && (
        <>
          <div className="notice">
            <FolderOpen size={19} />
            <p>
              Seus arquivos são salvos neste navegador quando há espaço e
              não são enviados a nenhum servidor. Limpar os dados do site
              remove os áudios salvos.
            </p>
            <button
              className="subtle-link"
              onClick={() => onImport()}
              disabled={importing}
            >
              Abrir áudio <Plus size={15} />
            </button>
          </div>
          {trackRows(localTracks, "Seu som também tem lugar aqui")}
        </>
      )}
    </>
  );
}
