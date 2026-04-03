import { useTheme } from "../theme/ThemeProvider";

type Status = "connected" | "error" | "unknown";

interface StatusIndicatorProps {
  status: Status;
}

const labels: Record<Status, string> = {
  connected: "Connected",
  error: "Not connected",
  unknown: "Not checked",
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const t = useTheme();

  const dotClass = { connected: t.dot.success, error: t.dot.error, unknown: t.dot.unknown }[status];
  const textClass = { connected: t.text.success, error: t.text.error, unknown: t.text.faint }[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      <span className={`text-sm ${textClass}`}>{labels[status]}</span>
    </div>
  );
}
