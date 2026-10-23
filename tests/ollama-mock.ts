export let answer: (...args: any[]) => Promise<string> = async () =>
  "## Summary\n\nMira guards the eastern archive.";
export function setAnswer(next: typeof answer) {
  answer = next;
}
export const generate = (...args: any[]) => answer(...args);
export const localEndpoint = (value: string) => new URL(value);
export const localModels = async () => ["local-model"];
