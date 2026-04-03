export const darkTheme = {
  bg: {
    base: "bg-gray-950",
    surface: "bg-gray-900",
    surfaceDim: "bg-gray-900/50",
    elevated: "bg-gray-800",
    hover: "bg-gray-700",
    overlay: "bg-black/50",
    selectedAccent: "bg-blue-600/20",
    warningAccent: "bg-amber-400/10",
    partitionKeyAccent: "bg-blue-400/10",
    sortKeyAccent: "bg-purple-400/10",
  },
  text: {
    primary: "text-gray-100",
    secondary: "text-gray-300",
    muted: "text-gray-400",
    faint: "text-gray-500",
    brand: "text-blue-400",
    success: "text-green-400",
    error: "text-red-400",
    errorDim: "text-red-400/70",
    warning: "text-amber-400",
    sortKey: "text-purple-400",
  },
  border: {
    base: "border-gray-800",
    muted: "border-gray-700",
    brand: "border-blue-400",
    transparent: "border-transparent",
    warningAccent: "border-amber-400/30",
    partitionKeyAccent: "border-blue-400/20",
    sortKeyAccent: "border-purple-400/20",
  },
  dot: {
    success: "bg-green-400",
    error: "bg-red-400",
    unknown: "bg-gray-500",
  },
  ring: {
    brand: "focus:border-blue-500",
  },
  // Complete interactive style bundles (hover variants need full strings for Tailwind scanner)
  button: {
    default: "px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 hover:text-gray-100 hover:bg-gray-700",
    sm: "px-3 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-gray-100 hover:bg-gray-700",
    ghost: "p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800",
    icon: "p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-md transition-colors cursor-pointer",
  },
  input: {
    base: "bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:border-blue-500",
  },
  listItem: {
    base: "text-gray-300 hover:bg-gray-800 border-l-2 border-transparent",
    selected: "bg-blue-600/20 text-blue-400 border-l-2 border-blue-400",
  },
  tableRow: {
    even: "bg-gray-950",
    odd: "bg-gray-900/50",
    hover: "hover:bg-gray-800 transition-colors",
  },
} as const;

export type Theme = typeof darkTheme;
