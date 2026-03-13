import React from "react";

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  disabled,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          "w-full h-11 px-3.5 rounded-xl border bg-white text-gray-900 text-sm",
          "outline-none transition-colors",
          "placeholder:text-gray-400",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-red-400 focus:border-red-500"
            : "border-gray-200 focus:border-gray-400",
        ].join(" ")}
      />
      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  );
}
