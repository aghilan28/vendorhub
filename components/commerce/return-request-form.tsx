"use client";

import { useState } from "react";
import { requestReturnAction } from "@/lib/actions/returns";
import type { ReturnReason } from "@/lib/commerce-core/types";

const REASONS: { value: ReturnReason; label: string }[] = [
  { value: "defective", label: "Defective / not working" },
  { value: "damaged", label: "Arrived damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "size_fit", label: "Size / fit issue" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

/**
 * EC-2 — Return request form. Calls the real `requestReturnAction`
 * (writes to `return_requests`, degrade-safe).
 */
export function ReturnRequestForm({ orderId, vendorId, orderItemId }: { orderId: string; vendorId: string; orderItemId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReturnReason>("defective");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setMessage("");
    try {
      await requestReturnAction({ orderId, vendorId, orderItemId: orderItemId ?? null, reason, description });
      setState("done");
      setMessage("Return request submitted. The seller will review it shortly.");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Unable to submit return request.");
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-medium text-primary hover:underline">
        Request a return
      </button>
    );
  }

  if (state === "done") {
    return <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} className="w-full rounded-md border p-2 text-sm">
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Details</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={5} rows={3} className="w-full rounded-md border p-2 text-sm" placeholder="Describe the issue (min 5 characters)" />
      </div>
      {message && state === "error" && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={state === "submitting"} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {state === "submitting" ? "Submitting..." : "Submit return"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm font-medium">Cancel</button>
      </div>
    </form>
  );
}
