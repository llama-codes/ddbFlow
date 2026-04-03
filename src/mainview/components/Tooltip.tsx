import type { ReactNode } from "react";

interface TooltipProps {
  text: string;
  position?: "top" | "bottom";
  children: ReactNode;
}

export function Tooltip({ text, position = "bottom", children }: TooltipProps) {
  const positionClasses =
    position === "top"
      ? "bottom-full mb-1.5"
      : "top-full mt-1.5";

  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute right-0 ${positionClasses} hidden group-hover:block bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 whitespace-nowrap z-50 pointer-events-none`}
      >
        {text}
      </div>
    </div>
  );
}
