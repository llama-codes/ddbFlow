import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";

interface TooltipProps {
  text: string;
  position?: "top" | "bottom";
  children: ReactNode;
}

export function Tooltip({ text, position = "bottom", children }: TooltipProps) {
  const t = useTheme();
  const positionClasses = position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";

  return (
    <div className="relative group">
      {children}
      <div className={`absolute right-0 ${positionClasses} hidden group-hover:block ${t.bg.elevated} border ${t.border.muted} ${t.text.secondary} text-xs rounded px-2 py-1.5 whitespace-nowrap z-50 pointer-events-none`}>
        {text}
      </div>
    </div>
  );
}
