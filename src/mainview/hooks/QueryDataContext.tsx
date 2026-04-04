import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQueryData } from "./useQueryData";
import type { TableInfo } from "shared/schemas";

type QueryDataContextValue = ReturnType<typeof useQueryData>;

const QueryDataContext = createContext<QueryDataContextValue | null>(null);

interface QueryDataProviderProps {
  children: ReactNode;
  selectedTable: string | null;
  tableInfo: TableInfo | null;
  scanLimit: number;
}

export function QueryDataProvider({
  children,
  selectedTable,
  tableInfo,
  scanLimit,
}: QueryDataProviderProps) {
  const value = useQueryData(selectedTable, tableInfo, scanLimit);

  useEffect(() => {
    value.resetQueryData();
    if (selectedTable) {
      value.restoreQuerySessions(selectedTable);
    }
  }, [selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  return <QueryDataContext.Provider value={value}>{children}</QueryDataContext.Provider>;
}

export function useQueryDataCtx(): QueryDataContextValue {
  const ctx = useContext(QueryDataContext);
  if (!ctx) throw new Error("useQueryDataCtx must be used within QueryDataProvider");
  return ctx;
}
