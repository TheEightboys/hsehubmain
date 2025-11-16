import * as React from "react";
import { cn } from "@/lib/utils";
import type { BadgeVariantProps } from "./badge-utils";
import { badgeVariants } from "./badge-utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    BadgeVariantProps {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
