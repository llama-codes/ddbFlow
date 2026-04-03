import { useState } from "react";
import { rpc } from "./lib/electrobun";

export function App() {
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [tables, setTables] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearState() {
    setError(null);
    setPingResult(null);
    setTables(null);
  }

  async function handlePing() {
    clearState();
    try {
      const response = await rpc.request.ping({});
      setPingResult(response);
      rpc.send.log({ msg: `Ping returned: ${response}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleListTables() {
    clearState();
    try {
      const response = await rpc.request.listTables({});
      setTables(response);
      rpc.send.log({ msg: `listTables returned ${response.length} tables` });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-blue-400">ddbFlow</h1>
        <p className="mt-2 text-gray-400">DynamoDB Explorer &mdash; M1/M2 Smoke Test</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handlePing}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Ping
        </button>
        <button
          onClick={handleListTables}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          List Tables
        </button>
      </div>

      {pingResult && (
        <div className="px-4 py-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
          Ping: <span className="font-mono font-bold">{pingResult}</span>
        </div>
      )}

      {tables && (
        <div className="px-4 py-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 w-full max-w-md">
          <p className="font-semibold mb-2">Tables ({tables.length}):</p>
          {tables.length === 0 ? (
            <p className="font-mono text-sm text-green-400/70">No tables found</p>
          ) : (
            <ul className="font-mono text-sm space-y-1">
              {tables.map((t) => (
                <li key={t} className="text-green-300">{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 w-full max-w-md">
          Error: {error}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Electrobun + Bun + React + Vite + Tailwind + Effect + AWS SDK</p>
      </div>
    </div>
  );
}
