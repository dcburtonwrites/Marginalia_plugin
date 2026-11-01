import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MARGINALIA_PLAYWRIGHT || "playwright");
const browser = await chromium.launch({ headless: true });
const folder = resolve("design/verification");
await mkdir(folder, { recursive: true });
const url = pathToFileURL(resolve(".preview/index.html")).href;
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(url);
  await page.getByRole("heading", { name: "Librarian", exact: true }).waitFor();
  assert.equal(
    await page.locator(".marginalia-entry-action").count(),
    0,
    "Ask is conversational",
  );
  await page.screenshot({ path: resolve(folder, "librarian-light.png") });
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  assert.equal(await page.locator(".marginalia-entry-action").count(), 2);
  await page.getByRole("button", { name: "Pin", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Unpin", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page
    .getByRole("button", { name: "Entry Enhancement", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Insert into note", exact: true })
    .waitFor();
  await page.locator(".marginalia-sources summary").click();
  await page.screenshot({ path: resolve(folder, "enhancement-review.png") });
  await page
    .getByRole("button", { name: "Insert into note", exact: true })
    .click();
  assert.match(
    await page.locator("#note-summary").textContent(),
    /keeper of the archive/,
  );
  assert.equal(await page.locator(".marginalia-suggestion").count(), 0);
  await page.getByRole("tab", { name: "Ask", exact: true }).click();
  assert.equal(await page.locator(".marginalia-entry-action").count(), 0);
  await page
    .getByRole("textbox", { name: "Ask the Librarian", exact: true })
    .fill("What is established?");
  await page
    .getByRole("textbox", { name: "Ask the Librarian", exact: true })
    .press("Enter");
  assert.equal(await page.locator(".marginalia-message").count(), 2);
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  assert.equal(await page.locator(".marginalia-message").count(), 0);
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Entry Expansion", exact: false })
    .click();
  assert.equal(await page.locator(".marginalia-library-item").count(), 1);
  assert.equal(
    await page.locator(".marginalia-entry-action").count(),
    0,
    "Library browses saved outputs",
  );
  await page.goto(url + "?theme=dark");
  await page.screenshot({ path: resolve(folder, "librarian-dark.png") });
  await page.setViewportSize({ width: 300, height: 850 });
  await page.goto(url + "?theme=dark&tab=review");
  await page
    .getByRole("button", { name: "Insert into note", exact: true })
    .waitFor();
  const overflow = await page
    .locator("#sidebar")
    .evaluate((e) => e.scrollWidth > e.clientWidth);
  assert.equal(overflow, false, "Sidebar should not overflow at 300px");
  await page.screenshot({ path: resolve(folder, "review-narrow.png") });
  await page.goto(url + "?empty=1");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Entry Enhancement", exact: false })
      .isDisabled(),
    true,
  );
  const scriptsURL = pathToFileURL(resolve(".preview/scripts.html")).href;
  await page.setViewportSize({ width: 1280, height: 920 });
  await page.goto(scriptsURL);
  const scriptNames = () =>
    page.locator(".marginalia-script-name").allTextContents();
  await page
    .getByRole("heading", { name: "Script Studio", exact: true })
    .waitFor();
  assert.deepEqual(
    await scriptNames(),
    [],
    "no unrelated scripts before session selection",
  );
  assert.equal(
    await page.locator(".marginalia-writing-footer").isVisible(),
    false,
  );
  assert.equal(await page.locator("main .marginalia-studio").count(), 0);
  assert.equal(await page.getByRole("combobox", {name:"Project or grouping"}).isVisible(), true);
  assert.match(await page.locator("main").textContent(), /Native Obsidian editing/);
  await page.screenshot({ path: resolve(folder, "script-studio-home.png") });
  await page.getByRole("combobox", {name:"Project or grouping"}).selectOption({label:"Copper Sky · All groupings"});
  await page.waitForFunction(
    () => document.querySelectorAll(".marginalia-script-name").length === 2,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Projects/Harbor", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.locator(".marginalia-writing-clock").textContent(),
    "25:00",
  );

  assert.equal(await page.getByText("View options",{exact:true}).count(),0);
  const display=page.locator('.marginalia-content-controls');
  await display.locator('summary').hover();
  await page.getByLabel('Panel descriptions',{exact:true}).uncheck();
  assert.ok(await page.locator('.marginalia-hide-panels').count()>0);
  await page.getByLabel('Panel descriptions',{exact:true}).check();
  assert.equal(await page.locator('.marginalia-hide-panels').count(),0);
  assert.deepEqual(await scriptNames(), ["Opening", "After the Bell"]);
  assert.equal(
    await page.getByRole("button", { name: "Refresh", exact: true }).count(),
    0,
  );
  assert.match(
    await page.locator(".marginalia-script-file").first().textContent(),
    /4 actual \/ 4 declared/,
  );
  assert.equal(
    await page
      .locator(".marginalia-script-file")
      .first()
      .getByRole("button", {
        name: "Panel 1 — The arrival",
        exact: true,
        includeHidden: true,
      })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: /^(Move script (up|down)|Open script|Open page)$/,
      })
      .count(),
    0,
  );
  const first = page.locator(".marginalia-script-file").first();
  assert.equal(
    await first.locator(":scope > .marginalia-outline-children").isVisible(),
    false,
  );
  await first.getByRole("button", { name: "Opening", exact: true }).click();
  assert.match(
    await page.locator("main").textContent(),
    /Editing .*Opening.md/,
  );
  assert.equal(
    await first.locator(":scope > .marginalia-outline-children").isVisible(),
    false,
    "name opens note without expanding",
  );
  await first
    .getByRole("button", { name: "Expand or collapse Opening", exact: true })
    .click();
  const page4 = first.locator(".marginalia-script-page").nth(2);
  assert.equal(
    await page4.locator(".marginalia-script-side").textContent(),
    "Left",
  );
  await first.getByRole("button", { name: "Page 1", exact: true }).click();
  assert.match(await page.locator("main").textContent(), /at line 5/);
  assert.equal(
    await first
      .getByRole("button", { name: "Expand or collapse Page 1", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(await first.getByRole("button", {name:"Panel 1 — The arrival",exact:true}).isVisible(),false);
  await first.getByRole("button",{name:"Expand or collapse Page 1",exact:true}).click();
  assert.equal(await first.getByRole("button", {name:"Panel 1 — The arrival",exact:true}).isVisible(),true);
  await first
    .getByRole("button", { name: "Expand or collapse Page 1", exact: true })
    .click();
  assert.equal(
    await first
      .getByRole("button", { name: "Panel 1 — The arrival", exact: true })
      .isVisible(),
    false,
  );
  await first
    .getByRole("button", { name: "Expand or collapse Page 1", exact: true })
    .click();
  await page
    .locator(".marginalia-script-name")
    .first()
    .dragTo(page.locator(".marginalia-script-name").nth(1));
  await page.waitForFunction(
    () =>
      document.querySelector(".marginalia-script-name")?.textContent ===
      "After the Bell",
  );
  assert.deepEqual(await scriptNames(), ["After the Bell", "Opening"]);
  let texts = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("script-texts")),
  );
  assert.match(
    texts["Projects/Copper Sky/Scripts/Opening.md"],
    /Preceded By: "\[\[Projects\/Copper Sky\/Scripts\/After the Bell\]\]"/,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Script Studio", exact: true }).waitFor();
  assert.deepEqual(await scriptNames(), ["After the Bell", "Opening"]);
  await page
    .getByRole("button", { name: "Projects/Copper Sky", exact: true })
    .click();
  await page.locator(".marginalia-project-script").nth(1).waitFor();
  assert.deepEqual(
    await page.locator(".marginalia-project-script-link").allTextContents(),
    ["After the Bell", "Opening"],
  );
  assert.match(await page.locator("main").textContent(), /The arrival/);
  await page
    .locator(".marginalia-script-name")
    .nth(1)
    .dragTo(page.locator(".marginalia-script-name").first());
  await page.waitForFunction(
    () =>
      document.querySelector(".marginalia-script-name")?.textContent ===
      "Opening",
  );
  assert.deepEqual(await scriptNames(), ["Opening", "After the Bell"]);
  await page
    .getByRole("button", { name: "Expand or collapse Opening", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Projects/Copper Sky", exact: true })
    .click();
  await page.locator(".marginalia-project-script").nth(1).waitFor();
  assert.deepEqual(
    await page.locator(".marginalia-project-script-link").allTextContents(),
    ["Opening", "After the Bell"],
  );
  await page.screenshot({
    path: resolve(folder, "scripts-organizer-light.png"),
  });
  await page.goto(scriptsURL + "?theme=dark");
  await page.getByRole("heading", { name: "Script Studio", exact: true }).waitFor();
  await page.screenshot({
    path: resolve(folder, "scripts-organizer-dark.png"),
  });
  await page.setViewportSize({ width: 300, height: 850 });
  await page.reload();
  await page.getByRole("heading", { name: "Script Studio", exact: true }).waitFor();
  assert.equal(
    await page
      .locator("#sidebar")
      .evaluate((e) => e.scrollWidth > e.clientWidth),
    false,
  );
  await page.screenshot({
    path: resolve(folder, "scripts-organizer-narrow.png"),
  });
  await page.evaluate(() => {
    localStorage.removeItem("script-orders");
    localStorage.removeItem("script-texts");
  });
  await page.goto(scriptsURL + "?conflict");
  await page.locator(".marginalia-script-warning").waitFor();
  assert.match(
    await page.locator(".marginalia-script-warning").textContent(),
    /missing script/,
  );
  await page
    .locator(".marginalia-script-name")
    .first()
    .dragTo(page.locator(".marginalia-script-name").nth(1));
  await page.waitForFunction(
    () => document.querySelectorAll(".marginalia-script-warning").length === 0,
  );

  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.setViewportSize({ width: 1280, height: 920 });
  await page.goto(scriptsURL + "?studio");
  await page
    .getByRole("heading", { name: "Script Studio", exact: true })
    .waitFor();
  await page.getByRole("combobox", {name:"Project or grouping"}).selectOption({label:"Copper Sky · All groupings"});
  await page.waitForFunction(
    () => document.querySelectorAll(".marginalia-script-name").length === 3,
  );
  assert.deepEqual(
    await page
      .locator(
        ".marginalia-script-group > .marginalia-outline-row > .marginalia-outline-name",
      )
      .allTextContents(),
    ["Draft", "Revision"],
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Projects/Harbor", exact: true })
      .count(),
    0,
  );

  await page
    .getByRole("heading", { name: "Script Studio", exact: true })
    .waitFor();
  await page.getByRole("combobox", {name:"Project or grouping"}).selectOption({label:"Copper Sky > Draft"});
  await page.waitForFunction(
    () => document.querySelectorAll(".marginalia-script-name").length === 2,
  );
  assert.deepEqual(await scriptNames(), ["Opening", "After the Bell"]);
  assert.equal(
    await page.getByRole("button", { name: "Revision", exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Writing settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Writing settings" });
  await dialog
    .getByRole("spinbutton", {
      name: "Countdown duration in minutes",
      exact: true,
    })
    .fill("1");
  await dialog
    .getByRole("spinbutton", { name: "Daily word goal", exact: true })
    .fill("10");
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  assert.equal(
    await page.locator(".marginalia-writing-clock").textContent(),
    "01:00",
  );
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".marginalia-writing-clock")?.textContent ===
      "00:59",
  );
  await page.getByRole("button", { name: "Pause timer", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Start timer", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
    "timer toggle retains keyboard focus",
  );
  await page
    .locator(".marginalia-script-name")
    .filter({ hasText: "Opening" })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Script editor",
    exact: true,
  });
  const original = await editor.inputValue();
  await editor.fill(original + "\nNew words appear here.");
  await page.waitForFunction(
    () =>
      document.querySelector(".marginalia-writing-count")?.textContent ===
      "4 / 10 words",
  );
  assert.equal(
    await page
      .getByRole("progressbar", { name: "Daily word goal", exact: true })
      .getAttribute("value"),
    "4",
  );
  await page
    .getByRole("button", { name: "Writing settings", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Word goal counts", exact: true })
    .selectOption("current-project");
  await dialog
    .getByRole("spinbutton", { name: "Daily word goal", exact: true })
    .fill("20");
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".marginalia-writing-label")?.textContent ===
      "Today · Copper Sky",
  );
  assert.equal(
    await page.locator(".marginalia-writing-count").textContent(),
    "4 / 20 words",
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Script Studio", exact: true })
    .waitFor();
  assert.deepEqual(await scriptNames(), ["Opening", "After the Bell"]);
  assert.equal(
    await page.locator(".marginalia-writing-count").textContent(),
    "4 / 20 words",
  );
  assert.equal(
    await page.locator(".marginalia-writing-clock").textContent(),
    "00:59",
  );
  await page
    .getByRole("button", { name: "Writing settings", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", { name: "Show countdown timer", exact: true })
    .uncheck();
  await dialog
    .getByRole("checkbox", { name: "Show word count", exact: true })
    .uncheck();
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  assert.equal(
    await page.locator(".marginalia-writing-footer").isVisible(),
    false,
  );
  await page
    .getByRole("button", { name: "Writing settings", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", { name: "Show countdown timer", exact: true })
    .check();
  await dialog
    .getByRole("checkbox", { name: "Show word count", exact: true })
    .check();
  await dialog
    .getByRole("combobox", { name: "Word goal counts", exact: true })
    .selectOption("full-vault");
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".marginalia-writing-label")?.textContent ===
      "Today · Full vault",
  );
  assert.equal(
    await page.locator(".marginalia-writing-count").textContent(),
    "4 / 10 words",
  );
  assert.match(await page.locator("main").textContent(), /Native Obsidian editing/);
  await page.getByRole("combobox", {name:"Project or grouping"}).selectOption({label:"Copper Sky · All groupings"});
  await page.locator(".marginalia-project-script").nth(2).waitFor();
  await page.screenshot({ path: resolve(folder, "script-studio-session.png") });
  // Create from the active grouping, using the same native modal/controller as the plugin.
  await page.getByRole("combobox", {name:"Project or grouping"}).selectOption({label:"Copper Sky > Draft"});
  const addScript = page.getByRole("button", {name:"New Script",exact:true});
  const addBox = await addScript.boundingBox();
  const lastScriptBox = await page.locator(".marginalia-script-file").last().boundingBox();
  assert.ok(addBox.y >= lastScriptBox.y + lastScriptBox.height, "creation button follows the active list");
  await addScript.click();
  let creation = page.getByRole("dialog");
  await creation.getByRole("textbox",{name:"Script name",exact:true}).fill("Created Script");
  assert.equal(await creation.getByLabel("Grouping",{exact:true}).inputValue(),"Draft");
  await creation.getByRole("button",{name:"Create script",exact:true}).click();
  assert.match(await creation.getByRole("alert").textContent(), /script template/);
  await creation.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.getByRole("button",{name:"Writing settings",exact:true}).click();
  await page.getByLabel("Script template location",{exact:true}).fill("_templates/Script.md");
  await page.getByRole("button",{name:"Close settings",exact:true}).click();
  await addScript.click();
  creation = page.getByRole("dialog");
  await creation.getByRole("textbox",{name:"Script name",exact:true}).fill("Created Script");
  await creation.getByRole("button",{name:"Create script",exact:true}).click();
  await page.locator(".marginalia-script-name").filter({hasText:"Created Script"}).waitFor();
  assert.deepEqual(await scriptNames(),["Opening","After the Bell","Created Script"]);
  assert.match(await page.getByRole("textbox",{name:"Script editor",exact:true}).inputValue(), /Location: INT\. LOCATION/);
  const createdTexts = await page.evaluate(()=>JSON.parse(localStorage.getItem("script-texts")));
  assert.match(createdTexts["Projects/Copper Sky/Scripts/Created Script.md"], /Preceded By: "\[\[Projects\/Copper Sky\/Scripts\/After the Bell\]\]"/);
  await addScript.click();
  creation = page.getByRole("dialog");
  await creation.getByRole("textbox",{name:"Script name",exact:true}).fill("Created Script");
  await creation.getByRole("button",{name:"Create script",exact:true}).click();
  assert.match(await creation.getByRole("alert").textContent(), /already exists/);
  await creation.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.reload();
  await page.locator(".marginalia-script-name").filter({hasText:"Created Script"}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("writing-data")).preferences.scriptTemplate), "_templates/Script.md");
  await page.getByRole("button",{name:"Reset timer",exact:true}).click();
  await page.getByRole("button",{name:"Countdown remaining",exact:true}).dblclick();
  let timerDialog=page.getByRole("dialog");
  await timerDialog.getByRole("spinbutton",{name:"Session timer minutes",exact:true}).fill("7");
  await timerDialog.getByRole("button",{name:"Set timer",exact:true}).click();
  assert.equal(await page.locator(".marginalia-writing-clock").textContent(),"07:00");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("writing-data")).preferences.countdownMinutes),1);
  await page.getByRole("button",{name:"Start timer",exact:true}).click();
  await page.getByRole("button",{name:"Countdown remaining",exact:true}).dblclick();
  assert.equal(await page.getByRole("dialog").count(),0);
  await page.getByRole("button",{name:"Pause timer",exact:true}).click();
  await page.getByRole("button",{name:"Countdown remaining",exact:true}).dblclick();
  assert.equal(await page.getByRole("dialog").count(),0);
  await page.getByRole("button",{name:"Reset timer",exact:true}).click();
  assert.equal(await page.locator(".marginalia-writing-clock").textContent(),"01:00");
  assert.deepEqual(errors, []);
  console.log(
    "UI checks passed: Studio project/group selection, scoped sidebar, countdown, persisted daily goals, visibility settings, script outline, separate arrows/names, project reading, predecessor fill/drag persistence, conflict repair, light/dark, 300px pane, context pin, review, sources, insertion harness, chat, library and empty state.",
  );
} finally {
  await browser.close();
}
