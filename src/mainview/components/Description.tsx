import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";

export function Description({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <p className={`text-xs ${t.text.faint}`}>
      {children}
    </p>
  );
}
