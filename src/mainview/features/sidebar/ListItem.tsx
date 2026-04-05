import type { ReactNode } from "react";
import { Icon, IconPaths } from "../../components/Icon";
import { useTheme } from "../../theme/ThemeProvider";

interface ListItemProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
  trailingIcon?: ReactNode;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function ListItem({ label, selected = false, onClick, trailingIcon, isFavorite, onToggleFavorite }: ListItemProps) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center transition-colors cursor-pointer ${selected ? t.listItem.selected : t.listItem.base}`}
      title={label}
    >
      {onToggleFavorite && (
        <span
          role="button"
          className={`shrink-0 mr-1.5 flex items-center cursor-pointer transition-colors ${isFavorite ? "text-yellow-400" : t.text.faint} hover:text-yellow-400`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleFavorite();
            }
          }}
        >
          <Icon size={12}>{isFavorite ? IconPaths.star : IconPaths.starOutline}</Icon>
        </span>
      )}
      <span className="truncate flex-1 min-w-0">{label}</span>
      {trailingIcon && <span className="shrink-0 ml-1 flex items-center">{trailingIcon}</span>}
    </button>
  );
}
