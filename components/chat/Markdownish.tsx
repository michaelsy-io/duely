import { Fragment, type ReactNode } from "react";

/** Tiny, safe renderer for chat text: **bold**, `code`, bullet/numbered lists, paragraphs. No HTML injection. */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\b_[^_]+_\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("_")) out.push(<em key={i++} className="text-fg-muted">{t.slice(1, -1)}</em>);
    else out.push(<code key={i++} className="rounded bg-surface-3 px-1 text-[0.9em]">{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const LIST = /^\s*([-*•]|\d+[.)])\s+/;

/** Groups lines into paragraphs and lists. */
export function Markdownish({ text }: { text: string }) {
  type Block = { kind: "p" | "ul" | "ol" | "h"; lines: string[] };
  const blocks: Block[] = [];
  for (const raw of text.trim().split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { blocks.push({ kind: "p", lines: [] }); continue; }
    const m = line.match(LIST);
    const kind: Block["kind"] = m ? (/\d/.test(m[1]) ? "ol" : "ul") : /^#{1,4}\s/.test(line) ? "h" : "p";
    const last = blocks[blocks.length - 1];
    const content = m ? line.replace(LIST, "") : kind === "h" ? line.replace(/^#{1,4}\s/, "") : line;
    if (last && last.kind === kind && kind !== "h" && last.lines.length) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  return (
    <>
      {blocks.filter((b) => b.lines.length).map((b, bi) => {
        if (b.kind === "ul" || b.kind === "ol") {
          const items = b.lines.map((l, li) => <li key={li}>{inline(l)}</li>);
          return b.kind === "ol" ? <ol key={bi} className="my-1.5 list-decimal space-y-1 pl-5">{items}</ol> : <ul key={bi} className="my-1.5 list-disc space-y-1 pl-5">{items}</ul>;
        }
        if (b.kind === "h") return <p key={bi} className="mt-2 font-bold">{inline(b.lines[0])}</p>;
        return (
          <p key={bi} className="my-1.5 first:mt-0 last:mb-0">
            {b.lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l)}</Fragment>)}
          </p>
        );
      })}
    </>
  );
}
