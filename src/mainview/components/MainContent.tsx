interface MainContentProps {
  selectedTable: string | null;
}

export function MainContent({ selectedTable }: MainContentProps) {
  if (!selectedTable) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-4 text-gray-600"
        >
          <ellipse cx="12" cy="6" rx="9" ry="3" />
          <path d="M3 6v6c0 1.657 4.03 3 9 3s9-1.343 9-3V6" />
          <path d="M3 12v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
        </svg>
        <p className="text-sm">Select a table to view its data</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-100">{selectedTable}</h2>
      <p className="mt-2 text-sm text-gray-500">
        Item viewer coming soon
      </p>
    </div>
  );
}
