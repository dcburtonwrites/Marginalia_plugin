import test from "node:test";
import assert from "node:assert/strict";
import {
  readWriting,
  WritingSession,
  selectedGroups,
  countWords,
  dayKey,
  clockLabel,
} from "../src/scripts/writing.ts";
import { arrangedGroups, parseScript } from "../src/scripts/model.ts";
const today = new Date(2026, 9, 22, 10, 0).getTime();
function writing() {
  let now = today;
  const data = readWriting(undefined, now),
    session = new WritingSession(data, () => now);
  return {
    data,
    session,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
test("writing preferences validate stored values and restore timers paused", () => {
  const d = readWriting(
    {
      selection: { scope: 7 },
      preferences: {
        countdownMinutes: -5,
        goalMode: "invalid",
        dailyGoal: NaN,
        showTimer: false,
      },
      timerRemainingMs: -1,
    },
    today,
  );
  assert.equal(d.selection, null);
  assert.equal(d.preferences.countdownMinutes, 25);
  assert.equal(d.preferences.goalMode, "all-projects");
  assert.equal(d.preferences.dailyGoal, 0);
  assert.equal(d.preferences.showTimer, false);
  assert.equal(d.timerRemainingMs, 1500000);
  assert.equal(new WritingSession(d).running, false);
  assert.equal(d.preferences.scriptTemplate, "");
  assert.equal(readWriting({preferences:{scriptTemplate:"  _templates/Script.md  "}}).preferences.scriptTemplate,"_templates/Script.md");
  assert.equal(readWriting({preferences:{scriptTemplate:42}}).preferences.scriptTemplate,"");
});
test("a project includes all its groups; a grouping includes only its own scripts", () => {
  const scripts = [
    ["A", "Draft"],
    ["A", "Revision"],
    ["B", "Draft"],
  ].map(([p, g]) =>
    parseScript({
      path: `${p}/Scripts/${g}.md`,
      text: "## Page 1",
      metadata: { Group: g },
    })!,
  );
  const groups = arrangedGroups(scripts, () => undefined, {});
  assert.equal(selectedGroups(groups, null).length, 0);
  assert.deepEqual(
    selectedGroups(groups, { scope: "A" }).map((g) => g.group),
    ["Draft", "Revision"],
  );
  assert.deepEqual(
    selectedGroups(groups, { scope: "A", group: "Draft" }).flatMap((g) =>
      g.scripts.map((s) => s.path),
    ),
    ["A/Scripts/Draft.md"],
  );
  assert.deepEqual(selectedGroups(groups, { scope: "Missing" }), []);
});
test("word counting excludes frontmatter, automatic page fields and link targets", () => {
  assert.equal(
    countWords(
      "---\naliases: hidden metadata\n---\n## Page 1\nSide: Right\n> [!panel]\n> Panel Description: Copper locks shine.\n**MIRA:** Hello.\n[[Folder/Very Long Name|a key]] [Door](https://example.com/path)\n",
    ),
    8,
  );
  assert.equal(countWords("---\nunclosed metadata"), 0);
  assert.equal(
    countWords("## Page 2 Double Spread\n\nSide: Double Spread\n"),
    0,
  );
});
test("opens, baseline scans and imports do not earn writing; editor additions and Undo net out", () => {
  const { session, data } = writing();
  session.observe("A/Scripts/A.md", "one two", "A", false);
  session.ready = true;
  assert.equal(session.observe("A/Scripts/A.md", "one two", "A", true), false);
  session.observe("A/Scripts/A.md", "one two three four", "A", true);
  assert.equal(session.progress().words, 2);
  session.observe("A/Scripts/A.md", "one two three four", "A", false);
  assert.equal(session.progress().words, 2);
  session.observe("A/Scripts/A.md", "one two", "A", true);
  assert.equal(session.progress().words, 0);
  session.observe("A/Scripts/A.md", "Imported many new words here", "A", false);
  assert.equal(data.daily.projects.A, 0);
});
test("goal modes distinguish every project, current project and full vault", () => {
  const { session, data } = writing();
  session.ready = true;
  session.observe("A/Scripts/A.md", "one two", "A", true);
  session.observe("B/Scripts/B.md", "three", "B", true);
  session.observe("Canon.md", "four five six", null, true);
  data.selection = { scope: "A", group: "Draft" };
  data.preferences.dailyGoal = 100;
  assert.deepEqual(session.progress(), {
    words: 3,
    goal: 100,
    label: "All projects",
  });
  data.preferences.goalMode = "current-project";
  data.projectGoals.A = 50;
  assert.deepEqual(session.progress(), { words: 2, goal: 50, label: "A" });
  data.selection = { scope: "B" };
  assert.equal(session.progress().goal, 100);
  assert.equal(session.progress().words, 1);
  data.preferences.goalMode = "full-vault";
  assert.deepEqual(session.progress(), {
    words: 6,
    goal: 100,
    label: "Full vault",
  });
});
test("daily totals reset at local midnight, survive reload today, and do not count old text", () => {
  const { session, data, advance } = writing();
  session.observe("A.md", "one", "A", false);
  session.ready = true;
  session.observe("A.md", "one two", "A", true);
  const saved = readWriting(JSON.parse(JSON.stringify(data)), today);
  assert.equal(saved.daily.projects.A, 1);
  advance(24 * 60 * 60 * 1000);
  session.observe("A.md", "one two three", "A", true);
  assert.equal(session.progress().words, 1);
  assert.equal(data.daily.date, dayKey(today + 24 * 60 * 60 * 1000));
  assert.equal(readWriting(saved, today + 86400000).daily.vault, 0);
});
test("renames preserve tracked project totals and selected grouping without creating words", () => {
  const { session, data } = writing();
  session.ready = true;
  session.observe("A/Scripts/A.md", "one two", "A", true);
  data.selection = { scope: "A", group: "Draft" };
  data.projectGoals.A = 10;
  session.rename("A", "Renamed");
  assert.equal(data.selection.scope, "Renamed");
  assert.equal(data.daily.projects.Renamed, 2);
  assert.equal(data.projectGoals.Renamed, 10);
  assert.equal(session.baseline.has("Renamed/Scripts/A.md"), true);
  session.observe("Renamed/Scripts/A.md", "one two", "Renamed", true);
  assert.equal(session.progress().words, 2);
});
test("countdown starts, pauses, resumes and finishes once without counting paused time", () => {
  const { session, data, advance } = writing();
  data.preferences.countdownMinutes = 1;
  session.reset();
  session.start();
  advance(10000);
  assert.equal(session.remaining(), 50000);
  session.pause();
  advance(20000);
  assert.equal(session.remaining(), 50000);
  session.start();
  advance(50000);
  assert.equal(session.tick(), true);
  assert.equal(session.remaining(), 0);
  assert.equal(session.tick(), false);
  session.start();
  assert.equal(session.remaining(), 60000);
  session.reset();
  assert.equal(session.running, false);
});
test("a countdown snapshot resumes as paused after reload; visibility is presentation only", () => {
  const { session, data, advance } = writing();
  session.start();
  advance(10000);
  data.preferences.showTimer = false;
  data.preferences.showWordCount = false;
  session.snapshot();
  const restored = new WritingSession(
    readWriting(JSON.parse(JSON.stringify(data)), today),
  );
  assert.equal(restored.running, false);
  assert.equal(restored.remaining(), 1490000);
  assert.equal(clockLabel(restored.remaining()), "24:50");
  assert.equal(clockLabel(1), "00:01");
  assert.equal(clockLabel(0), "00:00");
});

test("valid project names cannot collide with object property names", () => {
  const { session, data } = writing();
  session.ready = true;
  data.selection = { scope: "constructor" };
  data.preferences.goalMode = "current-project";
  session.observe("constructor/Scripts/A.md", "one two", "constructor", true);
  assert.equal(session.progress().words, 2);
  assert.equal(session.progress().goal, 0);
});

test('one-session timer override cannot change a running or paused session and leaves preferences unchanged', () => {
  const h = writing();
  h.session.setDuration(7);
  assert.equal(h.session.remaining(), 7 * 60000);
  assert.equal(h.data.preferences.countdownMinutes,25);
  h.session.start();
  assert.throws(()=>h.session.setDuration(8),/reset/);
  h.advance(60000);
  h.session.pause();
  assert.equal(h.session.remaining(),6*60000);
  assert.throws(()=>h.session.setDuration(8),/reset/);
  const restored=new WritingSession(readWriting(JSON.parse(JSON.stringify(h.data)),today));
  assert.equal(restored.running,false);
  assert.throws(()=>restored.setDuration(8),/reset/);
  h.session.reset();
  assert.equal(h.session.remaining(),25*60000);
  h.session.setDuration(1);
  h.session.start();h.advance(60000);assert.equal(h.session.tick(),true);
  h.session.setDuration(3);
  assert.equal(h.session.remaining(),3*60000);
  for(const value of [0,-1,1.5,1441,NaN]) assert.throws(()=>h.session.setDuration(value),/whole number/);
});
