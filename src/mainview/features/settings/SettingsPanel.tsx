import { useEffect } from "react";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import { Title } from "../../components/Title";
import { Description } from "../../components/Description";
import { useTheme } from "../../theme/ThemeProvider";

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
  const t = useTheme();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const statusText = {
    connected: "Connected",
    error: "Not connected",
    unknown: "Not checked",
  }[connectionStatus];

  const statusTextClass = {
    connected: t.text.success,
    error: t.text.error,
    unknown: t.text.faint,
  }[connectionStatus];

  const statusDotClass = {
    connected: t.dot.success,
    error: t.dot.error,
    unknown: t.dot.unknown,
  }[connectionStatus];

  return (
    <>
      <div className={`fixed inset-0 ${t.bg.overlay} z-40`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-80 ${t.bg.surface} border-l ${t.border.base} z-50 flex flex-col`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border.base}`}>
          <Title bold>Settings</Title>
          <Button.Container variant="ghost" onClick={onClose}>
            <Button.Icon><Icon size={16}>{IconPaths.close}</Icon></Button.Icon>
          </Button.Container>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <Title>AWS Region</Title>
            <select
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              className={`w-full ${t.input.base} rounded px-3 py-2 text-sm`}
            >
              {AWS_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Description>Changes take effect immediately</Description>
          </div>

          <div className="space-y-2">
            <Title>AWS Credentials</Title>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${statusDotClass}`} />
              <span className={`text-sm ${statusTextClass}`}>{statusText}</span>
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
