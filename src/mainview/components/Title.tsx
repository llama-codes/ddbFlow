import type { ReactNode } from "react";

interface TitleProps {
  children: ReactNode;
  bold?: boolean;
}

export function Title({ children, bold = false }: TitleProps) {
  return (
    <span className={`text-xs uppercase tracking-wider ${bold ? "font-bold text-gray-100" : "font-semibold text-gray-400"}`}>
      {children}
    </span>
  );
}
