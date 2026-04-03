import { useState } from "react";
import { rpc } from "./lib/electrobun";

export function App() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePing() {
    setError(null);
    setResult(null);
    try {
      const response = await rpc.request.ping({});
      setResult(response);
      rpc.send.log({ msg: `Ping returned: ${response}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-blue-400">ddbFlow</h1>
        <p className="mt-2 text-gray-400">
          DynamoDB Explorer &mdash; M0 Validation
        </p>
      </div>

      <button
        onClick={handlePing}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
      >
        Test RPC: Ping
      </button>

      {result && (
        <div className="px-4 py-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
          RPC Response: <span className="font-mono font-bold">{result}</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          Error: {error}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Electrobun + Bun + React + Vite + Tailwind</p>
        <p>Windows 11 / Edge WebView2</p>
      </div>
    </div>
  );
}
