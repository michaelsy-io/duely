"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";
import type { ComponentProps } from "react";
import { SPRING_PRESS } from "./env";

/** Shared press feedback: a quick spring down to 97%, no overshoot to speak of. */
export const press = { whileTap: { scale: 0.97 }, transition: SPRING_PRESS } as const;

const MotionLink = motion.create(Link);

/** next/link with a spring press. Safe to render from server components. */
export function PressLink(props: ComponentProps<typeof MotionLink>) {
  return <MotionLink {...press} {...props} />;
}

/** <button> with a spring press. */
export function PressButton(props: HTMLMotionProps<"button">) {
  return <motion.button {...press} {...props} />;
}
