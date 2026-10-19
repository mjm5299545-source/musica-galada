import { Search, X } from "lucide-react";
import type { Track } from "../types";
import type { useCatalog } from "../hooks/useCatalog";
import type { TrackRows } from "./model";
import { IconButton } from "./IconButton";
import { EmptyState } from "./EmptyState";
import { CatalogNotice } from "./CatalogNotice";

interface Props {
  catalog: ReturnType<typeof useCatalog>;
  query: string;
  setQuery: (query: string) => void;
  genre: string;
  setGenre: (genre: string) => void;
  catalogGenres: string[];
  hasLocalTracks: boolean;
  visibleTracks: Track[];
  trackRows: TrackRows;
}

export function SearchPage({
  catalog,
  query,
  setQuery,
  genre,
  setGenre,
  catalogGenres,
  hasLocalTracks,
  visibleTracks,
  trackRows,
}: Props) {
  return (
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
      <CatalogNotice catalog={catalog} />
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
          ...catalogGenres,
          ...(hasLocalTracks ? ["Local"] : []),
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
  );
}
