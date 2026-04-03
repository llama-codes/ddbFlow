import type { SelectHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeProvider";

interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: string) => void;
  size?: "default" | "sm";
}

const sizeClasses = {
  default: "px-3 py-2 text-sm",
  sm: "px-2 py-1 text-xs",
};

export function Dropdown({ options, value, onChange, size = "default", className = "", ...props }: DropdownProps) {
  const t = useTheme();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${t.input.base} rounded ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
