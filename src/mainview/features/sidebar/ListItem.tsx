import { useTheme } from "../../theme/ThemeProvider";

interface ListItemProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
}

export function ListItem({ label, selected = false, onClick }: ListItemProps) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm truncate transition-colors cursor-pointer ${selected ? t.listItem.selected : t.listItem.base}`}
      title={label}
    >
      {label}
    </button>
  );
}
