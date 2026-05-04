import { Icon, IconPaths } from "./Icon";
import { Tooltip } from "./Tooltip";
import { useTheme } from "../theme/ThemeProvider";
import { useSettingsCtx } from "../hooks/SettingsContext";
import type { AwsService } from "shared/schemas";

interface NavbarProps {
  service: AwsService;
  onHome: () => void;
}

function serviceLabel(service: AwsService): string {
  if (service === "dynamodb") return "DynamoDB";
  if (service === "lambda") return "Lambda / CloudWatch";
  return "Home";
}

export function Navbar({ service, onHome }: NavbarProps) {
  const t = useTheme();
  const { connectionStatus, toggleSettings } = useSettingsCtx();

  return (
    <nav className={`col-span-2 h-12 ${t.bg.surface} border-b ${t.border.base} flex items-center justify-between px-4`}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onHome}
          className={`${t.text.brand} font-bold text-lg tracking-tight cursor-pointer`}
          title="Home"
        >
          AWS Flow
        </button>
        <span className={`text-xs ${t.text.faint} truncate`}>{serviceLabel(service)}</span>
      </div>
      <div className="flex items-center gap-2">
        {service !== "home" && (
          <Tooltip text="Home" position="bottom">
            <button
              onClick={onHome}
              className={t.button.icon}
              title="Home"
            >
              <Icon size={18}>{IconPaths.collection}</Icon>
            </button>
          </Tooltip>
        )}
        {connectionStatus === "error" && (
          <Tooltip text="AWS credentials not found. Check Settings." position="bottom">
            <span className={`flex items-center gap-1.5 text-xs ${t.text.warning} ${t.bg.warningAccent} border ${t.border.warningAccent} rounded px-2 py-1 cursor-default`}>
              <Icon size={12}>{IconPaths.warning}</Icon>
              No credentials
            </span>
          </Tooltip>
        )}
        <button
          onClick={toggleSettings}
          className={t.button.icon}
          title="Settings"
        >
          <Icon size={18}>{IconPaths.gear}</Icon>
        </button>
      </div>
    </nav>
  );
}
