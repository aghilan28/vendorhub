import { Building2, CheckCircle2, Landmark, ReceiptText, ShieldCheck, Truck } from "lucide-react";
import { getVendorActivityLine, getVendorHumanLine } from "@/features/marketplace/lib/data";
import type { Vendor } from "@/types";
import { getTrustProfileForVendor } from "../data";
import { TrustLevelBadge, VerificationStateBadge } from "./trust-badges";

export function BuyerSellerTrustCard({ vendor }: { vendor: Vendor }) {
  const profile = getTrustProfileForVendor(vendor.id);
  if (!profile) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-secondary-text">Local seller</p>
          <h2 className="mt-1 font-semibold text-primary-text">{vendor.name}</h2>
          <p className="mt-1 text-sm text-secondary-text">{getVendorHumanLine(vendor)}</p>
        </div>
        <ShieldCheck className="size-5 text-brand" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <VerificationStateBadge state={profile.verificationState} />
        <TrustLevelBadge level={profile.trustScore.level} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <span className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-secondary-text"><Building2 className="size-4 text-brand" /> {vendor.area}, {profile.city}</span>
        <span className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-secondary-text"><ReceiptText className="size-4 text-brand" /> {profile.gst.invoiceEnabled ? `GST invoice enabled: ${profile.gst.gstin}` : "GST verification in review"}</span>
        <span className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-secondary-text"><Landmark className="size-4 text-brand" /> Verified payment account</span>
        <span className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-secondary-text"><Truck className="size-4 text-brand" /> {getVendorActivityLine(vendor)}</span>
      </div>
      <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
        <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4" /> Reviewed seller with local order history.</p>
      </div>
    </section>
  );
}
