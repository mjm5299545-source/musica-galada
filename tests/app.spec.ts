import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { resolve } from "node:path";

const playlistDialogName = "Criar ou renomear playlist";
const addDialogName = "Adicionar faixa à playlist";
const infoDialogName = "Sobre a Galada e detalhes da faixa";
const demoFile = resolve("public/media/antes-do-sol.mp3");

async function openMenu(page: Page) {
  const button = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await button.isVisible()) await button.click();
}

async function navigate(
  page: Page,
  name: "Descobrir" | "Buscar" | "Sua biblioteca",
) {
  await openMenu(page);
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name, exact: true })
    .click();
  const headings = {
    Descobrir: "Encontre sua frequência.",
    Buscar: "O que você quer ouvir?",
    "Sua biblioteca": "Sua biblioteca.",
  };
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    headings[name],
  );
}

async function openPlaylist(page: Page, name: string) {
  await openMenu(page);
  await page
    .getByRole("complementary", { name: "Menu principal" })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name, exact: true, level: 1 }),
  ).toBeVisible();
}

async function createPlaylist(page: Page, name: string) {
  await navigate(page, "Sua biblioteca");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Criar playlist", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: playlistDialogName });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Nome da playlist" }).fill(name);
  await dialog
    .getByRole("button", { name: "Criar playlist", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name, exact: true, level: 1 }),
  ).toBeVisible();
}

async function addTrackToPlaylist(
  page: Page,
  title: string,
  playlistName: string,
) {
  await page
    .getByRole("button", {
      name: `Adicionar ${title} a uma playlist`,
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: addDialogName });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: new RegExp(`^${playlistName}\\b`) })
    .click();
  await dialog
    .getByRole("button", { name: "Fechar seleção de playlist", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

const rows = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("list", { name: "Faixas", exact: true })
    .getByRole("listitem");

test("creating a playlist from a track keeps it and deletion returns to the library", async ({
  page,
}) => {
  await page.goto("/#buscar");
  await page
    .getByRole("button", {
      name: "Adicionar Antes do sol a uma playlist",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", { name: addDialogName })
    .getByRole("button", { name: "Nova playlist", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: playlistDialogName });
  await dialog
    .getByRole("textbox", { name: "Nome da playlist" })
    .fill("Primeiro encontro");
  await dialog
    .getByRole("button", { name: "Criar playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Primeiro encontro", level: 1 }),
  ).toBeVisible();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Antes do sol");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Excluir playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sua biblioteca.", level: 1 }),
  ).toBeVisible();
  await page.reload();
  await openMenu(page);
  await expect(
    page
      .getByRole("complementary", { name: "Menu principal" })
      .getByRole("button", { name: "Primeiro encontro", exact: true }),
  ).toHaveCount(0);
});

test("volume, repeat and shuffle remain available on both layouts", async ({
  page,
}) => {
  const mobile = (page.viewportSize()?.width || 0) <= 760;
  if (mobile)
    await page
      .getByRole("button", { name: "Abrir fila de reprodução", exact: true })
      .click();
  const controls = mobile
    ? page.getByRole("complementary", { name: "Fila de reprodução" })
    : page.getByRole("region", { name: "Player de áudio" });
  const volume = controls.getByRole("slider", {
    name: mobile ? "Volume no celular" : "Volume",
    exact: true,
  });
  await volume.fill("0.4");
  await expect(volume).toHaveValue("0.4");
  const shuffle = controls.getByRole("button", {
    name: mobile ? "Reprodução aleatória no celular" : "Reprodução aleatória",
    exact: true,
  });
  await shuffle.click();
  await expect(shuffle).toHaveAttribute("aria-pressed", "true");
  await controls
    .getByRole("button", {
      name: mobile ? "Repetição no celular: desligada" : "Repetição: desligada",
      exact: true,
    })
    .click();
  await expect(
    controls.getByRole("button", {
      name: mobile ? "Repetição no celular: todas" : "Repetição: todas",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  if (mobile)
    await page
      .getByRole("button", { name: "Abrir fila de reprodução", exact: true })
      .click();
  await expect(volume).toHaveValue("0.4");
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("navigation, browser history, named dialogs and keyboard skip link", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Encontre sua frequência.",
  );
  await navigate(page, "Buscar");
  await expect(page).toHaveURL(/#buscar$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "O que você quer ouvir?",
  );
  await navigate(page, "Sua biblioteca");
  await expect(page).toHaveURL(/#biblioteca$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sua biblioteca.",
  );
  await page.goBack();
  await expect(page).toHaveURL(/#buscar$/);
  await expect(
    page.getByRole("textbox", { name: "Buscar músicas" }),
  ).toBeVisible();

  const routeBeforeSkip = page.url();
  const skip = page.getByRole("link", {
    name: "Pular para o conteúdo",
    exact: true,
  });
  await skip.focus();
  await skip.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  expect(page.url()).toBe(routeBeforeSkip);
  await expect(
    page.getByRole("textbox", { name: "Buscar músicas" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Sobre o projeto", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: infoDialogName });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Música, no seu ritmo." }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(dialog).not.toBeVisible();
});

test("search normalizes accents, combines genre filters and recovers from empty results", async ({
  page,
}) => {
  await navigate(page, "Buscar");
  const search = page.getByRole("textbox", { name: "Buscar músicas" });
  await expect(rows(page)).toHaveCount(6);
  await search.fill("  ORBITA  ");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Órbita lenta");
  await page.getByRole("button", { name: "Ambient", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nenhum som por esse nome" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(rows(page)).toHaveCount(6);
  await page.getByRole("button", { name: "Eletrônica", exact: true }).click();
  await expect(rows(page)).toHaveCount(2);
  await search.fill("galada lab");
  await expect(rows(page)).toHaveCount(2);
  await search.fill("nenhuma-faixa-com-esse-nome");
  await expect(
    page.getByRole("heading", { name: "Nenhum som por esse nome" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect(rows(page)).toHaveCount(6);
});

test("favorites persist after reload and can be removed", async ({ page }) => {
  await navigate(page, "Buscar");
  await page
    .getByRole("button", { name: "Favoritar Antes do sol", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Desfavoritar Antes do sol",
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "Sua biblioteca");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Antes do sol");
  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Desfavoritar Antes do sol", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sua próxima favorita está por aí" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sua próxima favorita está por aí" }),
  ).toBeVisible();
});

test("playlist creation, track membership and renaming persist", async ({
  page,
}) => {
  await createPlaylist(page, "Dias leves");
  await expect(
    page.getByRole("heading", {
      name: "Sua playlist está esperando os primeiros sons",
    }),
  ).toBeVisible();
  await navigate(page, "Buscar");
  await addTrackToPlaylist(page, "Antes do sol", "Dias leves");
  await addTrackToPlaylist(page, "Órbita lenta", "Dias leves");
  await openPlaylist(page, "Dias leves");
  await expect(rows(page)).toHaveCount(2);

  await page.getByRole("button", { name: "Renomear", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: playlistDialogName });
  await dialog
    .getByRole("textbox", { name: "Nome da playlist" })
    .fill("Manhã tranquila");
  await dialog
    .getByRole("button", { name: "Salvar nome", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Manhã tranquila", level: 1 }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Manhã tranquila", level: 1 }),
  ).toBeVisible();
  await expect(rows(page)).toHaveCount(2);

  await addTrackToPlaylist(page, "Órbita lenta", "Manhã tranquila");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Antes do sol");
  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Antes do sol");
});

test("real audio advances, pauses, seeks and switches tracks", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Ouvir seleção", exact: true })
    .click();
  const player = page.getByRole("region", { name: "Player de áudio" });
  const progress = player.getByRole("slider", { name: "Progresso da faixa" });
  await expect(
    player.getByRole("button", { name: "Pausar reprodução", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await progress.inputValue()), { timeout: 10_000 })
    .toBeGreaterThan(0.5);
  await player
    .getByRole("button", { name: "Pausar reprodução", exact: true })
    .click();
  await expect(
    player.getByRole("button", { name: "Iniciar reprodução", exact: true }),
  ).toBeVisible();
  const pausedTime = Number(await progress.inputValue());
  await expect
    .poll(async () => Number(await progress.inputValue()))
    .toBeCloseTo(pausedTime, 1);
  const progressBounds = await progress.boundingBox();
  expect(progressBounds).not.toBeNull();
  await progress.click({
    position: { x: progressBounds!.width * 0.5, y: progressBounds!.height / 2 },
  });
  await expect
    .poll(async () => Number(await progress.inputValue()))
    .toBeGreaterThan(8);
  const soughtTime = Number(await progress.inputValue());
  await player
    .getByRole("button", { name: "Iniciar reprodução", exact: true })
    .click();
  await expect
    .poll(async () => Number(await progress.inputValue()))
    .toBeGreaterThan(soughtTime + 0.3);
  await player
    .getByRole("button", { name: "Próxima faixa", exact: true })
    .click();
  await expect(player).toContainText("Órbita lenta");
  await expect
    .poll(async () => Number(await progress.inputValue()), { timeout: 10_000 })
    .toBeGreaterThan(0.3);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("imported audio persists with playlist membership and reopening does not duplicate it", async ({
  page,
}) => {
  await createPlaylist(page, "Meu som");
  await page.getByLabel("Selecionar arquivos de áudio").setInputFiles(demoFile);
  await expect(page).toHaveURL(/#biblioteca$/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("antes-do-sol");
  await addTrackToPlaylist(page, "antes-do-sol", "Meu som");
  await openPlaylist(page, "Meu som");
  await expect(rows(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Ouvir antes-do-sol", exact: true })
    .click();
  const progress = page.getByRole("slider", { name: "Progresso da faixa" });
  await expect
    .poll(async () => Number(await progress.inputValue()), { timeout: 10_000 })
    .toBeGreaterThan(0.3);
  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("antes-do-sol");
  await page.getByRole("button", { name: "Ouvir antes-do-sol", exact: true }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(0.3);
  await page.getByLabel("Selecionar arquivos de áudio").setInputFiles(demoFile);
  await expect(page).toHaveURL(/#biblioteca$/);
  await expect(rows(page)).toHaveCount(1);
  await openPlaylist(page, "Meu som");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("antes-do-sol");
  await expect(
    page.getByText("Algumas faixas desta playlist estão indisponíveis.", {
      exact: false,
    }),
  ).toHaveCount(0);
});

test("queue can remove and clear tracks, and the layout stays within the viewport", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Abrir fila de reprodução", exact: true })
    .click();
  const queue = page.getByRole("complementary", { name: "Fila de reprodução" });
  await expect(queue).toBeVisible();
  await expect(queue.getByRole("button", { name: / na fila$/ })).toHaveCount(6);
  await queue
    .getByRole("button", { name: "Remover Órbita lenta da fila", exact: true })
    .click();
  await expect(queue.getByRole("button", { name: / na fila$/ })).toHaveCount(5);
  await queue
    .getByRole("button", { name: "Limpar próximas faixas", exact: true })
    .click();
  await expect(queue.getByRole("button", { name: / na fila$/ })).toHaveCount(1);
  await expect(
    queue.getByRole("button", { name: "Limpar próximas faixas", exact: true }),
  ).toBeDisabled();
  const queueBounds = await queue.boundingBox();
  expect(queueBounds).not.toBeNull();
  expect(queueBounds!.x).toBeGreaterThanOrEqual(0);
  expect(queueBounds!.x + queueBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await queue.getByRole("button", { name: "Fechar fila", exact: true }).click();
  await expect(queue).not.toBeVisible();
  await navigate(page, "Buscar");
  await expect(rows(page)).toHaveCount(6);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
