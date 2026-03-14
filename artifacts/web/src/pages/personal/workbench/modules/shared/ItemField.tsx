import React from "react";

interface ItemFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** Optional Tailwind class override for the hint text color. */
  hintClassName?: string;
  children: React.ReactNode;
}

/**
 * ItemField — label + control wrapper for a single form field inside an
 * ontology item card.
 *
 * Mirrors the wizard's FormField (same spacing and type scale) so the
 * workbench editing experience feels like the same product system.
 */
export function ItemField({
  label,
  required = false,
  hint,
  hintClassName,
  children,
}: ItemFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {required && <span className="text-red-400 text-xs leading-none">*</span>}
      </div>
      {children}
      {hint && (
        <p className={`text-[11px] leading-snug ${hintClassName ?? "text-gray-400"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
