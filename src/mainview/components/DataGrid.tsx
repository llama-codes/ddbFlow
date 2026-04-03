import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";
import type { KeySchemaElement } from "shared/schemas";
import { Tooltip } from "./Tooltip";

type Row = Record<string, unknown>;

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
}

export function DataGrid({ items, tableKeys }: DataGridProps) {
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
  });

  return (
    <div className="overflow-auto h-full">
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
  );
}
