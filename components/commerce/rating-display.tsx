import { Star } from "lucide-react";

export function RatingDisplay({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary-text">
      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
      {rating.toFixed(1)}
      {count ? <span className="text-slate-400">({count})</span> : null}
    </span>
  );
}
