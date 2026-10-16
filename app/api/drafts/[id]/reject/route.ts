import { NextResponse } from "next/server";
import { getDraft, setDraftStatus, type DraftStatus } from "@/lib/db/drafts";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { by, status? } — reject (default) or send back as needs_edit / held. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session.role === "collector") return NextResponse.json({ error: "Only a supervisor, CFO or admin can reject" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { by?: string; status?: string };
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  const status: DraftStatus = body.status === "needs_edit" || body.status === "held" ? body.status : "rejected";
  const updated = await setDraftStatus(id, status, body.by || session.roleLabel);
  return NextResponse.json({ draft: updated });
}
