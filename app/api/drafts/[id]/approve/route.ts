import { NextResponse } from "next/server";
import { getDraft, setDraftStatus } from "@/lib/db/drafts";
import { sendApprovedLetter } from "@/lib/n8n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { by, top_mgmt? } — supervisor approval; final notices also need top_mgmt: true. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { by?: string; top_mgmt?: boolean };
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status === "approved") return NextResponse.json({ draft });
  const review = (draft.review ?? {}) as { verdict?: string };
  if (review.verdict === "block") {
    return NextResponse.json({ error: "Draft failed the number/wording check — edit before approving", review }, { status: 409 });
  }
  if (draft.needs_top_mgmt && body.top_mgmt !== true) {
    return NextResponse.json({ error: "Needs top management" }, { status: 409 });
  }
  const by = body.by ? (draft.needs_top_mgmt ? `${body.by} (top management)` : body.by) : undefined;
  const updated = await setDraftStatus(id, "approved", by);
  // Test delivery through n8n: emails a copy to the team's own inbox, never to the client.
  const delivery = updated ? await sendApprovedLetter(updated) : "skipped";
  return NextResponse.json({ draft: updated, delivery });
}
