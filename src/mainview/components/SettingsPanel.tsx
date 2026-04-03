import { useEffect } from "react";
import { Button } from "./Button";
import { Icon, IconPaths } from "./Icon";
import { Title } from "./Title";
import { Description } from "./Description";

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
          <Title bold>Settings</Title>
          <Button.Container variant="ghost" onClick={onClose}>
            <Button.Icon><Icon size={16}>{IconPaths.close}</Icon></Button.Icon>
          </Button.Container>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* AWS Region */}
          <div>
            <Title>AWS Region</Title>
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
            <Description>Changes take effect immediately</Description>
          </div>

          {/* Credentials */}
          <div>
            <Title>AWS Credentials</Title>
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
            <Button.Container className="w-full justify-center" onClick={onCheckConnection} disabled={checkingConnection}>
              <Button.Text>{checkingConnection ? "Checking..." : "Check Connection"}</Button.Text>
            </Button.Container>
          </div>
        </div>
      </div>
    </>
  );
}
