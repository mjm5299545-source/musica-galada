import { expect, test } from "@playwright/test";

// Áudio sintético original que já acompanha o projeto; nenhum download externo.
const catalogTrack = {
  id: "faixa-autorizada",
  title: "Canção do catálogo",
  artist: "Galada Lab",
  album: "Teste do catálogo",
  genre: "Ambient",
  src: "/media/antes-do-sol.mp3",
  rights: "Composição sintética original deste projeto",
};

test("catalog audio can be searched, played, favorited and kept in a playlist after reload", async ({ page }) => {
  await page.route("**/catalog.json", route => route.fulfill({ json: { tracks: [catalogTrack] } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: catalogTrack.title, exact: true })).toBeVisible();
  await page.goto("/#buscar");
  await page.getByRole("textbox", { name: "Buscar músicas" }).fill("cancao do catalogo");
  const rows = page.getByRole("list", { name: "Faixas", exact: true }).getByRole("listitem");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(catalogTrack.title);
  await page.getByRole("button", { name: `Ouvir ${catalogTrack.title}`, exact: true }).click();
  const player = page.getByRole("region", { name: "Player de áudio" });
  await expect(player).toContainText("Catálogo Galada");
  const progress = player.getByRole("slider", { name: "Progresso da faixa" });
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(0.3);
  await expect(progress).toHaveAttribute("max", /^(?!0$)\d/);
  await page.getByRole("button", { name: `Favoritar ${catalogTrack.title}`, exact: true }).click();
  await page.getByRole("button", { name: `Adicionar ${catalogTrack.title} a uma playlist`, exact: true }).click();
  await page.getByRole("dialog", { name: "Adicionar faixa à playlist" }).getByRole("button", { name: "Nova playlist", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Criar ou renomear playlist" });
  await dialog.getByRole("textbox", { name: "Nome da playlist" }).fill("Catálogo autorizado");
  await dialog.getByRole("button", { name: "Criar playlist", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo autorizado");
  await page.reload();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(catalogTrack.title);
  await expect(page.getByRole("button", { name: `Desfavoritar ${catalogTrack.title}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ouvir playlist", exact: true }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(0.3);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("invalid catalog entries are explained while valid tracks remain playable", async ({ page }) => {
  await page.route("**/catalog.json", route => route.fulfill({ json: { tracks: [catalogTrack, { ...catalogTrack, title: "Sem direitos", rights: "" }] } }));
  await page.goto("/#buscar");
  await expect(page.getByRole("status").filter({ hasText: "ignoradas" })).toContainText("rights");
  await expect(page.getByRole("button", { name: `Ouvir ${catalogTrack.title}`, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvir Sem direitos", exact: true })).toHaveCount(0);
});

test("catalog failure keeps the demo available", async ({ page }) => {
  await page.route("**/catalog.json", route => route.fulfill({ status: 503 }));
  await page.goto("/#buscar");
  await expect(page.getByRole("status").filter({ hasText: "HTTP 503" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Faixas", exact: true }).getByRole("listitem")).toHaveCount(6);
});

for (const routeName of ["descobrir", "buscar"]) {
  test(`${routeName} shows catalog loading followed by guidance for an empty catalog`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/catalog.json", async route => {
      await gate;
      await route.fulfill({ json: { tracks: [] } });
    });
    await page.goto(`/#${routeName}`, { waitUntil: "domcontentloaded" });
    try {
      await expect(page.getByRole("status").filter({ hasText: "Carregando suas músicas" })).toBeVisible();
    } finally {
      release();
    }
    await expect(page.getByRole("status").filter({ hasText: "Adicione suas músicas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ouvir Antes do sol", exact: true }).first()).toBeVisible();
  });
}
