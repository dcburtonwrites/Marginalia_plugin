import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MARGINALIA_PLAYWRIGHT || "playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = pathToFileURL(resolve(".preview/workspace.html")).href;
const nav = () =>
  page.getByRole("navigation", { name: "Marginalia navigation" });
const open = async (name) => {
  await nav().getByRole("button", { name, exact: true }).click();
};
try {
  await page.goto(url);
  await page.getByRole("heading", { name: "Continue Writing" }).waitFor();
  assert.ok(await page.getByLabel("Vault files").isVisible());
  assert.deepEqual(await nav().getByRole("button").allTextContents(), [
    "Home",
    "Brainstorms",
    "Canon",
    "Projects",
    "Crypt",
    "Research",
    "Collections",
    "Ideas",
    "Templates",
  ]);
  await open("Ideas");
  await page.getByRole("tab", { name: "Signals", exact: true }).click();
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Glass map/,
  );
  await open("Templates");
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Character template/,
  );
  await open("Home");
  await page.screenshot({
    path: resolve("design/verification/app-home-light.png"),
  });
  await open("Canon");
  assert.equal(await page.locator(".marginalia-entry-card").count(), 3);
  await page.getByRole("tab", { name: "Character", exact: true }).click();
  assert.equal(await page.locator(".marginalia-entry-card").count(), 2);
  await page.getByLabel("Include project entries").uncheck();
  assert.equal(await page.locator(".marginalia-entry-card").count(), 1);
  await page.getByRole("searchbox", { name: "Find an entry" }).fill("absent");
  await page.getByText("No entries in this view yet.").waitFor();
  await page.getByRole("searchbox").fill("");
  await page.getByRole("tab", { name: "All Entries" }).click();
  await page.getByLabel("Include project entries").check();
  await page.screenshot({
    path: resolve("design/verification/app-canon-light.png"),
  });
  await page
    .locator(".marginalia-entry-card")
    .filter({ hasText: "Mira" })
    .click();
  assert.match(await page.locator("#opened").textContent(), /Mira.md/);
  await open("Brainstorms");
  await page.getByRole("tab", { name: "Inspiration", exact: true }).click();
  assert.equal(await page.locator(".marginalia-entry-card").count(), 1);
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Copper idea/,
  );
  await open("Projects");
  await page.getByRole("button", { name: /Copper Sky Drafting/ }).click();
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  assert.equal(await page.locator(".marginalia-entry-card").count(), 1);
  await page.getByRole("button", { name: "Write in Script Studio" }).click();
  assert.match(
    await page.locator("#opened").textContent(),
    /08 Projects\/Copper Sky/,
  );
  await open("Home");
  await page.getByLabel("Pin a reference").selectOption({ label: "Mira" });
  await page.getByRole("heading", { name: "Pinned References" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Unpin" }).count(), 1);
  await page.getByRole("button", { name: "Unpin" }).click();
  assert.equal(await page.getByRole("button", { name: "Unpin" }).count(), 0);
  await page.getByRole("button", { name: "Toggle Navigation" }).click();
  assert.equal(await nav().count(), 0);
  assert.ok(await page.getByLabel("Vault files").isVisible());
  await page.getByRole("button", { name: "Toggle Navigation" }).click();
  await page.getByRole("button", { name: "Toggle Colors" }).click();
  assert.equal(
    await page
      .locator("body")
      .evaluate((e) => e.classList.contains("marginalia-theme")),
    false,
  );
  await page.getByRole("button", { name: "Toggle Colors" }).click();
  await page.getByRole("button", { name: "Toggle Theme", exact: true }).click();
  assert.equal(await nav().count(), 0);
  assert.ok(await page.getByLabel("Vault files").isVisible());
  await page.getByRole("button", { name: "Toggle Theme", exact: true }).click();
  await page.evaluate(() => {
    document.body.classList.replace("theme-light", "theme-dark");
  });
  await open("Canon");
  await page.screenshot({
    path: resolve("design/verification/app-canon-dark.png"),
  });
  await page.setViewportSize({ width: 800, height: 900 });
  assert.equal(
    await page.locator("main").evaluate((e) => e.scrollWidth > e.clientWidth),
    false,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url + "?storyboard");
  await nav()
    .getByRole("button", { name: "Project Register", exact: true })
    .waitFor();
  assert.equal(
    await nav().getByRole("button", { name: "Canon", exact: true }).count(),
    0,
  );
  await open("Project Register");
  await page.getByRole("table", { name: "Project metadata" }).waitFor();
  assert.deepEqual(
    await page
      .getByRole("tablist", { name: "Project Register categories" })
      .getByRole("tab")
      .allTextContents(),
    [
      "All Entries",
      "Foraged",
      "Dried",
      "Ground",
      "Brewed",
      "Distilled",
      "Bottled",
      "Drafting",
      "Unassigned",
    ],
  );
  await page.getByRole("tab", { name: "Foraged", exact: true }).click();
  await page.getByText("No projects in this view yet.").waitFor();
  await page.getByRole("tab", { name: "Drafting", exact: true }).click();
  assert.match(await page.getByRole("table").textContent(), /Copper Sky/);
  await page.evaluate(() =>
    window.workspaceFixture.setStatusFlow("progress", ["Bottled", "Foraged"]),
  );
  await page.getByRole("tab", { name: "Bottled", exact: true }).click();
  assert.match(await page.getByRole("table").textContent(), /Bottled/);
  assert.equal(
    await page.getByRole("tab", { name: "Drafting", exact: true }).count(),
    0,
  );
  await open("Projects");
  assert.match(
    await page.locator(".marginalia-project-card").filter({hasText:"Copper Sky"}).textContent(),
    /Bottled/,
  );
  await page.evaluate(() =>
    window.workspaceFixture.setStatusFlow("stage", [
      "Foraged",
      "Dried",
      "Ground",
      "Brewed",
      "Distilled",
      "Bottled",
    ]),
  );
  await open("Project Register");
  assert.deepEqual(await nav().getByRole("button").allTextContents(), [
    "Home",
    "Project Register",
    "Projects",
    "Crypt",
    "Research",
    "Collections",
    "Ideas",
    "Templates",
  ]);
  for (const name of ["Crypt", "Research", "Collections"]) {
    assert.equal(
      await page
        .locator("main")
        .getByRole("button", { name, exact: true })
        .count(),
      0,
    );
  }
  assert.match(await page.getByRole("table").textContent(), /Copper Sky/);
  assert.match(await page.getByRole("table").textContent(), /Revise Opening/);
  await page.screenshot({
    path: resolve("design/verification/app-storyboard-register.png"),
  });
  await open("Crypt");
  assert.equal(
    await nav()
      .getByRole("button", { name: "Crypt", exact: true })
      .getAttribute("aria-current"),
    "page",
  );
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Lost signal/,
  );
  await open("Research");
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Cloud study/,
  );
  await open("Collections");
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Reference shelf/,
  );
  await page.evaluate(() => window.workspaceFixture.restoreLegacySection());
  await page.getByRole("heading", { name: "Crypt", exact: true }).waitFor();
  assert.match(
    await page.locator(".marginalia-entry-card").textContent(),
    /Lost signal/,
  );
  await page.evaluate(() => window.workspaceFixture.createFolder("_Workshop"));
  await open("Workshop");
  await page.getByText("No entries in this view yet.").waitFor();
  await page.evaluate(() =>
    window.workspaceFixture.renameFolder("_Workshop", "_Workbench"),
  );
  await page.getByRole("heading", { name: "Workbench", exact: true }).waitFor();
  assert.equal(
    await nav().getByRole("button", { name: "Workshop", exact: true }).count(),
    0,
  );
  await page.evaluate(() => window.workspaceFixture.deleteFolder("_Workbench"));
  await page
    .getByRole("heading", { name: "Continue Writing", exact: true })
    .waitFor();
  assert.equal(
    await nav().getByRole("button", { name: "Workbench", exact: true }).count(),
    0,
  );
  assert.ok(await page.getByLabel("Vault files").isVisible());
  await page.getByRole("button", { name: "Toggle Storyboard" }).click();
  await nav().getByRole("button", { name: "Canon", exact: true }).waitFor();
  assert.equal(
    await nav()
      .getByRole("button", { name: "Project Register", exact: true })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Workspace checks passed: live pages, World/Storyboard menus, Canon/Brainstorm/project tabs, cards and native links, pins, search, module presentation, light/dark and narrow layout.",
  );
} finally {
  await browser.close();
}
