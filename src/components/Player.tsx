import {
  AudioLines,
  CircleAlert,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Track } from "../types";
import type { AudioPlayer } from "./model";
import { formatTime } from "../utils/formatTime";
import { IconButton } from "./IconButton";

interface Props {
  player: AudioPlayer;
  mobileMenu: boolean;
  queueOpen: boolean;
  onToggleQueue: () => void;
  onCloseQueue: () => void;
  favorites: string[];
  favorite: (track: Track) => void;
  onDetails: (track: Track | null) => void;
}

export function Player({
  player,
  mobileMenu,
  queueOpen,
  onToggleQueue,
  onCloseQueue,
  favorites,
  favorite,
  onDetails,
}: Props) {
  return <>
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
                onDetails(player.currentTrack);
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
                  : player.currentTrack.source === "catalog"
                    ? "Catálogo Galada"
                    : "Arquivo local"}
              </span>
            </div>
            <IconButton
              icon={Heart}
              label={
                favorites.includes(player.currentTrack.id)
                  ? "Desfavoritar faixa atual"
                  : "Favoritar faixa atual"
              }
              active={favorites.includes(player.currentTrack.id)}
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
          onClick={() => onToggleQueue()}
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
            onClick={() => onCloseQueue()}
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
  </>;
}
