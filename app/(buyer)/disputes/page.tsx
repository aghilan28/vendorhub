"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import type { Dispute, DisputeType } from "@/lib/marketplace-operations";
import { createDispute, submitEvidence, SEED_DISPUTES } from "@/lib/marketplace-operations";

const DISPUTE_TYPES: { value: DisputeType; label: string }[] = [
  { value: "order_not_received", label: "Order Not Received" },
  { value: "item_not_as_described", label: "Item Not As Described" },
  { value: "damaged_item", label: "Damaged Item" },
  { value: "wrong_item", label: "Wrong Item Received" },
  { value: "refund_disagreement", label: "Refund Disagreement" },
  { value: "delivery_dispute", label: "Delivery Dispute" },
];

export default function BuyerDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>(SEED_DISPUTES);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<DisputeType>("order_not_received");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dispute = createDispute({ type, buyerId: "current-user", sellerId: "seller-001", orderId: "ord-new", amount: parseFloat(amount) || 0, description });
    setDisputes([dispute, ...disputes]);
    setShowForm(false);
    setDescription(""); setAmount("");
  }

  function handleSubmitEvidence(disputeId: string) {
    setDisputes((prev) => prev.map((d) => d.id === disputeId ? submitEvidence(d, { submittedBy: "current-user", submittedByRole: "buyer", type: "text", content: "Additional evidence provided by buyer", description: "Supplementary information" }) : d));
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Disputes</h1>
          <p className="text-sm text-muted-foreground">Manage and track your buyer-seller disputes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
          {showForm ? "Cancel" : "Raise Dispute"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Dispute Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as DisputeType)} className="w-full border rounded-md p-2 text-sm">
              {DISPUTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full border rounded-md p-2 text-sm" placeholder="Disputed amount" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="w-full border rounded-md p-2 text-sm" placeholder="Describe the issue in detail..." />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Submit Dispute</button>
        </form>
      )}

      <div className="space-y-3">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{DISPUTE_TYPES.find((t) => t.value === dispute.type)?.label ?? dispute.type}</p>
                <p className="text-xs text-muted-foreground">{dispute.disputeNumber} • ₹{dispute.amount.toLocaleString()}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                dispute.status.startsWith("resolved") ? "bg-green-100 text-green-700" :
                dispute.status === "escalated" ? "bg-red-100 text-red-700" :
                dispute.status === "under_review" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>{dispute.status.replace("_", " ")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{dispute.description}</p>

            {/* Evidence */}
            {(dispute.buyerEvidence.length > 0 || dispute.sellerEvidence.length > 0) && (
              <div className="mt-2 text-xs">
                <p className="font-medium">Evidence: {dispute.buyerEvidence.length} buyer • {dispute.sellerEvidence.length} seller</p>
              </div>
            )}

            {/* Resolution */}
            {dispute.resolution && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <p className="font-medium">Outcome: {dispute.resolution.outcome.replace("_", " ")}</p>
                <p>{dispute.resolution.summary}</p>
                {dispute.resolution.refundAmount && <p className="font-medium mt-1">Refund: ₹{dispute.resolution.refundAmount.toLocaleString()}</p>}
              </div>
            )}

            {/* Actions */}
            {!dispute.resolvedAt && dispute.status !== "dismissed" && dispute.status !== "closed" && (
              <button onClick={() => handleSubmitEvidence(dispute.id)} className="mt-2 text-xs text-primary font-medium hover:underline">
                + Submit Evidence
              </button>
            )}

            {/* Timeline */}
            {dispute.timeline.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <p className="text-xs font-medium mb-1">Timeline</p>
                {dispute.timeline.slice(-3).map((event) => (
                  <p key={event.id} className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleDateString()} — {event.detail}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">Preview (sample data)</p>
    </PageContainer>
  );
}
