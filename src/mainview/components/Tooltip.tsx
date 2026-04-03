import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  text: string;
  position?: TooltipPosition;
  children: ReactNode;
}

const positionClasses: Record<TooltipPosition, string> = {
  top:    "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left:   "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right:  "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

export function Tooltip({ text, position = "bottom", children }: TooltipProps) {
  const t = useTheme();
  return (
    <div className="relative group">
      {children}
      <div className={`absolute ${positionClasses[position]} hidden group-hover:block ${t.bg.elevated} border ${t.border.muted} ${t.text.secondary} text-xs rounded px-2 py-1.5 whitespace-nowrap z-50 pointer-events-none`}>
        {text}
      </div>
    </div>
  );
}
