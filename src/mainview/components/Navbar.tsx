import { Icon, IconPaths } from "./Icon";
import { Tooltip } from "./Tooltip";
import { useTheme } from "../theme/ThemeProvider";
import { useSettingsCtx } from "../hooks/SettingsContext";

export function Navbar() {
  const t = useTheme();
  const { connectionStatus, toggleSettings } = useSettingsCtx();

  return (
    <nav className={`col-span-2 h-12 ${t.bg.surface} border-b ${t.border.base} flex items-center justify-between px-4`}>
      <span className={`${t.text.brand} font-bold text-lg tracking-tight`}>
        ddbFlow
      </span>
      <div className="flex items-center gap-2">
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
