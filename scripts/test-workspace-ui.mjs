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
  await open("Canon");
  const fieldStyle = input => {const s=getComputedStyle(input);return {width:input.getBoundingClientRect().width,height:input.getBoundingClientRect().height,radius:s.borderRadius,padding:s.padding,font:s.font,border:s.border,background:s.backgroundColor};};
  const searchStyle=await page.getByLabel("Find an entry",{exact:true}).evaluate(fieldStyle);
  await open("Home");
  assert.equal(await page.getByLabel("Pin a reference",{exact:true}).isVisible(),false);
  await page.getByRole("button",{name:"Edit pinned references",exact:true}).click();
  assert.equal(await page.getByLabel("Pin a reference",{exact:true}).isVisible(),true);
  assert.deepEqual(await page.getByLabel("Pin a reference",{exact:true}).evaluate(fieldStyle),searchStyle);
  await page.getByLabel("Pin a reference",{exact:true}).fill("Mira");
  await page.getByRole("option",{name:"02 Character/Mira.md",exact:true}).click();
  await page.getByRole("heading", { name: "Pinned References" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Unpin" }).count(), 1);
  await page.getByRole("button",{name:"Finish editing pinned references",exact:true}).click();
  assert.equal(await page.getByLabel("Pin a reference",{exact:true}).isVisible(),false);
  assert.equal(await page.getByRole("button", { name: "Unpin" }).count(), 0);
  assert.match(await page.locator(".marginalia-home-pins .marginalia-entry-card").textContent(),/Mira/);
  await page.getByRole("button",{name:"Edit pinned references",exact:true}).click();
  await page.getByRole("button", { name: "Unpin" }).click();
  assert.equal(await page.getByRole("button", { name: "Unpin" }).count(), 0);
  await page.getByRole("button",{name:"Finish editing pinned references",exact:true}).click();
  assert.equal(await page.getByLabel("Pin a reference",{exact:true}).isVisible(),false);
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
  await page.goto(url);
  await page.setViewportSize({width:1440,height:1000});
  for(const name of ["Home","Brainstorms","Canon","Projects","Crypt","Research","Collections","Ideas","Templates"]) {
    await open(name);
    assert.equal(await page.locator("main").getByRole("button",{name:"New Entry",exact:true}).count(),1,name);
  }
  await open("Brainstorms");
  await page.getByRole("button",{name:"New Entry",exact:true}).click();
  let form=page.getByRole("dialog");
  assert.equal(await form.getByLabel("Entry type",{exact:true}).inputValue(),"Brainstorm");
  assert.equal(await form.getByLabel("Subtype",{exact:true}).count(),0);
  assert.equal(await form.getByLabel("Destination folder",{exact:true}).inputValue(),"00 Brainstorms");
  await form.getByLabel("Entry title",{exact:true}).fill("A new idea");
  await form.getByRole("button",{name:"Create entry",exact:true}).click();
  await page.getByText("A new idea",{exact:true}).waitFor();
  assert.match(await page.locator("#opened").textContent(),/00 Brainstorms\/A new idea.md/);
  await page.evaluate(()=>window.workspaceFixture.setup());
  const setup=page.getByRole("dialog");
  await setup.getByRole("button",{name:"Add canon type",exact:true}).click();
  const row=setup.getByRole("table",{name:"Canon type routes"}).locator("tr").last();
  const inputs=row.locator("input");
  await inputs.nth(0).fill("Creature");await inputs.nth(1).fill("World/Creatures");await inputs.nth(2).fill("Creatures");await inputs.nth(3).fill("_templates/Character template.md");
  await setup.getByRole("button",{name:"Save setup",exact:true}).click();
  await open("Canon");await page.getByRole("tab",{name:"Creature",exact:true}).waitFor();
  await page.getByRole("button",{name:"New Entry",exact:true}).click();
  form=page.getByRole("dialog");
  await form.getByLabel("Subtype",{exact:true}).selectOption("Creature");
  assert.equal(await form.getByLabel("Destination folder",{exact:true}).inputValue(),"World/Creatures");
  assert.equal(await form.getByLabel("Entry template",{exact:true}).inputValue(),"_templates/Character template.md");
  await form.getByLabel("Entry title",{exact:true}).fill("New Creature");
  await form.getByLabel("Entry template",{exact:true}).fill("Char");
  await form.getByLabel("Entry template",{exact:true}).press("ArrowDown");
  await form.getByLabel("Entry template",{exact:true}).press("Enter");
  assert.equal(await form.getByLabel("Entry template",{exact:true}).inputValue(),"_templates/Character template.md");
  await form.getByRole("button",{name:"Create entry",exact:true}).click();
  await page.getByRole("tab",{name:"Creature",exact:true}).click();
  assert.equal(await page.locator(".marginalia-entry-card").count(),1);
  assert.match(await page.locator(".marginalia-entry-card").textContent(),/New Creature/);
  assert.match(await page.evaluate(()=>window.workspaceFixture.sources()["World/Creatures/New Creature.md"]),/creature/);
  await open("Projects");await page.getByRole("button",{name:"New Entry",exact:true}).click();
  form=page.getByRole("dialog");
  assert.deepEqual(await form.getByLabel("Entry type",{exact:true}).locator("option").allTextContents(),["Brainstorm","Canon","Project"]);
  assert.deepEqual((await form.getByLabel("Subtype",{exact:true}).locator("option").allTextContents()).slice(0,6),["New Project","Overview","Outline","Plot Point","Script","Note"]);
  await form.getByLabel("Entry title",{exact:true}).fill("New Project");
  await form.getByRole("button",{name:"Create entry",exact:true}).click();
  await page.locator(".marginalia-project-card").filter({hasText:"New Project"}).waitFor();
  assert.match(await page.locator("#opened").textContent(),/08 Projects\/New Project\/Overview.md/);
  await page.evaluate(()=>window.workspaceFixture.setHiddenFolders([]));
  await open("Assets");
  await page.getByRole("heading",{name:"Assets",exact:true}).waitFor();
  assert.match(await page.locator(".marginalia-entry-card").textContent(),/Never list assets/);
  await page.evaluate(()=>window.workspaceFixture.setHiddenFolders(["_Assets","_Research"]));
  assert.equal(await nav().getByRole("button",{name:"Assets",exact:true}).count(),0);
  assert.equal(await nav().getByRole("button",{name:"Research",exact:true}).count(),0);
  await page.getByRole("heading",{name:"Copper Sky workspace",exact:true}).waitFor();
  await page.evaluate(()=>window.workspaceFixture.setHiddenFolders(["_Assets"]));
  await nav().getByRole("button",{name:"Research",exact:true}).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Workspace checks passed: live pages, World/Storyboard menus, Canon/Brainstorm/project tabs, cards and native links, pins, search, module presentation, light/dark and narrow layout.",
  );
} finally {
  await browser.close();
}
