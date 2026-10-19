export function localAudioId(file: File): string {
  // Preserve existing favorite/playlist references created before IndexedDB support.
  const signature = `${file.name}:${file.size}:${file.lastModified}`;
  return `local-${Array.from(signature).reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  ).toString(36)}-${file.size}`;
}

export function audioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
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
      if (Number.isFinite(value) && value > 0) resolve(value);
      else reject(new Error("duration"));
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("format"));
    };
    audio.src = url;
  });
}
