export let answer: (...args: any[]) => Promise<string> = async () =>
  "## Summary\n\nMira guards the eastern archive.";
let review: (...args:any[])=>Promise<string> = async()=>'{"unsupported":[]}';
export function setGroundingReview(next:typeof review){review=next;}
export function setAnswer(next: typeof answer) {
  review=async()=>'{"unsupported":[]}';
  answer = next;
}
export const generate = (...args: any[]) => String(args[1]).includes("Review the proposed draft against the original evidence.")?review(...args):answer(...args);
export const localEndpoint = (value: string) => new URL(value);
export const localModels = async () => ["local-model"];
