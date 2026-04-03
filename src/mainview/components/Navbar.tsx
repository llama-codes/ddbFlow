import { Icon, IconPaths } from "./Icon";
import { Tooltip } from "./Tooltip";

interface NavbarProps {
  credentialStatus: "unknown" | "connected" | "error";
  onToggleSettings: () => void;
}

export function Navbar({ credentialStatus, onToggleSettings }: NavbarProps) {
  return (
    <nav className="col-span-2 h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
      <span className="text-blue-400 font-bold text-lg tracking-tight">
        ddbFlow
      </span>
      <div className="flex items-center gap-2">
        {credentialStatus === "error" && (
          <Tooltip text="AWS credentials not found. Check Settings." position="bottom">
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-2 py-1 cursor-default">
              <Icon size={12}>{IconPaths.warning}</Icon>
              No credentials
            </span>
          </Tooltip>
        )}
        <button
          onClick={onToggleSettings}
          className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
          title="Settings"
        >
          <Icon size={18}>{IconPaths.gear}</Icon>
        </button>
      </div>
    </nav>
  );
}
