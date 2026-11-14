import React, { forwardRef } from 'react';
import { cn } from './cn';

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn('rounded-xl border border-slate-200 bg-white shadow-none', className)} {...props} />;
});

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-sm font-semibold leading-5 text-slate-900', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm leading-5 text-slate-500', className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
);
