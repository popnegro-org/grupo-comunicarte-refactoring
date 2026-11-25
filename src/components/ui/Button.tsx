import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = {
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      default: "bg-[#009966] text-white hover:bg-[#007D54]",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
      link: "text-[#007D54] underline-offset-4 hover:text-[#005F40] hover:underline",
      dark: "bg-gray-900 text-white hover:bg-black",
    },
    size: {
      default: "h-10 px-5 py-2",
      sm: "h-9 rounded-md px-4 text-xs",
      lg: "h-12 rounded-lg px-6 text-sm",
      icon: "h-10 w-10",
    },
  }
}

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: keyof typeof buttonVariants.variants.variant;
  size?: keyof typeof buttonVariants.variants.size;
}

export function buttonStyles({ variant = "default", size = "default", className }: {
  variant?: keyof typeof buttonVariants.variants.variant,
  size?: keyof typeof buttonVariants.variants.size,
  className?: string
} = {}) {
  return cn(buttonVariants.base, buttonVariants.variants.variant[variant], buttonVariants.variants.size[size], className)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button className={buttonStyles({ variant, size, className })} ref={ref} {...props} />
))
Button.displayName = "Button"

export { Button }
