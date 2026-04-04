import { useTheme } from "../theme/ThemeProvider";
import { Tooltip } from "./Tooltip";

type KeyVariant = "PK" | "SK" | "GSI" | "LSI";

interface KeyBadgeProps {
  variant: KeyVariant;
  /** Tooltip text. Falls back to a sensible default per variant. */
  tooltip?: string;
  /** Render at a smaller size (used inside the column-visibility dropdown). */
  compact?: boolean;
}

export function KeyBadge({ variant, tooltip, compact }: KeyBadgeProps) {
  const t = useTheme();

  const styles: Record<KeyVariant, { text: string; bg: string; border: string }> = {
    PK:  { text: t.text.tableKey, bg: t.bg.tableKeyAccent, border: t.border.tableKeyAccent },
    SK:  { text: t.text.tableKey, bg: t.bg.tableKeyAccent, border: t.border.tableKeyAccent },
    GSI: { text: t.text.gsi,      bg: t.bg.gsiAccent,      border: t.border.gsiAccent },
    LSI: { text: t.text.lsi,      bg: t.bg.lsiAccent,      border: t.border.lsiAccent },
  };

  const defaultTooltips: Record<KeyVariant, string> = {
    PK: "Partition Key (HASH)",
    SK: "Sort Key (RANGE)",
    GSI: "Global Secondary Index",
    LSI: "Local Secondary Index",
  };

  const s = styles[variant];
  const size = compact ? "text-[9px] px-1" : "text-[10px] px-1 py-0.5";

  return (
    <Tooltip text={tooltip ?? defaultTooltips[variant]}>
      <span className={`${size} font-bold rounded ${s.text} ${s.bg} border ${s.border} cursor-default shrink-0`}>
        {variant}
      </span>
    </Tooltip>
  );
}
