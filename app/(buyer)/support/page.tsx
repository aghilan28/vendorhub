"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import type { SupportTicket, TicketCategory, TicketChannel } from "@/lib/marketplace-operations";
import { createTicket, SEED_TICKETS } from "@/lib/marketplace-operations";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "order_issue", label: "Order Issue" },
  { value: "payment_issue", label: "Payment Problem" },
  { value: "delivery_issue", label: "Delivery Issue" },
  { value: "product_issue", label: "Product Problem" },
  { value: "refund_request", label: "Refund Request" },
  { value: "cancellation", label: "Order Cancellation" },
  { value: "seller_complaint", label: "Seller Complaint" },
  { value: "account_issue", label: "Account Issue" },
  { value: "general_inquiry", label: "General Inquiry" },
  { value: "technical_issue", label: "Technical Issue" },
];

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(SEED_TICKETS.filter((t) => t.createdByRole === "customer"));
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general_inquiry");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticket = createTicket({
      subject,
      description,
      category,
      channel: "web" as TicketChannel,
      createdBy: "current-user",
      createdByRole: "customer",
    });
    setTickets([ticket, ...tickets]);
    setShowForm(false);
    setSubject("");
    setDescription("");
    setCategory("general_inquiry");
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-sm text-muted-foreground">Get help with your orders, payments, and account</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
          {showForm ? "Cancel" : "New Ticket"}
        </button>
      </div>

      {/* Create Ticket Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-background">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className="w-full border rounded-md p-2 text-sm">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full border rounded-md p-2 text-sm" placeholder="Brief description of your issue" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="w-full border rounded-md p-2 text-sm" placeholder="Provide details about your issue..." />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Submit Ticket</button>
        </form>
      )}

      {/* Ticket List */}
      <div className="space-y-3">
        <h2 className="font-semibold">Your Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No support tickets yet.</p>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ticket.ticketNumber} • {CATEGORIES.find((c) => c.value === ticket.category)?.label}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ticket.priority === "critical" ? "bg-red-100 text-red-700" :
                    ticket.priority === "urgent" ? "bg-orange-100 text-orange-700" :
                    ticket.priority === "high" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{ticket.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ticket.status === "resolved" ? "bg-green-100 text-green-700" :
                    ticket.status === "escalated" ? "bg-red-100 text-red-700" :
                    ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{ticket.status.replace("_", " ")}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{ticket.description.slice(0, 120)}{ticket.description.length > 120 ? "..." : ""}</p>
              {ticket.resolution && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <p className="font-medium">Resolution:</p>
                  <p>{ticket.resolution.summary}</p>
                </div>
              )}
              {ticket.sla.isBreached && (
                <p className="text-xs text-red-600 mt-1 font-medium">⚠ SLA Breached ({ticket.sla.breachType?.replace("_", " ")})</p>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">Preview (sample data)</p>
    </PageContainer>
  );
}
