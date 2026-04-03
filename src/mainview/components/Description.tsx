import type { ReactNode } from "react";

export function Description({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-gray-500">
      {children}
    </p>
  );
}
