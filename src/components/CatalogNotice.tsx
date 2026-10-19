import { Music2 } from "lucide-react";
import type { useCatalog } from "../hooks/useCatalog";

export function CatalogNotice({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  if (catalog.status === "error" || (catalog.status === "ready" && catalog.tracks.length > 0)) return null;
  return (
    <div className="notice" role="status" aria-live="polite">
      <Music2 size={18} />
      <p>
        {catalog.status === "loading"
          ? "Carregando suas músicas… As faixas de demonstração já estão disponíveis."
          : "Adicione suas músicas: coloque áudios autorizados em public/media/ e cadastre-os em public/catalog.json com a declaração de direitos (rights)."}
      </p>
    </div>
  );
}
