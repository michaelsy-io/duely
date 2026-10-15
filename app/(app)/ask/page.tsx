import type { Metadata } from "next";
import { getPeriodFromCookie } from "@/lib/data";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const metadata: Metadata = { title: "Ask Duely" };

export default async function AskPage() {
  const period = await getPeriodFromCookie();
  return (
    <div className="card mx-auto flex h-[calc(100dvh-13rem)] min-h-[480px] max-w-3xl flex-col overflow-hidden lg:h-[calc(100dvh-10rem)]">
      <ChatPanel period={period} className="flex-1" autoFocus />
    </div>
  );
}
