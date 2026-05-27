"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/30" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-40 h-dvh w-[min(20rem,calc(100vw-1rem))] overflow-y-auto border-l border-border bg-surface p-5 shadow-lg focus-ring",
        className,
      )}
      {...props}
    >
      <DialogPrimitive.Title className="sr-only">Navigation drawer</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">Use this drawer to navigate between workspace sections.</DialogPrimitive.Description>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-md text-secondary-text hover:bg-slate-100 focus-ring">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";
