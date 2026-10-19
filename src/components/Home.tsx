import {
  ArrowRight,
  AudioLines,
  FolderOpen,
  Heart,
  Pause,
  Play,
  Shuffle,
  Sparkles,
} from "lucide-react";
import type { Track } from "../types";
import type { useCatalog } from "../hooks/useCatalog";
import type { AudioPlayer, TrackRows } from "./model";
import { demoTracks } from "../data/catalog";
import { formatTime } from "../utils/formatTime";
import { IconButton } from "./IconButton";
import { CatalogNotice } from "./CatalogNotice";

interface Props {
  catalog: ReturnType<typeof useCatalog>;
  shelfTracks: Track[];
  homeGenre: string;
  catalogGenres: string[];
  setGenre: (genre: string) => void;
  setQuery: (query: string) => void;
  go: (route: string) => void;
  player: AudioPlayer;
  play: (track: Track, context?: Track[]) => void;
  favorites: string[];
  favorite: (track: Track) => void;
  onDetails: (track: Track) => void;
  onImport: () => void;
  importing: boolean;
  trackRows: TrackRows;
}

export function Home({
  catalog,
  shelfTracks,
  homeGenre,
  catalogGenres,
  setGenre,
  setQuery,
  go,
  player,
  play,
  favorites,
  favorite,
  onDetails,
  onImport,
  importing,
  trackRows,
}: Props) {
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">MENOS RUÍDO. MAIS MÚSICA.</p>
          <h1>
            Encontre sua frequência<span>.</span>
          </h1>
          <p>Novos sons para acompanhar o seu ritmo.</p>
        </div>
        <span className="intro-decoration">
          <AudioLines size={32} strokeWidth={1.2} />
        </span>
      </div>
      <CatalogNotice catalog={catalog} />
      <section className="hero" aria-label="Seleção em destaque">
        <img
          className="hero-art"
          src="/artwork/hero.svg"
          alt="Arte abstrata original: um sol laranja entre anéis e paisagens onduladas"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="hero-kicker">
            <span /> SELEÇÃO GALADA <i>VOL. 01</i>
          </span>
          <h2>
            Dê um respiro.
            <br />
            Sinta o som.
          </h2>
          <p>
            Texturas eletrônicas, batidas leves e um mundo
            <br className="desktop-break" /> inteiro entre os fones.
          </p>
          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() =>
                player.playTrack(demoTracks[0], demoTracks)
              }
            >
              <Play size={17} fill="currentColor" />
              Ouvir seleção
            </button>
            <a
              className="hero-explore"
              href="#faixas"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("faixas")?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                  block: "start",
                });
              }}
            >
              Explorar faixas <ArrowRight size={16} />
            </a>
          </div>
          <span className="hero-meta">
            6 COMPOSIÇÕES ORIGINAIS <span>·</span> DEMONSTRAÇÃO
          </span>
        </div>
        <div className="hero-stamp">
          <span>ESCUTE COM CALMA</span>
          <AudioLines size={19} />
          <span>FIQUE À VONTADE</span>
        </div>
      </section>
      <section className="discovery-section" id="faixas">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ESCOLHA A SUA VIBE</p>
            <h2>Entre na frequência</h2>
          </div>
          <button
            className="subtle-link"
            onClick={() => {
              setQuery("");
              setGenre("Tudo");
              go("buscar");
            }}
          >
            Ver todas <ArrowRight size={16} />
          </button>
        </div>
        <div className="genre-filters" aria-label="Filtrar por gênero">
          {["Tudo", ...catalogGenres].map((g) => (
            <button
              className={homeGenre === g ? "active" : ""}
              key={g}
              onClick={() => setGenre(g)}
              aria-pressed={homeGenre === g}
            >
              {g === "Tudo" && <Sparkles size={14} />}
              {g}
            </button>
          ))}
        </div>
        <div className="cards-grid">
          {shelfTracks
            .filter(
              (track) =>
                homeGenre === "Tudo" || track.genre === homeGenre,
            )
            .map((track, i) => (
              <article
                className="music-card"
                key={track.id}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className="cover-wrapper">
                  <button
                    className="cover-button"
                    aria-label={`Ouvir ${track.title}`}
                    onClick={() =>
                      play(
                        track,
                        shelfTracks.filter(
                          (track) =>
                            homeGenre === "Tudo" ||
                            track.genre === homeGenre,
                        ),
                      )
                    }
                  >
                    <img
                      src={track.cover}
                      alt={`Capa abstrata original de ${track.title}`}
                      loading="lazy"
                    />
                    <span className="cover-play">
                      {player.currentTrack?.id === track.id &&
                      player.isPlaying ? (
                        <Pause size={22} fill="currentColor" />
                      ) : (
                        <Play size={22} fill="currentColor" />
                      )}
                    </span>
                  </button>
                  <span className="cover-tag">{track.genre}</span>
                </div>
                <div className="card-info">
                  <div>
                    <button
                      className="text-button card-title"
                      onClick={() => {
                        onDetails(track);
                      }}
                    >
                      {track.title}
                    </button>
                    <p>
                      {track.artist} <span>·</span>{" "}
                      {formatTime(track.duration)}
                    </p>
                  </div>
                  <IconButton
                    icon={Heart}
                    label={
                      favorites.includes(track.id)
                        ? `Desfavoritar ${track.title}`
                        : `Favoritar ${track.title}`
                    }
                    active={favorites.includes(track.id)}
                    onClick={() => favorite(track)}
                  />
                </div>
              </article>
            ))}
        </div>
      </section>
      <section className="lower-grid">
        <div className="quick-list">
          <div className="section-heading">
            <div>
              <p className="eyebrow">UMA DESCOBERTA DE CADA VEZ</p>
              <h2>Deixe acontecer</h2>
            </div>
            <button
              className="shuffle-link"
              onClick={() => {
                const ordered = [...shelfTracks].sort(
                  () => Math.random() - 0.5,
                );
                player.playTrack(ordered[0], ordered);
              }}
            >
              <Shuffle size={16} />
              Surpreenda-me
            </button>
          </div>
          {trackRows(shelfTracks.slice(0, 3))}
        </div>
        <div className="local-promo">
          <span className="promo-icon">
            <FolderOpen size={26} strokeWidth={1.5} />
          </span>
          <span className="eyebrow">A SUA COLEÇÃO, DO SEU JEITO</span>
          <h3>
            Traga seu som
            <br />
            para cá.
          </h3>
          <p>
            Abra arquivos de áudio do seu dispositivo. Eles ficam salvos
            neste navegador, só com você.
          </p>
          <button
            onClick={() => onImport()}
            disabled={importing}
          >
            Escolher arquivos <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </>
  );
}
