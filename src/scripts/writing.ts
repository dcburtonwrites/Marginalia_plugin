import { frontmatter } from "./properties.ts";
import type { ScriptGroup } from "./model.ts";

export type GoalMode = "all-projects" | "current-project" | "full-vault";
export interface WritingSelection {
  scope: string;
  group?: string;
}
export interface WritingPreferences {
  showTimer: boolean;
  showWordCount: boolean;
  countdownMinutes: number;
  goalMode: GoalMode;
  dailyGoal: number;
}
export interface WritingData {
  selection: WritingSelection | null;
  preferences: WritingPreferences;
  projectGoals: Record<string, number>;
  timerRemainingMs: number;
  daily: { date: string; vault: number; projects: Record<string, number> };
}
export const dayKey = (time = Date.now()) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const validNumber = (v: unknown, fallback: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max
    ? Math.floor(v)
    : fallback;
export function readWriting(value: unknown, now = Date.now()): WritingData {
  const raw =
    value && typeof value === "object" ? (value as Partial<WritingData>) : {};
  const p = raw.preferences;
  const preferences: WritingPreferences = {
    showTimer: p?.showTimer !== false,
    showWordCount: p?.showWordCount !== false,
    countdownMinutes: validNumber(p?.countdownMinutes, 25, 1440) || 25,
    goalMode: ["all-projects", "current-project", "full-vault"].includes(
      p?.goalMode ?? "",
    )
      ? p!.goalMode
      : "all-projects",
    dailyGoal: validNumber(p?.dailyGoal, 0, 10000000),
  };
  const selection =
    raw.selection &&
    typeof raw.selection.scope === "string" &&
    raw.selection.scope.trim() &&
    (raw.selection.group === undefined ||
      typeof raw.selection.group === "string")
      ? {
          scope: raw.selection.scope,
          ...(raw.selection.group !== undefined
            ? { group: raw.selection.group }
            : {}),
        }
      : null;
  const numbers = (input: unknown, negative = false) =>
    Object.assign(
      Object.create(null),
      Object.fromEntries(
        input && typeof input === "object" && !Array.isArray(input)
          ? Object.entries(input)
              .filter(
                ([, v]) =>
                  typeof v === "number" &&
                  Number.isFinite(v) &&
                  (negative || v >= 0) &&
                  Math.abs(v) < 1000000000,
              )
              .map(([k, v]) => [k, Math.floor(v as number)])
          : [],
      ),
    );
  return {
    selection,
    preferences,
    projectGoals: numbers(raw.projectGoals),
    timerRemainingMs: validNumber(
      raw.timerRemainingMs,
      preferences.countdownMinutes * 60000,
      86400000,
    ),
    daily:
      raw.daily?.date === dayKey(now)
        ? {
            date: raw.daily.date,
            vault:
              typeof raw.daily.vault === "number" &&
              Number.isFinite(raw.daily.vault)
                ? raw.daily.vault
                : 0,
            projects: numbers(raw.daily.projects, true),
          }
        : { date: dayKey(now), vault: 0, projects: Object.create(null) },
  };
}
export function selectedGroups(
  groups: ScriptGroup[],
  selection: WritingSelection | null,
): ScriptGroup[] {
  return selection
    ? groups.filter(
        (g) =>
          g.scope === selection.scope &&
          (selection.group === undefined || g.group === selection.group),
      )
    : [];
}
export function countWords(source: string): number {
  let text: string;
  try {
    text = source.slice(frontmatter(source)?.body ?? 0);
  } catch {
    return 0;
  }
  text = text
    .replace(/<!--[^]*?-->/g, "")
    .replace(/^\s*(`{3,}|~{3,})[^\n]*\n[^]*?^\s*\1\s*$/gm, "")
    .replace(/^#{1,6}\s+Page\s+\d+(?:[–-]\d+)?(?:\s+Double Spread)?\s*$/gim, "")
    .replace(/^Side:\s*(Left|Right|Double Spread)\s*$/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, (_m, link: string) =>
      link.includes("|")
        ? link.split("|").at(-1)!
        : link.split("#")[0].split("/").at(-1)!.replace(/\.md$/, ""),
    )
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>*\s*\[![^\]]+\][+-]?\s*/gm, "")
    .replace(/^\s*>*\s*Panel Description:\s*/gm, "");
  let count = 0;
  for (const part of new Intl.Segmenter(undefined, {
    granularity: "word",
  }).segment(text))
    if (part.isWordLike) count++;
  return count;
}
/** Counts editor changes against a runtime baseline; opens, imports and renames earn no words. */
export class WritingSession {
  baseline = new Map<string, { words: number; scope: string | null }>();
  ready = false;
  deadline: number | null = null;
  data: WritingData;
  clock: () => number;
  constructor(data: WritingData, clock: () => number = Date.now) {
    this.data = data;
    this.clock = clock;
  }
  rollDay() {
    const date = dayKey(this.clock());
    if (this.data.daily.date === date) return false;
    this.data.daily = { date, vault: 0, projects: Object.create(null) };
    return true;
  }
  observe(path: string, text: string, scope: string | null, credit: boolean) {
    this.rollDay();
    const words = countWords(text),
      prior = this.baseline.get(path);
    this.baseline.set(path, { words, scope });
    if (!this.ready || !credit) return false;
    const delta = words - (prior?.words ?? 0);
    if (!delta) return false;
    this.data.daily.vault += delta;
    if (scope)
      this.data.daily.projects[scope] =
        (this.data.daily.projects[scope] ?? 0) + delta;
    return true;
  }
  rename(oldPath: string, newPath: string) {
    const rename = (p: string) =>
      p === oldPath
        ? newPath
        : p.startsWith(oldPath + "/")
          ? newPath + p.slice(oldPath.length)
          : p;
    this.baseline = new Map(
      [...this.baseline].map(([p, v]) => [
        rename(p),
        { ...v, scope: v.scope ? rename(v.scope) : null },
      ]),
    );
    const next: Record<string, number> = Object.create(null);
    for (const [scope, words] of Object.entries(this.data.daily.projects)) {
      const key = rename(scope);
      next[key] = (next[key] ?? 0) + words;
    }
    this.data.daily.projects = next;
    const goals: Record<string, number> = Object.create(null);
    for (const [scope, goal] of Object.entries(this.data.projectGoals))
      goals[rename(scope)] = goal;
    this.data.projectGoals = goals;
    if (this.data.selection)
      this.data.selection.scope = rename(this.data.selection.scope);
  }
  progress() {
    this.rollDay();
    const { goalMode, dailyGoal } = this.data.preferences,
      scope = this.data.selection?.scope;
    const value =
      goalMode === "full-vault"
        ? this.data.daily.vault
        : goalMode === "current-project"
          ? scope
            ? (this.data.daily.projects[scope] ?? 0)
            : 0
          : Object.values(this.data.daily.projects).reduce((a, b) => a + b, 0);
    const goal =
      goalMode === "current-project" && scope
        ? (this.data.projectGoals[scope] ?? dailyGoal)
        : dailyGoal;
    return {
      words: Math.max(0, value),
      goal,
      label:
        goalMode === "full-vault"
          ? "Full vault"
          : goalMode === "current-project"
            ? (scope?.split("/").at(-1) ?? "Current project")
            : "All projects",
    };
  }
  remaining() {
    return this.deadline === null
      ? this.data.timerRemainingMs
      : Math.max(0, this.deadline - this.clock());
  }
  get running() {
    return this.deadline !== null;
  }
  start() {
    if (this.running) return;
    if (this.data.timerRemainingMs <= 0) this.reset();
    this.deadline = this.clock() + this.data.timerRemainingMs;
  }
  pause() {
    this.data.timerRemainingMs = this.remaining();
    this.deadline = null;
  }
  reset() {
    this.deadline = null;
    this.data.timerRemainingMs = this.data.preferences.countdownMinutes * 60000;
  }
  tick() {
    this.rollDay();
    if (this.deadline !== null && this.remaining() === 0) {
      this.data.timerRemainingMs = 0;
      this.deadline = null;
      return true;
    }
    return false;
  }
  snapshot() {
    this.data.timerRemainingMs = this.remaining();
  }
}
export function clockLabel(milliseconds: number): string {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000),
    minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
