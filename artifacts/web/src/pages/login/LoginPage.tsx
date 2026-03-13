import React from "react";
import { AuthCard } from "./AuthCard";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <p className="mb-8 text-sm font-light tracking-[0.25em] text-gray-300 uppercase select-none">
        SCIBLOCK
      </p>
      <AuthCard />
    </div>
  );
}
