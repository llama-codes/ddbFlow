import { useEffect } from "react";

const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "sa-east-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  region: string;
  onRegionChange: (region: string) => void;
  connectionStatus: "unknown" | "connected" | "error";
  checkingConnection: boolean;
  onCheckConnection: () => void;
}

export function SettingsPanel({
  open,
  onClose,
  region,
  onRegionChange,
  connectionStatus,
  checkingConnection,
  onCheckConnection,
}: SettingsPanelProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-gray-800 z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded transition-colors cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* AWS Region */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              AWS Region
            </label>
            <select
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {AWS_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              Changes take effect immediately
            </p>
          </div>

          {/* Credentials */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              AWS Credentials
            </label>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-400"
                    : connectionStatus === "error"
                      ? "bg-red-400"
                      : "bg-gray-500"
                }`}
              />
              <span
                className={`text-sm ${
                  connectionStatus === "connected"
                    ? "text-green-400"
                    : connectionStatus === "error"
                      ? "text-red-400"
                      : "text-gray-500"
                }`}
              >
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "error"
                    ? "Not connected"
                    : "Not checked"}
              </span>
            </div>
            <button
              onClick={onCheckConnection}
              disabled={checkingConnection}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingConnection ? "Checking..." : "Check Connection"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
