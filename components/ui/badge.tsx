import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        overdue: "border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
        due: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
        success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
        outline: "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
