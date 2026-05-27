"use client";

import { ArrowDownUp, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface OperationalColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
  sortLabel?: string;
}

export function OperationalTable<T>({
  title,
  description,
  rows,
  columns,
  searchValue,
  onSearch,
  empty,
  actions,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: OperationalColumn<T>[];
  searchValue?: string;
  onSearch?: (value: string) => void;
  empty: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="operational-surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-primary-text">{title}</h2>
          {description ? <p className="mt-1 text-xs text-secondary-text">{description}</p> : null}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {onSearch ? (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
              <Input value={searchValue ?? ""} onChange={(event) => onSearch(event.target.value)} placeholder="Search table" className="pl-9" aria-label={`Search ${title}`} />
            </div>
          ) : null}
          {actions}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-4">{empty}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortLabel ? <ArrowDownUp className="size-3" aria-hidden="true" /> : null}
                    {column.sortLabel ? <span className="sr-only">{column.sortLabel}</span> : null}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} className="align-top">
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn("min-w-36 max-w-80", column.className)}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-xs text-secondary-text sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {rows.length} operational records</span>
        <span>Pagination-ready table architecture</span>
      </div>
    </section>
  );
}
