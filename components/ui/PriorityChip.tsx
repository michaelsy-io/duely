import { scoreTone } from "@/lib/view";
import { Chip } from "./Chip";

/** Follow-up priority score from the rules engine, labelled so first-time users can read it. */
export function PriorityChip({ score, className }: { score: number; className?: string }) {
  const help = `Priority score ${score}: higher means call sooner. Points come from the reasons listed.`;
  return (
    <span title={help} aria-label={help} className="inline-flex">
      <Chip tone={scoreTone(score)} className={className ? `num ${className}` : "num"}>Priority {score}</Chip>
    </span>
  );
}
