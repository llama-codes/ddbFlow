import { useTheme } from "../theme/ThemeProvider";
import { Icon, IconPaths } from "./Icon";
import { Tooltip } from "./Tooltip";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface CacheIndicatorProps {
  cachedAt: string | null;
  position?: TooltipPosition;
}

function timeAgo(cachedAt: string): string {
  const ageMs = Date.now() - new Date(cachedAt).getTime();
  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function cacheAgeColor(cachedAt: string, t: ReturnType<typeof useTheme>): string {
  const ageMs = Date.now() - new Date(cachedAt).getTime();
  const hours = ageMs / (1000 * 60 * 60);
  if (hours < 1) return t.text.success;
  if (hours < 24) return t.text.warning;
  return t.text.error;
}

export function CacheIndicator({ cachedAt, position = "bottom" }: CacheIndicatorProps) {
  const t = useTheme();
  if (!cachedAt) return null;

  const color = cacheAgeColor(cachedAt, t);
  const tooltip = `Cached ${timeAgo(cachedAt)} · ${new Date(cachedAt).toLocaleString()}`;

  return (
    <Tooltip text={tooltip} position={position}>
      <span className={`p-1 ${color} flex items-center cursor-default`}>
        <Icon size={13}>{IconPaths.clock}</Icon>
      </span>
    </Tooltip>
  );
}
