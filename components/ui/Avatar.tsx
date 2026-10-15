import clsx from "clsx";
import { avatarColor, initials } from "@/lib/clients";

/** Initials avatar. Shape comes from --radius-avatar (theme avatarShape). */
export function Avatar({ code, label, size = 44, className }: { code: string; label?: string; size?: number; className?: string }) {
  const c = avatarColor(code);
  return (
    <span
      aria-hidden="true"
      className={clsx("inline-grid shrink-0 place-items-center rounded-avatar font-bold", className)}
      style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: Math.round(size * 0.34) }}
    >
      {label ?? initials(code)}
    </span>
  );
}
