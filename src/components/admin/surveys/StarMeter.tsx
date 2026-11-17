import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STAR_COLOR = "fill-[#c5475f] text-[#c5475f]";
const EMPTY_COLOR = "text-[#231717]/20";

// Five stars filled to `value` (0-5), including partial stars for averages
// like 4.6: a filled row is clipped to value/5 of its width over an empty row.
export function StarMeter({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const starClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  // w-max + shrink-0: the filled row must keep full-size stars and be clipped
  // by its narrower parent, not squeezed into it.
  const row = (className: string) => (
    <span className="flex w-max gap-0.5">
      {[0, 1, 2, 3, 4].map((index) => (
        <Star key={index} className={cn(starClass, "shrink-0", className)} strokeWidth={1.75} />
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {row(EMPTY_COLOR)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${percent}%` }} aria-hidden="true">
        {row(STAR_COLOR)}
      </span>
    </span>
  );
}

// "4.6 / 5" with the number and "/ 5" at the same size, and the answer count
// small after it: "4.6 / 5 (12)".
export function RatingFigure({ value, count, decimals = 1 }: { value: number; count?: number; decimals?: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums">
      <span className="font-black text-[#231717]">{value.toFixed(decimals)}</span>
      <span className="font-semibold text-[#6b5a55]">/ 5</span>
      {count !== undefined ? <span className="text-[11px] text-[#8a7871]">({count})</span> : null}
    </span>
  );
}
