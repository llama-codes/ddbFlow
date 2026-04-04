import { useEffect } from "react";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import { Title } from "../../components/Title";
import { Description } from "../../components/Description";
import { StatusIndicator } from "../../components/StatusIndicator";
import { Dropdown } from "../../components/Dropdown";
import { useTheme } from "../../theme/ThemeProvider";
import { useSettingsCtx } from "../../hooks/SettingsContext";

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

const SCAN_LIMIT_OPTIONS = [25, 50, 100, 250, 500, 1000];

interface SettingsPanelProps {
  onRegionChange: (region: string) => void;
  onPurgeCache: () => void;
}

export function SettingsPanel({ onRegionChange, onPurgeCache }: SettingsPanelProps) {
  const t = useTheme();
  const {
    settingsOpen, closeSettings,
    region, scanLimit, handleScanLimitChange,
    connectionStatus, checkingConnection, checkConnection,
  } = useSettingsCtx();

  useEffect(() => {
    if (!settingsOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSettings();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [settingsOpen, closeSettings]);

  if (!settingsOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 ${t.bg.overlay} z-40`} onClick={closeSettings} />
      <div className={`fixed top-0 right-0 h-full w-80 ${t.bg.surface} border-l ${t.border.base} z-50 flex flex-col`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border.base}`}>
          <Title bold>Settings</Title>
          <Button.Container variant="ghost" onClick={closeSettings}>
            <Button.Icon><Icon size={16}>{IconPaths.close}</Icon></Button.Icon>
          </Button.Container>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <Title>AWS Region</Title>
            <Dropdown
              options={AWS_REGIONS.map((r) => ({ value: r, label: r }))}
              value={region}
              onChange={onRegionChange}
              className="w-full"
            />
            <Description>Changes take effect immediately</Description>
          </div>

          <div className="space-y-2">
            <Title>Scan Limit</Title>
            <Dropdown
              options={SCAN_LIMIT_OPTIONS.map((n) => ({ value: String(n), label: `${n} items` }))}
              value={String(scanLimit)}
              onChange={(v) => handleScanLimitChange(Number(v))}
              className="w-full"
            />
            <Description>Max items fetched per scan request</Description>
          </div>

          <div className="space-y-2">
            <Title>AWS Credentials</Title>
            <StatusIndicator status={connectionStatus} />
            <Button.Container className="w-full justify-center" onClick={checkConnection} disabled={checkingConnection}>
              <Button.Text>{checkingConnection ? "Checking..." : "Check Connection"}</Button.Text>
            </Button.Container>
          </div>
          <div className={`space-y-2 pt-4 border-t ${t.border.base}`}>
            <Title>Cache</Title>
            <Description>Clear all locally cached table and scan data</Description>
            <Button.Container className="w-full justify-center" onClick={onPurgeCache}>
              <Button.Text>Purge all cache</Button.Text>
            </Button.Container>
          </div>
        </div>
      </div>
    </>
  );
}
