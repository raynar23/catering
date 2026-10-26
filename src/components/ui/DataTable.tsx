"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  className?: string;
}

// Adaptive table computing rows dynamically via ResizeObserver for zero page scroll
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
  tableLayout = "fixed",
  className,
}: DataTableProps<T> & { tableLayout?: "auto" | "fixed" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [pageSize, setPageSize] = useState(minRows);

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

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, activePage), totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, validPage, pageSize]);

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
      <div className={cn("flex-1 min-h-0", isFixed ? "overflow-y-auto overflow-x-hidden" : "overflow-auto")}>
        <table className={cn("w-full text-left border-collapse text-xs", isFixed && "table-fixed")}>
          <thead className="sticky top-0 z-10 bg-[#F9F9FB]/95 backdrop-blur-sm border-b border-[#E5E5EA]">
            <tr className="h-10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "px-2 sm:px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] select-none truncate",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
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
                      return (
                        <td
                          key={`${key}-${col.key}`}
                          className={cn(
                            "px-2 sm:px-3.5 text-text tabular-nums truncate",
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

      <div className="h-11 border-t border-[#E5E5EA] px-2.5 sm:px-4 flex items-center justify-between gap-2 text-xs text-[#86868B] shrink-0 bg-[#FAFAFC] select-none">
        <span className="tabular-nums font-medium truncate max-w-[130px] sm:max-w-none text-[10px] sm:text-xs">
          {summaryText}
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            disabled={validPage <= 1 || isLoading}
            onClick={() => handlePageChange(validPage - 1)}
            className="h-7 px-2 sm:px-3 rounded-[6px] border border-[#D1D1D6] bg-white text-[11px] sm:text-xs font-medium text-text hover:bg-black/[0.03] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            Sebelumnya
          </button>
          <span className="px-2 py-0.5 text-text font-semibold tabular-nums text-[10px] sm:text-[11px] bg-[#E5E5EA]/70 rounded-[5px]">
            {pageText}
          </span>
          <button
            type="button"
            disabled={validPage >= totalPages || isLoading}
            onClick={() => handlePageChange(validPage + 1)}
            className="h-7 px-2 sm:px-3 rounded-[6px] border border-[#D1D1D6] bg-white text-[11px] sm:text-xs font-medium text-text hover:bg-black/[0.03] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
