import React from "react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Pairs a Label with any form control (Input, Textarea, Select…).
 * Keeps label + control visually consistent across all wizard steps.
 */
export function FormField({ label, required = false, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {children}
    </div>
  );
}
