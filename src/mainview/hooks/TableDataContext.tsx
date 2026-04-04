import { createContext, useContext, type ReactNode } from "react";
import { useTableData } from "./useTableData";

type TableDataContextValue = ReturnType<typeof useTableData>;

const TableDataContext = createContext<TableDataContextValue | null>(null);

export function TableDataProvider({ children, scanLimit }: { children: ReactNode; scanLimit: number }) {
  const value = useTableData(scanLimit);
  return <TableDataContext.Provider value={value}>{children}</TableDataContext.Provider>;
}

export function useTableDataCtx(): TableDataContextValue {
  const ctx = useContext(TableDataContext);
  if (!ctx) throw new Error("useTableDataCtx must be used within TableDataProvider");
  return ctx;
}
