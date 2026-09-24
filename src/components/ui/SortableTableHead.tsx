import React from "react";
import { TableHead } from "@/components/ui/table";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import type { SortDirection } from "./table-sort";

export interface SortableTableHeadProps {
  id: string;
  label: React.ReactNode;
  sortable?: boolean;
  activeKey?: string | null;
  activeDirection?: SortDirection;
  onSort?: (id: string) => void;
  align?: "left" | "right" | "center";
  sticky?: boolean;
  className?: string;
  title?: string;
}

export function SortableTableHead({
  id,
  label,
  sortable = true,
  activeKey,
  activeDirection = "default",
  onSort,
  align = "left",
  sticky = false,
  className,
  title,
}: SortableTableHeadProps) {
  const { t } = useI18n();

  const isActive = activeKey === id && activeDirection !== "default";
  const isAsc = isActive && activeDirection === "asc";
  const isDesc = isActive && activeDirection === "desc";

  const ariaSort = !isActive
    ? "none"
    : isAsc
      ? "ascending"
      : "descending";

  const labelText = typeof label === "string" ? label : "";
  const sortAriaLabel = !sortable
    ? undefined
    : `${labelText ? `${labelText}: ` : ""}${
        isAsc
          ? t?.common?.tableSort?.sortedAscending ?? "Ordenado de forma crescente"
          : isDesc
            ? t?.common?.tableSort?.sortedDescending ?? "Ordenado de forma decrescente"
            : t?.common?.tableSort?.clickToSort ?? "Clique para ordenar"
      }`;

  function handleClick() {
    if (!sortable || !onSort) return;
    onSort(id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTableCellElement>) {
    if (!sortable || !onSort) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      onSort(id);
    }
  }

  return (
    <TableHead
      scope="col"
      role={sortable ? "button" : undefined}
      tabIndex={sortable ? 0 : undefined}
      aria-sort={sortable ? ariaSort : undefined}
      aria-label={sortAriaLabel}
      title={title}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "select-none transition-colors",
        sticky && STICKY_FIRST_COLUMN_CLASS,
        sortable &&
          "cursor-pointer group hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        isActive && "text-foreground font-bold",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
          align === "left" && "justify-start",
        )}
      >
        <span>{label}</span>
        {sortable && (
          <span className="inline-flex shrink-0 transition-all">
            {isAsc ? (
              <ChevronUp className="h-3.5 w-3.5 text-accent-gold animate-in fade-in zoom-in-75 duration-150" />
            ) : isDesc ? (
              <ChevronDown className="h-3.5 w-3.5 text-accent-gold animate-in fade-in zoom-in-75 duration-150" />
            ) : (
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        )}
      </div>
    </TableHead>
  );
}
