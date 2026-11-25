import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.ComponentProps<'input'> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
Input.displayName = "Input"

export interface TextareaProps extends React.ComponentProps<'textarea'> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-28 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export interface LabelProps extends React.ComponentProps<'label'> {}

function Label({ className, ...props }: LabelProps) {
  return <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] leading-[1.4] text-gray-700", className)} {...props} />
}

export { Input, Textarea, Label }
