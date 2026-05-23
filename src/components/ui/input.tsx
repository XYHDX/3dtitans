import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Brand v2 — pixel-frame input: 3px hard border, block shadow, yellow focus.
          "flex h-10 w-full border-[3px] border-foreground bg-background px-3 py-2 text-base font-mono shadow-[3px_3px_0_0_hsl(var(--foreground))] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:placeholder:text-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
