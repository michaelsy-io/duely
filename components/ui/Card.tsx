import clsx from "clsx";
import type { ElementType, ReactNode, ComponentPropsWithoutRef } from "react";

type Props<T extends ElementType> = { as?: T; className?: string; children?: ReactNode; pad?: boolean } & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Card<T extends ElementType = "div">({ as, className, children, pad = true, ...rest }: Props<T>) {
  const C = (as ?? "div") as ElementType;
  return (
    <C className={clsx("card", pad && "p-5 sm:p-6", className)} {...rest}>
      {children}
    </C>
  );
}

export function SectionTitle({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-fg">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-fg-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
