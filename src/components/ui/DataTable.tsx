"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  className?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | boolean | null | undefined;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  rowHeight?: number;
  minRows?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  defaultSortKey?: string;
  defaultSortOrder?: "asc" | "desc";
  onSortChange?: (key: string, order: "asc" | "desc") => void;
  tableLayout?: "auto" | "fixed";
  className?: string;
  tableClassName?: string;
}

// Adaptive table computing rows dynamically via ResizeObserver with interactive column sorting
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = "Tidak ada data",
  emptyDescription = "Belum ada catatan yang tersedia untuk ditampilkan.",
  emptyAction,
  rowHeight = 40,
  minRows = 5,
  page: controlledPage,
  onPageChange,
  defaultSortKey,
  defaultSortOrder = "asc",
  onSortChange,
  tableLayout = "fixed",
  className,
  tableClassName,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [pageSize, setPageSize] = useState(minRows);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

  const activePage = controlledPage ?? internalPage;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // Subtract 40px sticky header and 44px pagination bar
        const availableHeight = height - 84;
        if (availableHeight > 0) {
          const calculated = Math.floor(availableHeight / rowHeight);
          setPageSize(Math.max(minRows, calculated));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [rowHeight, minRows]);

  const handleSort = (key: string) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (sortKey === key) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortKey(key);
    setSortOrder(nextOrder);
    setInternalPage(1);
    onSortChange?.(key, nextOrder);
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    return [...data].sort((a, b) => {
      let valA: unknown = col?.sortValue ? col.sortValue(a) : (a as Record<string, unknown>)[sortKey];
      let valB: unknown = col?.sortValue ? col.sortValue(b) : (b as Record<string, unknown>)[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === "") return 1;
      if (valB === null || valB === undefined || valB === "") return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      if (typeof valA === "boolean" && typeof valB === "boolean") {
        return sortOrder === "asc" ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortOrder === "asc"
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [data, sortKey, sortOrder, columns]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, activePage), totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, validPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const startRecord = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endRecord = Math.min(validPage * pageSize, totalItems);
  const summaryText = `Menampilkan ${startRecord}-${endRecord} dari ${formatNumber(totalItems)} data`;
  const pageText = `${validPage} / ${totalPages}`;

  const isFixed = tableLayout === "fixed";

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 min-h-0 flex flex-col bg-surface border border-black/[0.08] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <table className={cn("min-w-full w-full text-left border-collapse text-xs", isFixed && "table-fixed", tableClassName)}>
          <thead className="sticky top-0 z-10 bg-[#F9F9FB] border-b border-[#E5E5EA]">
            <tr className="h-10">
              {columns.map((col) => {
                const isSortable = col.sortable ?? (col.key !== "select" && col.key !== "actions" && col.key !== "aksi");
                const isCurrentSort = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => isSortable && handleSort(col.key)}
                    className={cn(
                      "px-2 sm:px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] select-none",
                      isSortable && "cursor-pointer hover:text-text hover:bg-black/[0.03] transition-colors",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 min-w-0 max-w-full",
                        col.align === "right" && "justify-end w-full",
                        col.align === "center" && "justify-center w-full"
                      )}
                    >
                      <span className="whitespace-nowrap">{col.header}</span>
                      {isSortable && (
                        <span className="shrink-0 text-text-muted">
                          {isCurrentSort ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-primary stroke-[2.5]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-primary stroke-[2.5]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F2F2F7]">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="h-10">
                  {columns.map((col) => (
                    <td key={`skeleton-cell-${col.key}`} className="px-2 sm:px-3.5 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const key = keyExtractor(row, index);
                return (
                  <tr
                    key={key}
                    className="h-10 hover:bg-primary-50/40 transition-colors duration-150"
                  >
                    {columns.map((col) => {
                      const value = (row as Record<string, unknown>)[col.key];
                      const allowOverflow = col.className?.includes("overflow-");
                      return (
                        <td
                          key={`${key}-${col.key}`}
                          className={cn(
                            "px-2 sm:px-3.5 text-text tabular-nums",
                            allowOverflow ? "" : "truncate",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                            col.className
                          )}
                        >
                          {col.render
                            ? col.render(row, index)
                            : (value as React.ReactNode) ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="h-10 sm:h-11 border-t border-[#E5E5EA] px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-2 text-xs text-[#86868B] shrink-0 bg-[#FAFAFC] select-none flex-nowrap">
        <span className="tabular-nums font-medium text-[10px] sm:text-xs whitespace-nowrap truncate mr-1">
          {summaryText}
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            disabled={validPage <= 1 || isLoading}
            onClick={() => handlePageChange(validPage - 1)}
            className="h-6.5 sm:h-7 px-1.5 sm:px-2.5 rounded-[5px] sm:rounded-[6px] border border-[#D1D1D6] bg-white text-[10px] sm:text-xs font-medium text-text hover:bg-black/[0.03] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-nowrap"
          >
            Sebelumnya
          </button>
          <span className="px-1.5 py-0.5 text-text font-semibold tabular-nums text-[9px] sm:text-[11px] bg-[#E5E5EA]/70 rounded-[4px] sm:rounded-[5px] whitespace-nowrap">
            {pageText}
          </span>
          <button
            type="button"
            disabled={validPage >= totalPages || isLoading}
            onClick={() => handlePageChange(validPage + 1)}
            className="h-6.5 sm:h-7 px-1.5 sm:px-2.5 rounded-[5px] sm:rounded-[6px] border border-[#D1D1D6] bg-white text-[10px] sm:text-xs font-medium text-text hover:bg-black/[0.03] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-nowrap"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
