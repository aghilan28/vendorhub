import Link from "next/link";
import { BookOpen, Boxes, ClipboardList, LifeBuoy, Mail, MessagesSquare, PackageCheck, Phone, ShieldCheck, Sparkles, Store, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";

const HELP_TOPICS = [
  { icon: ClipboardList, title: "Orders & fulfillment", detail: "Accept, pack, dispatch and resolve order issues.", href: "/seller/fulfillment" },
  { icon: WalletCards, title: "Payouts & settlements", detail: "Earnings, commission and payout batches.", href: "/seller/payouts" },
  { icon: Boxes, title: "Inventory & stock", detail: "Restock risk, reorder points and stock health.", href: "/seller/inventory" },
  { icon: PackageCheck, title: "Products & catalog", detail: "Listings, media, pricing and bulk operations.", href: "/seller/products" },
  { icon: Store, title: "Store settings", detail: "Branding, contact, hours and policies.", href: "/seller/store-settings" },
  { icon: ShieldCheck, title: "Reputation & trust", detail: "Ratings, badges and improvement tips.", href: "/seller/reputation" },
] as const;

const CONTACT_CHANNELS = [
  { icon: MessagesSquare, label: "Live chat", detail: "Mon–Sat, 9 AM – 9 PM IST", action: "Start chat" },
  { icon: Mail, label: "Email support", detail: "seller-support@vendorhub.example", action: "Email us" },
  { icon: Phone, label: "Priority line", detail: "For verified sellers with live orders", action: "Request callback" },
] as const;

const FAQS = [
  { q: "When are payouts settled?", a: "Eligible settlements are batched after orders are delivered and the return window passes; track each batch in Payouts." },
  { q: "How do I handle a return request?", a: "Open Fulfillment → resolve the order; approved returns move through the trust layer to refund automatically." },
  { q: "Why is an order at risk?", a: "Orders breach SLA when they age past the fulfillment promise. The Fulfillment queue surfaces breached and at-risk orders first." },
  { q: "How do I improve my reputation score?", a: "Reputation reflects fulfilment, returns, refunds and response time. See Reputation for tailored improvement tips." },
] as const;

export function SellerSupportCenter() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><LifeBuoy className="size-5" /> Help & Support</h1>
          <p className="text-sm text-secondary-text">Get help, find answers and jump straight to the tools that resolve issues.</p>
        </div>
        <Badge variant="secondary">Seller support</Badge>
      </div>

      <GovernanceCard title="Help topics" description="Jump to the workspace that resolves your issue." action={<BookOpen className="size-4 text-secondary-text" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_TOPICS.map((topic) => (
            <Link key={topic.title} href={topic.href} className="focus-ring rounded-lg border border-border p-4 transition-colors hover:border-brand">
              <topic.icon className="size-5 text-brand" />
              <p className="mt-2 font-medium text-primary-text">{topic.title}</p>
              <p className="mt-1 text-sm text-secondary-text">{topic.detail}</p>
            </Link>
          ))}
        </div>
      </GovernanceCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <GovernanceCard title="Frequently asked" action={<Sparkles className="size-4 text-secondary-text" />}>
          <dl className="divide-y divide-border">
            {FAQS.map((faq) => (
              <div key={faq.q} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-sm font-medium text-primary-text">{faq.q}</dt>
                <dd className="mt-1 text-sm text-secondary-text">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </GovernanceCard>

        <GovernanceCard title="Contact us" description="A response target is attached to every channel.">
          <div className="space-y-3">
            {CONTACT_CHANNELS.map((channel) => (
              <div key={channel.label} className="flex items-start gap-3 rounded-md border border-border p-3">
                <channel.icon className="mt-0.5 size-4 text-brand" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary-text">{channel.label}</p>
                  <p className="truncate text-xs text-secondary-text">{channel.detail}</p>
                  <span className="mt-1 inline-block text-xs font-medium text-brand">{channel.action}</span>
                </div>
              </div>
            ))}
          </div>
        </GovernanceCard>
      </div>
    </div>
  );
}
