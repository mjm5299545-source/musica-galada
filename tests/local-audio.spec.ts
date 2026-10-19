import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const audioFile = resolve("public/media/antes-do-sol.mp3");

for (const failure of ["unavailable", "quota"] as const) {
  test(`local audio plays for the session when IndexedDB is ${failure}`, async ({ page }) => {
    await page.addInitScript(mode => {
      if (mode === "unavailable") {
        Object.defineProperty(window, "indexedDB", { value: undefined });
      } else {
        IDBObjectStore.prototype.put = () => { throw new DOMException("Storage full", "QuotaExceededError"); };
      }
    }, failure);
    await page.goto("/");
    // Import is enabled after restoration has completed, including a failed restoration.
    await expect(page.getByRole("button", { name: "Abrir áudio local", exact: true })).toBeEnabled();
    await page.getByLabel("Selecionar arquivos de áudio").setInputFiles(audioFile);
    const rows = page.getByRole("list", { name: "Faixas", exact: true }).getByRole("listitem");
    await expect(rows).toHaveCount(1);
    await expect(page.getByRole("status").filter({ hasText: "Não foi possível salvar ou recuperar" })).toBeVisible();
    await page.getByRole("button", { name: "Ouvir antes-do-sol", exact: true }).click();
    const progress = page.getByRole("slider", { name: "Progresso da faixa" });
    await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(0.3);
    await page.reload();
    await expect(page.getByRole("button", { name: "Abrir áudio local", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Arquivos locais 0", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seu som também tem lugar aqui" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ouvir antes-do-sol", exact: true })).toHaveCount(0);
  });
}
