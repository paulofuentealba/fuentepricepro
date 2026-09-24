import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";
import { SortableTableHead } from "@/components/ui/SortableTableHead";
import { useTableSort, type SortDirection } from "@/components/ui/table-sort";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  accessor?: (item: T) => number | string | null | undefined;
  cell?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  sticky?: boolean;
  className?: string;
  headerClassName?: string;
  title?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  defaultSortKey?: string;
  defaultSortDirection?: "asc" | "desc";
  onRowClick?: (item: T) => void;
  rowClassName?: string | ((item: T, index: number) => string | undefined);
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyState?: React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  tableClassName?: string;
  containerClassName?: string;
  /** Permite acessar o estado ativo de sort pelo pai se necessário */
  onSortChange?: (sortKey: string | null, direction: SortDirection) => void;
}

/**
 * Componente Mestre Unificado DataTable (Regra 1 do AGENTS.md — Reusabilidade Primeiro).
 * Centraliza:
 * - Ciclo tri-state de ordenação por cabeçalho (asc -> desc -> default)
 * - Container com scroll horizontal e coluna sticky automática
 * - Skeletons de loading proporcionais ao número de colunas
 * - Estado de vazio customizável
 */
export function DataTable<T>({
  data,
  columns,
  defaultSortKey,
  defaultDirectionFallback,
  defaultSortDirection = "desc",
  onRowClick,
  rowClassName,
  isLoading = false,
  loadingRowCount = 4,
  emptyState,
  keyExtractor,
  tableClassName,
  containerClassName,
  onSortChange,
}: DataTableProps<T> & { defaultDirectionFallback?: "asc" | "desc" }) {
  // Constrói mapa de extractors a partir das colunas que possuem accessor
  const extractors = useMemo(() => {
    const map: Record<string, (item: T) => number | string | null | undefined> = {};
    for (const col of columns) {
      if (col.accessor) {
        map[col.id] = col.accessor;
      }
    }
    return map;
  }, [columns]);

  // Chave padrão: usa a especificada ou a primeira coluna com accessor
  const effectiveDefaultKey = defaultSortKey || columns.find((c) => c.accessor)?.id || columns[0]?.id || "";

  const { sortedItems, sortKey, sortDirection, toggleSort } = useTableSort<T, string>({
    items: data,
    defaultSortKey: effectiveDefaultKey,
    defaultDirection: defaultSortDirection || defaultDirectionFallback || "desc",
    extractors,
  });

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border/60 bg-card",
        containerClassName,
      )}
    >
      <Table className={cn("w-full border-collapse", tableClassName)}>
        <TableHeader className="bg-surface-1">
          <TableRow className="border-border/60 hover:bg-transparent">
            {columns.map((col) => {
              const isSortable = col.sortable ?? Boolean(col.accessor);
              return (
                <SortableTableHead
                  key={col.id}
                  id={col.id}
                  label={col.header}
                  sortable={isSortable}
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onSort={(key) => {
                    toggleSort(key);
                    if (onSortChange) {
                      onSortChange(key, sortDirection);
                    }
                  }}
                  align={col.align}
                  sticky={col.sticky}
                  className={col.headerClassName}
                  title={col.title}
                />
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: loadingRowCount }).map((_, rIdx) => (
              <TableRow key={`skeleton-row-${rIdx}`} className="border-border/40">
                {columns.map((col, cIdx) => (
                  <TableCell
                    key={`skeleton-cell-${rIdx}-${col.id}`}
                    className={cn(
                      col.sticky && STICKY_FIRST_COLUMN_CLASS,
                      col.className,
                    )}
                  >
                    <Skeleton
                      className={cn(
                        "h-5 w-full max-w-[120px] rounded bg-muted/40",
                        cIdx === 0 && "max-w-[140px]",
                        col.align === "right" && "ml-auto",
                        col.align === "center" && "mx-auto",
                      )}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : sortedItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyState || "Nenhum dado encontrado."}
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((item, index) => {
              const key = keyExtractor(item, index);
              const computedRowClass =
                typeof rowClassName === "function"
                  ? rowClassName(item, index)
                  : rowClassName;

              return (
                <TableRow
                  key={key}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={cn(
                    "border-border/40 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-surface-hover/80",
                    computedRowClass,
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={`${key}-${col.id}`}
                      className={cn(
                        col.sticky && STICKY_FIRST_COLUMN_CLASS,
                        col.align === "right" && "text-right tabular-nums",
                        col.align === "center" && "text-center",
                        col.className,
                      )}
                    >
                      {col.cell
                        ? col.cell(item, index)
                        : String(col.accessor ? col.accessor(item) ?? "—" : "—")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
