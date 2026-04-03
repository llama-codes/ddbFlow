import { Icon, IconPaths } from "./Icon";
import { useTheme } from "../theme/ThemeProvider";

interface MainContentProps {
  selectedTable: string | null;
}

export function MainContent({ selectedTable }: MainContentProps) {
  const t = useTheme();

  if (!selectedTable) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${t.text.faint}`}>
        <Icon size={48} className={`mb-4 ${t.text.faint}`}>
          {IconPaths.database}
        </Icon>
        <p className="text-sm">Select a table to view its data</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto">
      <h2 className={`text-xl font-semibold ${t.text.primary}`}>{selectedTable}</h2>
      <p className={`mt-2 text-sm ${t.text.faint}`}>Item viewer coming soon</p>
    </div>
  );
}
