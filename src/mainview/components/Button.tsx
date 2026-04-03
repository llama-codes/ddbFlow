import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ContainerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "ghost";
}

function Container({ children, variant = "default", className = "", ...props }: ContainerProps) {
  const base = "flex items-center gap-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 hover:text-gray-100 hover:bg-gray-700",
    ghost: "p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
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
