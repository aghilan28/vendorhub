"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/lib/actions/reviews";

/**
 * EC-2 — Review & rating submission form.
 * Calls the real `submitReviewAction` (writes to `reviews` table, degrade-safe).
 */
export function ReviewSubmissionForm({ productId, orderItemId }: { productId: string; orderItemId?: string | null }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setMessage("");
    try {
      const res = await submitReviewAction({ userId: "", productId, orderItemId: orderItemId ?? null, rating, title, body });
      setState("done");
      setMessage(res.verified ? "Thank you! Your verified review was submitted." : "Thanks! Your review is pending moderation.");
      setTitle("");
      setBody("");
      setRating(0);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Unable to submit review. Please sign in and ensure you purchased this item.");
    }
  }

  if (state === "done") {
    return <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Your rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
            >
              <Star className={`h-6 w-6 ${(hover || rating) >= n ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} className="w-full rounded-md border p-2 text-sm" placeholder="Sum up your experience" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Review</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={5000} rows={4} className="w-full rounded-md border p-2 text-sm" placeholder="Share details about quality, value, delivery..." />
      </div>
      {message && state === "error" && <p className="text-sm text-red-600">{message}</p>}
      <button type="submit" disabled={state === "submitting" || rating === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {state === "submitting" ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
