import React from "react";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <p className="mb-4 text-sm font-light tracking-[0.25em] text-gray-300 uppercase select-none">
        SCIBLOCK
      </p>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome home</h1>
      <p className="mt-2 text-sm text-gray-500">You are logged in.</p>
    </div>
  );
}
