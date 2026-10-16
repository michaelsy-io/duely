import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, inMonthRange, isMonthKey, isPeriod, monthLabel, PERIOD_COOKIE, periodForMonth } from "@/lib/session";
import { prepareImport, type DateFormat, type IncomingFile } from "@/lib/imports/files";
import { deleteImport, listImports, saveImport } from "@/lib/db/imports";
import { forgetImport, preloadImports, previewImportResult } from "@/lib/imports/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const monthOpts = { path: "/", sameSite: "lax" as const };

type Check = { error: NextResponse } | { month: string };

/** Admin only, a month inside the range, and not one of the bundled demo months. */
async function checkMonth(raw: unknown): Promise<Check> {
  const session = await getSession();
  if (session.role !== "admin") return { error: NextResponse.json({ error: "Only the Admin can import or revert month-end files." }, { status: 403 }) };
  if (!isMonthKey(raw) || !inMonthRange(raw)) return { error: NextResponse.json({ error: "Pick a month between June and December 2026." }, { status: 400 }) };
  if (isPeriod(periodForMonth(raw))) {
    return { error: NextResponse.json({ error: `${monthLabel(raw)} is a bundled demo month. Its books can't be replaced or reverted.` }, { status: 409 }) };
  }
  return { month: raw };
}

/**
 * POST { month: "2026-10", files: [{ name, text }], dateFormat?: "dmy" | "mdy" }
 * Validates the month's files (same recognition as the wizard), runs the engine on them, then
 * stores them in month_imports (or this server's memory when Supabase is not reachable).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { month?: unknown; files?: unknown; dateFormat?: unknown } | null;
  const c = await checkMonth(body?.month);
  if ("error" in c) return c.error;
  const { month } = c;

  const files: IncomingFile[] = Array.isArray(body?.files)
    ? (body.files as unknown[]).flatMap((f) => {
        const o = f as { name?: unknown; text?: unknown };
        return typeof o?.name === "string" && typeof o?.text === "string" ? [{ name: o.name, text: o.text }] : [];
      })
    : [];
  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });
  const dateFormat: DateFormat | null = body?.dateFormat === "dmy" || body?.dateFormat === "mdy" ? body.dateFormat : null;

  const check = prepareImport(month, files, { dateFormat });
  if (!check.ok) return NextResponse.json({ error: "These files can't be imported yet.", errors: check.errors, warnings: check.warnings }, { status: 422 });

  // Run the engine before storing anything, so a set it cannot read never becomes a month.
  await preloadImports(await listImports());
  const map = Object.fromEntries(check.files.map((f) => [f.file, f.text]));
  let result;
  try {
    result = previewImportResult(month, map);
  } catch (e) {
    return NextResponse.json({ error: "The rules engine could not read these files.", errors: [(e as Error).message] }, { status: 422 });
  }

  const session = await getSession();
  const store = await saveImport(month, check.files.map((f) => ({ file: f.file, content: f.text, rows: f.rows })), session.roleLabel);
  forgetImport(month);
  await preloadImports(await listImports());
  // Open the imported month next.
  (await cookies()).set(PERIOD_COOKIE, month, monthOpts);

  return NextResponse.json({
    month,
    label: monthLabel(month),
    asOf: check.asOf,
    store,
    files: check.files.map((f) => ({ file: f.file, source: f.source, rows: f.rows, renamed: f.renamed })),
    warnings: check.warnings,
    openInvoices: check.files.find((f) => f.table === "ar_aging")?.rows ?? 0,
    clientsToFollowUp: result.followUp.length,
    totalAr: result.kpis.totalAr,
    control: result.control,
  });
}

/** DELETE ?month=2026-10 — revert an imported month (it goes back to empty). Admin only; bundled months can't be reverted. */
export async function DELETE(req: Request) {
  const c = await checkMonth(new URL(req.url).searchParams.get("month"));
  if ("error" in c) return c.error;
  const { month } = c;
  const found = await deleteImport(month);
  forgetImport(month);
  const jar = await cookies();
  if (jar.get(PERIOD_COOKIE)?.value === month) jar.delete(PERIOD_COOKIE);
  if (!found) return NextResponse.json({ error: `${monthLabel(month)} has no imported files.` }, { status: 404 });
  return NextResponse.json({ month, label: monthLabel(month), reverted: true });
}
