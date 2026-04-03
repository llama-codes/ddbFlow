import type { InputHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { Icon, IconPaths } from "./Icon";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange, placeholder, className = "", ...props }: SearchInputProps) {
  const t = useTheme();
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-xs ${t.input.base} rounded px-2 py-1.5 placeholder:${t.text.faint} ${value ? "pr-6" : ""} ${className}`}
        {...props}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className={`absolute right-1.5 flex items-center ${t.text.faint} hover:text-gray-300 cursor-pointer`}
          tabIndex={-1}
        >
          <Icon size={12}>{IconPaths.close}</Icon>
        </button>
      )}
    </div>
  );
}
