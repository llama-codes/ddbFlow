import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import { Tooltip } from "../../components/Tooltip";
import type { ScanSession } from "../../App";

interface SessionsDropdownProps {
  sessions: ScanSession[];
  activeSessionKey: string | null;
  onSelectSession: (key: string) => void;
  onDeleteSession: (key: string) => void;
  disabled?: boolean;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionsDropdown({
  sessions,
  activeSessionKey,
  onSelectSession,
  onDeleteSession,
  disabled,
}: SessionsDropdownProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const hasSessions = sessions.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip text="Cached sessions">
        <Button.Container variant="ghost" onClick={() => hasSessions && setOpen((o) => !o)} disabled={disabled || !hasSessions}>
          <Button.Icon>
            <Icon size={14} className={open ? t.text.brand : ""}>{IconPaths.collection}</Icon>
          </Button.Icon>
          {hasSessions && <span className={`text-xs ${t.text.faint} ml-0.5`}>{sessions.length}</span>}
        </Button.Container>
      </Tooltip>

      {open && (
        <div
          className={`absolute right-0 top-full mt-1 w-64 ${t.bg.elevated} border ${t.border.muted} rounded-md shadow-lg z-50 flex flex-col`}
        >
          <div className={`px-3 py-2 border-b ${t.border.base}`}>
            <span className={`text-xs font-medium ${t.text.secondary}`}>
              {sessions.length} cached session{sessions.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {sessions.map((session) => {
              const isActive = session.cacheKey === activeSessionKey;
              return (
                <div
                  key={session.cacheKey}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs group ${
                    isActive
                      ? `${t.bg.selectedAccent} ${t.text.brand} border-l-2 ${t.border.brand}`
                      : `${t.text.secondary} border-l-2 ${t.border.transparent} hover:${t.bg.hover}`
                  }`}
                  onClick={() => {
                    onSelectSession(session.cacheKey);
                    setOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{formatSessionDate(session.fetchedAt)}</div>
                    <div className={`${t.text.faint}`}>{session.itemCount} items</div>
                  </div>
                  <button
                    type="button"
                    className={`p-0.5 opacity-0 group-hover:opacity-100 ${t.text.faint} hover:${t.text.error} transition-opacity cursor-pointer`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.cacheKey);
                    }}
                    title="Delete session"
                  >
                    <Icon size={12}>{IconPaths.trash}</Icon>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
