import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  CircleAlert,
  Disc3,
  FolderOpen,
  Headphones,
  Heart,
  Home,
  Library,
  ListMusic,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { demoTracks } from "./data/catalog";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useLibrary } from "./hooks/useLibrary";
import type { Playlist, Track } from "./types";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${active ? "is-active" : ""} ${className}`}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={20} strokeWidth={1.8} />
    </button>
  );
}

export default function App() {
  const [route, setRoute] = useState(
    () => window.location.hash.slice(1) || "descobrir",
  );
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Tudo");
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState("favorites");
  const [toast, setToast] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistInitialTrack, setPlaylistInitialTrack] =
    useState<Track | null>(null);
  const [addTrack, setAddTrack] = useState<Track | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [detailsTrack, setDetailsTrack] = useState<Track | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const playlistDialog = useRef<HTMLDialogElement>(null);
  const addDialog = useRef<HTMLDialogElement>(null);
  const infoDialog = useRef<HTMLDialogElement>(null);
  const localUrls = useRef<string[]>([]);
  const player = useAudioPlayer(demoTracks);
  const library = useLibrary();
  const tracks = [...demoTracks, ...localTracks];
  const favoriteTracks = tracks.filter((t) => library.favorites.includes(t.id));
  const selectedPlaylist = library.playlists.find(
    (p) => route === `playlist/${p.id}`,
  );
  const normalizedQuery = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const matches = (track: Track) =>
    (genre === "Tudo" || track.genre === genre) &&
    `${track.title} ${track.artist} ${track.album} ${track.genre}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(normalizedQuery);
  const visibleTracks = tracks.filter(matches);
  const homeGenre = ["Tudo", "Eletrônica", "Ambient", "Lo-fi"].includes(genre)
    ? genre
    : "Tudo";

  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash.slice(1) || "descobrir");
      setMobileMenu(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title = `${selectedPlaylist?.name || (route === "biblioteca" ? "Sua biblioteca" : route === "buscar" ? "Buscar" : "Descobrir")} · Galada`;
  }, [route, selectedPlaylist?.name]);
  useEffect(
    () => () => {
      localUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    if (!mobileMenu) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById("sidebar-navigation");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = requestAnimationFrame(() =>
      sidebar?.querySelector<HTMLElement>("a,button")?.focus(),
    );
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenu(false);
      if (event.key === "Tab") {
        const elements = Array.from(
          sidebar?.querySelectorAll<HTMLElement>(
            "a[href],button:not(:disabled)",
          ) || [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", close);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [mobileMenu]);

  const go = (nextRoute: string) => {
    if (nextRoute === "descobrir" && genre === "Local") setGenre("Tudo");
    window.location.hash = nextRoute;
    setMobileMenu(false);
  };
  const notify = (message: string) => setToast(message);
  const favorite = (track: Track) => {
    library.toggleFavorite(track.id);
    notify(
      library.favorites.includes(track.id)
        ? "Faixa removida dos favoritos."
        : "Faixa salva nos favoritos.",
    );
  };
  const openPlaylistDialog = (
    playlist: Playlist | null = null,
    initialTrack: Track | null = null,
  ) => {
    setEditingPlaylist(playlist);
    setPlaylistInitialTrack(initialTrack);
    setPlaylistName(playlist?.name || "");
    playlistDialog.current?.showModal();
  };
  const openAddDialog = (track: Track) => {
    setAddTrack(track);
    addDialog.current?.showModal();
  };
  const play = (track: Track, context: Track[] = tracks) => {
    if (player.currentTrack?.id === track.id) player.togglePlay();
    else player.playTrack(track, context);
  };
  const savePlaylist = (event: FormEvent) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    if (editingPlaylist) {
      library.renamePlaylist(editingPlaylist.id, playlistName);
      notify("Nome da playlist atualizado.");
    } else {
      const playlist = library.createPlaylist(playlistName);
      if (playlist) {
        if (playlistInitialTrack)
          library.togglePlaylistTrack(playlist.id, playlistInitialTrack.id);
        go(`playlist/${playlist.id}`);
        notify(
          playlistInitialTrack
            ? "Playlist criada com a sua faixa."
            : "Playlist criada. Agora escolha seus sons.",
        );
      }
    }
    playlistDialog.current?.close();
  };

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setImporting(true);
    setImportError("");
    const imported: Track[] = [];
    let rejected = 0;
    for (const file of Array.from(files).slice(0, 30)) {
      if (
        (!file.type.startsWith("audio/") &&
          !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) ||
        file.size > 100 * 1024 * 1024
      ) {
        rejected++;
        continue;
      }
      const url = URL.createObjectURL(file);
      try {
        const duration = await new Promise<number>((resolve, reject) => {
          const audio = new Audio();
          const timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error("timeout"));
          }, 8000);
          function cleanup() {
            window.clearTimeout(timeout);
            audio.onloadedmetadata = null;
            audio.onerror = null;
            audio.removeAttribute("src");
            audio.load();
          }
          audio.preload = "metadata";
          audio.onloadedmetadata = () => {
            const value = audio.duration;
            cleanup();
            Number.isFinite(value) && value > 0
              ? resolve(value)
              : reject(new Error("duration"));
          };
          audio.onerror = () => {
            cleanup();
            reject(new Error("format"));
          };
          audio.src = url;
        });
        localUrls.current.push(url);
        const signature = `${file.name}:${file.size}:${file.lastModified}`;
        const id = `local-${Array.from(signature)
          .reduce(
            (hash, character) =>
              Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
            2166136261,
          )
          .toString(36)}-${file.size}`;
        imported.push({
          id,
          title: file.name.replace(/\.[^.]+$/, ""),
          artist: "Arquivo local",
          album: "Seus arquivos",
          genre: "Local",
          duration,
          cover: "/artwork/antes-do-sol.svg",
          src: url,
          source: "local",
        });
      } catch {
        URL.revokeObjectURL(url);
        rejected++;
      }
    }
    setLocalTracks((current) => [
      ...current,
      ...imported.filter(
        (track, index) =>
          !current.some((existing) => existing.id === track.id) &&
          imported.findIndex((item) => item.id === track.id) === index,
      ),
    ]);
    setImporting(false);
    if (fileInput.current) fileInput.current.value = "";
    if (imported.length) {
      setLibraryTab("local");
      go("biblioteca");
      notify(`${imported.length} arquivo(s) disponível(is) nesta sessão.`);
    }
    if (rejected || files.length > 30)
      setImportError(
        "Alguns arquivos não foram abertos. Use áudio compatível de até 100 MB e selecione no máximo 30 arquivos por vez.",
      );
  }

  const trackRows = (
    items: Track[],
    emptyText = "Ainda não há faixas por aqui.",
  ) =>
    items.length ? (
      <div className="track-table" role="list" aria-label="Faixas">
        <div className="track-table-head" aria-hidden="true">
          <span>#</span>
          <span>FAIXA</span>
          <span>ÁLBUM</span>
          <span>DURAÇÃO</span>
          <span />
        </div>
        {items.map((track, index) => (
          <div
            className={`track-row ${player.currentTrack?.id === track.id ? "current-track" : ""}`}
            role="listitem"
            key={track.id}
          >
            <button
              className="row-play"
              aria-label={`${player.currentTrack?.id === track.id && player.isPlaying ? "Pausar" : "Ouvir"} ${track.title}`}
              onClick={() => play(track, items)}
            >
              <span className="row-number">
                {player.currentTrack?.id === track.id && player.isPlaying ? (
                  <AudioLines size={17} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <span className="row-play-icon">
                {player.currentTrack?.id === track.id && player.isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </span>
            </button>
            <div className="track-title-cell">
              <img src={track.cover} alt="" loading="lazy" />
              <div>
                <button
                  className="text-button track-name"
                  onClick={() => play(track, items)}
                >
                  {track.title}
                </button>
                <span>
                  {track.artist} <i>·</i> {track.genre}
                </span>
              </div>
            </div>
            <span className="album-cell">{track.album}</span>
            <span className="duration-cell">{formatTime(track.duration)}</span>
            <div className="row-actions">
              <IconButton
                icon={Heart}
                label={
                  library.favorites.includes(track.id)
                    ? `Desfavoritar ${track.title}`
                    : `Favoritar ${track.title}`
                }
                active={library.favorites.includes(track.id)}
                onClick={() => favorite(track)}
              />
              <IconButton
                icon={Plus}
                label={`Adicionar ${track.title} a uma playlist`}
                onClick={() => openAddDialog(track)}
              />
              <IconButton
                icon={ListMusic}
                label={`Adicionar ${track.title} à fila`}
                onClick={() => {
                  player.addToQueue(track);
                  notify("Faixa adicionada ao fim da fila.");
                }}
              />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState
        icon={Music2}
        title={emptyText}
        description="Toda boa coleção começa com uma descoberta."
        action="Explorar sons"
        onAction={() => {
          setGenre("Tudo");
          setQuery("");
          go("descobrir");
        }}
      />
    );

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      {mobileMenu && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        id="sidebar-navigation"
        className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}
        aria-label="Menu principal"
      >
        <button
          className="sidebar-close icon-button"
          aria-label="Fechar menu de navegação"
          onClick={() => setMobileMenu(false)}
        >
          <X size={20} />
        </button>
        <a
          className="brand"
          href="#descobrir"
          onClick={() => setMobileMenu(false)}
          aria-label="Galada início"
        >
          <span className="brand-symbol">
            <i />
            <i />
            <i />
            <i />
          </span>
          galada<span className="brand-dot">.</span>
        </a>
        <p className="sidebar-label">SEU UNIVERSO MUSICAL</p>
        <nav className="main-navigation" aria-label="Navegação principal">
          <NavItem
            icon={Home}
            label="Descobrir"
            active={route === "descobrir"}
            route="descobrir"
            go={go}
          />
          <NavItem
            icon={Search}
            label="Buscar"
            active={route === "buscar"}
            route="buscar"
            go={go}
          />
          <NavItem
            icon={Library}
            label="Sua biblioteca"
            active={route === "biblioteca"}
            route="biblioteca"
            go={go}
          />
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-title">
          <span>SUAS PLAYLISTS</span>
          <IconButton
            icon={Plus}
            label="Criar playlist"
            onClick={() => openPlaylistDialog()}
          />
        </div>
        <button
          className={`favorites-link ${route === "biblioteca" && libraryTab === "favorites" ? "selected" : ""}`}
          onClick={() => {
            setLibraryTab("favorites");
            go("biblioteca");
          }}
        >
          <span className="favorite-art">
            <Heart size={17} fill="currentColor" />
          </span>
          <span>
            Músicas curtidas
            <small>
              {favoriteTracks.length}{" "}
              {favoriteTracks.length === 1 ? "faixa" : "faixas"}
            </small>
          </span>
        </button>
        <div className="sidebar-playlists">
          {library.playlists.map((p) => (
            <button
              className={selectedPlaylist?.id === p.id ? "selected" : ""}
              key={p.id}
              onClick={() => go(`playlist/${p.id}`)}
            >
              <ListMusic size={17} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        {!library.playlists.length && (
          <button
            className="create-playlist"
            onClick={() => openPlaylistDialog()}
          >
            <Plus size={17} />
            <span>Crie sua primeira playlist</span>
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="headphone-mark">
            <Headphones size={25} />
          </div>
          <strong>O som é seu.</strong>
          <p>
            Um espaço para suas descobertas.
            <br />
            Sem conta, sem pressa.
          </p>
          <button
            onClick={() => {
              setDetailsTrack(null);
              infoDialog.current?.showModal();
            }}
          >
            Conheça a Galada <ArrowRight size={14} />
          </button>
          <span className="local-storage-label">
            <span />{" "}
            {library.storageAvailable
              ? "SALVO NESTE NAVEGADOR"
              : "APENAS NESTA SESSÃO"}
          </span>
        </div>
      </aside>

      <div className="main-shell" inert={mobileMenu}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"}
              aria-controls="sidebar-navigation"
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu((v) => !v)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Seu mundo<span>/</span>
              <strong>
                {selectedPlaylist
                  ? "Playlist"
                  : route === "biblioteca"
                    ? "Biblioteca"
                    : route === "buscar"
                      ? "Buscar"
                      : "Descobrir"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="demo-badge">
              <span /> MODO DEMO
            </span>
            <button
              className="import-button"
              onClick={() => fileInput.current?.click()}
              disabled={importing}
            >
              <ArrowDownToLine size={16} />
              <span>
                {importing ? "Abrindo arquivos…" : "Abrir áudio local"}
              </span>
            </button>
            <span
              className="avatar"
              title="Seu espaço local"
              aria-label="Seu espaço local"
            >
              <Headphones size={18} />
            </span>
          </div>
        </header>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
          multiple
          hidden
          onChange={(e) => {
            void importFiles(e.target.files);
          }}
          aria-label="Selecionar arquivos de áudio"
        />
        <main id="main-content" tabIndex={-1}>
          {!library.storageAvailable && (
            <div className="notice" role="status">
              <CircleAlert size={18} />
              <p>
                O armazenamento do navegador está indisponível. Você pode ouvir
                normalmente, mas favoritos e playlists ficarão apenas nesta
                sessão.
              </p>
            </div>
          )}
          {importError && (
            <div className="notice error-notice" role="alert">
              <CircleAlert size={18} />
              <span>{importError}</span>
              <IconButton
                icon={X}
                label="Fechar aviso de importação"
                onClick={() => setImportError("")}
              />
            </div>
          )}
          {route === "descobrir" && (
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
                  {["Tudo", "Eletrônica", "Ambient", "Lo-fi"].map((g) => (
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
                  {demoTracks
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
                                demoTracks.filter(
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
                                setDetailsTrack(track);
                                infoDialog.current?.showModal();
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
                              library.favorites.includes(track.id)
                                ? `Desfavoritar ${track.title}`
                                : `Favoritar ${track.title}`
                            }
                            active={library.favorites.includes(track.id)}
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
                        const ordered = [...demoTracks].sort(
                          () => Math.random() - 0.5,
                        );
                        player.playTrack(ordered[0], ordered);
                      }}
                    >
                      <Shuffle size={16} />
                      Surpreenda-me
                    </button>
                  </div>
                  {trackRows(demoTracks.slice(0, 3))}
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
                    Abra arquivos de áudio do seu dispositivo. Eles ficam só com
                    você, nesta sessão.
                  </p>
                  <button
                    onClick={() => fileInput.current?.click()}
                    disabled={importing}
                  >
                    Escolher arquivos <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            </>
          )}

          {route === "buscar" && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">SIGA SUA CURIOSIDADE</p>
                  <h1>
                    O que você quer ouvir<span>?</span>
                  </h1>
                  <p>Encontre uma faixa, um álbum ou uma nova atmosfera.</p>
                </div>
              </div>
              <form
                className="search-box"
                role="search"
                onSubmit={(e) => e.preventDefault()}
              >
                <Search size={22} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busque por faixa, artista, álbum ou gênero"
                  aria-label="Buscar músicas"
                />
                {query && (
                  <IconButton
                    icon={X}
                    label="Limpar busca"
                    onClick={() => setQuery("")}
                  />
                )}
              </form>
              <div
                className="genre-filters"
                aria-label="Filtrar resultados por gênero"
              >
                {[
                  "Tudo",
                  "Eletrônica",
                  "Ambient",
                  "Lo-fi",
                  ...(localTracks.length ? ["Local"] : []),
                ].map((g) => (
                  <button
                    key={g}
                    className={genre === g ? "active" : ""}
                    onClick={() => setGenre(g)}
                    aria-pressed={genre === g}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="section-heading search-heading">
                <h2>
                  {query.trim() ? "Resultados da busca" : "Explore o catálogo"}
                </h2>
                <span className="muted">
                  {visibleTracks.length}{" "}
                  {visibleTracks.length === 1 ? "faixa" : "faixas"}
                </span>
              </div>
              {visibleTracks.length ? (
                trackRows(visibleTracks)
              ) : (
                <EmptyState
                  icon={Search}
                  title="Nenhum som por esse nome"
                  description="Tente outro termo ou escolha um gênero diferente."
                  action="Limpar filtros"
                  onAction={() => {
                    setQuery("");
                    setGenre("Tudo");
                  }}
                />
              )}
            </>
          )}

          {route === "biblioteca" && (
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
                  onClick={() => openPlaylistDialog()}
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
                      onClick={() => openPlaylistDialog()}
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
                    onAction={() => openPlaylistDialog()}
                  />
                ))}
              {libraryTab === "local" && (
                <>
                  <div className="notice">
                    <FolderOpen size={19} />
                    <p>
                      Seus arquivos não são enviados a nenhum servidor. Abra-os
                      novamente ao recarregar a página.
                    </p>
                    <button
                      className="subtle-link"
                      onClick={() => fileInput.current?.click()}
                      disabled={importing}
                    >
                      Abrir áudio <Plus size={15} />
                    </button>
                  </div>
                  {trackRows(localTracks, "Seu som também tem lugar aqui")}
                </>
              )}
            </>
          )}

          {selectedPlaylist && (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setLibraryTab("playlists");
                  go("biblioteca");
                }}
              >
                <ArrowLeft size={16} />
                Sua biblioteca
              </button>
              <div className="playlist-detail">
                <div className="playlist-detail-art">
                  <ListMusic size={65} strokeWidth={1} />
                </div>
                <div>
                  <p className="eyebrow">SUA PLAYLIST</p>
                  <h1>{selectedPlaylist.name}</h1>
                  <p>
                    {
                      tracks.filter((t) =>
                        selectedPlaylist.trackIds.includes(t.id),
                      ).length
                    }{" "}
                    faixas disponíveis · Salva neste navegador
                  </p>
                  <div className="playlist-detail-actions">
                    <button
                      className="primary-button"
                      disabled={
                        !tracks.some((t) =>
                          selectedPlaylist.trackIds.includes(t.id),
                        )
                      }
                      onClick={() => {
                        const items = tracks.filter((t) =>
                          selectedPlaylist.trackIds.includes(t.id),
                        );
                        if (items.length) player.playTrack(items[0], items);
                      }}
                    >
                      <Play size={16} fill="currentColor" />
                      Ouvir playlist
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => openPlaylistDialog(selectedPlaylist)}
                    >
                      Renomear
                    </button>
                    <IconButton
                      icon={Trash2}
                      label="Excluir playlist"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Excluir a playlist “${selectedPlaylist.name}”? As faixas serão mantidas.`,
                          )
                        ) {
                          library.deletePlaylist(selectedPlaylist.id);
                          setLibraryTab("playlists");
                          go("biblioteca");
                          notify("Playlist excluída.");
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              {selectedPlaylist.trackIds.some(
                (id) => !tracks.some((t) => t.id === id),
              ) && (
                <div className="notice">
                  <CircleAlert size={18} />
                  <p>
                    Esta playlist inclui arquivos locais de outra sessão. Abra
                    os arquivos novamente para ouvi-los.
                  </p>
                </div>
              )}
              {trackRows(
                tracks.filter((t) => selectedPlaylist.trackIds.includes(t.id)),
                "Sua playlist está esperando os primeiros sons",
              )}
              <button
                className="secondary-button add-more-button"
                onClick={() => {
                  setQuery("");
                  setGenre("Tudo");
                  go("buscar");
                }}
              >
                <Plus size={17} />
                Explorar faixas para adicionar
              </button>
            </>
          )}

          {!["descobrir", "buscar", "biblioteca"].includes(route) &&
            !selectedPlaylist && (
              <EmptyState
                icon={Disc3}
                title="Este caminho ainda não tem trilha"
                description="A página ou playlist não foi encontrada. Vamos voltar às descobertas?"
                action="Ir para Descobrir"
                onAction={() => go("descobrir")}
              />
            )}
          <footer className="page-footer">
            <span>
              <span className="mini-brand">g.</span> Feito para sentir.
            </span>
            <p>
              Catálogo demonstrativo · composições sintéticas originais · sem
              streaming comercial
            </p>
            <button
              onClick={() => {
                setDetailsTrack(null);
                infoDialog.current?.showModal();
              }}
            >
              Sobre o projeto <ArrowRight size={13} />
            </button>
          </footer>
        </main>
      </div>

      <section
        className="player"
        aria-label="Player de áudio"
        inert={mobileMenu}
      >
        <div className="now-playing">
          {player.currentTrack ? (
            <>
              <button
                className="now-cover"
                onClick={() => {
                  setDetailsTrack(player.currentTrack);
                  infoDialog.current?.showModal();
                }}
                aria-label={`Detalhes de ${player.currentTrack.title}`}
              >
                <img src={player.currentTrack.cover} alt="" />
              </button>
              <div className="now-details">
                <strong>{player.currentTrack.title}</strong>
                <span>
                  {player.currentTrack.artist}
                  <i>·</i>
                  {player.currentTrack.source === "demo"
                    ? "Demo original"
                    : "Arquivo local"}
                </span>
              </div>
              <IconButton
                icon={Heart}
                label={
                  library.favorites.includes(player.currentTrack.id)
                    ? "Desfavoritar faixa atual"
                    : "Favoritar faixa atual"
                }
                active={library.favorites.includes(player.currentTrack.id)}
                onClick={() => {
                  if (player.currentTrack) favorite(player.currentTrack);
                }}
              />
            </>
          ) : (
            <span className="muted">Escolha seu próximo som</span>
          )}
        </div>
        <div className="playback">
          <div className="playback-buttons">
            <IconButton
              icon={Shuffle}
              label="Reprodução aleatória"
              active={player.shuffle}
              onClick={player.toggleShuffle}
            />
            <IconButton
              icon={SkipBack}
              label="Faixa anterior"
              disabled={!player.currentTrack}
              onClick={player.previous}
            />
            <button
              className="main-play-button"
              aria-label={
                player.isPlaying ? "Pausar reprodução" : "Iniciar reprodução"
              }
              disabled={!player.currentTrack}
              onClick={player.togglePlay}
            >
              {player.isPlaying ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
            </button>
            <IconButton
              icon={SkipForward}
              label="Próxima faixa"
              disabled={!player.currentTrack}
              onClick={player.next}
            />
            <IconButton
              icon={player.repeat === "one" ? Repeat1 : Repeat}
              label={`Repetição: ${player.repeat === "off" ? "desligada" : player.repeat === "all" ? "todas" : "uma faixa"}`}
              active={player.repeat !== "off"}
              onClick={player.cycleRepeat}
            />
          </div>
          <div className="progress-control">
            <span>{formatTime(player.currentTime)}</span>
            <input
              type="range"
              min="0"
              max={player.duration || player.currentTrack?.duration || 0}
              step="0.1"
              value={Math.min(
                player.currentTime,
                player.duration || player.currentTrack?.duration || 0,
              )}
              onChange={(e) => player.seek(Number(e.target.value))}
              aria-label="Progresso da faixa"
              aria-valuetext={`${formatTime(player.currentTime)} de ${formatTime(player.duration || player.currentTrack?.duration || 0)}`}
              style={
                {
                  "--range-fill": `${player.duration ? (player.currentTime / player.duration) * 100 : 0}%`,
                } as React.CSSProperties
              }
            />
            <span>
              {formatTime(
                player.duration || player.currentTrack?.duration || 0,
              )}
            </span>
          </div>
        </div>
        <div className="player-extras">
          <IconButton
            icon={ListMusic}
            label={
              queueOpen
                ? "Fechar fila de reprodução"
                : "Abrir fila de reprodução"
            }
            active={queueOpen}
            onClick={() => setQueueOpen((v) => !v)}
          />
          <span className="player-separator" />
          <div className="volume-control">
            <IconButton
              icon={
                player.muted || !player.volume
                  ? VolumeX
                  : player.volume < 0.5
                    ? Volume1
                    : Volume2
              }
              label={player.muted ? "Ativar som" : "Silenciar"}
              onClick={player.toggleMute}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={player.muted ? 0 : player.volume}
              aria-label="Volume"
              aria-valuetext={`${Math.round((player.muted ? 0 : player.volume) * 100)} por cento`}
              onChange={(e) => player.changeVolume(Number(e.target.value))}
              style={
                {
                  "--range-fill": `${(player.muted ? 0 : player.volume) * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </section>

      {queueOpen && (
        <aside className="queue-panel" aria-label="Fila de reprodução">
          <div className="queue-heading">
            <div>
              <p className="eyebrow">NA SEQUÊNCIA</p>
              <h2>Sua fila</h2>
            </div>
            <IconButton
              icon={X}
              label="Fechar fila"
              onClick={() => setQueueOpen(false)}
            />
          </div>
          <p className="muted queue-caption">
            {player.queue.length} faixas ·{" "}
            {player.shuffle ? "Modo aleatório" : "Na sua ordem"}
          </p>
          <div className="queue-list">
            {player.queue.map((track, i) => (
              <div
                className={`queue-track ${i === player.currentIndex ? "selected" : ""}`}
                key={`${track.id}-${i}`}
              >
                <button
                  onClick={() => player.playAtIndex(i)}
                  aria-label={`Ouvir ${track.title} na fila`}
                >
                  <img src={track.cover} alt="" />
                  <span>
                    <strong>{track.title}</strong>
                    <small>
                      {i === player.currentIndex
                        ? player.isPlaying
                          ? "Tocando agora"
                          : "Selecionada"
                        : track.artist}
                    </small>
                  </span>
                  {i === player.currentIndex && player.isPlaying && (
                    <AudioLines size={16} />
                  )}
                </button>
                <IconButton
                  icon={X}
                  label={`Remover ${track.title} da fila`}
                  onClick={() => player.removeFromQueue(i)}
                />
              </div>
            ))}
          </div>
          <div className="queue-settings">
            <p className="eyebrow">CONTROLES DE REPRODUÇÃO</p>
            <div className="queue-settings-row">
              <IconButton
                icon={Shuffle}
                label="Reprodução aleatória no celular"
                active={player.shuffle}
                onClick={player.toggleShuffle}
              />
              <IconButton
                icon={player.repeat === "one" ? Repeat1 : Repeat}
                label={`Repetição no celular: ${player.repeat === "off" ? "desligada" : player.repeat === "all" ? "todas" : "uma faixa"}`}
                active={player.repeat !== "off"}
                onClick={player.cycleRepeat}
              />
              <IconButton
                icon={player.muted || !player.volume ? VolumeX : Volume2}
                label={
                  player.muted
                    ? "Ativar som no celular"
                    : "Silenciar no celular"
                }
                onClick={player.toggleMute}
              />
              <input
                type="range"
                aria-label="Volume no celular"
                min="0"
                max="1"
                step="0.01"
                value={player.muted ? 0 : player.volume}
                onChange={(event) =>
                  player.changeVolume(Number(event.target.value))
                }
                style={
                  {
                    "--range-fill": `${(player.muted ? 0 : player.volume) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={player.clearQueue}
            disabled={player.queue.length <= 1}
          >
            <Trash2 size={15} />
            Limpar próximas faixas
          </button>
        </aside>
      )}
      {player.error && (
        <div className="audio-error" role="alert">
          <CircleAlert size={19} />
          <span>{player.error}</span>
        </div>
      )}
      <div
        className={`toast ${toast ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={17} />
            {toast}
          </>
        )}
      </div>

      <dialog
        ref={playlistDialog}
        aria-label="Criar ou renomear playlist"
        className="modal"
        onClose={() => setEditingPlaylist(null)}
      >
        <div className="modal-heading">
          <span className="modal-icon">
            <ListMusic size={25} />
          </span>
          <IconButton
            icon={X}
            label="Fechar formulário de playlist"
            onClick={() => playlistDialog.current?.close()}
          />
        </div>
        <h2>
          {editingPlaylist
            ? "Um novo nome para a história"
            : "Que história vamos ouvir?"}
        </h2>
        <p>
          {editingPlaylist
            ? "Mude o nome, preserve os seus sons."
            : "Crie um espaço para seus sons favoritos."}
        </p>
        <form onSubmit={savePlaylist}>
          <label htmlFor="playlist-name">Nome da playlist</label>
          <input
            id="playlist-name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Ex.: domingos sem pressa"
            maxLength={60}
            required
            autoComplete="off"
          />
          <small>{playlistName.length}/60 · Salva apenas neste navegador</small>
          <button
            className="primary-button"
            type="submit"
            disabled={!playlistName.trim()}
          >
            {editingPlaylist ? "Salvar nome" : "Criar playlist"}
            <ArrowRight size={17} />
          </button>
        </form>
      </dialog>
      <dialog
        ref={addDialog}
        aria-label="Adicionar faixa à playlist"
        className="modal"
        onClose={() => setAddTrack(null)}
      >
        <div className="modal-heading">
          <span className="modal-icon">
            <Plus size={25} />
          </span>
          <IconButton
            icon={X}
            label="Fechar seleção de playlist"
            onClick={() => addDialog.current?.close()}
          />
        </div>
        <h2>Um lugar para esse som</h2>
        <p>{addTrack?.title} · Escolha uma playlist.</p>
        <div className="add-playlist-list">
          {library.playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (addTrack) {
                  library.togglePlaylistTrack(p.id, addTrack.id);
                  notify(
                    p.trackIds.includes(addTrack.id)
                      ? "Faixa removida da playlist."
                      : "Faixa adicionada à playlist.",
                  );
                }
              }}
            >
              <ListMusic size={21} />
              <span>
                {p.name}
                <small>{p.trackIds.length} faixas</small>
              </span>
              {addTrack && p.trackIds.includes(addTrack.id) ? (
                <Check size={20} className="accent" />
              ) : (
                <Plus size={20} />
              )}
            </button>
          ))}
        </div>
        {!library.playlists.length && (
          <p className="empty-dialog-note">
            Crie sua primeira playlist para começar a colecionar sons.
          </p>
        )}
        <button
          className="secondary-button full-width"
          onClick={() => {
            const initialTrack = addTrack;
            addDialog.current?.close();
            openPlaylistDialog(null, initialTrack);
          }}
        >
          <Plus size={16} />
          Nova playlist
        </button>
      </dialog>
      <dialog
        ref={infoDialog}
        aria-label="Sobre a Galada e detalhes da faixa"
        className="modal info-modal"
      >
        <div className="modal-heading">
          <span className="modal-icon">
            <Disc3 size={25} />
          </span>
          <IconButton
            icon={X}
            label="Fechar detalhes"
            onClick={() => infoDialog.current?.close()}
          />
        </div>
        {detailsTrack ? (
          <>
            <img
              className="detail-cover"
              src={detailsTrack.cover}
              alt="Capa abstrata original"
            />
            <p className="eyebrow">
              {detailsTrack.source === "demo"
                ? "COMPOSIÇÃO SINTÉTICA ORIGINAL"
                : "ARQUIVO DO SEU DISPOSITIVO"}
            </p>
            <h2>{detailsTrack.title}</h2>
            <p>
              {detailsTrack.artist} · {detailsTrack.album}
            </p>
            <div className="detail-tags">
              <span>{detailsTrack.genre}</span>
              <span>{formatTime(detailsTrack.duration)}</span>
              <span>
                {detailsTrack.source === "demo"
                  ? "Demonstração"
                  : "Nesta sessão"}
              </span>
            </div>
            <button
              className="primary-button full-width"
              onClick={() => {
                player.playTrack(detailsTrack, tracks);
                infoDialog.current?.close();
              }}
            >
              <Play size={17} fill="currentColor" />
              Ouvir faixa
            </button>
            <button
              className="secondary-button full-width"
              onClick={() => {
                infoDialog.current?.close();
                openAddDialog(detailsTrack);
              }}
            >
              <Plus size={17} />
              Adicionar à playlist
            </button>
          </>
        ) : (
          <>
            <h2>Música, no seu ritmo.</h2>
            <p>
              A Galada é um projeto independente de demonstração. As seis faixas
              curtas e todas as capas foram criadas originalmente para este
              site.
            </p>
            <p>
              O player reproduz áudio de verdade. Favoritos e playlists ficam
              neste navegador. Seus arquivos locais ficam disponíveis durante a
              sessão e não são enviados a servidores.
            </p>
            <p>
              Este projeto não tem vínculo com plataformas de streaming e não
              oferece contas, assinaturas ou um catálogo comercial.
            </p>
            <span className="about-signature">
              Menos ruído. Mais música. <AudioLines size={20} />
            </span>
          </>
        )}
      </dialog>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  route,
  go,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  route: string;
  go: (route: string) => void;
}) {
  return (
    <a
      href={`#${route}`}
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        go(route);
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
      <span>{label}</span>
      {active && <span className="nav-active-dot" />}
    </a>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={31} strokeWidth={1.3} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="secondary-button" onClick={onAction}>
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
