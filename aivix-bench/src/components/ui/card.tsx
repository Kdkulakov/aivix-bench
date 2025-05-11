import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-white text-black shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";
