import { createContext, useContext, type ReactNode } from "react";
import { useLambdaFunctions } from "./useLambdaFunctions";

type LambdaFunctionsContextValue = ReturnType<typeof useLambdaFunctions>;

const LambdaFunctionsContext = createContext<LambdaFunctionsContextValue | null>(null);

export function LambdaFunctionsProvider({ children }: { children: ReactNode }) {
  const value = useLambdaFunctions();
  return (
    <LambdaFunctionsContext.Provider value={value}>
      {children}
    </LambdaFunctionsContext.Provider>
  );
}

export function useLambdaFunctionsCtx(): LambdaFunctionsContextValue {
  const ctx = useContext(LambdaFunctionsContext);
  if (!ctx) throw new Error("useLambdaFunctionsCtx must be used within LambdaFunctionsProvider");
  return ctx;
}
