import { createContext, useContext, type ReactNode } from "react";
import { useTables } from "./useTables";

type TablesContextValue = ReturnType<typeof useTables>;

const TablesContext = createContext<TablesContextValue | null>(null);

export function TablesProvider({ children }: { children: ReactNode }) {
  const value = useTables();
  return <TablesContext.Provider value={value}>{children}</TablesContext.Provider>;
}

export function useTablesCtx(): TablesContextValue {
  const ctx = useContext(TablesContext);
  if (!ctx) throw new Error("useTablesCtx must be used within TablesProvider");
  return ctx;
}
