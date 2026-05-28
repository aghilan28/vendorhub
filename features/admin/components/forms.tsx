"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categorySchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  parent: z.string().min(3),
  status: z.enum(["active", "inactive"]),
});

const noteSchema = z.object({
  decision: z.string().min(3),
  note: z.string().min(10),
});

const settingsSchema = z.object({
  moderationMode: z.string().min(3),
  notificationEmail: z.string().email(),
  featureFlags: z.string().min(5),
});

export function CategoryForm() {
  const form = useForm<any>({
    resolver: zodResolver(categorySchema as any),
    defaultValues: { name: "Fresh foods", slug: "fresh-foods", parent: "Marketplace root", status: "active" },
  });

  return (
    <form className="grid gap-4 lg:grid-cols-2" onSubmit={form.handleSubmit((() => undefined) as any)}>
      <FormField label="Category name"><Input {...form.register("name")} /></FormField>
      <FormField label="Slug"><Input {...form.register("slug")} /></FormField>
      <FormField label="Parent category"><Input {...form.register("parent")} /></FormField>
      <FormField label="Visibility">
        <Select defaultValue="active" onValueChange={(value) => form.setValue("status", value as "active" | "inactive")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </FormField>
      <div className="lg:col-span-2 rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-secondary-text">Category image workflow is ready for future taxonomy media management.</div>
      <div className="lg:col-span-2 flex justify-end"><Button type="submit"><Save /> Save category</Button></div>
    </form>
  );
}

export function GovernanceNoteForm({ label = "Governance action" }: { label?: string }) {
  const form = useForm<any>({
    resolver: zodResolver(noteSchema as any),
    defaultValues: { decision: "Approve", note: "" },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((() => undefined) as any)}>
      <FormField label={label}>
        <Select defaultValue="Approve" onValueChange={(value) => form.setValue("decision", value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Approve">Approve</SelectItem>
            <SelectItem value="Reject">Reject</SelectItem>
            <SelectItem value="Escalate">Escalate</SelectItem>
            <SelectItem value="Suspend">Suspend</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Operational notes"><Textarea {...form.register("note")} placeholder="Record auditable governance reasoning for this decision." /></FormField>
      <Button type="submit"><ShieldCheck /> Record decision</Button>
    </form>
  );
}

export function AdminSettingsForm() {
  const form = useForm<any>({
    resolver: zodResolver(settingsSchema as any),
    defaultValues: { moderationMode: "Manual review queues", notificationEmail: "ops@vendorhub.local", featureFlags: "Realtime, AI moderation, settlements deferred" },
  });
  return (
    <form className="grid gap-4 lg:grid-cols-2" onSubmit={form.handleSubmit((() => undefined) as any)}>
      <FormField label="Moderation settings"><Input {...form.register("moderationMode")} /></FormField>
      <FormField label="Notification settings"><Input {...form.register("notificationEmail")} /></FormField>
      <div className="lg:col-span-2"><FormField label="Feature flags"><Textarea {...form.register("featureFlags")} /></FormField></div>
      <div className="lg:col-span-2 rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-secondary-text">Admin preferences are ready for future governance personalization.</div>
      <div className="lg:col-span-2 flex justify-end"><Button type="submit"><Save /> Save admin settings</Button></div>
    </form>
  );
}
