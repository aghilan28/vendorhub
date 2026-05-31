"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import type { SupportTicket, TicketCategory, TicketChannel } from "@/lib/marketplace-operations";
import { createTicket, SEED_TICKETS } from "@/lib/marketplace-operations";

const SELLER_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "payment_issue", label: "Payout Issue" },
  { value: "order_issue", label: "Order Problem" },
  { value: "product_issue", label: "Listing Issue" },
  { value: "account_issue", label: "Account Issue" },
  { value: "technical_issue", label: "Technical Problem" },
  { value: "general_inquiry", label: "General Question" },
];

export default function SellerSupportPage() {
  const [tickets] = useState<SupportTicket[]>(SEED_TICKETS.filter((t) => t.createdByRole === "seller").length > 0 ? SEED_TICKETS.filter((t) => t.createdByRole === "seller") : [SEED_TICKETS[0]]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general_inquiry");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTicket({ subject, description, category, channel: "web" as TicketChannel, createdBy: "current-seller", createdByRole: "seller" });
    setShowForm(false);
    setSubject(""); setDescription("");
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seller Support</h1>
          <p className="text-sm text-muted-foreground">Get help with your store, orders, and payouts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
          {showForm ? "Cancel" : "Create Issue"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-background">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className="w-full border rounded-md p-2 text-sm">
              {SELLER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full border rounded-md p-2 text-sm" placeholder="What do you need help with?" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="w-full border rounded-md p-2 text-sm" placeholder="Describe the issue..." />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Submit</button>
        </form>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold">Your Issues ({tickets.length})</h2>
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                ticket.status === "resolved" ? "bg-green-100 text-green-700" :
                ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>{ticket.status.replace("_", " ")}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">Preview (sample data)</p>
    </PageContainer>
  );
}
