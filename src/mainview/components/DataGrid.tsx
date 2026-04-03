import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";
import type { KeySchemaElement } from "shared/schemas";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";
import { Icon, IconPaths } from "./Icon";

type Row = Record<string, unknown>;

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value instanceof Set) return [...value].join(", ");
  return JSON.stringify(value);
}

interface DataGridProps {
  items: Row[];
  tableKeys: KeySchemaElement[];
  hasNextPage: boolean;
  loadingNextPage: boolean;
  onLoadNextPage: () => void;
}

export function DataGrid({ items, tableKeys, hasNextPage, loadingNextPage, onLoadNextPage }: DataGridProps) {
  const t = useTheme();

  const hashKey = tableKeys.find((k) => k.keyType === "HASH")?.attributeName;
  const rangeKey = tableKeys.find((k) => k.keyType === "RANGE")?.attributeName;

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const allKeys = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
    const orderedKeys = [
      hashKey,
      rangeKey,
      ...allKeys.filter((k) => k !== hashKey && k !== rangeKey),
    ].filter(Boolean) as string[];

    return orderedKeys.map((key) => ({
      id: key,
      accessorFn: (row) => row[key],
      header: key,
      cell: (info) => {
        const formatted = formatValue(info.getValue());
        return (
          <span className={`block truncate max-w-xs ${t.text.secondary}`} title={formatted}>
            {formatted}
          </span>
        );
      },
    }));
  }, [items, hashKey, rangeKey, t]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = items.length;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);
  const isLastClientPage = !table.getCanNextPage();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="text-sm border-collapse min-w-full">
          <thead className={`sticky top-0 ${t.bg.surface} z-10`}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const key = header.id;
                  const isPK = key === hashKey;
                  const isSK = key === rangeKey;
                  return (
                    <th
                      key={header.id}
                      className={`px-3 py-2 text-left border-b ${t.border.base} whitespace-nowrap`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${t.text.muted} uppercase tracking-wider`}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {isPK && (
                          <Tooltip text="Partition Key (HASH)">
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${t.text.brand} ${t.bg.partitionKeyAccent} border ${t.border.partitionKeyAccent} cursor-default`}>
                              PK
                            </span>
                          </Tooltip>
                        )}
                        {isSK && (
                          <Tooltip text="Sort Key (RANGE)">
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${t.text.sortKey} ${t.bg.sortKeyAccent} border ${t.border.sortKeyAccent} cursor-default`}>
                              SK
                            </span>
                          </Tooltip>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b ${t.border.base} ${i % 2 === 0 ? t.tableRow.even : t.tableRow.odd} ${t.tableRow.hover}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 max-w-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className={`flex items-center justify-between px-4 py-2 border-t ${t.border.base} shrink-0`}>
        <div className="flex items-center gap-1.5">
          {hasNextPage && (
            <Tooltip text="More items available. Use 'Load more from AWS' to fetch them." position="right">
              <span className={`flex items-center ${t.text.warning} cursor-default`}>
                <Icon size={13}>{IconPaths.warning}</Icon>
              </span>
            </Tooltip>
          )}
          <span className={`text-xs ${t.text.faint}`}>
            {from}–{to} of {totalRows} loaded items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { table.setPageSize(Number(e.target.value)); table.setPageIndex(0); }}
            className={`text-xs ${t.input.base} rounded px-2 py-1`}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
          {isLastClientPage && hasNextPage && (
            <Button.Container
              variant="sm"
              onClick={onLoadNextPage}
              disabled={loadingNextPage}
              className="mr-2"
            >
              <Button.Text>{loadingNextPage ? "Loading…" : "Load more from AWS"}</Button.Text>
            </Button.Container>
          )}
          <Button.Container variant="ghost" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <Button.Icon><Icon size={14}>{chevronLeft}</Icon></Button.Icon>
          </Button.Container>
          <span className={`text-xs ${t.text.muted} px-2`}>
            {pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button.Container variant="ghost" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <Button.Icon><Icon size={14}>{chevronRight}</Icon></Button.Icon>
          </Button.Container>
        </div>
      </div>
    </div>
  );
}

const chevronLeft = (
  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
);

const chevronRight = (
  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
);
