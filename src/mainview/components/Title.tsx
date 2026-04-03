import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";

interface TitleProps {
  children: ReactNode;
  bold?: boolean;
}

export function Title({ children, bold = false }: TitleProps) {
  const t = useTheme();
  return (
    <span className={`text-xs uppercase tracking-wider ${bold ? `font-bold ${t.text.primary}` : `font-semibold ${t.text.muted}`}`}>
      {children}
    </span>
  );
}
