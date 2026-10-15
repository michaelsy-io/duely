import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import "./_landing/landing.css";

export const metadata: Metadata = {
  title: "Duely · Collections, made friendly",
  description: "Duely tells your collectors who to chase, which checks to deposit and what to say. Every peso is checked by the rules engine.",
};

export default function Home() {
  return <Landing />;
}
