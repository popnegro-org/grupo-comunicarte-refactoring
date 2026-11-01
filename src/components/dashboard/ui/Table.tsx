import React from 'react';
import { cn } from './cn';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <div className="w-full overflow-x-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>;
}
export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn('[&_tr]:border-b [&_tr]:border-slate-200', className)} {...props} />;
export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
export const TableFooter = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <tfoot className={cn('border-t border-slate-200 bg-slate-50 font-medium', className)} {...props} />;
export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn('border-b border-slate-100 transition-colors hover:bg-slate-50/70', className)} {...props} />;
export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn('h-10 px-4 text-left align-middle text-xs font-semibold text-slate-500', className)} {...props} />;
export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-4 py-3 align-middle text-sm text-slate-700', className)} {...props} />;
