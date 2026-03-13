import React from "react";

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  disabled,
}: CheckboxFieldProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-gray-900 accent-gray-900 cursor-pointer"
      />
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  );
}
