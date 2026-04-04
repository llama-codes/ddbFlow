import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";

interface ListItemProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
  trailingIcon?: ReactNode;
}

export function ListItem({ label, selected = false, onClick, trailingIcon }: ListItemProps) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center transition-colors cursor-pointer ${selected ? t.listItem.selected : t.listItem.base}`}
      title={label}
    >
      <span className="truncate flex-1 min-w-0">{label}</span>
      {trailingIcon && <span className="shrink-0 ml-1 flex items-center">{trailingIcon}</span>}
    </button>
  );
}
