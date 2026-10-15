// Test-only helpers: read the answer-key markdown and pull out its tables.
import fs from "node:fs";
import path from "node:path";

export function readExpected(period: "P1" | "P2"): string {
  return fs.readFileSync(path.join(process.cwd(), "tests/fixtures/answer-key", `expected_${period}.md`), "utf8");
}

/** Rows (cells trimmed) of the first markdown table after the heading that starts with `heading`. */
export function table(md: string, heading: string): string[][] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## " + heading));
  if (start < 0) throw new Error("heading not found: " + heading);
  const rows: string[][] = [];
  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith("|")) i++;
  i += 2; // header + separator
  for (; i < lines.length && lines[i].startsWith("|"); i++) {
    rows.push(lines[i].slice(1, -1).split(" | ").map((c) => c.trim()));
  }
  return rows;
}

/** The text after a "Label: " line prefix. */
export function line(md: string, prefix: string): string {
  const l = md.split("\n").find((x) => x.startsWith(prefix));
  if (l === undefined) throw new Error("line not found: " + prefix);
  return l.slice(prefix.length);
}
