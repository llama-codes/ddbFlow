import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import { Tooltip } from "../../components/Tooltip";
import { KeyBadge } from "../../components/KeyBadge";

export interface ColumnEntry {
  id: string;
  isVisible: boolean;
  keyType?: "PK" | "SK" | null;
  gsiCount?: number;
  lsiCount?: number;
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnEntry[];
  onToggle: (columnId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function ColumnVisibilityDropdown({
  columns,
  onToggle,
  onShowAll,
  onHideAll,
}: ColumnVisibilityDropdownProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  if (columns.length === 0) return null;

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip text="Toggle columns">
        <Button.Container variant="ghost" onClick={() => setOpen((o) => !o)}>
          <Button.Icon>
            <Icon size={14}>{IconPaths.columns}</Icon>
          </Button.Icon>
        </Button.Container>
      </Tooltip>

      {open && (
        <div
          className={`absolute right-0 top-full mt-1 w-56 ${t.bg.elevated} border ${t.border.muted} rounded-md shadow-lg z-50 flex flex-col`}
        >
          <div className={`flex items-center justify-between px-3 py-2 border-b ${t.border.base}`}>
            <button
              type="button"
              className={`text-xs ${t.text.brand} hover:underline cursor-pointer`}
              onClick={onShowAll}
            >
              Show all
            </button>
            <button
              type="button"
              className={`text-xs ${t.text.muted} hover:underline cursor-pointer`}
              onClick={onHideAll}
            >
              Hide all
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {columns.map((col) => (
              <label
                key={col.id}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:${t.bg.hover} text-xs ${t.text.secondary}`}
              >
                <input
                  type="checkbox"
                  checked={col.isVisible}
                  onChange={() => onToggle(col.id)}
                  className="accent-blue-500 rounded"
                />
                <span className="truncate flex-1">{col.id}</span>
                {col.keyType === "PK" && <KeyBadge variant="PK" compact />}
                {col.keyType === "SK" && <KeyBadge variant="SK" compact />}
                {col.gsiCount != null && col.gsiCount > 0 && (
                  <KeyBadge variant="GSI" compact tooltip={col.gsiCount > 1 ? `Used in ${col.gsiCount} GSIs` : undefined} />
                )}
                {col.lsiCount != null && col.lsiCount > 0 && (
                  <KeyBadge variant="LSI" compact tooltip={col.lsiCount > 1 ? `Used in ${col.lsiCount} LSIs` : undefined} />
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
