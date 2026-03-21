import React from "react";

interface AuthButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}

export function AuthButton({
  children,
  onClick,
  disabled,
  loading,
  type = "button",
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "w-full h-11 rounded-xl text-sm font-semibold transition-colors",
        isDisabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950 cursor-pointer",
      ].join(" ")}
    >
      {loading ? "登录中..." : children}
    </button>
  );
}
