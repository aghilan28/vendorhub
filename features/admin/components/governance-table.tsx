"use client";

import { ArrowDownUp, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface GovernanceColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

export function GovernanceTable<T>({
  title,
  description,
  rows,
  columns,
  searchValue,
  onSearch,
  actions,
  empty,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: GovernanceColumn<T>[];
  searchValue?: string;
  onSearch?: (value: string) => void;
  actions?: ReactNode;
  empty: ReactNode;
}) {
  return (
    <section className="operational-surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-primary-text">{title}</h2>
          {description ? <p className="mt-1 text-xs text-secondary-text">{description}</p> : null}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {onSearch ? (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
              <Input className="pl-9" value={searchValue ?? ""} onChange={(event) => onSearch(event.target.value)} placeholder="Search governance records" aria-label={`Search ${title}`} />
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
                    {column.sortable ? <ArrowDownUp className="size-3" aria-hidden="true" /> : null}
                    {column.sortable ? <span className="sr-only">Sortable column</span> : null}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} className="align-top">
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn("min-w-36 max-w-80", column.className)}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-xs text-secondary-text sm:flex-row sm:items-center sm:justify-between">
        <span>{rows.length} records visible</span>
        <span>Pagination and bulk action-ready governance table</span>
      </div>
    </section>
  );
}
