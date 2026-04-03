import type { ReactNode, ButtonHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeProvider";

interface ContainerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "sm" | "ghost";
}

function Container({ children, variant = "default", className = "", ...props }: ContainerProps) {
  const t = useTheme();
  const base = "flex items-center gap-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button className={`${base} ${t.button[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Text({ children }: { children: ReactNode }) {
  return <span>{children}</span>;
}

function ButtonIcon({ children }: { children: ReactNode }) {
  return <span className="flex items-center">{children}</span>;
}

export const Button = {
  Container,
  Text,
  Icon: ButtonIcon,
};
