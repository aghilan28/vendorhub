import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium leading-none transition duration-150 ease-out focus-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-hover",
        secondary: "border border-border bg-surface text-primary-text hover:bg-slate-50",
        ghost: "text-secondary-text hover:bg-slate-100 hover:text-primary-text",
        destructive: "bg-danger text-white hover:bg-red-700",
        outline: "border border-border bg-transparent text-primary-text hover:bg-slate-50",
      },
      size: {
        sm: "min-h-11 px-3 text-xs",
        default: "min-h-11 px-3",
        lg: "min-h-12 px-4",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
