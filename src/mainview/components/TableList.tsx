interface TableListProps {
  tables: string[];
  selectedTable: string | null;
  loading: boolean;
  error: string | null;
  onSelectTable: (name: string) => void;
  onRefresh: () => void;
}

export function TableList({
  tables,
  selectedTable,
  loading,
  error,
  onSelectTable,
  onRefresh,
}: TableListProps) {
  return (
    <div className="bg-gray-900/50 border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Tables
        </span>
        <button
          onClick={onRefresh}
          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors cursor-pointer"
          title="Refresh tables"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="px-3 py-4 text-sm text-gray-500 animate-pulse">
            Loading tables...
          </p>
        )}

        {error && (
          <div className="px-3 py-3 text-sm text-red-400">
            <p className="font-medium">Failed to load</p>
            <p className="text-xs text-red-400/70 mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && tables.length === 0 && (
          <p className="px-3 py-4 text-sm text-gray-500">No tables found</p>
        )}

        {!loading && tables.length > 0 && (
          <ul>
            {tables.map((table) => {
              const isSelected = table === selectedTable;
              return (
                <li key={table}>
                  <button
                    onClick={() => onSelectTable(table)}
                    className={`w-full text-left px-3 py-2 text-sm truncate transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-400"
                        : "text-gray-300 hover:bg-gray-800 border-l-2 border-transparent"
                    }`}
                    title={table}
                  >
                    {table}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
