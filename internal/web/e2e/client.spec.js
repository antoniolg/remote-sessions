import { expect, test } from "@playwright/test";
import { computers, pairingLink } from "./servers.js";

const { alpha, beta } = computers;
const betaOrigin = `https://127.0.0.1:${beta.port}`;

/** Pairs computers by writing the store directly, as a returning visitor would have it. */
async function paired(page, list, current) {
  await page.goto("/app/");
  await page.evaluate(([list, current]) => {
    localStorage.setItem("remote-sessions.computers", JSON.stringify(list));
    if (current) localStorage.setItem("remote-sessions.current", current);
  }, [list, current]);
  await page.goto("/app/");
}

const alphaEntry = () => ({ id: alpha.id, name: alpha.name, origin: `https://127.0.0.1:${alpha.port}`, token: alpha.token });
const betaEntry = () => ({ id: beta.id, name: beta.name, origin: betaOrigin, token: beta.token });
const cards = (page) => page.locator("#sessions li:not(.skeleton)");

test("pairs this page's computer from a pasted link and lists its conversations, newest first", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.locator("#pair")).toBeVisible();
  await page.fill("#pair-input", pairingLink(alpha));
  await page.click("#pair-save");
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).nth(0)).toContainText("Fix the login form");
  await expect(cards(page).nth(1)).toContainText("Add rate limiting");
  await expect(page.locator("#computer")).toHaveValue(alpha.id);
});

test("rejects a link that is not a pairing link", async ({ page }) => {
  await page.goto("/app/");
  await page.fill("#pair-input", "https://example.com");
  await page.click("#pair-save");
  await expect(page.locator("#pair-error")).toHaveText("That is not a pairing link.");
});

test("search and project filter narrow the list and live in the address", async ({ page }) => {
  await paired(page, [alphaEntry()]);
  await expect(cards(page)).toHaveCount(2);
  await page.fill("#search", "rate");
  await expect(cards(page)).toHaveCount(1);
  await expect(page).toHaveURL(/\?q=rate$/);
  await page.fill("#search", "nothing like this");
  await expect(page.locator("#list-status")).toHaveText("No conversation matches.");
  await page.fill("#search", "");
  await page.selectOption("#project", "web");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText("Fix the login form");
  await page.reload();
  await expect(page.locator("#project")).toHaveValue("web");
  await expect(cards(page)).toHaveCount(1);
});

test("opens a conversation with its messages and the tools used", async ({ page }) => {
  await paired(page, [alphaEntry()]);
  await cards(page).filter({ hasText: "Fix the login form" }).click();
  await expect(page.locator("#title")).toHaveText("Fix the login form");
  await expect(page.locator("#detail-meta")).toHaveText(`${alpha.name} · /work/web`);
  await expect(page.locator("#messages li.user")).toHaveText("The login form rejects valid emails");
  await expect(page.locator("#messages li.assistant")).toContainText("Fixed the email regex.");
  await expect(page.locator("#messages li.assistant .tools")).toHaveText("⚙ Read");
  await page.goBack();
  await expect(cards(page)).toHaveCount(2);
});

test("adds a second computer and merges both lists under All computers", async ({ page }) => {
  await paired(page, [alphaEntry()]);
  await page.selectOption("#computer", "add");
  await expect(page.locator("#pair")).toBeVisible();
  await page.fill("#pair-input", pairingLink(beta));
  await page.click("#pair-save");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText("Weekly notes");
  // Reached at its own address: the page's server has no proxy route for it.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("remote-sessions.computers")).map((c) => c.origin)))
    .toContain("https://127.0.0.1:18788");
  await page.selectOption("#computer", "all");
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).filter({ hasText: "Weekly notes" })).toContainText(beta.name);
  await expect(page).toHaveURL(/computer=all/);
  await expect(page.locator("#new")).toBeHidden();
});

test("settings select and forget computers", async ({ page }) => {
  await paired(page, [alphaEntry(), betaEntry()], alpha.id);
  await page.click("#settings-open");
  const rows = page.locator("#computers li");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: alpha.name })).toContainText("✓");
  await expect(page.locator("#version")).not.toBeEmpty();
  page.once("dialog", (dialog) => dialog.accept());
  await rows.filter({ hasText: beta.name }).getByRole("button", { name: "Forget" }).click();
  await expect(rows).toHaveCount(1);
  await rows.first().click();
  await expect(cards(page)).toHaveCount(2);
});

test("a new conversation offers recent projects and browses the computer's folders", async ({ page }) => {
  await paired(page, [alphaEntry()]);
  await expect(cards(page)).toHaveCount(2);
  await page.click("#new");
  await expect(page.locator("#title")).toHaveText(`New conversation on ${alpha.name}`);
  await expect(page.locator("#recent li")).toHaveCount(2);
  await expect(page.locator("#recent li").first()).toContainText("/work/web");
  await expect(page.locator("#folders li")).toHaveText(["📁 Documents", "📁 Projects"]);
  await page.locator("#folders li", { hasText: "Projects" }).click();
  await expect(page.locator("#folder-path")).toHaveText(/Projects$/);
  await expect(page.locator("#folders li")).toHaveText(["‹ ..", "📁 api", "📁 web"]);
});

test("a computer that rejects its key is forgotten and the page asks to pair again", async ({ page }) => {
  await paired(page, [{ ...alphaEntry(), token: "revoked-by-pair-rotate" }]);
  await expect(page.locator("#pair")).toBeVisible();
  await expect(page.locator("#pair-error")).toHaveText(`${alpha.name} did not accept the key. Pair it again.`);
});

test("start waits for the folder listing and shows nothing stale when it fails", async ({ page }) => {
  await paired(page, [alphaEntry()]);
  await expect(cards(page)).toHaveCount(2);
  let release;
  const held = new Promise((done) => { release = done; });
  await page.route("**/v1/folders**", async (route) => { await held; await route.continue(); });
  await page.click("#new");
  await expect(page.locator("#create-start")).toBeHidden();
  release();
  await expect(page.locator("#create-start")).toBeVisible();
  await page.unroute("**/v1/folders**");
  await page.route("**/v1/folders**", (route) => route.fulfill({ status: 400, contentType: "application/json", body: '{"code":"outside_home","error":"x"}' }));
  await page.locator("#folders li", { hasText: "Projects" }).click();
  await expect(page.locator("#folder-path")).toHaveText("Only folders inside your home folder can be used.");
  await expect(page.locator("#folders li")).toHaveCount(0);
  await expect(page.locator("#create-start")).toBeHidden();
});

test("an unreachable computer shows its error without claiming there are no conversations", async ({ page }) => {
  await paired(page, [{ ...betaEntry(), origin: "https://127.0.0.1:1" }]);
  await expect(page.locator("#list-status")).toContainText("Cannot reach Beta Box");
  await expect(page.locator("#list-status")).not.toContainText("No conversations yet.");
});

test("All computers waits for every computer before showing rows, so they do not jump", async ({ page }) => {
  await paired(page, [alphaEntry(), betaEntry()], "all");
  await page.route(`${betaOrigin}/v1/sessions`, async (route) => {
    await new Promise((done) => setTimeout(done, 1000));
    await route.continue();
  });
  await page.reload();
  await page.waitForTimeout(500);
  // Alpha has answered by now, but its rows wait for Beta.
  await expect(cards(page)).toHaveCount(0);
  await expect(cards(page)).toHaveCount(3);
});

test("a slow computer does not hold the others for long", async ({ page }) => {
  await paired(page, [alphaEntry(), betaEntry()], "all");
  await page.route(`${betaOrigin}/v1/sessions`, async (route) => {
    await new Promise((done) => setTimeout(done, 4000));
    await route.continue();
  });
  await page.reload();
  await expect(cards(page)).toHaveCount(2, { timeout: 3500 });
  await expect(page.locator("#sessions li.skeleton").first()).toBeVisible();
  await expect(cards(page)).toHaveCount(3, { timeout: 6000 });
});

test.describe("in Spanish", () => {
  test.use({ locale: "es-ES" });

  test("the page follows the browser's language", async ({ page }) => {
    await page.goto("/app/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("#pair-save")).toHaveText("Vincular");
    await page.fill("#pair-input", "no es un enlace");
    await page.click("#pair-save");
    await expect(page.locator("#pair-error")).toHaveText("Esto no es un enlace de vinculación.");
    await page.fill("#pair-input", pairingLink(alpha));
    await page.click("#pair-save");
    await expect(cards(page)).toHaveCount(2);
    await expect(page.locator("#search")).toHaveAttribute("placeholder", "Buscar conversaciones");
    await expect(page.locator("#project option").first()).toHaveText("Todos los proyectos");
    await page.click("#settings-open");
    await expect(page.locator("#title")).toHaveText("Ajustes");
    await expect(page.getByRole("button", { name: "Olvidar" })).toBeVisible();
  });
});
