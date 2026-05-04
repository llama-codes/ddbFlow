import { Icon, IconPaths } from "../../components/Icon";
import { useTheme } from "../../theme/ThemeProvider";
import type { AwsService } from "shared/schemas";

interface HomeScreenProps {
  onSelectService: (service: AwsService) => void;
}

export function HomeScreen({ onSelectService }: HomeScreenProps) {
  const t = useTheme();

  return (
    <main className={`col-span-2 min-h-0 overflow-auto ${t.bg.base}`}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={`text-2xl font-semibold ${t.text.primary}`}>AWS Flow</h1>
          <p className={`text-sm ${t.text.muted} mt-2`}>
            Choose a service workspace. Each one keeps its own selection, cached sessions, and local workflow state.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelectService("dynamodb")}
            className={`text-left p-5 rounded-lg border ${t.border.base} ${t.bg.surface} hover:${t.bg.elevated} transition-colors cursor-pointer`}
          >
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded border ${t.border.tableKeyAccent} ${t.bg.tableKeyAccent} ${t.text.tableKey}`}>
              <Icon size={22}>{IconPaths.database}</Icon>
            </span>
            <h2 className={`mt-4 text-base font-semibold ${t.text.primary}`}>DynamoDB</h2>
            <p className={`mt-2 text-sm ${t.text.muted}`}>
              Browse tables, inspect keys and indexes, scan data, build queries, and restore cached sessions.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectService("lambda")}
            className={`text-left p-5 rounded-lg border ${t.border.base} ${t.bg.surface} hover:${t.bg.elevated} transition-colors cursor-pointer`}
          >
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded border ${t.border.gsiAccent} ${t.bg.gsiAccent} ${t.text.gsi}`}>
              <Icon size={22}>{IconPaths.bolt}</Icon>
            </span>
            <h2 className={`mt-4 text-base font-semibold ${t.text.primary}`}>Lambda / CloudWatch</h2>
            <p className={`mt-2 text-sm ${t.text.muted}`}>
              List functions, view runtime metadata, fetch recent CloudWatch logs, and keep log sessions locally.
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}
