"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, MapPin, Save, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ServiceZoneMapPreview } from "@/features/geo/components/map-preview";
import { SellerGuidancePanel } from "@/features/intelligence/components/seller-guidance-panel";
import { marketplaceVendors } from "@/features/marketplace/lib/data";
import { useSellerStore } from "../store";

const productSchema = z.object({
  name: z.string().min(3, "Name is required"),
  sku: z.string().min(4, "SKU is required"),
  category: z.string().min(1),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().min(0),
  visibility: z.string().min(1),
  description: z.string().min(10),
});

const settingsSchema = z.object({
  storeName: z.string().min(3),
  phone: z.string().min(8),
  address: z.string().min(10),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  serviceRadiusKm: z.coerce.number().min(1).max(15),
  description: z.string().min(20),
});

const onboardingSchema = z.object({
  businessName: z.string().min(3),
  ownerName: z.string().min(3),
  category: z.string().min(1),
  brandColor: z.string().min(3),
  verificationNote: z.string().min(10),
});

export function ProductForm({ mode = "create" }: { mode?: "create" | "edit" }) {
  const { t } = useTranslation();
  const setDraftProductName = useSellerStore((state) => state.setDraftProductName);
  const form = useForm<any>({
    resolver: zodResolver(productSchema as any),
    defaultValues: {
      name: mode === "edit" ? "Farm Fresh Paneer 200g" : "",
      sku: mode === "edit" ? "FRL-DAIRY-PNR-200" : "",
      category: mode === "edit" ? "Dairy" : "Fresh vegetables",
      price: mode === "edit" ? 128 : 0,
      stock: mode === "edit" ? 14 : 0,
      visibility: "marketplace",
      description: mode === "edit" ? "Fresh paneer prepared for same-day hyperlocal fulfillment." : "",
    },
  });

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit((value) => setDraftProductName(value.name))}>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Product name"><Input {...form.register("name")} placeholder="Example: Farm Fresh Paneer 200g" /></FormField>
        <FormField label="SKU"><Input {...form.register("sku")} placeholder="FRL-CAT-ITEM-SIZE" /></FormField>
        <FormField label="Category"><Input {...form.register("category")} /></FormField>
        <FormField label="Visibility">
          <Select defaultValue="marketplace" onValueChange={(value) => form.setValue("visibility", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="marketplace">Marketplace</SelectItem>
              <SelectItem value="store_only">Store only</SelectItem>
              <SelectItem value="hidden">Hidden draft</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Selling price"><Input type="number" {...form.register("price")} /></FormField>
        <FormField label="Opening stock"><Input type="number" {...form.register("stock")} /></FormField>
      </div>
      <FormField label="Product description"><Textarea {...form.register("description")} placeholder="Operational product detail for seller catalog readiness." /></FormField>
      <SellerGuidancePanel
        product={{
          name: form.watch("name") || "New local product",
          category: form.watch("category") || "Daily essentials",
          price: Number(form.watch("price") || 0),
          stock: Number(form.watch("stock") || 0),
          lowStockThreshold: 8,
          description: form.watch("description") || "",
        }}
      />
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">{t("seller.guidanceTitle")}</p>
        <p className="mt-1">{t("seller.guidanceBody")}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {["Variants placeholder", "Shipping placeholder", "SEO placeholder"].map((label) => (
          <div key={label} className="rounded-lg border border-dashed border-border bg-slate-50 p-4">
            <p className="text-sm font-medium text-primary-text">{label}</p>
            <p className="mt-1 text-xs text-secondary-text">Architecture reserved for later marketplace depth.</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-border bg-slate-50 p-5">
        <div className="flex items-center gap-3">
          <ImagePlus className="size-5 text-secondary-text" />
          <div>
            <p className="text-sm font-medium text-primary-text">Media uploads</p>
            <p className="text-xs text-secondary-text">Image upload UI placeholder for catalog media workflow.</p>
          </div>
          <Button type="button" variant="secondary" className="ml-auto"><Upload /> Upload</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary">Save draft</Button>
        <Button type="submit"><Save /> {mode === "edit" ? "Update product" : "Create product"}</Button>
      </div>
    </form>
  );
}

export function StoreSettingsForm() {
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: "Freshline Local",
      phone: "+91 98765 43210",
      address: "Pondy Bazaar, T. Nagar, Chennai",
      latitude: 13.0418,
      longitude: 80.2341,
      serviceRadiusKm: 4.5,
      description: "Daily essentials, fresh foods, and fast hyperlocal fulfillment for nearby households.",
    },
  });
  const previewVendor = { ...marketplaceVendors[0], latitude: Number(form.watch("latitude")), longitude: Number(form.watch("longitude")), serviceRadiusKm: Number(form.watch("serviceRadiusKm")) };
  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(() => undefined)}>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Store name"><Input {...form.register("storeName")} /></FormField>
        <FormField label="Contact phone"><Input {...form.register("phone")} /></FormField>
        <FormField label="Store address"><Input {...form.register("address")} /></FormField>
        <FormField label="Operating hours placeholder"><Input value="08:00 - 22:00, daily" readOnly /></FormField>
        <FormField label="Latitude"><Input type="number" step="0.0001" {...form.register("latitude")} /></FormField>
        <FormField label="Longitude"><Input type="number" step="0.0001" {...form.register("longitude")} /></FormField>
        <FormField label="Delivery radius (km)"><Input type="number" min="1" max="15" step="0.5" {...form.register("serviceRadiusKm")} /></FormField>
        <div className="rounded-lg border border-border bg-slate-50 p-4 text-sm text-secondary-text">
          <MapPin className="mb-2 size-4 text-emerald-700" />
          Location verification placeholder ready. Sellers can pin location and preview service coverage before future review workflows.
        </div>
      </div>
      <FormField label="Store description"><Textarea {...form.register("description")} /></FormField>
      <ServiceZoneMapPreview vendor={previewVendor} />
      <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-secondary-text">Policies placeholder: returns, substitutions, and service commitments will become configurable later.</div>
      <div className="flex justify-end"><Button type="submit"><Save /> Save geo settings</Button></div>
    </form>
  );
}

export function OnboardingForm() {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { businessName: "Freshline Local", ownerName: "Akash Kumar", category: "Daily essentials", brandColor: "Emerald", verificationNote: "" },
  });
  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(() => undefined)}>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label={t("seller.businessName")}><Input {...form.register("businessName")} /></FormField>
        <FormField label={t("seller.ownerName")}><Input {...form.register("ownerName")} /></FormField>
        <FormField label={t("seller.category")}><Input {...form.register("category")} /></FormField>
        <FormField label="Store branding"><Input {...form.register("brandColor")} /></FormField>
      </div>
      <FormField label="Verification placeholder"><Textarea {...form.register("verificationNote")} placeholder="Capture documents and review notes later. No real KYC logic in this phase." /></FormField>
      <Button type="submit"><BadgeCheckIcon /> Complete onboarding review</Button>
    </form>
  );
}

function BadgeCheckIcon() {
  return <Save className="size-4" />;
}
