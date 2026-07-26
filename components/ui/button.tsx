import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // motion-safe cho scale: người bật "giảm chuyển động" không bị nút nhún.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-150 motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent-strong shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        // Trước đây outline/ghost dùng `hover:bg-accent`. Sau khi `--accent` đổi
        // thành màu nhấn fuchsia, hover biến thành mảng hồng đặc — sai hoàn toàn.
        // Hover của nút phụ phải là surface, không phải màu nhấn.
        outline: "border border-border bg-transparent hover:border-fg/25 hover:bg-surface-2 hover:text-fg",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3",
        ghost: "hover:bg-surface-2 hover:text-fg",
        link: "text-accent-soft underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        // 40px là sàn vùng bấm. Trước là h-9 (36px) — dưới ngưỡng chạm được.
        sm: "h-10 rounded-md px-3.5",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-lg": "h-11 w-11",
      },
      iconSize: {
        sm: "[&_svg]:size-3.5",
        md: "[&_svg]:size-4",
        lg: "[&_svg]:size-5",
        xl: "[&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      iconSize: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, iconSize, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, iconSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
