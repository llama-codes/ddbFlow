import { createContext, useContext, type ReactNode } from "react";
import { useLambdaLogs } from "./useLambdaLogs";

type LambdaLogsContextValue = ReturnType<typeof useLambdaLogs>;

const LambdaLogsContext = createContext<LambdaLogsContextValue | null>(null);

export function LambdaLogsProvider({ children }: { children: ReactNode }) {
  const value = useLambdaLogs();
  return (
    <LambdaLogsContext.Provider value={value}>
      {children}
    </LambdaLogsContext.Provider>
  );
}

export function useLambdaLogsCtx(): LambdaLogsContextValue {
  const ctx = useContext(LambdaLogsContext);
  if (!ctx) throw new Error("useLambdaLogsCtx must be used within LambdaLogsProvider");
  return ctx;
}
