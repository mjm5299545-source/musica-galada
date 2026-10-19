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
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconButton } from "./components/IconButton";
import { EmptyState } from "./components/EmptyState";
import { Home as HomePage } from "./components/Home";
import { SearchPage } from "./components/SearchPage";
import { LibraryPage } from "./components/LibraryPage";
import { Player } from "./components/Player";
import { formatTime } from "./utils/formatTime";
import { demoTracks } from "./data/catalog";
import { useCatalog } from "./hooks/useCatalog";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useLibrary } from "./hooks/useLibrary";
import { useLocalTracks } from "./hooks/useLocalTracks";
import type { Playlist, Track } from "./types";

export default function App() {
  const [route, setRoute] = useState(
    () => window.location.hash.slice(1) || "descobrir",
  );
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Tudo");
  const localAudio = useLocalTracks();
  const { tracks: localTracks, importing } = localAudio;
  const [mobileMenu, setMobileMenu] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState("favorites");
  const [toast, setToast] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistInitialTrack, setPlaylistInitialTrack] =
    useState<Track | null>(null);
  const [addTrack, setAddTrack] = useState<Track | null>(null);
  const [importError, setImportError] = useState("");
  const [detailsTrack, setDetailsTrack] = useState<Track | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const playlistDialog = useRef<HTMLDialogElement>(null);
  const addDialog = useRef<HTMLDialogElement>(null);
  const infoDialog = useRef<HTMLDialogElement>(null);
  const player = useAudioPlayer(demoTracks);
  const library = useLibrary();
  const catalog = useCatalog();
  const shelfTracks = [...demoTracks, ...catalog.tracks]; // demo + catálogo do usuário
  const tracks = [...shelfTracks, ...localTracks];
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
  const homeGenre = genre === "Local" ? "Tudo" : genre;
  const catalogGenres = [...new Set(shelfTracks.map((track) => track.genre))];

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
  const openFiles = () => fileInput.current?.click();
  const showDetails = (track: Track | null) => {
    setDetailsTrack(track);
    infoDialog.current?.showModal();
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
    setImportError("");
    const result = await localAudio.importFiles(Array.from(files));
    if (fileInput.current) fileInput.current.value = "";
    if (result.opened) {
      setLibraryTab("local");
      go("biblioteca");
      notify(result.saved === result.opened
        ? `${result.opened} arquivo(s) salvo(s) neste navegador.`
        : `${result.opened} arquivo(s) aberto(s) para ouvir.`);
    }
    if (result.rejected) setImportError(
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
              disabled={importing || localAudio.loading}
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
          {localAudio.storageError && (
            <div className="notice" role="status">
              <CircleAlert size={18} />
              <p>{localAudio.storageError}</p>
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
          {(catalog.status === "error" || catalog.skipped.length > 0) && (
            <div className="notice error-notice" role="status">
              <CircleAlert size={18} />
              <span>
                {catalog.status === "error"
                  ? `${catalog.error} As faixas de demonstração continuam disponíveis.`
                  : `${catalog.skipped.length} faixa(s) de catalog.json foram ignoradas: ${catalog.skipped[0]}`}
              </span>
            </div>
          )}
          {route === "descobrir" && (
            <HomePage catalog={catalog} shelfTracks={shelfTracks} homeGenre={homeGenre}
              catalogGenres={catalogGenres} setGenre={setGenre} setQuery={setQuery} go={go}
              player={player} play={play} favorites={library.favorites} favorite={favorite}
              onDetails={showDetails} onImport={openFiles} importing={importing || localAudio.loading} trackRows={trackRows} />
          )}

          {route === "buscar" && (
            <SearchPage catalog={catalog} query={query} setQuery={setQuery} genre={genre}
              setGenre={setGenre} catalogGenres={catalogGenres} hasLocalTracks={localTracks.length > 0}
              visibleTracks={visibleTracks} trackRows={trackRows} />
          )}

          {route === "biblioteca" && (
            <LibraryPage library={library} libraryTab={libraryTab} setLibraryTab={setLibraryTab}
              favoriteTracks={favoriteTracks} localTracks={localTracks} tracks={tracks} player={player}
              trackRows={trackRows} go={go} onCreatePlaylist={() => openPlaylistDialog()}
              onImport={openFiles} importing={importing || localAudio.loading} />
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
              {!localAudio.loading && catalog.status !== "loading" && selectedPlaylist.trackIds.some(
                (id) => !tracks.some((t) => t.id === id),
              ) && (
                <div className="notice">
                  <CircleAlert size={18} />
                  <p>
                    Algumas faixas desta playlist estão indisponíveis. Verifique o
                    catálogo ou abra novamente os arquivos locais.
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

      <Player player={player} mobileMenu={mobileMenu} queueOpen={queueOpen}
        onToggleQueue={() => setQueueOpen((value) => !value)} onCloseQueue={() => setQueueOpen(false)}
        favorites={library.favorites} favorite={favorite} onDetails={showDetails} />
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
                : detailsTrack.source === "catalog"
                  ? "CATÁLOGO GALADA"
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
                  : detailsTrack.source === "catalog"
                    ? "Catálogo"
                    : "Arquivo local"}
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
              neste navegador. Seus arquivos locais são salvos neste navegador
              quando há espaço e não são enviados a servidores.
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
